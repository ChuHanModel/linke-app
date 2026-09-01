#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -d "$ROOT_DIR/release/mac-arm64/林课桌面端.app" ]]; then
  APP_PATH="$ROOT_DIR/release/mac-arm64/林课桌面端.app"
elif [[ -d "$ROOT_DIR/release/mac/林课桌面端.app" ]]; then
  APP_PATH="$ROOT_DIR/release/mac/林课桌面端.app"
else
  echo "未找到已打包的林课桌面端.app" >&2
  exit 1
fi

osascript -e 'tell application "林课桌面端" to quit' >/dev/null 2>&1 || true

for _ in {1..20}; do
  if ! pgrep -x "林课桌面端" >/dev/null 2>&1 && ! pgrep -f "林课桌面端.app" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if pgrep -x "林课桌面端" >/dev/null 2>&1 || pgrep -f "林课桌面端.app" >/dev/null 2>&1; then
  pkill -x "林课桌面端" >/dev/null 2>&1 || true
  pkill -f "林课桌面端.app" >/dev/null 2>&1 || true
  sleep 0.5
fi

open "$APP_PATH"
