#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -d "$ROOT_DIR/release/mac-arm64/林课桌面端.app" ]]; then
  APP_PATH="$ROOT_DIR/release/mac-arm64/林课桌面端.app"
elif [[ -d "$ROOT_DIR/release/mac/林课桌面端.app" ]]; then
  APP_PATH="$ROOT_DIR/release/mac/林课桌面端.app"
else
  echo "Cannot find packaged app under $ROOT_DIR/release" >&2
  exit 1
fi

codesign --force --deep --sign - "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
echo "$APP_PATH"
