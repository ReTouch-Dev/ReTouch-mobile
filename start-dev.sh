#!/usr/bin/env bash
# Start both the Flask backend and Expo web dev server.
# Usage: ./start-dev.sh
# Logs:  /tmp/retouch-server.log  and  /tmp/retouch-expo.log

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- Flask backend ---
echo "[server] starting on http://localhost:5000 ..."
cd "$ROOT/server"
source .venv/bin/activate
nohup python app.py > /tmp/retouch-server.log 2>&1 &
SERVER_PID=$!
echo "[server] PID $SERVER_PID"

# Wait until Flask is accepting connections
for i in $(seq 1 20); do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "[server] ready ✓"
    break
  fi
  sleep 0.5
done

# --- Expo web ---
echo "[expo] starting on http://localhost:8081 ..."
cd "$ROOT"
nohup npx expo start --web --non-interactive > /tmp/retouch-expo.log 2>&1 &
EXPO_PID=$!
echo "[expo] PID $EXPO_PID"

# Wait for Metro to be ready
for i in $(seq 1 60); do
  if curl -sf http://localhost:8081 > /dev/null 2>&1; then
    echo "[expo] Metro ready ✓"
    break
  fi
  sleep 1
done

echo ""
echo "  Backend:  http://localhost:5000"
echo "  App (web): http://localhost:8081"
echo ""
echo "  Logs:"
echo "    tail -f /tmp/retouch-server.log"
echo "    tail -f /tmp/retouch-expo.log"
echo ""
echo "  To stop: kill $SERVER_PID $EXPO_PID"
