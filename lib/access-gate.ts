import { Redis } from "@upstash/redis";

// Registration-code gate + per-IP rate limit, backed by Upstash Redis (REST, works on
// Vercel serverless). Cost control: each code gets N uses; spam is rate-limited per IP.
//
// Graceful degradation: if ACCESS_CODES is empty OR Upstash env vars are missing, gating
// is DISABLED (open) — use that for local dev / before you wire up KV. You opt into the
// gate by setting ACCESS_CODES + UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.

const CODE_LIMIT = Number(process.env.ACCESS_CODE_LIMIT ?? "5");
const RATE_PER_MIN = Number(process.env.ACCESS_RATE_PER_MIN ?? "20");

function validCodes(): Set<string> {
  return new Set(
    (process.env.ACCESS_CODES ?? "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean)
  );
}

function kv(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return Redis.fromEnv();
}

export function gatingEnabled(): boolean {
  return validCodes().size > 0 && kv() !== null;
}

export type AccessOk = { ok: true; gated: boolean; remaining: number | null };
export type AccessDenied = { ok: false; status: 403 | 429; error: string };
export type AccessResult = AccessOk | AccessDenied;

/** Read the caller IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() ?? "";
}

/**
 * Validate the code + apply the per-IP rate limit. Does NOT consume a use — call
 * consumeAccess() only after the protected work succeeds, so failures don't burn quota.
 */
export async function checkAccess({ code, ip }: { code: string; ip: string }): Promise<AccessResult> {
  const codes = validCodes();
  const redis = kv();

  // Gate not configured → open.
  if (codes.size === 0 || !redis) {
    return { ok: true, gated: false, remaining: null };
  }

  // 1) Per-IP rate limit (sliding 60s window via INCR + EXPIRE).
  const rlKey = `tf:rl:${ip || "unknown"}`;
  const hits = await redis.incr(rlKey);
  if (hits === 1) await redis.expire(rlKey, 60);
  if (hits > RATE_PER_MIN) {
    return { ok: false, status: 429, error: "请求过于频繁，请稍后再试。" };
  }

  // 2) Validate the code.
  const trimmed = code.trim();
  if (!trimmed || !codes.has(trimmed)) {
    return { ok: false, status: 403, error: "注册码无效。" };
  }

  // 3) Check remaining quota (read-only; consume happens after success).
  const used = Number((await redis.get<number>(`tf:uses:${trimmed}`)) ?? 0);
  if (used >= CODE_LIMIT) {
    return { ok: false, status: 403, error: `该注册码的 ${CODE_LIMIT} 次额度已用完。` };
  }

  return { ok: true, gated: true, remaining: CODE_LIMIT - used };
}

/** Consume one use for the code. Call after the protected work succeeds. */
export async function consumeAccess(code: string): Promise<number | null> {
  const redis = kv();
  if (validCodes().size === 0 || !redis) return null;
  const used = await redis.incr(`tf:uses:${code.trim()}`);
  return Math.max(0, CODE_LIMIT - used);
}
