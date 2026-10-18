import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FLOW_FILE = path.join(process.cwd(), "configuration", "flow.json");

export type FlowData = { nodes: unknown[]; edges: unknown[] };

export async function readFlow(): Promise<FlowData | null> {
  try {
    return JSON.parse(await readFile(FLOW_FILE, "utf8"));
  } catch {
    return null;
  }
}

export async function writeFlow(flow: FlowData) {
  await mkdir(path.dirname(FLOW_FILE), { recursive: true });
  await writeFile(FLOW_FILE, JSON.stringify(flow, null, 2), "utf8");
}
