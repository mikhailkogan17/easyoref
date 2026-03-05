# EasyOref

> **Peace-of-mind bot for families during wartime.**
> Real-time Israeli Civil Defense alerts to Telegram, filtered by your location.

> ⚠️ **Disclaimer:** EasyOref supplements but does not replace official Home Front Command (Pikud HaOref) alerts. Always follow official instructions.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](Dockerfile)
[![npm](https://img.shields.io/badge/npm-easyoref-red?logo=npm)](https://www.npmjs.com/package/easyoref)

[English](#what-it-does) | [Русский](#что-делает)

---

## What it does

- Polls [Pikud HaOref API](https://www.oref.org.il/) every 2 seconds for active alerts
- Filters by **your region** (e.g. Tel Aviv South, Gush Dan, Jerusalem)
- Sends **calm, context-aware messages** to your family Telegram chat:
  - 🚀 **Early warning** (5–12 min): "Stay near a protected space"
  - 🚨 **Siren** (1.5 min): "Enter a protected space"
  - 😮‍💨 **Incident over**: "You may leave the protected space"
- Cooldown logic (no spam): 2 min for early warnings, 1.5 min for sirens
- Night mode (03:00–11:00 Israel time): different GIFs to reduce panic
- **4 languages**: Russian, English, Hebrew, Arabic
- **4 GIF modes**: `funny_cats`, `assertive`, `pikud_haoref`, `none`
- Persistent GIF rotation — no repeats, survives redeploys

## Why it exists

For **diaspora families** who see "Tel Aviv under attack" on CNN but don't know:
- Is it your area or 200 km away?
- Are you safe?
- Should they call/text (while you're in a shelter)?

**EasyOref solves information asymmetry**: your family gets automated updates **without you doing anything**.

### Why GIFs with cats?

Reduces panic. Seeing a cute cat = signal "everything is under control" (vs plain text "SIREN IN TEL AVIV").

---

## Quick Start (Docker — recommended)

**Requirements**: Docker + Telegram bot token

```bash
# 1. Create bot via @BotFather → get BOT_TOKEN
# 2. Add bot to your family group chat → get CHAT_ID
#    (forward a message from the group to @userinfobot)

# 3. Clone and configure
git clone https://github.com/mikhailkogan17/easyoref.git
cd easyoref
cp config.yaml.example config.yaml
# Edit config.yaml with your values

# 4. Run
docker compose up -d

# 5. Check health
curl localhost:3100/health
```

**Done!** Bot is now monitoring Oref API and will message your chat on alerts.

### `config.yaml` example

```yaml
city_ids:
  - 722   # תל אביב - דרום העיר ויפו
alert_types: [early, siren, incident_over]
language: ru
gif_mode: funny_cats
telegram:
  bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
  chat_id: "-1001234567890"
```

---

## Run without Docker

```bash
# Requirements: Node.js 22+
npm install
npm run build
npm start
```

Or install globally from npm:

```bash
npm install -g easyoref
easyoref  # reads config.yaml from current directory
```

Or for development with hot-reload:

```bash
npm run dev
```

---

## Configuration

All settings live in `config.yaml` (see [config.yaml.example](config.yaml.example)).

Config file search order: `EASYOREF_CONFIG` env → `./config.yaml` → `/app/config.yaml` → `/etc/easyoref/config.yaml`.

### Required

| Key                  | Description                            | Example             |
| -------------------- | -------------------------------------- | ------------------- |
| `telegram.bot_token` | Telegram bot token from @BotFather     | `123456:ABC-DEF...` |
| `telegram.chat_id`   | Telegram chat ID (negative for groups) | `-1001234567890`    |
| `city_ids`           | Numeric city IDs from cities.json      | `[722]`             |

### Optional

| Key                               | Default   | Description                                                       |
| --------------------------------- | --------- | ----------------------------------------------------------------- |
| `alert_types`                     | all three | Which alerts to send: `early` / `siren` / `incident_over`         |
| `language`                        | `ru`      | Message language: `ru` / `en` / `he` / `ar`                       |
| `gif_mode`                        | `none`    | GIF style: `funny_cats` / `assertive` / `none`                    |
| `title_override.<type>`           | —         | Custom title per alert type                                       |
| `description_override.<type>`     | —         | Custom description per alert type                                 |
| `observability.betterstack_token` | —         | Better Stack token — see [docs/MONITORING.md](docs/MONITORING.md) |
| `health_port`                     | `3100`    | Health endpoint port                                              |
| `poll_interval_ms`                | `2000`    | API poll interval (ms)                                            |
| `data_dir`                        | `./data`  | Directory for persistent GIF rotation state                       |

### Finding your city ID

City IDs are numeric identifiers from [cities.json](https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json). Search for your city name and use the `id` field. Or run `npx @easyoref/cli list-areas`.

### Legacy: environment variables

For backward compatibility, `BOT_TOKEN`, `CHAT_ID`, `AREAS` (comma-separated Hebrew names), and other env vars are still supported as fallbacks when YAML keys are not set.

---

## Architecture

```
Oref API (2-sec poll)
  → Area filter (city IDs → Hebrew names via cities.json)
    → Alert type classifier (early_warning / siren / resolved)
      → Alert type filter (config.alert_types)
        → Cooldown logic (2 min / 1.5 min / 5 min)
          → i18n (ru/en/he/ar, auto-translated area names)
            → Telegram (grammY + GIF rotation, persistent state)
```

**No LLM needed** — purely deterministic matching for <1s latency.

**Production-grade:**
- Docker secrets support (`/run/secrets/bot_token`)
- Named volume for persistent GIF state (`easyoref-data`)
- Health endpoint (`/health`)
- Graceful shutdown (SIGTERM)
- Structured logging (Logtail-compatible)
- Telegram fallback (GIF → text if upload fails)
- Night mode (different GIF pool 03:00–11:00)

### Project structure

```
packages/
  bot/          — the Telegram bot (published to npm as `easyoref`)
    src/
      bot.ts      — main polling loop, Telegram integration, GIF pools
      config.ts   — centralized configuration (YAML + env fallback)
      i18n.ts     — message templates (ru/en/he/ar) + area translation
      gif-state.ts — persistent GIF rotation (JSON file)
      logger.ts   — dual console + Logtail logger
  cli/          — interactive setup wizard (`npx @easyoref/cli init`)
```

---

## FAQ

**Q: Why not use RedAlert app?**
A: RedAlert is for *you* (in Israel). EasyOref is for *your family abroad* who don't read Hebrew and panic from news.

**Q: Why Russian by default?**
A: Built for diaspora parents in Russia/Ukraine/etc. Set `LANGUAGE=en` or `LANGUAGE=he` to change.

**Q: Can I monitor multiple areas?**
A: Yes — add multiple city IDs: `city_ids: [722, 723, 1]`

**Q: Can I use it for other countries?**
A: Not out of the box (hardcoded to Oref API), but the architecture is reusable — fork and adapt the polling logic.

**Q: Will GIF rotation reset on redeploy?**
A: No — state is persisted in `DATA_DIR` (mapped to a Docker named volume). Safe across updates.

---

## Contributing

PRs welcome! Ideas:

- [ ] More complete areas list
- [ ] `/test` command for manual trigger
- [ ] Prometheus metrics (`/metrics`)
- [ ] Web dashboard (recent alerts history)
- [ ] `pikud_haoref` GIF mode (official Oref visuals)

---

## Русский

### Что делает

- Каждые 2 секунды проверяет [API Пикуд ха-Ореф](https://www.oref.org.il/)
- Фильтрует по вашему региону (например, Тель-Авив юг, Гуш Дан)
- Отправляет **спокойные сообщения** в семейный чат Telegram:
  - 🚀 **Раннее предупреждение** (5–12 мин): "Находитесь рядом с защищённым помещением"
  - 🚨 **Сирена** (1.5 мин): "Войдите в защищённое помещение"
  - 😮‍💨 **Инцидент завершён**: "Можно покинуть защищённое помещение"
- Cooldown (без спама): 2 мин для предупреждений, 1.5 мин для сирен
- Ночной режим (03:00–11:00): другие GIF'ки
- **4 языка**: русский, английский, иврит, арабский
- Persistent GIF-ротация — не повторяется, переживает редеплой

### Зачем это нужно

Для **семей за границей**, которые видят "Ракеты по Тель-Авиву" в новостях, но не знают:
- Это ваш район или за 200 км?
- Вы в безопасности?
- Звонить/писать (пока вы в укрытии)?

**EasyOref решает проблему**: семья получает обновления **автоматически**, вы ничего не делаете.

### Быстрый старт

```bash
# 1. Создайте бота через @BotFather → получите BOT_TOKEN
# 2. Добавьте бота в семейный чат → получите CHAT_ID
#    (перешлите сообщение из группы в @userinfobot)

# 3. Клонируйте и настройте
git clone https://github.com/mikhailkogan17/easyoref.git
cd easyoref
cp config.yaml.example config.yaml
# Отредактируйте config.yaml — укажите свои значения

# 4. Запустите
docker compose up -d

# 5. Проверьте
curl localhost:3100/health
```

### Настройка `config.yaml`

```yaml
city_ids:
  - 722   # תל אביב - דרום העיר ויפו
alert_types: [early, siren, incident_over]
language: ru
gif_mode: funny_cats
telegram:
  bot_token: "ваш_токен_от_botfather"
  chat_id: "-1001234567890"
```

Полный список районов с переводами: [areas.json](areas.json)

# 5. Проверьте
curl localhost:3100/health
```

### Настройка `config.yaml`

```yaml
city_ids:
  - 722   # תל אביב - דרום העיר ויפו
language: ru
telegram:
  bot_token: "ваш_токен_от_botfather"
  chat_id: "-1001234567890"
```

Полный список районов с переводами: [areas.json](areas.json)

---

## License

[MIT](LICENSE) — Mikhail Kogan, 2025–2026
