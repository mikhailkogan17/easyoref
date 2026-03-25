<p align="center">
  <img src="docs/assets/hero.png" alt="EasyOref" width="100%">
</p>

Israeli Home Front Command alerts — delivered to your loved ones' Telegram chat.

[![CI](https://github.com/mikhailkogan17/EasyOref/actions/workflows/ci.yml/badge.svg)](https://github.com/mikhailkogan17/EasyOref/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-easyoref-CB3837?logo=npm)](https://www.npmjs.com/package/easyoref)
[![LangGraph](https://img.shields.io/badge/LangGraph-agentic-blue?logo=langgraph)](https://langchain-ai.github.io/langgraphjs/)
[![LangChain](https://img.shields.io/badge/LangChain-tools-green?logo=langchain)](https://js.langchain.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

[עברית](docs/readme_he.md) · [Русский](docs/readme_ru.md)

> [!CAUTION]
> EasyOref **does not replace** official Home Front Command alerts.
> It **supplements** them — keeping your loved ones abroad informed.
> Always follow Home Front Command instructions!

## Why

During a rocket attack, your loved ones abroad see "MISSILES HIT TEL AVIV" on news.

They don't know:
- Is it your neighborhood or 200 km away?
- Are you safe?
- Should they worry?

**Nothing solves this for them today.**
Alert apps with area filtering — for you in Israel.
Cell Broadcast alerts — for you in Israel.

## Features

- **4 languages** — Russian, English, Hebrew, Arabic
- **3 alert types** — early warning, red_alert, all-clear
- **Custom messages** — your own text and media per alert type

## Install

### 1. Install Node.js

<details>
<summary>Windows</summary>

Download the installer from [nodejs.org](https://nodejs.org/) (LTS, 22+). Run it, click "Next".

</details>

<details>
<summary>macOS</summary>

```bash
brew install node
```

Or download from [nodejs.org](https://nodejs.org/).

</details>

<details>
<summary>Linux / Raspberry Pi</summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

</details>

### 2. Set up Telegram

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **token**
2. Add the bot to your Telegram chat or channel
3. Forward any message from that chat to [@userinfobot](https://t.me/userinfobot) → copy the **chat ID**

### 3. Find your city ID

Open [cities.json](https://github.com/eladnava/pikud-haoref-api/blob/master/cities.json), find your city, copy the `id` number.

Example: `"id": 722` = Tel Aviv — South & Jaffa.

### 4. Run setup

```bash
npx easyoref init
```

The wizard asks for language, token, chat ID, and city ID. Config is saved to `~/.easyoref/config.yaml`.

### 5. Start the bot

```bash
npx easyoref
```

**Done.** The bot will message your chat whenever the Home Front Command issues an alert for your area.

> The bot needs to run 24/7 — on a Raspberry Pi, server, or always-on computer.
> Guides: [RPi](docs/rpi.md) · [Local](docs/local.md)

## How it works

EasyOref runs two layers:

**Core layer** — always on, <1s latency
- Polls Pikud HaOref API every 2 seconds
- Filters alerts by city ID (Iron Dome zone-aware)
- Delivers to Telegram instantly

**Agentic enrichment layer** — LangGraph pipeline per alert

```
collectAndFilter → extract → vote → [clarify → revote] → editMessage
```

1. **collectAndFilter** — fetches channel posts, deterministic noise filter, channel tracking
2. **extract** — two-stage LLM: cheap channel relevance pre-filter → expensive structured extraction (rocket count, intercepts, impact zone, country origin)
3. **vote** — consensus across multiple extractions, confidence scoring
4. **clarify** *(conditional)* — triggered on low confidence or suspicious single-source claims; LLM invokes tools to resolve:
   - `read_telegram_sources` — live MTProto fetch from IDF/news channels
   - `alert_history` — verifies claims against Pikud HaOref history API
   - `resolve_area` — Iron Dome zone proximity check
   - `betterstack_log` — queries enrichment pipeline logs
5. **revote** — re-runs consensus with clarified data
6. **editMessage** — in-place Telegram edit with citations

LangGraph `MemorySaver` checkpoints state per `alertId`. Graceful degradation: `ai.enabled: false` → deterministic delivery only, zero LLM dependency.

## Configuration

Config file: `~/.easyoref/config.yaml`. Created by `npx easyoref init`.

Full reference: [`config.yaml.example`](config.yaml.example).

| Key                      | Default | Description                                                                                         |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------- |
| `city_ids`               | —       | **required.** [Find city IDs](https://github.com/eladnava/pikud-haoref-api/blob/master/cities.json) |
| `telegram.bot_token`     | —       | **required.** Token from @BotFather                                                                 |
| `telegram.chat_id`       | —       | **required.** Chat ID (negative number)                                                             |
| `language`               | `ru`    | `ru` `en` `he` `ar`                                                                                 |
| `alert_types`            | all     | `early` `red_alert` `resolved`                                                                          |
| `gif_mode`               | `none`  | `funny_cats` `none`                                                                                 |
| `title_override.*`       | —       | Custom title per alert type                                                                         |
| `description_override.*` | —       | Custom description per alert type                                                                   |

## Development

```bash
# Test
npm test              # Run all tests
npm run test:watch   # Watch mode

# Build
npm run build        # Build all packages

# Version bump (auto-commits)
npm run bump:patch   # 1.21.0 → 1.21.1
npm run bump:minor   # 1.21.0 → 1.22.0
npm run bump:major   # 1.21.0 → 2.0.0

# Publish
npm run publish      # Publish bot only
npm run publish:all  # Publish all packages

# Release flow (bump + push + publish)
npm run release       # patch + push + publish
npm run release:minor # minor + push + publish
npm run release:major # major + push + publish
```

## License

[MIT](LICENSE) — Mikhail Kogan, 2026
