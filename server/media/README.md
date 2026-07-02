# 本地媒体文件目录

## 目录结构
```
media/
├── audio/       # 本地音频文件 (.mp3, .m4a, .ogg)
├── covers/      # 本地封面图片 (.jpg, .png)
└── lyrics/      # 本地歌词文件 (.lrc, .txt)
```

## 如何添加本地歌曲

1. 将音频文件放入 `audio/` 目录，命名规范：`{艺术家} - {歌名}.mp3`
   例如：`Wizkid - Essence.mp3`

2. 将封面图片放入 `covers/` 目录，命名与音频文件相同
   例如：`Wizkid - Essence.jpg`

3. 歌词文件放入 `lyrics/` 目录（可选）
   例如：`Wizkid - Essence.lrc`

4. 数据会自动通过 `/api/media/audio/{文件名}` 访问
```

## 当前已生成的测试文件
- `audio/demo-beat.mp3` — 非洲鼓节奏演示音频（测试用）
- `audio/demo-kizomba.mp3` — Kizomba风格演示音频（测试用）
