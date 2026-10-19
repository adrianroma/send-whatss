import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRedis, getRedisConfig } from "@/lib/redis";

// Storage: Redis when REDIS_HOST is set, otherwise the local file public/flow.json.
// Serverless hosts such as Vercel have a read-only disk, so they need Redis.
const FLOW_FILE = path.join(process.cwd(), "public", "flow.json");
const FLOW_KEY = "chatbot-flow";

export type FlowData = { nodes: unknown[]; edges: unknown[] };

async function readLocal(): Promise<FlowData | null> {
  try {
    return JSON.parse(await readFile(FLOW_FILE, "utf8"));
  } catch {
    return null;
  }
}

export async function readFlow(): Promise<FlowData | null> {
  if (getRedisConfig().configured) {
    try {
      const raw = await (await getRedis()).get(FLOW_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.error("flow read error (redis)", err);
    }
  }
  // Nothing stored yet (or Redis unavailable): fall back to the bundled/local file.
  return readLocal();
}

export async function writeFlow(flow: FlowData) {
  if (getRedisConfig().configured) {
    await (await getRedis()).set(FLOW_KEY, JSON.stringify(flow));
    return;
  }
  try {
    await mkdir(path.dirname(FLOW_FILE), { recursive: true });
    await writeFile(FLOW_FILE, JSON.stringify(flow, null, 2), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EROFS") {
      throw new Error(
        "el disco es de solo lectura; configura REDIS_HOST, REDIS_PORT, REDIS_USERNAME y REDIS_PASSWORD"
      );
    }
    throw err;
  }
}
