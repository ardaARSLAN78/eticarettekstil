import { Redis } from "ioredis";
import { config } from "../config/index.js";
import { fail } from "../../lib/errors.js";

export const redis =
  config.NODE_ENV !== "test" && config.REDIS_URL
    ? new Redis(config.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : null;

const local = new Map<string, { count: number; expires: number }>();

export async function enforceLimit(key: string, maximum: number, seconds: number) {
  let count: number;
  if (redis) {
    // INCR ve süre ataması tek Redis işlemiyle yapılır; birden çok API kopyasında tutarlı kalır.
    count = Number(
      await redis.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        `quantia:${key}`,
        seconds,
      ),
    );
  } else {
    const now = Date.now();
    if (local.size > 5000)
      for (const [name, item] of local) if (item.expires < now) local.delete(name);
    const item = local.get(key);
    const next =
      !item || item.expires < now
        ? { count: 1, expires: now + seconds * 1000 }
        : { ...item, count: item.count + 1 };
    local.set(key, next);
    count = next.count;
  }
  if (count > maximum)
    fail("Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.", "RATE_LIMITED");
}

export function clearLocalLimits() {
  local.clear();
}
