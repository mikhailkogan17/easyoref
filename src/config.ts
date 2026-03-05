/**
 * EasyOref — Centralized Configuration
 *
 * Reads from environment variables (or Docker secrets).
 * See .env.example for all available options.
 */

import { existsSync, readFileSync } from "node:fs";
import { isValidLanguage, type Language } from "./i18n.js";

// ── Helpers ──────────────────────────────────────────────

function readSecret(envKey: string, secretPaths: string[]): string {
  for (const p of secretPaths) {
    if (existsSync(p)) return readFileSync(p, "utf-8").trim();
  }
  return process.env[envKey] ?? "";
}

function parseAreas(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Exported Config ──────────────────────────────────────

export const config = {
  /** Telegram bot token (from @BotFather) */
  botToken: readSecret("BOT_TOKEN", [
    "/run/secrets/bot_token",
    "secrets/bot_token",
  ]),

  /** Telegram chat ID (negative for groups) */
  chatId: process.env.CHAT_ID ?? "",

  /** Hebrew area names to monitor (comma-separated) */
  areas: parseAreas(process.env.AREAS ?? "תל אביב - דרום העיר ויפו,גוש דן"),

  /** Message language: ru | en | he */
  language: ((): Language => {
    const raw = (process.env.LANGUAGE ?? "ru").toLowerCase();
    return isValidLanguage(raw) ? raw : "ru";
  })(),

  /** Oref API polling interval (ms) */
  pollIntervalMs: Number(process.env.OREF_POLL_INTERVAL_MS ?? "2000"),

  /** Health endpoint port */
  healthPort: Number(process.env.HEALTH_PORT ?? "3100"),

  /** Oref API URL */
  orefApiUrl:
    process.env.OREF_API_URL ??
    "https://www.oref.org.il/WarningMessages/alert/alerts.json",

  /** Better Stack Logtail token (optional) */
  logtailToken: process.env.LOGTAIL_TOKEN ?? "",
} as const;
