# EasyOref

Israeli civil defense alerts → your family's Telegram chat.

[![CI](https://github.com/mikhailkogan17/EasyOref/actions/workflows/ci.yml/badge.svg)](https://github.com/mikhailkogan17/EasyOref/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-easyoref-CB3837?logo=npm)](https://www.npmjs.com/package/easyoref)
[![Docker](https://img.shields.io/badge/ghcr.io-easyoref-2496ED?logo=docker)](https://ghcr.io/mikhailkogan17/easyoref)

[Русский](docs/readme_ru.md) · [עברית](docs/readme_he.md)

> [!CAUTION]
> EasyOref **does not replace** official Home Front Command alerts.
> It **supplements** them — notifying your family abroad.
> Always follow IDF Home Front Command instructions!

---

## Why

During a rocket attack, your family abroad sees "MISSILES HIT NETANYA" on the news.

They don't know:
- Is it your neighborhood or 200 km away?
- Are you safe?
- Should they worry?

**Nothing solves this today.**
Alert apps with area filtering — for you in Israel.
Cell Broadcast alerts — for you in Israel.

---

## Features

- **4 languages** — Russian, English, Hebrew, Arabic
- **3 alert types** — early warning, siren, all-clear
- **Custom messages** — your own text and media per alert type

---

## Quick Start

**You need:** Node.js 22+, Docker, an always-on machine ([RPi](docs/rpi.md), server, or [local](docs/local.md)).

### Step 1: Telegram bot

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token
2. Add the bot to your family group chat
3. Forward any message from that chat to [@userinfobot](https://t.me/userinfobot) → copy the chat ID

### Step 2: Find your city ID

Open [cities.json](https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json), find your city, copy the `id` number.

Example: `"id": 722` = Tel Aviv — South & Jaffa.

### Step 3: Deploy

On an always-on machine (Mac / Linux / RPi):

```bash
npx easyoref
```

First run creates `config.yaml` — edit it:

```yaml
city_ids:
  - 722          # your city ID

language: ru     # ru / en / he / ar

telegram:
  bot_token: "paste-token-here"
  chat_id: "-1001234567890"
```

Run again:

```bash
npx easyoref
```

Or via Docker:

```bash
git clone https://github.com/mikhailkogan17/easyoref.git && cd easyoref
cp config.yaml.example config.yaml   # edit it
docker compose up -d
```

**Done.** The bot will message your chat whenever the Home Front Command issues an alert for your area.

---

## Configuration

All settings live in `config.yaml`.

### Required

| Key                  | What it is                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `city_ids`           | Cities to monitor ([find IDs here](https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json)) |
| `telegram.bot_token` | Token from @BotFather                                                                                               |
| `telegram.chat_id`   | Your group chat ID (negative number)                                                                                |

### Optional

| Key                               | Default | What it does                                             |
| --------------------------------- | ------- | -------------------------------------------------------- |
| `language`                        | `ru`    | Message language: `ru` `en` `he` `ar`                    |
| `alert_types`                     | all     | Which alerts to forward: `early` `siren` `incident_over` |
| `gif_mode`                        | `none`  | Attach GIF to messages: `funny_cats` `assertive` `none`  |
| `title_override.*`                | —       | Custom title per alert type                              |
| `description_override.*`          | —       | Custom description per alert type                        |
| `observability.betterstack_token` | —       | [Better Stack](docs/MONITORING.md) logging               |

---

## License

[MIT](LICENSE) — Mikhail Kogan, 2025–2026
