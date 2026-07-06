# AfroGO 语音助手 — 技术分析文档

## 一、当前实现技术栈

### 1.1 唤醒词检测

| 层级 | 技术 | 说明 |
|------|------|------|
| 主方案 | **Sherpa-ONNX Silero VAD** | 11MB WASM，浏览器端运行，对人类语音精准响应 |
| 降级方案 | Web Audio API `AnalyserNode` | 0MB，能量门控（音量阈值 > 35），CPU ≈ 0.1% |
| 关键词匹配 | Web Speech API (`SpeechRecognition`) | Chrome 内置，英文/中文识别，单次模式 |
| 模糊匹配 | 自写 `fuzzyMatch()` 算法 | 容忍 1 字符差异 + 部分匹配，覆盖 15+ 唤醒词变体 |

**唤醒词列表：**
- 英文：`Hey AfroGO`, `OK Afro`, `Hey Afro`, `wake up`, `start listening`
- 中文：`嘿助手`, `你好助手`, `唤醒`

### 1.2 语音命令识别

| 层级 | 技术 | 说明 |
|------|------|------|
| 语音识别 | Web Speech API | 免费，零配置，支持 `zh-CN` / `en-US` |
| 意图解析 | 自写 `parseIntent()` 正则引擎 | 10 条规则，覆盖播放/暂停/切歌/随机/音量 |
| 歌曲匹配 | **Fuse.js** 模糊搜索 | `threshold: 0.45`，5 字段加权（title×4, artist×3, aliases×2, genre×2, dance×1） |
| 相似推荐 | 同 `genre`/`dance` 标签匹配 + Fisher-Yates 洗牌 | 零外部依赖 |
| 语音反馈 | Web Speech API `SpeechSynthesis` | 浏览器内置 TTS，中英文 |

### 1.3 实时音频播放

| 层级 | 技术 |
|------|------|
| 音频引擎 | HTML5 `<audio>` 元素 |
| 播放控制 | React state + `useRef` 驱动 |
| 自动播放 | 用户交互后调用 `audio.play()`（满足浏览器 autoplay 策略） |
| 队列管理 | Fisher-Yates 随机洗牌 + 循环/单曲重复模式 |

---

## 二、完整运行链路

### 2.1 唤醒链路

```
浏览器加载
  │
  ├─[1] useWakeWord hook 挂载
  │     │
  │     ├─ 加载 sherpa-onnx-vad.js (定义 createVad / CircularBuffer)
  │     ├─ 加载 sherpa-onnx-wasm-main-vad.js (11MB WASM)
  │     ├─ 下载 sherpa-onnx-wasm-main-vad.data (630KB 模型)
  │     └─ 初始化 Silero VAD (threshold=0.5)
  │
  ├─[2] getUserMedia() 获取麦克风
  │     └─ 失败 → 降级到能量门控
  │
  ├─[3] ScriptProcessorNode (4096 buffer, 16kHz)
  │     │
  │     └─ onaudioprocess 回调
  │           │
  │           ├─ Float32Array 采样 → downsample → buffer.push()
  │           ├─ vad.acceptWaveform() 逐窗口检测
  │           │
  │           └─ vad.isDetected() === true?
  │                 │
  │                 YES → [4] 进入关键词识别
  │                 NO  → 继续监听
  │
  └─[4] SpeechRecognition.start() (Web Speech API)
        │
        ├─ 用户说 "Hey AfroGO"
        ├─ STT 识别 → "hey afro go"
        ├─ fuzzyMatch("hey afro go", WAKE_WORDS) → true
        │
        └─ onWake() 回调
              │
              └─ AppLayout: setWakeTrigger(c => c + 1)
                    │
                    └─ VoiceButton: useEffect → setActive(true)
                          │
                          └─ AI 语音助手已唤醒，等待命令
```

### 2.2 语音命令链路

```
AI 助手已唤醒
  │
  ├─ 用户说 "播放 Funky Lagos"
  │
  ├─ SpeechRecognition → "play Funky Lagos"
  │
  ├─ parseIntent("play Funky Lagos")
  │     └─ { action: 'play', params: { query: 'Funky Lagos' } }
  │
  ├─ findSongs("Funky Lagos")
  │     │
  │     ├─ 1. Exact genre match? → No
  │     ├─ 2. Genre partial match? → No
  │     ├─ 3. Fuse.js fuzzy search → score: 0.00 (exact match via aliases)
  │     └─ 4. Return [Funky Lagos]
  │
  ├─ handlePlaySong(funkyLagos)
  │     │
  │     ├─ setCurrentSong(funkyLagos)
  │     ├─ setIsPlaying(true)
  │     ├─ audio.src = '/api/media/audio/Funky_Lagos.mp3'
  │     └─ audio.play()
  │
  └─ speak("Playing Funky Lagos", 'en-US')
        └─ SpeechSynthesis.speak()
```

### 2.3 意图解析覆盖

| 用户输入 | 解析结果 |
|----------|---------|
| "播放 Essence" | `{ action: 'play', query: 'Essence' }` |
| "来点 Amapiano" | `{ action: 'play', query: 'Amapiano' }` |
| "暂停" | `{ action: 'pause' }` |
| "继续" | `{ action: 'resume' }` |
| "下一首" / "换歌" | `{ action: 'next' }` |
| "随便放点" | `{ action: 'random' }` |
| "声音大一点" | `{ action: 'volumeUp' }` |
| "这是什么歌" | `{ action: 'whatPlaying' }` |

### 2.4 歌曲模糊匹配层级

```
findSongs(query)
  │
  ├─ Level 1: 精确 genre/dance 匹配
  │     query = "Afrobeat" → 所有 Afrobeat 歌曲，随机返回
  │
  ├─ Level 2: 部分 genre/dance 匹配
  │     query = "beat" → 包含 "beat" 的 genre
  │
  ├─ Level 3: Fuse.js 模糊搜索 (threshold 0.45)
  │     加权搜索 title(×4) + artist(×3) + aliases(×2) + genre(×2) + dance(×1)
  │     query = "Essen" → "Essence" (score 0.00)
  │     query = "Wizkid" → "Essence" (artist match via alias)
  │     query = "bootlicker" → "Bootlickers House Remix" (partial artist match)
  │
  └─ Level 4: 随机播放
        无匹配 → Fisher-Yates 洗牌全部歌曲，取前 6 首
```

---

## 三、技术架构全景图

```
┌────────────────────────────────────────────────────────────┐
│                      React App                             │
│                                                            │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐    │
│  │AppLayout │  │VoiceButton│  │    MusicPlayer        │    │
│  │          │  │  (FAB)    │  │  (mini + fullscreen)  │    │
│  │ useWakeWord│ │ onClick   │  │  <audio> element      │    │
│  │          │  │ wakeTrigger│  │  play/pause/next/prev │    │
│  └────┬─────┘  └─────┬─────┘  └──────────┬───────────┘    │
│       │              │                    │                │
│  ┌────▼──────────────▼────────────────────▼───────────┐    │
│  │                  Services                           │    │
│  │                                                     │    │
│  │  parseIntent()    findSongs()    findSimilar()      │    │
│  │  speak()          getFeedback()                     │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │                  Data Layer                          │    │
│  │                                                     │    │
│  │  mockData.js: songs[] (9 tracks + aliases + tags)   │    │
│  │  audio files: /server/media/audio/*.mp3             │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                   Browser APIs                             │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Web Speech   │  │ SpeechSynth  │  │ Web Audio    │      │
│  │ Recognition  │  │ (TTS)        │  │ API          │      │
│  │ (STT,free)   │  │ (free)       │  │ (mic access) │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│                                             │              │
│                                  ┌──────────▼──────────┐   │
│                                  │ Sherpa-ONNX WASM    │   │
│                                  │ Silero VAD (11MB)   │   │
│                                  │ 离线语音活动检测     │   │
│                                  └─────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 四、费用与性能

### 4.1 运行成本

| 资源 | 当前方案 | 说明 |
|------|---------|------|
| 模型下载 | 11 MB（仅首次） | Sherpa VAD WASM，浏览器缓存后零流量 |
| CPU 空闲 | ~1% | VAD 持续运行 |
| CPU 识别中 | ~3% | Web Speech API 识别时 |
| 网络 | 仅识别时需要 | Web Speech API 走 Chrome 云端 |
| 服务器成本 | $0 | 无后端 AI 服务 |
| API 费用 | $0 | 全部使用浏览器免费 API |

### 4.2 一次性下载

| 文件 | 大小 | 用途 |
|------|------|------|
| `sherpa-onnx-wasm-main-vad.wasm` | 11 MB | VAD 引擎 |
| `sherpa-onnx-wasm-main-vad.data` | 630 KB | Silero VAD 模型 |
| `sherpa-onnx-vad.js` | 8 KB | JS 绑定 |
| **合计** | **~12 MB** | 首次加载，后续浏览器缓存 |

### 4.3 浏览器兼容性

| 平台 | VAD | 语音识别 | TTS |
|------|-----|---------|-----|
| Chrome (Desktop) | ✅ WASM | ✅ | ✅ |
| Chrome (Android) | ✅ WASM | ✅ | ✅ |
| Edge | ✅ WASM | ✅ | ✅ |
| Safari | ✅ WASM | ⚠️ 14.5+ | ✅ |
| Firefox | ✅ WASM | ❌ | ✅ |
| Opera Mini | ❌ | ❌ | ❌ |

**非洲市场预估覆盖率：~80%（Chrome + Samsung + Opera + Edge）**

---

## 五、成熟市场化方案展望

### 5.1 阶段演进路线

```
Phase 1 (当前)          Phase 2 (半年)         Phase 3 (一年)          Phase 4 (成熟)
─────────────────────────────────────────────────────────────────────────────────
Web Speech API         Whisper tiny ONNX      自训练非洲语言模型       多模态 Agent
+ Fuse.js 模糊匹配      + LLM 意图理解          + 离线全链路            + 端到端推理
+ Sherpa VAD           + 情绪感知              + 个性化推荐             + 实时翻译
+ 本地音频              + Spotify/Boomplay     + 用户自适应             + 手势+语音
```

### 5.2 Phase 2 — 增强识别

| 升级项 | 技术 | 效果 |
|--------|------|------|
| STT 升级 | **Whisper tiny ONNX** (75MB WASM) | 离线识别，支持 99 种语言，含斯瓦希里语 |
| 意图理解 | **Claude API** / GPT-4o-mini | 自然语言理解，不再依赖正则 |
| 情绪感知 | 语音情感分析 ONNX | 根据用户情绪推荐歌曲 |
| 曲库对接 | **Boomplay API** / **Audiomack API** | 接入非洲本土正版曲库 |

### 5.3 Phase 3 — 离线全链路

```
用户语音 → Whisper ONNX (离线 STT)
              │
              ▼
         LLM Phi-3 ONNX (离线意图理解，2GB)
              │
              ▼
         本地曲库匹配 (Fuse.js)
              │
              ▼
         本地音频播放 (<audio>)
              │
              ▼
         Piper TTS ONNX (离线语音反馈，50MB)
```

**完整离线链路，零网络依赖，完美适配非洲弱网环境。**

### 5.4 Phase 4 — 多模态 Agent

| 能力 | 技术 | 场景 |
|------|------|------|
| 语音+手势 | MediaPipe + Whisper | "播放这个" + 指向屏幕 |
| 实时翻译 | SeamlessM4T ONNX | 斯瓦希里语 ↔ 英语实时互译 |
| 个性化 | 本地向量数据库 | 学习用户偏好，精准推荐 |
| 多设备协同 | WebRTC | 手机唤醒 → 音箱播放 |
| 舞蹈教学 | Pose Detection ONNX | "教我 Azonto 第二步" → AI 纠正动作 |

### 5.5 商业化方案对比

| 方案 | 离线 | 成本 | 非洲语言 | 推荐 |
|------|------|------|---------|------|
| Google Speech API | ❌ | $0.006/15s | ⭐⭐⭐ | 短期 |
| Azure Speech | ❌ | $1/小时 | ⭐⭐⭐⭐ | 中期 |
| **Whisper ONNX** | ✅ | 免费 | ⭐⭐⭐⭐⭐ | **长期** |
| Boomplay 集成 | ❌ | 分成模式 | ⭐⭐⭐⭐⭐ | 曲库 |
| 自研全链路 ONNX | ✅ | 免费 | ⭐⭐⭐⭐⭐ | **终极** |

### 5.6 建议路径

```
现在 → Web Speech API (免费，快速验证)
  ↓
3 个月 → Whisper tiny ONNX (离线 STT，非洲语言)
  ↓
6 个月 → Boomplay API 集成 (正版曲库)
  ↓
12 个月 → 全链路 ONNX (离线 STT + TTS + LLM)
  ↓
18 个月 → 多模态 Agent (语音 + 视觉 + 舞蹈教学)
```

---

## 附录：关键代码文件索引

| 文件 | 功能 |
|------|------|
| `src/hooks/useWakeWord.js` | 唤醒词检测（Sherpa VAD + Web Speech + fuzzy match） |
| `src/hooks/useVoiceRecognition.js` | 语音识别 hook（Web Speech API 封装） |
| `src/services/voiceAssistant.js` | 意图解析 + 模糊歌曲搜索 + TTS |
| `src/components/VoiceButton.jsx` | 语音助手浮动按钮 UI |
| `src/AppLayout.jsx` | 唤醒词 → VoiceButton 桥接 |
| `src/data/mockData.js` | 歌曲数据（9 首，含 aliases） |
| `public/sherpa/` | Sherpa-ONNX VAD WASM 文件 |
