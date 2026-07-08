#!/usr/bin/env python3
"""
Pose Data Extractor for AfroGO Dance Scoring
=============================================
Extracts MediaPipe Pose landmarks (33 keypoints) from a dance video
and outputs a track JSON file compatible with the AfroGO scoring engine.

Usage:
    python extract_poses.py [--fps 15] [--title "My Dance"] [--style "Amapiano"]
                            [--output output.json] [--preview] [--start N] [--duration N]
                            [--extract-audio]

Requirements:
    pip install mediapipe opencv-python numpy moviepy

The output JSON format matches the AfroGO dance scoring track structure:
    {
      "id": "ext_xxx",
      "title": "...",
      "danceStyle": "...",
      "duration_ms": ...,
      "fps": ...,
      "frames": [
        { "timestamp_ms": 0, "landmarks": [33 x {x, y, z, visibility}] },
        ...
      ],
      "frameCount": ...,
      "createdAt": ...,
      "source": "extracted_from_video"
    }
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

# MediaPipe Tasks API (v0.10.x)
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    PoseLandmarkerResult,
    RunningMode,
)

# ──────────────────────────────────────────────
# Constants (matching danceScoring.js / index.html)
# ──────────────────────────────────────────────

# Skeleton connections for preview drawing (body only, no face)
SKELETON_CONNECTIONS = [
    (11, 12), (11, 23), (12, 24), (23, 24),  # torso + shoulders + hips
    (11, 13), (13, 15),                        # left arm
    (12, 14), (14, 16),                        # right arm
    (23, 25), (25, 27),                        # left leg
    (24, 26), (26, 28),                        # right leg
]

SKELETON_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

# Colors for preview
JOINT_COLOR = (0, 230, 118)       # green
BONE_COLOR = (0, 200, 100)        # darker green
TEXT_COLOR = (255, 255, 255)

# Default model path (downloaded alongside this script)
DEFAULT_MODEL = Path(__file__).parent / "pose_landmarker.task"


def draw_skeleton(image: np.ndarray, landmarks: list) -> np.ndarray:
    """Draw skeleton overlay on image (BGR format)."""
    h, w = image.shape[:2]

    if not landmarks or len(landmarks) < 33:
        return image

    overlay = image.copy()

    # Draw bones
    for from_idx, to_idx in SKELETON_CONNECTIONS:
        a = landmarks[from_idx]
        b = landmarks[to_idx]
        # Skip low-visibility landmarks
        if (a.get("visibility", 1.0) < 0.4 or b.get("visibility", 1.0) < 0.4):
            continue
        pt1 = (int(a["x"] * w), int(a["y"] * h))
        pt2 = (int(b["x"] * w), int(b["y"] * h))
        cv2.line(overlay, pt1, pt2, BONE_COLOR, 2, cv2.LINE_AA)

    # Draw joints
    for idx in SKELETON_JOINTS:
        p = landmarks[idx]
        if p.get("visibility", 1.0) < 0.4:
            continue
        pt = (int(p["x"] * w), int(p["y"] * h))
        cv2.circle(overlay, pt, 4, JOINT_COLOR, -1, cv2.LINE_AA)

    # Blend overlay with original
    alpha = 0.8
    return cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)


def extract_poses(
    video_path: str,
    target_fps: int = 15,
    title: str = "Untitled",
    dance_style: str = "Unknown",
    start_sec: float = 0.0,
    duration_sec: float | None = None,
    output_path: str | None = None,
    preview: bool = False,
    model_path: str | None = None,
) -> dict:
    """
    Extract MediaPipe Pose landmarks from a video file.

    Args:
        video_path: Path to the input video file.
        target_fps: Frames per second to sample from the video.
        title: Track title for the output JSON.
        dance_style: Dance style label (e.g. "Amapiano", "Azonto").
        start_sec: Start time in seconds (skip earlier frames).
        duration_sec: Maximum duration to process (None = whole video).
        output_path: Path to write the output JSON file (None = no file output).
        preview: Whether to show a live skeleton overlay window during extraction.
        model_path: Path to the pose landmarker .task model file.

    Returns:
        The completed track dictionary.
    """
    print(f"\n{'='*60}")
    print(f"  AfroGO Pose Extractor")
    print(f"{'='*60}\n")

    # ── Resolve model path ──
    if model_path is None:
        model_path = str(DEFAULT_MODEL)
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Pose landmarker model not found: {model_path}\n"
            f"Download it from:\n"
            f"  https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
            f"pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task\n"
            f"And save it as: {DEFAULT_MODEL}"
        )

    # ── Open video ──
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    full_duration = total_frames / video_fps if video_fps > 0 else 0
    video_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    video_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"  Video:       {Path(video_path).name}")
    print(f"  Resolution:  {video_w}x{video_h}")
    print(f"  Native FPS:  {video_fps:.2f}")
    print(f"  Duration:    {full_duration:.1f}s ({total_frames} frames)")
    print(f"  Target FPS:  {target_fps}")
    print()

    # ── Calculate extraction range ──
    start_frame = int(start_sec * video_fps) if start_sec > 0 else 0
    if duration_sec is not None:
        end_time = min(start_sec + duration_sec, full_duration)
    else:
        end_time = full_duration

    extract_duration = end_time - start_sec
    total_sample_frames = int(extract_duration * target_fps)
    frame_interval_sec = 1.0 / target_fps

    print(f"  Start:       {start_sec:.1f}s (frame {start_frame})")
    print(f"  End:         {end_time:.1f}s")
    print(f"  Samples:     ~{total_sample_frames} frames")
    print()

    # ── Initialize MediaPipe PoseLandmarker (Tasks API) ──
    print("  Initializing MediaPipe PoseLandmarker...")
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_segmentation_masks=False,
    )
    landmarker = PoseLandmarker.create_from_options(options)
    print("  [OK] Model loaded\n")

    # ── Extract frames ──
    extracted_frames = []
    detected_count = 0
    sample_idx = 0
    start_time = time.time()

    if preview:
        cv2.namedWindow("Pose Extractor", cv2.WINDOW_NORMAL)

    try:
        while sample_idx < total_sample_frames:
            seek_sec = start_sec + sample_idx * frame_interval_sec
            timestamp_ms = int(round(seek_sec * 1000))

            # Seek to the correct frame
            seek_frame = int(seek_sec * video_fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, seek_frame)

            ret, frame = cap.read()
            if not ret:
                break  # end of video

            # Convert BGR to RGB (MediaPipe expects RGB)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            # MediaPipe Tasks API expects a MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

            # Run pose detection for this video frame
            result: PoseLandmarkerResult = landmarker.detect_for_video(
                mp_image, timestamp_ms
            )

            landmarks = None
            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                pose_lms = result.pose_landmarks[0]  # first (and only) person
                landmarks = []
                for lm in pose_lms:
                    landmarks.append({
                        "x": round(lm.x, 6),
                        "y": round(lm.y, 6),
                        "z": round(lm.z, 6),
                        "visibility": round(lm.visibility, 6) if hasattr(lm, 'visibility') and lm.visibility is not None else 1.0,
                    })
                detected_count += 1

            if landmarks:
                extracted_frames.append({
                    "timestamp_ms": timestamp_ms,
                    "landmarks": landmarks,
                })

            # Progress reporting (every 5%)
            if sample_idx % max(1, total_sample_frames // 20) == 0 or sample_idx == total_sample_frames - 1:
                elapsed = time.time() - start_time
                rate = (sample_idx + 1) / elapsed if elapsed > 0 else 0
                eta = (total_sample_frames - sample_idx - 1) / rate if rate > 0 else 0
                progress = (sample_idx + 1) / total_sample_frames * 100
                bar_len = 30
                filled = int(bar_len * (sample_idx + 1) / total_sample_frames)
                bar = "#" * filled + "-" * (bar_len - filled)
                print(f"\r  [{bar}] {progress:5.1f}%  "
                      f"frame {sample_idx + 1}/{total_sample_frames}  "
                      f"{detected_count} poses  "
                      f"{rate:.1f} fps  ETA {eta:.0f}s  ",
                      end="", flush=True)

            # Preview window
            if preview and landmarks:
                preview_frame = draw_skeleton(frame, landmarks)
                # Draw info overlay
                cv2.putText(preview_frame, f"Frame {sample_idx+1}/{total_sample_frames}",
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, TEXT_COLOR, 2)
                cv2.putText(preview_frame, f"Time: {seek_sec:.1f}s",
                            (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, TEXT_COLOR, 2)
                cv2.imshow("Pose Extractor", preview_frame)
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC to abort
                    print("\n\n  [!] Extraction aborted by user.")
                    break
                elif key == 32:  # SPACE to pause/resume preview
                    print("\n  [PAUSED] Press SPACE in preview window to continue...")
                    while True:
                        k = cv2.waitKey(0) & 0xFF
                        if k == 32:
                            print("  [RESUME] Resuming...")
                            break
                        elif k == 27:
                            print("\n  [!] Extraction aborted.")
                            sample_idx = total_sample_frames  # force exit
                            break

            sample_idx += 1

    finally:
        cap.release()
        if preview:
            cv2.destroyAllWindows()
        landmarker.close()

    elapsed_total = time.time() - start_time
    print(f"\n\n  [OK] Extraction complete in {elapsed_total:.1f}s")
    print(f"  Frames with poses: {detected_count}/{sample_idx} "
          f"({detected_count/max(1,sample_idx)*100:.1f}%)")

    # ── Build track ──
    actual_duration_ms = (
        extracted_frames[-1]["timestamp_ms"] if extracted_frames else 0
    )

    track = {
        "id": "ext_" + hex(int(time.time() * 1000))[2:],
        "title": title,
        "danceStyle": dance_style,
        "duration_ms": actual_duration_ms,
        "fps": target_fps,
        "frames": extracted_frames,
        "frameCount": len(extracted_frames),
        "createdAt": int(time.time() * 1000),
        "source": "extracted_from_video",
    }

    # ── Output ──
    json_str = json.dumps(track, ensure_ascii=False)

    if output_path:
        out_path = Path(output_path)
        out_path.write_text(json_str, encoding="utf-8")
        file_size_kb = len(json_str.encode("utf-8")) / 1024
        print(f"\n  [SAVED] {out_path.resolve()}")
        print(f"     Size: {file_size_kb:.1f} KB, {len(extracted_frames)} frames")
    else:
        # Print summary + first/last few frames as sample
        print(f"\n  Track JSON generated ({len(json_str.encode('utf-8'))/1024:.1f} KB)")
        print(f"  ID:       {track['id']}")
        print(f"  Title:    {track['title']}")
        print(f"  Style:    {track['danceStyle']}")
        print(f"  Duration: {track['duration_ms']}ms")
        print(f"  Frames:   {track['frameCount']}")
        print(f"  FPS:      {track['fps']}")
        # Print first 2 frame summaries
        if extracted_frames:
            print(f"\n  Preview (first 2 frames):")
            for f in extracted_frames[:2]:
                lms = f["landmarks"]
                # Show a few key joints
                key_joints = {
                    "nose": 0, "L_shoulder": 11, "R_shoulder": 12,
                    "L_hip": 23, "R_hip": 24, "L_wrist": 15, "R_wrist": 16,
                }
                joint_str = ", ".join(
                    f"{name}=({lms[idx]['x']:.3f},{lms[idx]['y']:.3f})"
                    for name, idx in key_joints.items()
                )
                print(f"    [{f['timestamp_ms']}ms] {joint_str}")

    return track


def main():
    parser = argparse.ArgumentParser(
        description="Extract MediaPipe Pose landmarks from video for AfroGO dance scoring.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_poses.py
      Uses default video (amapiano.mp4) at 15 fps, prints summary.

  python extract_poses.py --fps 20 --title "My Dance" --style "Azonto" -o my_dance.json
      Extracts at 20 fps with custom title/style and saves to file.

  python extract_poses.py --preview --fps 10
      Extracts at 10 fps with live skeleton overlay window.

  python extract_poses.py --start 5.0 --duration 10.0 -o clip.json
      Only processes from 5s to 15s of the video.
        """,
    )

    parser.add_argument(
        "video",
        nargs="?",
        default=None,
        help="Path to input video file (default: amapiano.mp4 in same directory)",
    )
    parser.add_argument(
        "--fps", "-f",
        type=int,
        default=15,
        choices=[5, 10, 15, 20, 25, 30],
        help="Target frames per second for extraction (default: 15)",
    )
    parser.add_argument(
        "--title", "-t",
        type=str,
        default="Amapiano Tutorial",
        help="Track title (default: 'Amapiano Tutorial')",
    )
    parser.add_argument(
        "--style", "-s",
        type=str,
        default="Amapiano",
        help="Dance style label (default: 'Amapiano')",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Output JSON file path (default: auto-generate from title)",
    )
    parser.add_argument(
        "--preview", "-p",
        action="store_true",
        help="Show live skeleton overlay window during extraction",
    )
    parser.add_argument(
        "--start",
        type=float,
        default=0.0,
        help="Start time in seconds (default: 0.0)",
    )
    parser.add_argument(
        "--duration", "-d",
        type=float,
        default=None,
        help="Duration to process in seconds (default: entire video)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Path to pose_landmarker.task model file",
    )
    parser.add_argument(
        "--no-output",
        action="store_true",
        help="Don't write any output file, just print summary",
    )
    parser.add_argument(
        "--extract-audio",
        action="store_true",
        help="Also extract audio from the video as MP3 (requires moviepy)",
    )

    args = parser.parse_args()

    # Default video path
    if args.video is None:
        script_dir = Path(__file__).parent
        args.video = str(script_dir / "amapiano.mp4")

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"ERROR: Video file not found: {video_path}", file=sys.stderr)
        sys.exit(1)

    # Default output path
    if args.output is None and not args.no_output:
        safe_title = args.title.replace(" ", "_").lower()
        script_dir = Path(__file__).parent
        args.output = str(script_dir / f"{safe_title}_pose.json")

    try:
        track = extract_poses(
            video_path=str(video_path),
            target_fps=args.fps,
            title=args.title,
            dance_style=args.style,
            start_sec=args.start,
            duration_sec=args.duration,
            output_path=args.output if not args.no_output else None,
            preview=args.preview,
            model_path=args.model,
        )

        # Extract audio if requested
        if args.extract_audio:
            try:
                from moviepy import VideoFileClip
                audio_path = str(video_path).rsplit('.', 1)[0] + '.mp3'
                print(f"\n  Extracting audio...")
                clip = VideoFileClip(str(video_path))
                if clip.audio:
                    clip.audio.write_audiofile(audio_path, logger=None)
                    print(f"  [OK] Audio saved: {audio_path}")
                else:
                    print(f"  [!] No audio track found in video")
                clip.close()
            except ImportError:
                print(f"\n  [!] moviepy not installed. Run: pip install moviepy")
            except Exception as e:
                print(f"\n  [!] Audio extraction failed: {e}")

        # If stdout is piped, print the full JSON
        if not sys.stdout.isatty():
            print(json.dumps(track, ensure_ascii=False))

    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.", file=sys.stderr)
        sys.exit(130)


if __name__ == "__main__":
    main()
