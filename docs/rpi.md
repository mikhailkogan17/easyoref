# RPi Deployment

## Overview

EasyOref deploys to the same Raspberry Pi as cybermem using the same infrastructure patterns:
- Ansible playbook for idempotent deployment
- Docker Compose with ARM64 images from GHCR
- Ollama shared with or separate from cybermem

## Prerequisites

- RPi with Docker (64-bit) — see cybermem's GEMINI.md for RPi setup
- Ansible installed on your Mac (`brew install ansible`)
- SSH access to RPi (`ssh pi@raspberrypi.local`)

## Manual Deploy

```bash
cd ~/EasyOref

# Deploy to RPi
ansible-playbook -i inventory/hosts.ini playbooks/deploy-easyoref.yml

# With explicit model pull
ansible-playbook -i inventory/hosts.ini playbooks/deploy-easyoref.yml \
  --extra-vars "pull_model=true"
```

## What the playbook does

1. Ensures Docker is running on RPi
2. Creates `/home/pi/easyoref/` directory structure
3. Copies `docker-compose.yml` and `.env` to RPi
4. Pulls images from GHCR
5. Starts services (bot + Ollama)
6. Pulls the Ollama model (`gemma3:1b`)
7. Waits for health check (`/health` on port 3100)
8. On failure: dumps logs and attempts restart

## CI/CD (GitHub Actions)

On push to `main`:
1. Build ARM64 Docker image (cross-compile via QEMU)
2. Push to `ghcr.io/mikhailkogan17/easyoref:latest`
3. Join Tailscale via OAuth
4. Get RPi Tailscale IP
5. Run Ansible deploy

### Required GitHub Secrets

| Secret               | Description               |
| -------------------- | ------------------------- |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID |
| `TS_OAUTH_SECRET`    | Tailscale OAuth secret    |

## Ollama on RPi

### Option A: Share with cybermem (recommended)

If cybermem is already running with Ollama on the same RPi:

1. Edit `docker-compose.yml` — change network to external:
```yaml
networks:
  default:
    external: true
    name: cybermem-network
```

2. Set `OLLAMA_URL=http://cybermem-ollama-1:11434` in `.env`

### Option B: Own Ollama instance

Start with the Ollama profile (default):
```bash
docker compose --profile ollama up -d
docker exec easyoref-ollama ollama pull gemma3:1b
```

> **Note:** Running two Ollama instances on RPi will use significant RAM.
> Option A is recommended if cybermem already provides Ollama.

## Deploying alongside cybermem

Both services coexist on the same RPi:

| Service  | Directory            | Ports      | Network                      |
| -------- | -------------------- | ---------- | ---------------------------- |
| cybermem | `/home/pi/cybermem/` | 8625, 8626 | cybermem-network             |
| easyoref | `/home/pi/easyoref/` | 3100       | easyoref-network (or shared) |

## Troubleshooting

```bash
# SSH into RPi
ssh pi@raspberrypi.local

# Check running containers
docker ps

# View bot logs
docker logs easyoref-bot --tail 50

# View Ollama logs
docker logs easyoref-ollama --tail 50

# Restart
cd ~/easyoref && docker compose --profile ollama up -d

# Health check
curl http://localhost:3100/health
```
