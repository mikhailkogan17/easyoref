# Local Development

## Prerequisites

- Node.js 22+
- Ollama installed (`brew install ollama`)
- Telegram bot token (from [@BotFather](https://t.me/BotFather))

## Setup

```bash
cd ~/EasyOref

# Install dependencies
npm install

# Pull the LLM model
ollama pull gemma3:1b

# Create secrets directory
mkdir -p secrets
echo "YOUR_BOT_TOKEN" > secrets/bot_token
```

## Running

### Direct (recommended for dev)
```bash
export BOT_TOKEN=$(cat secrets/bot_token)
export CHAT_ID=your-chat-id
export OLLAMA_URL=http://localhost:11434
npx tsx watch src/bot.ts
```

### Docker Compose
```bash
# Copy env file
cp envs/local.env .env

# Start with Ollama
docker compose --profile ollama up -d

# Pull model
docker exec easyoref-ollama ollama pull gemma3:1b

# Check health
curl http://localhost:3100/health

# View logs
docker compose logs -f bot
```

## VS Code

Open the workspace file:
```bash
code easyoref.code-workspace
```

Use the built-in tasks:
- **Dev: Watch** — runs `tsx watch src/bot.ts`
- **Docker: Up** — starts the full stack
- **Ollama: Pull Model** — pulls gemma3:1b
