#!/bin/bash
# AfroGo 一键启动脚本
set -e

echo "🧹 清理端口..."
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :5174 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🔧 启动后端 (:3001)..."
node server/index.js &
sleep 2

echo "🎨 启动前端 (:5174)..."
npx vite --host 0.0.0.0 --port 5174 &
sleep 3

echo ""
echo "══════════════════════════════"
echo "  ✅ AfroGo 已启动"
echo "  本地:    http://localhost:5174"
echo "  局域网:  http://$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | head -1 | awk '{print $2}'):5174"
echo "  关闭:    按 Ctrl+C"
echo "══════════════════════════════"
wait
