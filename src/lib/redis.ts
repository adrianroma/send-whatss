import { createClient } from "redis";

function makeClient(host: string, port: number, username: string) {
  return createClient({
    username,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: { host, port, connectTimeout: 5000 },
  });
}
type RedisClient = ReturnType<typeof makeClient>;

// One shared connection per server instance (survives hot reloads and warm serverless invocations).
const g = globalThis as unknown as { __redis?: Promise<RedisClient> };

export function getRedisConfig() {
  const host = process.env.REDIS_HOST || "";
  const password = process.env.REDIS_PASSWORD || "";
  return {
    configured: Boolean(host),
    host,
    port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME || "default",
    hasPassword: Boolean(password),
    maskedPassword: password ? `${password.slice(0, 2)}••••${password.slice(-2)}` : "No configurado",
  };
}

export function getRedis(): Promise<RedisClient> {
  const cfg = getRedisConfig();
  if (!cfg.configured) return Promise.reject(new Error("REDIS_HOST no está configurado"));

  const connection = (g.__redis ??= (async () => {
    const client = makeClient(cfg.host, cfg.port, cfg.username);
    client.on("error", (err) => console.error("Redis client error", err));
    await client.connect();
    return client;
  })().catch((err) => {
    g.__redis = undefined; // allow a retry on the next call
    throw err;
  }));
  return connection;
}
