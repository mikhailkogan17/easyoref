#!/bin/bash
# scripts/deploy.sh — deploy EasyOref to RPi
# Usage: ./scripts/deploy.sh [host]
set -euo pipefail

HOST="${1:-pi@raspberrypi.local}"
IMAGE="easyoref:latest"
REMOTE_DIR="/home/pi/easyoref"
ENV_FILE="envs/rpi.env"

echo "=== EasyOref Deploy to $HOST ==="

# 1. Build image (arm64 native on Apple Silicon)
echo "[1/5] Building Docker image..."
docker build --platform linux/arm64 -t "$IMAGE" .

# 2. Save image to tarball
echo "[2/5] Saving image..."
docker save "$IMAGE" | gzip > /tmp/easyoref.tar.gz
echo "       Image size: $(du -h /tmp/easyoref.tar.gz | cut -f1)"

# 3. Transfer to RPi
echo "[3/5] Transferring to RPi..."
scp /tmp/easyoref.tar.gz "$HOST":/tmp/easyoref.tar.gz

# 4. Setup remote directory + env + compose
echo "[4/5] Setting up remote..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"
scp docker-compose.yml "$HOST:$REMOTE_DIR/docker-compose.yml"
scp "$ENV_FILE" "$HOST:$REMOTE_DIR/.env"

# 5. Load image and start container (plain docker run, no compose needed)
echo "[5/5] Loading image & starting..."
ssh "$HOST" bash -s "$REMOTE_DIR" << 'REMOTE'
  set -euo pipefail
  DIR="$1"
  echo "  Loading image..."
  docker load < /tmp/easyoref.tar.gz
  rm -f /tmp/easyoref.tar.gz
  echo "  Stopping old container..."
  docker stop easyoref-bot 2>/dev/null || true
  docker rm easyoref-bot 2>/dev/null || true
  echo "  Starting..."
  docker run -d \
    --name easyoref-bot \
    --restart unless-stopped \
    --env-file "$DIR/.env" \
    -p 3100:3100 \
    easyoref:latest
  sleep 3
  echo "  Health check..."
  curl -sf http://localhost:3100/health && echo ""
  echo "  Container status:"
  docker ps --filter name=easyoref-bot --format "table {{.Status}}\t{{.Ports}}"
REMOTE

echo ""
echo "=== Deploy complete ==="
echo "Health: ssh $HOST 'curl -s http://localhost:3100/health'"
echo "Logs:   ssh $HOST 'docker logs -f easyoref-bot'"
echo "Stop:   ssh $HOST 'docker stop easyoref-bot'"
