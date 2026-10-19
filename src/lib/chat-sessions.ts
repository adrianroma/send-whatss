import type { ChatTurn, StoredVars } from "@/lib/flow-engine";

type Session = { cursor: string | null; history: ChatTurn[]; vars: StoredVars };

// In-memory, per server instance: conversations restart if the server restarts.
const g = globalThis as unknown as { __chatSessions?: Map<string, Session>; __seenMsgs?: Set<string> };
const sessions = (g.__chatSessions ??= new Map());
const seen = (g.__seenMsgs ??= new Set());

export function getSession(key: string): Session {
  let s = sessions.get(key);
  if (!s) sessions.set(key, (s = { cursor: null, history: [], vars: {} }));
  return s;
}

/** True the first time a message id is seen (Meta retries webhooks). */
export function firstSeen(id: string) {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 1000) seen.delete(seen.values().next().value as string);
  return true;
}
