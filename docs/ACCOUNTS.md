# AfroGo — 账户资源文档

## 测试账户

| 手机号 | 密码 | 用户名 | 地区 | 会员等级 |
|--------|------|--------|------|----------|
| `+233200000001` | `amina123` | Amina Diallo | Accra, Ghana | Gold |
| `+234800000002` | `chioma123` | Chioma Okafor | Lagos, Nigeria | Free |
| `+277200000007` | `seun123` | Oluwaseun Bello | Johannesburg, SA | Gold |

> 这些账户在首次启动时由 `server/db.js` 自动 seed 到 SQLite 数据库。

---

## 认证方式

| 方式 | 端点 | 说明 |
|------|------|------|
| 手机号登录 | `POST /api/auth/login` | 传 `{ phone, password }`，密码验证通过返回 JWT |
| 手机号注册 | `POST /api/auth/login` | 传 `{ phone, password, register: true }`，自动创建账户 |
| 游客登录 | `POST /api/auth/guest` | 无需参数，自动创建匿名账户并返回 JWT |
| 获取用户信息 | `GET /api/auth/me` | 需 Bearer Token，返回当前用户资料 |

### JWT Token

| 属性 | 值 |
|------|------|
| 算法 | HS256 |
| 有效期 | 1 小时 |
| Secret | `afrogo-dev-secret-key-2026`（开发环境） |

---

## 游客账户

- 手机号：无（`NULL`）
- 用户名：`Guest_` + 随机 6 位字符
- 会员等级：`free`
- 权限限制：
  - 歌曲试听仅 3 秒
  - AI 舞蹈导师功能锁定
  - 资源包不可下载
  - 个人页显示 "GUEST" 标识

---

## 歌曲资源（9 首）

| # | 歌曲 | 艺术家 | 流派 | 时长 | 文件名 |
|---|------|--------|------|------|--------|
| 1 | Funky Lagos | AfroGroove Collective | Afrobeat | 3:42 | `Funky_Lagos.mp3` |
| 2 | Nadeya | Sona Jobarteh | Afro-Fusion | 4:15 | `Nadeya.mp3` |
| 3 | Take Some Time | The Cooltrane Quartet | Jazz | 5:28 | `Take_Some_Time.mp3` |
| 4 | Dance In The Rain | JP Cooper | Afro-Pop | 3:10 | `Dance_In_The_Rain.mp3` |
| 5 | For You I'll Go There | The Smooth Jazz Allstars | Jazz | 4:02 | `For_You_I_ll_Go_There.mp3` |
| 6 | Bootlickers House Remix | The Bootlickers | House | 3:22 | `Bootlickers_House_Remix.mp3` |
| 7 | Gas and Gravity | The Crystal Method | Electronic | 4:48 | `Gas_and_Gravity.mp3` |
| 8 | Around the Corner | The Smooth Jazz Allstars | Jazz | 3:35 | `Around_The_Corner.mp3` |
| 9 | World Fusion Music | Global Beats Ensemble | World | 4:55 | `World_Fusion_Music.mp3` |

> 音频文件位于 `server/media/audio/`，通过 `/api/stream/{filename}` 流式播放。

---

## AI 数字人导师（6 位）

| 名字 | 专长 | 风格标签 |
|------|------|----------|
| Zara | Afrobeat 女王 | Shaku Shaku, Gwara Gwara |
| Amara | Amapiano 专家 | Log Drum, Piano Groove |
| Kofi | Highlife 大师 | Traditional, Fusion |
| Nia | Kizomba 女王 | Sensual, Partner |
| Tunde | 街舞 & 病毒传播 | Challenges, Freestyle |
| Sade | 非洲拉丁融合 | Salsa, Bachata |

---

## 离线资源包（6 个）

| 名称 | 课时 | 时长 | 大小 |
|------|------|------|------|
| Azonto Basics | 10 | 1h 20m | 48 MB |
| Afrobeat Mastery | 15 | 2h 45m | 85 MB |
| Amapiano Grooves | 12 | 2h 10m | 62 MB |
| House Essentials | 8 | 1h 30m | 55 MB |
| Kizomba Connection | 14 | 3h 0m | 70 MB |
| Viral Challenge Pack | 15 | 2h 30m | 95 MB |

---

## 项目启动

```bash
# 1. 启动后端（端口 3001）
cd server && node index.js

# 2. 启动前端（端口 5173）
npm run dev
```

首次启动时 SQLite 数据库自动创建并 seed 测试数据。
