# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EasyOref Dockerfile — Multi-stage build (amd64 + arm64)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root + bot package
COPY package.json package-lock.json* ./
COPY packages/bot/package.json ./packages/bot/
RUN npm ci --workspace=packages/bot --ignore-scripts

COPY packages/bot/tsconfig.json ./packages/bot/
COPY packages/bot/src/ ./packages/bot/src/

RUN npm run build --workspace=packages/bot

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Install production deps only
COPY package.json package-lock.json* ./
COPY packages/bot/package.json ./packages/bot/
RUN npm ci --workspace=packages/bot --omit=dev --ignore-scripts

# Copy compiled output
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist

# Copy config file (user must supply config.yaml at build or mount)
COPY config.yaml* ./

# Persistent data directory (mount volume here)
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3100/health || exit 1

# Non-root user
RUN addgroup -g 1001 -S easyoref && \
    adduser -S easyoref -u 1001 -G easyoref && \
    chown -R easyoref:easyoref /app/data
USER easyoref

EXPOSE 3100

CMD ["node", "packages/bot/dist/bot.js"]
