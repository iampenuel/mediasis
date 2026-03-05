#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVICE_NAME="${IOS_SIMULATOR_DEVICE:-iPhone 17 Pro Max}"
METRO_PORT="${EXPO_METRO_PORT:-8081}"
METRO_HOST="127.0.0.1"
METRO_URL="http://${METRO_HOST}:${METRO_PORT}"
DEEP_LINK="exp+app://expo-development-client/?url=http%3A%2F%2F${METRO_HOST}%3A${METRO_PORT}"

# Force expo run:ios to use localhost URL when auto-opening the dev client.
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-${METRO_HOST}}"

cd "$PROJECT_DIR"

metro_running() {
  lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_metro() {
  local timeout_seconds=60
  local waited=0

  until metro_running; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$timeout_seconds" ]; then
      echo "Metro did not start on port ${METRO_PORT} within ${timeout_seconds}s." >&2
      return 1
    fi
  done
}

if metro_running; then
  echo "Metro already running on :${METRO_PORT}; reusing existing process."
else
  echo "Starting Metro on ${METRO_URL} ..."
  mkdir -p "$PROJECT_DIR/.expo"
  nohup npx expo start --dev-client --localhost --clear >"$PROJECT_DIR/.expo/metro-ios-preview.log" 2>&1 &
  echo "Metro PID $!"
  wait_for_metro
fi

echo "Booting simulator: ${DEVICE_NAME}"
xcrun simctl boot "${DEVICE_NAME}" >/dev/null 2>&1 || true

echo "Building and installing iOS dev client (no bundler) ..."
npx expo run:ios --device "${DEVICE_NAME}" --no-bundler

echo "Opening dev client at ${METRO_URL}"
xcrun simctl openurl booted "${DEEP_LINK}"
