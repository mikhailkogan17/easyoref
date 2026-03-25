# AI Agent Instructions — EasyOref

## NPM Publishing: OIDC (Trusted Publishers)

### CRITICAL RULE — READ THIS FIRST

**NPM_TOKEN НЕ создаётся вручную. НЕ добавляется в GitHub repo secrets. НИКОГДА.**

EasyOref (как и CyberMem) использует **npm OIDC Trusted Publishers**.
Токен генерируется **динамически** GitHub Actions при каждом publish run.

### Как это работает

1. `permissions: id-token: write` в workflow → GitHub генерирует OIDC JWT
2. `actions/setup-node@v4` с `registry-url: "https://registry.npmjs.org"` → создаёт `.npmrc`
3. `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` — **НЕ нужна** в changesets action env. Она ПЕРЕЗАПИСЫВАЕТ OIDC JWT пустым значением (secret не существует → пустая строка → ENEEDAUTH)
4. `setup-node` с `registry-url` сам создаёт `.npmrc` и инжектит OIDC JWT через env
5. Trusted Publisher настроен на **npmjs.com** (Settings пакета → Publishing access → Trusted Publishers)

### Чеклист для нового пакета

1. На **npmjs.com** → пакет → Settings → Publishing access → Configure trusted publishers:
   - Repository owner: `mikhailkogan17`
   - Repository name: `EasyOref`
   - Workflow filename: `release.yml`
   - Environment: *(пусто)*
2. В workflow: `permissions: id-token: write` ✅
3. В workflow: `registry-url: "https://registry.npmjs.org"` в setup-node ✅
4. В workflow: `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` в env publish step ✅
5. В package.json: `"publishConfig": { "access": "public", "provenance": true }` ✅

### ЗАПРЕЩЕНО

- ❌ Добавлять `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` в env шага publish — это ПЕРЕЗАТИРАЕТ OIDC JWT пустой строкой
- ❌ Предлагать "создай NPM_TOKEN на npmjs.com → скопируй → добавь в GitHub secrets"
- ❌ Предлагать "npmjs.com → Access Tokens → Automation"
- ❌ Путать OIDC (динамический JWT) с классическим automation token (статический)

### Ссылки

- [npm Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- CyberMem reference: `.github/OIDC_PUBLISHING.md`

---

## LangGraph Agent Enrichment Pipeline

### Overview

EasyOref v1.6.0+ includes a **LangGraph.js agentic enrichment pipeline** that monitors Hebrew-language Telegram news channels via GramJS (MTProto), correlates messages with Red Alert events, and enriches bot notifications with context — attack type, ETA, source citations.

### Architecture

```
Red Alert API ──► grammY bot ──► sends initial alert ──► captures {messageId, isCaption}
                                      │
GramJS MTProto ──► monitors 5 news channels ──► BullMQ delayed job (90s)
                                                       │
                                                       ▼
                                              LangGraph pipeline (5 tiers)
                                                       │
                                                       ▼
                                              bot.editMessageText() with enrichment
```

### Files (Monorepo Structure)

```
packages/
├── shared/        # Config, schemas, Redis helpers — shared across all packages
├── monitoring/    # Logger wrapper (pino + Better Stack)
├── gramjs/        # GramJS MTProto client: monitors channels, stores messages in Redis
├── agent/         # LangGraph enrichment pipeline
│   └── src/
│       ├── graph.ts         # LangGraph StateGraph: 5-tier pipeline
│       ├── extract.ts       # LLM extraction with cheap/expensive filter
│       ├── queue.ts         # BullMQ queue: `enrich-alert` jobs
│       ├── worker.ts        # BullMQ worker: runs graph → edits message
│       ├── tools.ts         # MCP tools for clarification
│       ├── redis.ts         # ioredis singleton
│       └── nodes/           # Graph nodes: clarify, filters, message, vote
├── bot/           # Main grammY bot
└── cli/           # CLI commands (init, auth, install, logs)
```

**Build:** `npm run build` → `tsc -b` (uses root tsconfig.json project references)

**Tests:** `npm test` (vitest runs all `packages/*/__tests__/*.test.ts` and `packages/*/src/**/*.test.ts`)

### Model

- **google/gemini-3-flash-preview** via OpenRouter (no RPD limits)
- Configured in `config.yaml` under `ai.openrouter_model`
- Base URL `https://openrouter.ai/api/v1` hardcoded in `graph.ts` — NOT configurable

### Running Tests

```bash
# Unit tests only (no LLM calls)
npm test

# All tests including LLM integration tests
OPENROUTER_API_KEY="sk-or-v1-..." npm test
```

LLM integration tests are **skipped** without `OPENROUTER_API_KEY` env variable. Set it in your shell or `.env` file. Key is also in `config.yaml` under `ai.openrouter_api_key` but tests require the env var.

### Config Keys (config.yaml)

```yaml
ai:
  enabled: true
  openrouter_api_key: "sk-or-v1-..."
  openrouter_model: "google/gemini-3-flash-preview"
  enrich_delay_ms: 20000
  confidence_threshold: 0.65
  mtproto:
    api_id: 2040
    api_hash: "b18441a1ff607e10a989891a5462e627"
    session_string: "1AgAOMTQ5..."
  redis_url: "redis://redis:6379"   # Docker network hostname, NOT localhost
```

### Enrichment Format

Unicode superscript citations (¹²³), absolute ETA (~HH:MM¹), inline key:value pairs, clickable source footer. No "Разведка" block — enrichment is appended inline to original alert text.

### Docker

- Redis: `redis:7-alpine` with `--appendonly yes --maxmemory 64mb`
- `redis_url` must be `redis://redis:6379` inside Docker network (NOT `redis://localhost:6379`)
- `depends_on: redis: condition: service_healthy`

### GramJS Auth

- Uses Telegram Desktop public `api_id: 2040` / `api_hash` (hardcoded, not secret)
- QR-code login flow via `auth.ts` → produces `session_string`
- `.gitleaks.toml` has allowlist entry for the public apiHash fingerprint (false positive)

### Deployment

- **RPi production**: Docker compose (recommended)
  ```bash
  # Install (first time)
  ssh pi@raspberrypi.local
  npm i -g @easyoref/cli
  easyoref init
  
  # Update
  easyoref update
  ```
- Config: `~/.easyoref/config.yaml` (created by `easyoref init`)
- Docker compose: local build on RPi (not GHCR)
- Logs: `docker logs easyoref`

### ЗАПРЕЩЕНО (Lethal Laws)

- ❌ **Клонировать git-репозиторий на RPi** — на RPi нет и не должно быть git clone. Деплой ТОЛЬКО через `npm install -g easyoref`
- ❌ **Вызывать `docker compose` / `docker-compose` для деплоя на RPi** — production RPi работает через systemd, НЕ через Docker. Docker compose — только для локальной разработки
- ❌ **Предлагать `docker compose up/down/pull` как способ обновления** — обновление: `sudo npm update -g easyoref && easyoref restart`
- ❌ Предлагать ручной деплой на RPi (только через npm + systemd)
- ❌ Создавать api_id/api_hash на my.telegram.org — используются публичные Telegram Desktop
- ❌ Писать `redis://redis:6379` в systemd/native конфиге — только `redis://localhost:6379` (Docker hostname не существует вне Docker network)
- ❌ Удалять `.gitleaks.toml` allowlist — apiHash fingerprint нужен для прохождения CI

---

## Release & Deploy Pipeline

### Release Flow

```bash
# Patch release (1.21.0 → 1.21.1)
npm run release

# Minor release (1.21.0 → 1.22.0)
npm run release:minor

# Major release (1.21.0 → 2.0.0)
npm run release:major
```

This does: bump version → git push → npm publish (all packages)

### RPi Update

```bash
ssh pi@raspberrypi.local
easyoref update
```

This does: npm update → npm install -g @easyoref/cli → docker compose down → docker compose up --build -d

### Post-Implementation Checklist (MANDATORY)

After every fix, feature, or refactor — **always** execute the full pipeline:

1. **Version bump** — create changeset + apply it:
   ```bash
   npx changeset               # select patch / minor / major
   npx changeset version       # bumps package.json + CHANGELOG.md
   ```
2. **Commit** — all changed files (code + version bump + CHANGELOG):
   ```bash
   git add -A && git commit -m "feat/fix: description"
   ```
3. **Push + PR** — push branch, create PR, wait for CI (`ci` status check):
   ```bash
   git push -u origin <branch>
   gh pr create --title "..." --body "..."
   ```
4. **Merge** — squash merge after CI passes:
   ```bash
   gh pr merge <number> --squash --auto
   ```
5. **Trigger release** — manually run release.yml on main:
   ```bash
   gh workflow run release.yml --ref main
   gh run list --workflow=release.yml -L1   # monitor
   gh run view <run-id> --log               # check logs
   ```
6. **RPi update** — see detailed algorithm below

### RPi Update

**Host:** `raspberrypi.local` | **User:** `pi`

```bash
ssh pi@raspberrypi.local
easyoref update
```

**Troubleshooting:**

| Symptom | Fix |
|---|---|
| Container not starting | `docker logs easyoref` |
| Old version | `docker compose build --no-cache` |

### General Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| release.yml failed | Duplicate tag (manual `git tag` before CI) | Delete tag: `git push origin :refs/tags/vX.Y.Z`, re-run workflow |
| npm 403 | OIDC token issue | Check trusted publisher on npmjs.com |
| npm "already published" | CI already published on previous run | OK, skip |
| Docker image not found | Release failed at Docker step | Re-run release workflow on GitHub |

### CRITICAL RULES

- **NEVER** run `npm publish` locally — use `npm run release`
- RPi deploy is ALWAYS via `easyoref update`, NEVER via manual docker commands
- Docker compose builds locally on RPi (not from GHCR)
