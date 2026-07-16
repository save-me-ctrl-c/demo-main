# MediaPipe 多人动作捕捉与计分改造记录

本文记录 AfroGO 从单人 MediaPipe Pose 改造成多人实时动作捕捉与独立计分的完整过程，可作为后续项目复用参考。

> 当前产品版本已按交互需求切回单人打分：`MAX_POSES = 1`。本文保留多人实现过程，后续恢复多人时可重新设为 4；第 8 节描述当前单人分屏和庆祝特效。

## 1. 改造目标

- 摄像头画面内同时识别最多 4 个人。
- 每个人拥有稳定的 `P1-P4` 编号。
- 每个人独立计算动作分、节奏分、能量和连击。
- 实时展示个人分数，并用参与者平均分作为综合分。
- 骨架与使用 `object-fit: cover` 的前置摄像头画面准确重合。
- 人物短暂遮挡或漏检时，不产生 `P5、P6……` 之类不断增长的编号。

## 2. 原实现为什么不能支持多人

原项目使用旧版 `@mediapipe/pose`：

```js
results.poseLandmarks
```

这个接口每帧只返回一个人的 33 个关键点。将 `modelComplexity` 从 `1` 调到 `2` 只会更换精度更高的单人模型，不会让它返回多个人。

多人识别需要使用 `@mediapipe/tasks-vision` 中的 `PoseLandmarker`，并配置：

```js
{
  runningMode: 'VIDEO',
  numPoses: 4,
}
```

新接口返回：

```js
result.landmarks // NormalizedLandmark[][]，每个数组元素代表一个人
```

## 3. 涉及文件

| 文件 | 作用 |
| --- | --- |
| `package.json` | 增加并锁定 `@mediapipe/tasks-vision` 版本 |
| `src/services/poseRecorder.js` | 模型加载、多人检测、人物 ID 跟踪 |
| `src/components/DanceScore.jsx` | 多骨架绘制、独立计分、综合结果 |
| `src/components/DanceScore.css` | 实时个人分数和结果列表样式 |

依赖固定为 `0.10.35`，因为代码里的 WASM CDN 地址也使用这个版本。包版本和 WASM 版本应保持一致。

## 4. 实施步骤

### 4.1 安装多人姿态依赖

```powershell
npm.cmd install @mediapipe/tasks-vision@0.10.35 --legacy-peer-deps
```

项目已有 `@runanywhere` 的 peer dependency 冲突，因此安装时使用了 `--legacy-peer-deps`。

### 4.2 按需加载模型

为了避免把姿态库放进首屏 JavaScript，使用动态导入：

```js
let tasksVisionPromise = null

function loadTasksVision() {
  if (!tasksVisionPromise) {
    tasksVisionPromise = import('@mediapipe/tasks-vision')
  }
  return tasksVisionPromise
}
```

相关资源：

```js
const TASKS_VISION_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'

const POSE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/' +
  'pose_landmarker_full/float16/1/pose_landmarker_full.task'
```

多人靠近和互相遮挡时，Full 模型比 Lite 模型更稳定，但推理成本也更高。4 人实时场景优先使用 Full；Heavy 模型精度更高，但在普通手机上可能导致明显掉帧。

优先使用 GPU，失败后自动回退 CPU：

```js
try {
  landmarker = await PoseLandmarker.createFromOptions(fileset, {
    ...options,
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
  })
} catch {
  landmarker = await PoseLandmarker.createFromOptions(fileset, options)
}
```

### 4.3 每帧检测多人

视频模式要求时间戳递增，并且同一个视频帧不应重复推理：

```js
if (video.currentTime !== lastVideoTime) {
  lastVideoTime = video.currentTime
  const result = landmarker.detectForVideo(video, performance.now())
  onResults(assignPersonIds(result.landmarks || [], Date.now()))
}
```

当前上限：

```js
const MAX_POSES = 4
```

增加人数会明显提高浏览器推理开销。修改上限时必须同步评估手机帧率、发热和内存占用。

### 4.4 给检测结果分配稳定人物 ID

Pose Landmarker 返回多人关键点，但不提供可直接用于业务的永久人物 ID，而且返回顺序可能变化。

本项目使用肩部和髋部中心作为人物中心点：

```js
const points = [11, 12, 23, 24].map(index => landmarks[index])
```

跨帧匹配流程：

1. 计算本帧每个人的中心点。
2. 根据上一帧位置和速度预测下一位置。
3. 将肩、髋和四肢关键点按人体中心及躯干尺寸归一化，计算身体形状距离。
4. 使用“预测中心距离 72% + 身体形状距离 28%”作为匹配代价。
5. 对最多 4 人进行全局组合搜索，选择总匹配代价最低的一对一分配，避免检测顺序影响 ID。
6. 1.8 秒内的短暂丢失保留轨迹；250ms 内用半透明旧骨架抑制闪烁，但旧骨架不参与计分。
7. 新人物使用空闲的 `P1-P4` 槽位。
8. 没有空闲槽位时复用最久未出现的槽位，并通知计分层重置该槽位。

关键点是编号必须来自固定槽位：

```js
Array.from({ length: MAX_POSES }, (_, index) => index + 1)
```

不要使用一直递增的 `nextPersonId++`。否则短暂漏检会让一场打分出现 `P1-P22`，虽然镜头中实际只有几个人。

该方法属于轻量级位置跟踪，不是人脸识别。两个人快速交叉、完全遮挡后交换位置时，ID 仍可能互换。如需严格身份一致性，应增加人体 Re-ID 模型或要求参与者固定站位。

### 4.5 为每个人维护独立计分状态

不能让多人共用以下状态：

- 前一帧关键点
- 节奏计算窗口
- 连击计数
- 最大连击
- 最新分数

使用 `Map` 按人物槽位隔离：

```js
const peopleScoringRef = useRef(new Map())

let state = peopleScoringRef.current.get(person.id)
if (!state) {
  state = {
    frames: [],
    prevLandmarks: null,
    combo: createComboState(),
    result: null,
  }
  peopleScoringRef.current.set(person.id, state)
}
```

每个人分别执行：

```text
关键点归一化
  -> 动作相似度
  -> 独立节奏窗口
  -> 融合分数
  -> 独立连击和能量
```

当跟踪器返回 `person.reset === true` 时，先删除该槽位的旧状态，避免新进入的人继承上一位参与者的分数。

### 4.6 综合分和结果页使用相同参与者集合

曾出现过一个问题：顶部综合分只计算最后一帧仍被检测到的人，但结果页列出了整场所有历史 ID，导致综合分与个人分数明显不一致。

修复方式是先生成统一的参与者结果数组：

```js
const participantResults = [...peopleScoringRef.current.values()]
  .map(state => state.result)
  .filter(Boolean)
  .sort((a, b) => a.id - b.id)
```

综合动作分、节奏分和总分都从这个数组求平均，结果页也直接渲染这个数组。

### 4.7 修复骨架与人物错位

摄像头元素使用：

```css
object-fit: cover;
transform: scaleX(-1);
```

`cover` 会等比放大视频并裁掉超出容器的部分。如果画布只是把原始视频宽高直接拉伸到容器，骨架一定会产生偏移。

正确投影步骤如下：

```js
const scale = Math.max(containerW / videoW, containerH / videoH)
const renderedW = videoW * scale
const renderedH = videoH * scale
const offsetX = (containerW - renderedW) / 2
const offsetY = (containerH - renderedH) / 2
```

关键点先应用 `cover` 缩放和裁切，再应用前置摄像头镜像：

```js
const project = point => ({
  x: containerW - (point.x * renderedW + offsetX),
  y: point.y * renderedH + offsetY,
})
```

画布本身不再使用 `scaleX(-1)`，这样骨架标签 `P1` 不会变成镜像文字。

同时根据设备像素比设置 Canvas 缓冲区，防止高分屏骨架发虚：

```js
const ratio = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = Math.round(containerW * ratio)
canvas.height = Math.round(containerH * ratio)
ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
```

## 5. 验证方法

### 5.1 静态检查

```powershell
npm.cmd run build
git diff --check
```

两条命令都应成功。构建产物中姿态库应成为独立的 `vision_bundle` chunk，而不是合并进首屏主包。

### 5.2 浏览器测试

```powershell
npm.cmd run server
npm.cmd run dev
```

打开 `http://localhost:5174`，授权摄像头后检查：

1. 单人左右移动时，骨架始终贴合身体。
2. 第二个人进入后，显示两个不同颜色的骨架和两个独立分数。
3. 人物短暂离开或被遮挡后返回，优先保持原编号。
4. 整场编号始终限制在 `P1-P4`。
5. 两人交换左右位置后，观察 ID 是否保持；快速交叉属于重点压力场景。
6. 结束页个人分数数量不超过 4，综合分与列出的参与者平均结果一致。
7. 调整浏览器窗口尺寸和手机横竖屏后，骨架仍与人物重合。

## 6. 常见问题

### 只有一个骨架

- 确认使用的是 `PoseLandmarker`，不是旧版 `window.Pose` 实时追踪器。
- 确认 `numPoses` 大于 1。
- 确保每个人身体的大部分区域都在画面内，且光线足够。

### 两个人靠近后合并、漏检或交换编号

- 使用 Full 模型，Lite 模型更容易在重叠场景漏掉其中一人。
- 可将检测置信度适当降低到 `0.35`，存在和跟踪置信度设为 `0.4`，但继续降低会增加误检。
- ID 匹配不能只看人体中心，需要结合运动预测和归一化身体形状。
- 使用全局一对一分配，避免第一个检测结果先占用错误轨迹。
- 可以短时显示上一帧骨架减少闪烁，但旧骨架必须标记为 stale 且禁止参与计分。
- 尽量让两人前后错开，保证每个人的肩、髋至少有一部分可见。完全重叠时，单目 RGB 摄像头没有足够信息恢复被完全遮挡的人。

### 骨架整体偏左、偏右或被拉伸

- 检查视频是否使用了 `object-fit: cover`。
- Canvas 必须使用相同的 cover 缩放和居中裁切公式。
- 检查是否同时在坐标和 CSS 上做了两次镜像。

### 编号持续增长

- 不要为每次新检测结果使用递增 ID。
- 使用固定槽位，并给短暂漏检保留一定时间。
- 结束页不要保存和展示所有已经失效的历史轨迹。

### 多人分数互相影响

- 检查节奏帧窗口、前一帧关键点和 Combo 是否全部按人物 ID 存储。
- 槽位被新人物复用时必须清理旧状态。

### 模型初始化失败

- 检查 WASM URL、模型 URL 和依赖版本是否一致且可访问。
- 保留 GPU 到 CPU 的回退逻辑。
- 部署环境需要允许加载 jsDelivr 和 Google Storage；如需离线运行，应将 WASM 和 `.task` 模型放到项目静态资源目录。

## 7. 当前实现边界

- 实时摄像头最多识别 4 人。
- 上传视频分析仍沿用旧版单人 Pose 流程。
- 参考动作录制仍只缓存当前检测列表中的第一位参与者。
- 目前的人物 ID 是运动轨迹 ID，不是生物身份 ID。
- 最终效果必须使用真实摄像头测试，构建成功不能替代视觉对齐验证。

如果后续需要让上传视频也支持多人，应复用同一个 `PoseLandmarker`，逐帧得到多人关键点，再用本文的固定槽位跟踪与独立计分流程处理。

## 8. 标准骨架分屏与动作命中特效

### 8.1 直接播放标准关键点

标准动作 JSON 已包含每帧的 `timestamp_ms` 和 33 个关键点，不需要重新运行姿态模型。计分时使用与评分相同的时间轴查找标准帧：

```js
const refFrame = findClosestRefFrame(refTrack.frames, elapsed)
drawReferenceSkeleton(refFrame.landmarks)
```

这样标准骨架画面与实际参与评分的标准帧完全一致，不会出现“看到的动作”和“用于打分的动作”时间不一致。

### 8.2 分屏结构

打分舞台包含两个独立区域：

```jsx
<div className="ds-camera-wrap">
  <div className="ds-reference-pane">
    <canvas className="ds-reference-canvas" />
  </div>
  <div className="ds-user-pane">
    <video className="ds-cam-feed" />
    <canvas className="ds-skeleton-canvas" />
  </div>
</div>
```

- 宽屏使用左右分屏。
- 700px 以下使用上下分屏，标准动作占 42%，用户画面占 58%。
- 标准 Canvas 和用户 Canvas 必须独立，不能清除或缩放同一个绘图上下文。
- 实时分数、能量和个人分数覆盖在用户画面区域。

### 8.3 标准骨架绘制

标准数据是归一化坐标。绘制时使用 contain 投影并保留参考视频常见的 4:3 比例，避免分屏区域较窄时人体被横向压缩：

```js
const scale = Math.min(canvasW / 4, canvasH / 3)
const renderedW = 4 * scale
const renderedH = 3 * scale
const offsetX = (canvasW - renderedW) / 2
const offsetY = (canvasH - renderedH) / 2
```

如果后续导出的标准数据包含真实 `videoWidth` 和 `videoHeight`，应优先使用真实视频宽高替代固定 4:3。

前置摄像头画面是镜像显示，因此标准骨架的显示坐标也需要水平镜像，让用户照着标准动作移动时两侧画面方向一致。该镜像只影响 Canvas 绘制，不修改标准关键点，也不影响评分计算。

### 8.4 烟花触发条件

特效使用单帧动作相似度 `frameScore`，不使用包含节奏的综合分。当前规则：

```js
frameScore >= 0.78       // 动作相似度至少 78%
连续命中 3 帧
冷却时间 1600ms
```

特效按命中分数分级：

- `78%-85%`：`GOOD`
- `86%-93%`：`GREAT`
- `94%+`：`PERFECT`

连续帧限制可过滤偶然高分，冷却时间可避免每个推理帧都生成动画。当前单人模式将 `matchFrames` 和 `lastCelebration` 保存在玩家计分状态中。

烟花使用短生命周期 DOM 粒子和 CSS 动画实现：

- 每次在全屏 6 个区域同时生成烟花，每个烟花包含 24 个粒子。
- 中央显示带缩放、旋转、描边和发光动画的 `GOOD / GREAT / PERFECT`。
- 1700ms 后从 React 状态中删除。
- 特效层设置 `pointer-events: none`，不能遮挡停止按钮或其他操作。
- 支持 `prefers-reduced-motion`，用户关闭动画时将动画时长降到最低。

### 8.5 验证清单

1. 标准骨架随计时连续变化，并与当前参考音乐时间同步。
2. 标准骨架和用户骨架不会绘制到对方画布。
3. 手机竖屏为上下分屏，桌面为左右分屏。
4. 动作保持一致约 3 个检测帧后出现烟花。
5. 分数不足 78% 时不触发。
6. 页面最多保留最近 2 个庆祝实例，持续命中时仍受 1600ms 冷却限制。
7. 烟花不拦截点击，不改变画布、按钮或计分布局尺寸。
8. 退出打分页面后清理所有烟花定时器。
