#!/bin/bash
# AfroGo 生产预览 — 避免 React Dev 双重挂载
set -e

echo "🧹 清理端口..."
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :4173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🔧 启动后端 (:3001)..."
node server/index.js &
sleep 2

echo "📦 构建前端..."
./node_modules/.bin/vite build

echo "🎨 启动预览 (:4173)..."
./node_modules/.bin/vite preview --host 0.0.0.0 --port 4173 &
sleep 2

echo ""
echo "══════════════════════════════"
echo "  ✅ AfroGo 生产预览已启动"
echo "  本地:    http://localhost:4173"
echo "  关闭:    按 Ctrl+C"
echo "══════════════════════════════"
wait
