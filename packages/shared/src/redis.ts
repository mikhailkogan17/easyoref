import { Redis } from "ioredis";
import { config } from "./config.js";

let redis: Redis | undefined;

/** Get a lazy-connected Redis instance */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.agent.redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      lazyConnect: true,
      keyPrefix: config.redisPrefix ? `${config.redisPrefix}:` : undefined,
    });
  }
  return redis;
}

/** Close the Redis connection (for clean shutdown) */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
}
