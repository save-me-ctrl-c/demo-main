#!/bin/bash
# AfroGo 端口清理脚本
PORTS=(3001 5174)

for p in "${PORTS[@]}"; do
  PID=$(lsof -ti :$p 2>/dev/null)
  if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "✅ 端口 $p 已释放 (PID: $PID)"
  else
    echo "⚪ 端口 $p 空闲"
  fi
done
