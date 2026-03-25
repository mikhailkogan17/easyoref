# RPi Deployment Guide

## Overview

EasyOref runs on Raspberry Pi as a native Node.js systemd service (similar to Homebridge).

## Prerequisites

- Raspberry Pi 3+ with Raspberry Pi OS (32/64-bit)
- Node.js 20+ installed
- SSH access (`ssh pi@raspberrypi.local`)

## Install

### Step 1: Install Node.js (if not already present)

```bash
ssh pi@raspberrypi.local
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # verify
```

### Step 2: Install Redis (for enrichment pipeline)

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping  # should return PONG
```

### Step 3: Install EasyOref from npm

```bash
sudo npm install -g easyoref@latest
npm list -g easyoref  # verify
```

### Step 4: Configure bot

```bash
easyoref init
```

Interactive wizard asks for:
- **Language** — `ru` (русский), `en` (English), `he` (עברית), `ar` (العربية)
- **Bot Token** — from @BotFather
- **Chat ID(s)** — from @userinfobot (negative numbers, comma-separated for multiple chats)
- **City ID(s)** — from [cities.json](https://github.com/eladnava/pikud-haoref-api/blob/master/cities.json)

Config saved to: `~/.easyoref/config.yaml`

### Step 5: Install systemd service

```bash
sudo HOME=$HOME easyoref install
systemctl status easyoref
```

Service starts automatically on RPi reboot.

### Step 6: Verify it's running

```bash
# Check service status
easyoref status

# View live logs
easyoref logs

# Health check
curl http://localhost:3100/health

# List connected channels
ps aux | grep easyoref
```

## Update

When new version is released:

```bash
ssh pi@raspberrypi.local
easyoref update
```

Or from local machine:
```bash
npm run rpi  # defined in package.json
```

This does:
1. `sudo npm install -g easyoref@latest`
2. `sudo systemctl restart easyoref`
3. Service back online in ~30s

## Service Management

All commands work via systemd or easyoref CLI:

```bash
# Status & logs
easyoref status          # systemctl status easyoref
easyoref logs            # journalctl -u easyoref -f

# Control
easyoref start           # start service
easyoref stop            # stop service
easyoref restart         # restart service
easyoref uninstall       # remove systemd unit
```

## Configuration

Edit config anytime:
```bash
nano ~/.easyoref/config.yaml
sudo systemctl restart easyoref
```

Full reference: see `config.yaml.example` in repo.

Key settings:
- `city_ids` — which zones to monitor
- `telegram.bot_token` — bot token
- `telegram.chat_id` — where to send alerts (supports multiple)
- `language` — UI language
- `ai.enabled` — LLM enrichment (true/false)
- `ai.openrouter_api_key` — for enrichment pipeline

## Troubleshooting

### Service won't start

```bash
# Check what failed
easyoref logs

# Common issues:
# - Port 3100 already in use: sudo pkill -9 node
# - Config missing: easyoref init
# - Dependencies missing: npm list -g easyoref
```

### Old version still running

```bash
sudo systemctl stop easyoref
sudo npm install -g easyoref@latest --force
sudo systemctl start easyoref
```

### Redis connection error

```bash
# Check Redis is running
redis-cli ping          # should return PONG
sudo systemctl restart redis-server

# Verify in config
grep redis_url ~/.easyoref/config.yaml
# Should be: redis://localhost:6379
```

### Monitor Telegram messages

```bash
# Watch bot sending alerts in real-time
easyoref logs | grep -i "telegram\|alert"
```

### Manual run (for debugging)

```bash
sudo systemctl stop easyoref
easyoref run  # runs in foreground, shows errors
# Ctrl+C to stop
sudo systemctl start easyoref
```

### Check disk space

```bash
df -h              # disk usage
du -sh ~/.easyoref # config/cache size
```

## Uninstall

To completely remove EasyOref:

```bash
sudo systemctl stop easyoref
sudo npm uninstall -g easyoref
rm -rf ~/.easyoref  # WARNING: deletes config & data
```
