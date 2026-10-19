import { readFile } from "node:fs/promises";
import path from "node:path";
import { AI_MODEL, getAiClient } from "@/lib/openai";
import { readFlow } from "@/lib/flow-store";

type ActionData = {
  text?: string;
  actionType?: "api" | "file";
  method?: "GET" | "POST";
  /** URL (api) or project path under public/ or configuration/ (file). */
  target?: string;
};
type FNode = { id: string; type: string; data?: ActionData };
type FEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

export type ChatTurn = { role: "user" | "bot"; text: string };
export type ChatResult = {
  replies: { kind: "botResponse" | "botRequest"; text: string }[];
  actions: { text: string; type: string; target: string; ok: boolean; preview: string }[];
  /** Node after which the flow waits for the next user message. */
  cursor: string | null;
};

const FALLBACK = "Lo siento, no encontré una respuesta para eso.";
const MAX_STEPS = 25;
const MAX_DATA = 6000;
const ALLOWED_DIRS = ["public", "configuration"];

async function runAction(node: FNode, message: string, history: ChatTurn[]) {
  const { actionType, method = "GET", target = "" } = node.data ?? {};
  const t = target.trim();
  if (!t) throw new Error("La acción no tiene destino configurado");

  if (actionType === "file") {
    const full = path.resolve(process.cwd(), t);
    const allowed = ALLOWED_DIRS.some((d) => full.startsWith(path.resolve(process.cwd(), d) + path.sep));
    if (!allowed) throw new Error(`Solo se permiten archivos en ${ALLOWED_DIRS.join(" o ")}/`);
    return (await readFile(full, "utf8")).slice(0, MAX_DATA);
  }

  if (!/^https?:\/\//i.test(t)) throw new Error("La URL debe comenzar con http:// o https://");
  const res = await fetch(t, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify({ message, history }) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.text()).slice(0, MAX_DATA);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  return body;
}

async function askJson<T>(system: string, user: string): Promise<T> {
  const res = await getAiClient().chat.completions.create({
    model: AI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${system}\nResponde únicamente con un objeto JSON.` },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}") as T;
}

function transcript(history: ChatTurn[]) {
  return history.map((t) => `${t.role === "user" ? "Usuario" : "Bot"}: ${t.text}`).join("\n") || "(sin historial)";
}

/** Returns the index of the best option, or -1 when none applies. */
async function pick(instruction: string, input: string, history: ChatTurn[], options: string[]) {
  const list = options.map((o, i) => `${i}: ${o || "(vacío)"}`).join("\n");
  const out = await askJson<{ index?: number }>(
    `${instruction}\nDevuelve {"index": número} con la opción elegida, o {"index": -1} si ninguna aplica.`,
    `Historial:\n${transcript(history)}\n\nMensaje del usuario: ${input}\n\nOpciones:\n${list}`
  );
  return Number.isInteger(out.index) && out.index! >= 0 && out.index! < options.length ? out.index! : -1;
}

export async function runFlow(message: string, cursor: string | null, history: ChatTurn[]): Promise<ChatResult> {
  const flow = await readFlow();
  const nodes = (flow?.nodes ?? []) as FNode[];
  const edges = (flow?.edges ?? []) as FEdge[];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const text = (n?: FNode) => n?.data?.text?.trim() ?? "";
  const outs = (id: string) => edges.filter((e) => e.source === id && byId.has(e.target));
  const isUser = (n: FNode) => n.type === "userRequest" || n.type === "userResponse";

  const result: ChatResult = { replies: [], actions: [], cursor: null };
  let steps = 0;
  let done = false;
  let data = "";
  // Text of the matched user node: reference context only, never the user's actual words.
  let userContext = "";
  const withData = (s: string) =>
    s +
    (userContext
      ? `\n\nContexto del nodo de usuario (solo referencia de la intención esperada; lo que el usuario realmente escribió es el "Mensaje del usuario"):\n${userContext}`
      : "") +
    (data ? `\n\nDatos obtenidos por una acción:\n${data}` : "");
  const fill = (s: string) =>
    s.replaceAll("{{data}}", data.slice(0, 1500)).replaceAll("{{input}}", message);

  // Input: only user nodes can receive the message.
  async function matchUserNode(candidates: FNode[]) {
    if (!candidates.length) return null;
    if (candidates.length === 1 && !text(candidates[0])) return candidates[0];
    const i = await pick(
      "Elige el nodo de usuario cuyo texto describe mejor lo que el usuario escribió (por intención, no literalmente).",
      message,
      history,
      candidates.map(text)
    );
    return i < 0 ? null : candidates[i];
  }

  async function choose(node: FNode, options: FEdge[], instruction: string) {
    if (options.length <= 1) return options[0] ?? null;
    const labels = options.map((e) => {
      const handle = e.sourceHandle === "yes" ? "[Sí] " : e.sourceHandle === "no" ? "[No] " : "";
      const t = byId.get(e.target)!;
      return `${handle}${t.type}: ${text(t)}`;
    });
    const i = await pick(withData(`${instruction}\nContexto del nodo: ${text(node)}`), message, history, labels);
    return i < 0 ? null : options[i];
  }

  async function walk(fromId: string) {
    for (const e of outs(fromId)) {
      if (done) return;
      await visit(e.target, fromId);
    }
  }

  async function visit(id: string, from: string) {
    const node = byId.get(id);
    if (!node || done) return;
    if (++steps > MAX_STEPS) {
      done = true;
      return;
    }

    if (isUser(node)) {
      result.cursor = from;
      done = true;
    } else if (node.type === "botResponse") {
      result.replies.push({ kind: "botResponse", text: fill(text(node)) });
      await walk(id);
    } else if (node.type === "botRequest") {
      result.replies.push({ kind: "botRequest", text: fill(text(node)) });
      result.cursor = id;
      done = true;
    } else if (node.type === "action") {
      const type = node.data?.actionType ?? "api";
      const target = node.data?.target ?? "";
      try {
        data = await runAction(node, message, history);
        result.actions.push({ text: text(node), type, target, ok: true, preview: data.slice(0, 200) });
      } catch (err) {
        data = `Error: ${err instanceof Error ? err.message : "falló la acción"}`;
        result.actions.push({ text: text(node), type, target, ok: false, preview: data });
      }
      await walk(id);
    } else if (node.type === "rules") {
      const verdict = await askJson<{ cumple?: boolean }>(
        'Evalúas reglas. Indica si el mensaje del usuario cumple TODAS las condiciones. Devuelve {"cumple": true|false}.',
        withData(`Condiciones:\n${text(node)}\n\nHistorial:\n${transcript(history)}\n\nMensaje del usuario: ${message}`)
      );
      if (!verdict.cumple) return;
      const next = await choose(node, outs(id), "Elige la salida a la que debe continuar el flujo.");
      if (next) await visit(next.target, id);
    } else if (node.type === "determine") {
      const next = await choose(
        node,
        outs(id),
        "El contexto del nodo es un prompt. Compáralo con el mensaje del usuario y elige la salida siguiente (Sí/No u otra)."
      );
      if (next) await visit(next.target, id);
    }
  }

  // 1. Find the entry user node: answers to the pending question first, then fresh requests.
  const pending = cursor && byId.has(cursor) ? outs(cursor).map((e) => byId.get(e.target)!).filter(isUser) : [];
  let entry = await matchUserNode(pending);
  if (!entry) entry = await matchUserNode(nodes.filter((n) => n.type === "userRequest"));

  // 2. Walk the flow from there.
  if (entry) {
    userContext = text(entry);
    await walk(entry.id);
  }

  if (!result.replies.length) result.replies.push({ kind: "botResponse", text: FALLBACK });
  return result;
}
