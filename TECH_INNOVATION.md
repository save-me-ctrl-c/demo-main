# AfroGo 技术创新与可行性分析

> 基于《AfroGo非洲本土化舞蹈APP整体产品方案》设计书

---

## 一、产品技术架构概览

```
┌─────────────────────────────────────────────────┐
│                   前端 (React 19)                 │
│  Welcome → Onboarding → Social/Create/Library/Profile │
│         ↑ Outlet Context (状态共享)              │
│  AppLayout: Audio引擎 · 播放队列 · 主题 · i18n    │
├─────────────────────────────────────────────────┤
│               API 层 (Vite Proxy)                │
│      JWT Auth · RESTful · Range Stream           │
├─────────────────────────────────────────────────┤
│              后端 (Express 5 + SQLite)            │
│  用户 · 歌曲 · 视频 · 歌单 · 导师 · 教学包 · 设备  │
├─────────────────────────────────────────────────┤
│           本地存储 (media/)                       │
│  音频流 (MP3) · 视频流 (MP4) · 封面 (PNG)        │
└─────────────────────────────────────────────────┘
```

### 当前技术栈
| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React | 19.2 |
| 构建工具 | Vite (Rolldown) | 8.1 |
| 路由 | React Router | 7.18 |
| 图标 | Lucide React | 1.22 |
| 后端 | Express | 5.2 |
| 数据库 | better-sqlite3 | 12.11 |
| 认证 | JWT (jsonwebtoken) | 9.0 |
| 音频流 | HTTP Range Requests | — |
| 视频流 | HTTP Range Requests + scroll-snap | — |

---

## 二、已实现的核心创新点

### 2.1 离线优先的本地媒体引擎

**创新点**：全部媒体资源本地化，零网络依赖

- 9 首 CC 授权 Afro 音乐本地存储，通过 HTTP Range 流式播放
- 4 个舞蹈视频本地文件，支持拖拽 Seek
- 69 张 AI 生成封面图，无外部 CDN 依赖
- SQLite 嵌入式数据库，无需单独部署

**技术实现**：
```
音频播放链路：
  click → handlePlaySong() → audio.src = /api/stream/file.mp3
  → Express fs.createReadStream (Range: bytes=0-)
  → <audio> timeupdate → 实时进度条
```

**可行性评估**：✅ 已验证可行。Local Afro Grooves 歌单 9 首歌曲全部通过 Range 流播放，支持 Seek 拖拽、暂停/播放、上下首切换、随机/循环。

---

### 2.2 AI 数字人导师引导系统

**创新点**：首次进入的沉浸式导师选择 + 离线教学资源包管理

- 6 位 AI 数字人导师（Zuri/Amara/Kofi/Nia/Tunde/Sade）
- 8 个分类教学资源包（Azonto/Amapiano/Kizomba 等）
- 两步引导流程：选导师 → 选资源包 → 进入主界面
- 资源包可标记离线下载，存储在 `user_onboarding` 表

**技术实现**：
```
Onboarding 流程：
  Welcome (手机号/游客) → JWT 签发
  → Step 1: GET /api/mentors (6位导师 + 专长/学生数)
  → Step 2: GET /api/packs (8个教学包 + 课时/大小)
  → POST /api/onboarding (存储选择)
  → 进入主界面
```

**可行性评估**：✅ 框架已搭建。当前导师为元数据，后续可接入真实 AI 模型（如 MediaPipe Pose Detection）做动作识别与教学反馈。

---

### 2.3 全屏沉浸式视频 Feed

**创新点**：类 TikTok 交互 + 本地视频 + 完整社交功能

- `scroll-snap: y mandatory` 实现整页滑动切换
- 视频暂停/播放 + 进度条 Seek + 时间显示
- 点赞（toggle）、评论面板（底部弹出）、分享（剪贴板）、礼物（8 种金额）
- Memo 优化：每个视频卡片独立状态，点赞只重渲染当前卡片
- 点击隔离：视频 `pointer-events: none`，操作栏独立热区

**技术实现**：
```
视频 Feed 事件隔离：
  <video pointer-events:none>          ← 不接收点击
  <tap-zone inset:0 62px 0 0>         ← 左/中部：暂停/播放
  <actions right:0 width:60px>         ← 右侧：点赞/评论/分享/礼物
  <comment-panel>                      ← 底部弹出，类 TikTok
```

**可行性评估**：✅ 4 个本地 MP4 视频已集成，stream-video 端点支持 Range 请求。后续可扩展为 UGC 视频上传 + 云端转码。

---

### 2.4 多语言 + 双主题系统

**创新点**：非洲本地化的语言和视觉适配

- 中/英双语，通过 `LanguageContext` 全局注入 `t()` 函数
- 主题系统：Dark（黑+青） / Midnight（紫 #8D8AD1 + 星光粒子）
- CSS 变量批量同步到 `:root`，`localStorage` 持久化
- 星光背景：15 颗半透明粒子 `radial-gradient` + 20s 漂移动画

**技术实现**：
```
主题切换：
  ThemeContext → themes[midnight] → 16个 CSS setProperty()
  → :root 变量即时生效 → localStorage 持久化
```

**可行性评估**：✅ 已验证。后续可扩展斯瓦希里语、豪萨语等非洲本土语言。

---

### 2.5 果冻弹性交互系统

**创新点**：统一使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹簧曲线

- Tab 切换：选中气泡 `scale(1.06)` 弹性弹出
- 语音按钮：拖动松手吸附边栏 `left 0.6s` 弹性过渡
- 播放模式切换：透明度渐变 + 色彩切换
- 进度条悬停：2px → 4px 平滑放大

**可行性评估**：✅ CSS 动画方案，性能优异，无 JS 开销。

---

## 三、设计书中的核心技术挑战与方案

### 3.1 离线 AI 数字人舞蹈教学

| 维度 | 设计书要求 | 当前状态 | 技术方案 |
|------|-----------|---------|---------|
| 离线可用 | 无网络可用的 AI 教学 | 🟡 导师框架已搭建，AI 未接入 | TensorFlow.js + MediaPipe Pose，浏览器端推理 |
| 动作识别 | 数字人 1:1 真人动作教学 | 🔴 未实现 | Pose Landmark Detection → 关节角度对比 → 评分反馈 |
| 慢速分解 | 慢速播放、逐帧回看 | 🟡 视频播放已支持，AI 层未接入 | video.playbackRate + 关键帧标注 |
| 资源包 | 离线下载、断点续传 | 🟡 资源包元数据已有，下载逻辑模拟 | Service Worker + Cache API 实现真离线 |

**推荐方案**：
1. 使用 **MediaPipe Pose** (Google) 做 33 点人体姿态检测，完全在浏览器端运行
2. 教学视频预标注关键帧姿态数据，存储为 JSON
3. 用户摄像头采集姿态 → 与标注数据对比 → 实时相似度评分
4. 模型文件 (~5MB) 通过 Service Worker 预缓存，实现真正离线

**可行性**：🟢 技术成熟。MediaPipe 已在 Chrome/Safari 稳定运行，33 点姿态检测延迟 < 50ms。

---

### 3.2 多语种智能语音系统

| 维度 | 设计书要求 | 当前状态 | 技术方案 |
|------|-----------|---------|---------|
| 语音识别 | 斯瓦希里/豪萨/阿拉伯/英语 | 🟡 UI 按钮已实现，后端未接入 | Web Speech API (浏览器端) 或 Whisper (本地) |
| 语音合成 | 语音对话答疑 | 🔴 未实现 | Web Speech Synthesis 或 Edge TTS |
| 离线可用 | 离线语音识别 | 🔴 未实现 | whisper.cpp (WASM) 浏览器端推理 |

**推荐方案**：
1. **第一阶段**：Web Speech API（Chrome 内置，支持 50+ 语言，无需后端）
2. **第二阶段**：whisper.cpp 编译为 WebAssembly，浏览器端离线推理
3. **语音指令集**：预定义意图（播放/暂停/下一首/搜索舞曲），NLP 匹配

**可行性**：🟢 Web Speech API 已在 Chrome for Android 支持斯瓦希里语、阿拉伯语。Whisper tiny 模型 (~40MB) 可通过 WASM 在浏览器运行。

---

### 3.3 传音智能音箱硬件联动

| 维度 | 设计书要求 | 当前状态 | 技术方案 |
|------|-----------|---------|---------|
| 设备绑定 | APP 绑定传音音箱 | 🟡 设备表已建，UI 展示已做 | Web Bluetooth API 或局域网 mDNS |
| 音频同步 | 手机 ↔ 音箱同步播放 | 🔴 未实现 | Web Audio API + 局域网 WebSocket 时间同步 |
| 语音操控 | 音箱语音反向控制 APP | 🔴 未实现 | MQTT 双向消息通道 |

**推荐方案**：
1. **设备发现**：mDNS (Bonjour) 扫描局域网内传音音箱
2. **音频同步**：NTP 时间同步 + Web Audio `currentTime` 对齐
3. **控制协议**：MQTT over WebSocket，APP 和音箱双向订阅

**可行性**：🟡 技术可行但需传音 SDK 支持。Web Bluetooth 在 iOS 受限，建议通过局域网 HTTP/WS 通信。

---

### 3.4 UGC 视频创作 + AI 美化

| 维度 | 设计书要求 | 当前状态 | 技术方案 |
|------|-----------|---------|---------|
| 拍摄/导入 | 横竖屏拍摄、本地导入 | 🟡 创作页 UI 已搭建 | MediaDevices API + `<input type=file>` |
| AI 抠图 | 智能换背景 | 🔴 未实现 | @mediapipe/selfie_segmentation (浏览器端) |
| 滤镜/特效 | 非洲本土风格滤镜 | 🔴 未实现 | WebGL Shader 或 Canvas 2D 像素处理 |
| 配乐匹配 | 一键匹配曲库 BGM | 🟡 曲库 API 已有 | 音频指纹匹配 或 BPM/调性自动推荐 |

**推荐方案**：
1. **AI 抠图**：MediaPipe Selfie Segmentation，浏览器端实时分割，延迟 < 20ms
2. **背景替换**：Canvas 合成，支持非洲草原/城市/星空预设背景
3. **滤镜**：CSS `filter` + Canvas `globalCompositeOperation` 实现肤色优化

**可行性**：🟢 MediaPipe 分割模型已成熟，可在移动端浏览器运行。

---

## 四、技术架构演进路线图

```
Phase 1 (已完成)        Phase 2 (Q3)           Phase 3 (Q4)           Phase 4 (2027)
─────────────────────────────────────────────────────────────────────────────────
✅ 本地音乐播放         🔲 AI 姿态识别          🔲 UGC 视频创作         🔲 传音音箱联动
✅ 视频 Feed            🔲 语音指令控制         🔲 AI 动作评分          🔲 云端同步
✅ JWT 认证             🔲 离线资源缓存         🔲 社交关注系统         🔲 直播功能
✅ 双语 + 双主题        🔲 斯瓦希里语           🔲 会员订阅             🔲 创作者变现
✅ 导师引导框架         🔲 断点续传下载         🔲 打赏提现             🔲 广告系统
```

---

## 五、关键技术风险与对策

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| Web Speech API 非洲语言覆盖不全 | 语音功能受限 | 中 | whisper.cpp WASM 方案作为 Plan B |
| iOS Safari 对 Web Bluetooth 支持有限 | 硬件联动受阻 | 高 | 改用局域网 HTTP/WebSocket 通信 |
| MediaPipe 模型加载慢 (弱网) | AI 功能不可用 | 中 | Service Worker 预缓存 + 渐进加载 |
| SQLite 不支持多设备同步 | 数据孤岛 | 中 | Phase 4 迁移到 SQLite + CRDT 同步 或云端 PostgreSQL |
| 非洲低端机型性能不足 | 视频/AI 卡顿 | 中 | 降级策略：360p 视频 + 轻量 AI 模型 |
| App Store / Google Play 审核 | 上架受阻 | 低 | CC 授权内容 + 合规隐私政策 |

---

## 六、核心竞争力总结

1. **离线优先** — 所有核心功能（音乐、视频、AI 教学）离线可用，适配非洲弱网环境
2. **本地化** — 非洲本土音乐、舞蹈风格、语言、肤色美颜，非欧美产品直接翻译
3. **AI 原生** — MediaPipe + TensorFlow.js 浏览器端推理，零服务端 AI 成本
4. **轻量化** — SQLite 单文件数据库 + 无外部依赖，一部手机即可运行完整后端
5. **渐进增强** — 从本地到云端分阶段演进，每阶段都有可用产品

---

> **文档版本**: v1.0  
> **编写日期**: 2026-07-02  
> **基于代码版本**: AfroGo v2.0 (commit: 13ce1ea)
