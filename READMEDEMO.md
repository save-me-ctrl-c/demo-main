# AfroGO Music — 非洲舞蹈娱乐 App

> Dance with Africa. Move with AI.
>
> 面向非洲大陆用户的舞蹈娱乐应用，支持本地音乐播放、AI 数字人导师引导、社交短视频浏览。

---

## 🚀 启动方法

### 环境要求
- **Node.js** >= 20
- **Python 3**（用于生成封面图片，Pillow 库）
- **npm**

```bash
# 1. 进入项目目录
cd afrogo-music

# 2. 安装依赖（仅首次）
npm install
pip3 install Pillow   # 封面图片生成

# 3. 释放端口（如果之前有残留进程）
lsof -ti :3001 | xargs kill -9
lsof -ti :5174 | xargs kill -9

# 4. 启动后端（终端1）
npm run server
# → Express API 运行在 http://localhost:3001
# → 数据库自动创建在 server/afrogo.db
# → 首次启动自动填充种子数据（9首真实歌曲、6位AI导师等）

# 5. 启动前端（终端2）
npm run dev
# → Vite 开发服务器运行在 http://localhost:5174
# → /api 请求自动代理到 :3001

# 6. 打开浏览器访问
open http://localhost:5174
```

### 首次访问流程
1. 进入 `/welcome` 登录/注册页 → 手机号登录或游客模式
2. 进入 `/onboarding` 导师选择页 → 选择AI舞蹈导师 + 教学资源包
3. 进入 `/` 主界面

---

## 🏗️ 项目架构

```
afrogo-music/
├── server/                         # 后端 (Express + SQLite)
│   ├── index.js                    # 入口：路由挂载、音频流、静态服务
│   ├── db.js                       # 数据库初始化 + 种子数据（14张表）
│   ├── afrogo.db                   # SQLite 数据库文件（自动生成）
│   ├── package.json                # { "type": "commonjs" }
│   ├── middleware/
│   │   └── auth.js                 # JWT 认证（requireAuth / optionalAuth）
│   ├── routes/
│   │   ├── auth.js                 # POST /api/auth/login, /guest, GET /me
│   │   ├── videos.js               # GET /api/videos, /topics, /rankings, POST like
│   │   ├── library.js              # GET /api/playlists, /songs, /templates, /ai-tools
│   │   ├── create.js               # GET/POST /api/drafts
│   │   ├── profile.js              # GET/PUT /api/profile, /stats, /devices
│   │   └── mentors.js              # GET /api/mentors, /packs, /onboarding
│   └── media/
│       ├── audio/                   # 本地音频文件（9首ccMixter CC授权歌曲）
│       └── covers/                  # 本地封面图片（自动生成）
│
├── src/                            # 前端 (React 19 + Vite)
│   ├── App.jsx                     # 路由配置（lazy-loaded pages）
│   ├── AppLayout.jsx               # 核心状态管理（播放控制、队列、进度）
│   ├── AppLayout.css
│   ├── main.jsx                    # React 入口
│   ├── index.css                   # 全局样式 + CSS变量 + 星光背景
│   ├── api.js                      # API 请求封装（自动游客认证）
│   ├── components/
│   │   ├── Icon.jsx                # 图标注册中心（lucide-react）
│   │   ├── TabBar.jsx / .css       # 底部导航栏（果冻弹性切换）
│   │   ├── MusicPlayer.jsx / .css  # 迷你播放器（进度条、切歌、随机/循环）
│   │   ├── VoiceButton.jsx / .css  # 语音助手悬浮按钮
│   │   └── LanguageSwitch.jsx      # 语言切换组件
│   ├── pages/
│   │   ├── Welcome.jsx / .css      # 登录/注册/游客页
│   │   ├── Onboarding.jsx / .css   # AI导师引导页（Step1选导师 Step2选资源包）
│   │   ├── Social.jsx / .css       # 社交广场（视频卡片 + 全屏Feed上下滑动）
│   │   ├── Create.jsx / .css       # 创作中心（拍摄/导入/AI工具/模板/草稿）
│   │   ├── Library.jsx / .css      # 曲库资源（最近播放/歌单/本地歌曲）
│   │   ├── Profile.jsx / .css      # 个人中心（资料/会员/设备/主题/语言）
│   │   ├── Player.jsx / .css       # 全屏播放器（封面大图/进度条/控制）
│   │   └── NotFound.jsx            # 404
│   ├── i18n/
│   │   ├── LanguageContext.jsx     # 中英文切换（localStorage 持久化）
│   │   ├── ThemeContext.jsx        # 主题切换（Dark/Midnight，CSS变量同步）
│   │   └── translations.js         # 翻译词典
│   └── data/
│       └── mockData.js             # 备用数据（API失败时的fallback）
│
├── index.html
├── vite.config.js                  # Vite配置（端口5174, /api代理到3001）
├── package.json                    # 依赖和脚本
└── READMEDEMO.md                   # 本文件
```

---

## 🗄️ 数据库设计（14 张表）

| 表 | 用途 | 种子数 |
|---|---|---|
| `users` | 用户（手机号、昵称、头像、会员等级、积分、地区） | 3 |
| `songs` | 歌曲（标题、艺人、时长、流派、舞种、文件路径、歌词、封面） | 9 |
| `playlists` | 歌单（名称、图标、类型 online/offline/teaching/vip） | 1 |
| `playlist_songs` | 歌单↔歌曲关联（含排序位置） | 9 |
| `videos` | 舞蹈视频（用户、描述、歌曲信息、互动数据、舞种、地区） | 5 |
| `topics` | 热门话题标签 | 5 |
| `rankings` | 排行榜 | 3 |
| `drafts` | 视频草稿 | 2 |
| `templates` | 舞蹈模板 | 6 |
| `ai_tools` | AI 创作工具 | 6 |
| `devices` | 智能设备绑定 | 1 |
| `user_likes` | 用户点赞记录 | 0 |
| `mentors` | AI 数字人导师（Zuri, Amara, Kofi, Nia, Tunde, Sade） | 6 |
| `mentor_packs` | 导师教学资源包（可离线下载） | 8 |
| `user_onboarding` | 用户引导完成状态 | 0 |

**数据库文件**: `server/afrogo.db`（SQLite WAL 模式，删除后重启自动重建）

---

## 🔌 API 端点一览

### 认证
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/api/auth/login` | 手机号登录/注册 | - |
| POST | `/api/auth/guest` | 游客模式 | - |
| GET | `/api/auth/me` | 当前用户信息 | ✓ |

### 视频/社交
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/videos` | 视频列表（?page=&limit=） |
| GET | `/api/videos/:id` | 单个视频 |
| POST | `/api/videos/:id/like` | 点赞视频 |
| GET | `/api/videos/topics` | 话题列表 |
| GET | `/api/videos/rankings` | 排行榜 |

### 曲库
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/playlists?type=` | 歌单列表 |
| GET | `/api/playlists/:id` | 歌单详情（含歌曲） |
| GET | `/api/songs` | 全部歌曲 |
| GET | `/api/songs/:id` | 单首歌曲 |
| GET | `/api/templates` | 创作模板 |
| GET | `/api/ai-tools` | AI工具列表 |

### 导师/引导
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/mentors` | 导师列表 |
| GET | `/api/mentors/:id` | 导师详情（含教学包） |
| GET | `/api/packs` | 全部教学包 |
| GET | `/api/onboarding` | 引导状态 |
| POST | `/api/onboarding` | 完成引导 |

### 音频流
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stream/:filename` | 音频流（支持 Range 请求） |
| GET | `/api/local-songs` | 本地音频文件列表 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/profile` | 用户资料 |
| GET | `/api/drafts` | 草稿列表 |
| GET | `/api/devices` | 设备列表 |
| GET | `/api/health` | 健康检查 |

---

## 🎨 UI 设计要点

### 主题
- **Midnight（默认）**: 底色 `#1A1930` 深紫黑，主色 `#8D8AD1` 薰衣草紫
- **Dark**: 底色 `#000` 纯黑，主色 `#1EABBE` 青蓝
- CSS 变量挂在 `:root`，切换主题时通过 JS 批量 `setProperty`
- 全局星光粒子背景（`body::before` 15 颗半透明星点 + 渐变光晕 + 20s 漂移动画）

### Tab 导航
- 底部固定，4 个 Tab：社交、创作、曲库、我的
- 选中态：父容器 `.tab-item` 加紫色半透明背景 + `scale(1.06)` 果冻弹性动画
- `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹簧曲线

### 社交视频页
- **概览模式**: 大视频卡片（可点击）+ 下方圆形头像横滚更多视频
- **全屏 Feed**: 点击进入，`scroll-snap: y mandatory` 上下滑动切换，侧边进度点

### 播放器
- 实际音乐播放通过隐式 `<audio>` 元素驱动
- 进度来自 `timeupdate` 事件，支持 Seek 拖拽
- 迷你播放器底部常驻（封面缩略图 + 进度条 + 上/下首/暂停/随机/循环）
- 全屏播放器显示大封面（本地 `/media/covers/` 服务）

### 响应式
- 手机优先设计，最大宽度 `430px`，桌面端居中显示
- `clamp()` 函数实现流畅缩放
- 安全区域适配（`safe-area-inset`）

---

## 🔑 关键设计决策

### 认证流程
1. 首次访问无 token → 跳转 `/welcome`
2. 登录/游客 → 后端发 JWT（30天过期） → 存 `localStorage`
3. 前端 `api.js` 自动检测需认证的请求 → 无 token 时自动调 `POST /api/auth/guest`
4. 并发游客登录去重（共享 `guestPromise`）

### 音频播放
- `AppLayout.jsx` 中的 `<audio ref={audioRef}>` 是唯一音频元素
- `handlePlaySong(song)` 在点击事件同步链中调用 `audio.play()` 满足浏览器自动播放策略
- 队列管理：`playQueue` + `queueIndex`，支持随机和单曲循环
- `handlePrev`: 进度 > 5s → 重播当前曲；≤ 5s → 切上一首

### 封面图片
- 全部歌曲封面存储在本地的 `server/media/covers/`
- 首次启动或数据库重建时由 Python 脚本自动生成渐变色封面
- 通过 `/media/covers/` 静态服务，零延迟

### 歌曲数据
- 9 首真实 ccMixter CC 授权歌曲（Funky Lagos, Nadeya 等 Afrobeat/House/Fusion 风格）
- 本地 MP3 文件在 `server/media/audio/`，通过 `/api/stream/` 流式传输
- 无模拟数据——所有歌曲都有真实音频

---

## 🛠️ 对 AI Coding 有用的提示

### 如果要添加新页面
1. 在 `src/pages/` 创建 `NewPage.jsx` + `NewPage.css`
2. 在 `src/App.jsx` 用 `lazy()` 导入，添加 `<Route>`
3. 如需全屏（无 Tab 栏），路由放在 `<AppLayout>` 外面
4. 如需共享状态，通过 `useOutletContext()` 获取

### 如果要添加新 API
1. 在 `server/routes/` 创建新路由文件
2. 在 `server/index.js` 用 `app.use('/api', require(...))` 挂载
3. 如需新表，在 `server/db.js` 的 `initTables()` 添加 `CREATE TABLE IF NOT EXISTS`
4. 在 `src/api.js` 添加对应的 fetch 封装

### 如果要添加新的数据库表
1. 在 `db.js` 的 `initTables()` 中加 `CREATE TABLE IF NOT EXISTS`
2. 如需种子数据，在 `seedIfEmpty()` 中添加 INSERT 逻辑
3. 删除 `server/afrogo.db` 重启服务器即可重建

### 主题颜色
- 修改 `src/i18n/ThemeContext.jsx` 中的 `themes` 对象
- 同步更新 `src/index.css` 中 `:root` 的默认值

### 翻译
- 在 `src/i18n/translations.js` 中 `zh` 和 `en` 对象添加 key
- 组件中 `const { t } = useT()` 然后 `t('your_key')` 使用

### 常见问题
- **端口占用**: `lsof -ti :3001 | xargs kill -9` 和 `lsof -ti :5174 | xargs kill -9`
- **数据库重置**: 删除 `server/afrogo.db`，重启 `npm run server`
- **无声音**: 确认点击的是 `Local Afro Grooves` 歌单中的歌曲（有 `fileUrl` 的才有真实音频）
- **封面不显示**: 确认 `server/media/covers/` 目录存在且服务器在运行
