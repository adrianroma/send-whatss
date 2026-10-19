import { readFile } from "node:fs/promises";
import path from "node:path";
import { AI_MODEL, getAiClient } from "@/lib/openai";
import { readFlow } from "@/lib/flow-store";
import {
  evalExpression,
  interpolate,
  isExpressionLine,
  parseAssignment,
  RESERVED_VARS,
  show,
  type Vars,
} from "@/lib/flow-vars";

type ActionData = {
  text?: string;
  actionType?: "api" | "file";
  method?: "GET" | "POST";
  /** URL (api) or project path under public/ or configuration/ (file). Accepts {variables}. */
  target?: string;
};
type FNode = { id: string; type: string; data?: ActionData };
type FEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

export type ChatTurn = { role: "user" | "bot"; text: string };
export type StoredVars = Record<string, string | null>;
export type ChatResult = {
  replies: { kind: "botResponse" | "botRequest"; text: string }[];
  actions: { text: string; type: string; target: string; ok: boolean; preview: string }[];
  /** Node after which the flow waits for the next user message. */
  cursor: string | null;
  /** Variables to keep for the next turn (reserved input/output/data are excluded). */
  vars: StoredVars;
};

const FALLBACK = "Lo siento, no encontré una respuesta para eso.";
const MAX_STEPS = 25;
const MAX_DATA = 6000;
const ALLOWED_DIRS = ["public", "configuration"];

async function runAction(node: FNode, target: string, message: string, history: ChatTurn[]) {
  const { actionType, method = "GET" } = node.data ?? {};
  if (!target) throw new Error("La acción no tiene destino configurado");

  if (actionType === "file") {
    const full = path.resolve(process.cwd(), target);
    const allowed = ALLOWED_DIRS.some((d) => full.startsWith(path.resolve(process.cwd(), d) + path.sep));
    if (!allowed) throw new Error(`Solo se permiten archivos en ${ALLOWED_DIRS.join(" o ")}/`);
    return (await readFile(full, "utf8")).slice(0, MAX_DATA);
  }

  if (!/^https?:\/\//i.test(target)) throw new Error("La URL debe comenzar con http:// o https://");
  const res = await fetch(target, {
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

/** Returns the index of the best option (-1 when none applies) and a short AI-generated summary. */
async function pick(instruction: string, input: string, history: ChatTurn[], options: string[]) {
  const list = options.map((o, i) => `${i}: ${o || "(vacío)"}`).join("\n");
  const out = await askJson<{ index?: number; salida?: string }>(
    `${instruction}\nDevuelve {"index": número, "salida": texto breve que resuma tu decisión} con la opción elegida, o {"index": -1} si ninguna aplica.`,
    `Historial:\n${transcript(history)}\n\nMensaje del usuario: ${input}\n\nOpciones:\n${list}`
  );
  const index =
    Number.isInteger(out.index) && out.index! >= 0 && out.index! < options.length ? out.index! : -1;
  return { index, salida: typeof out.salida === "string" ? out.salida : "" };
}

export async function runFlow(
  message: string,
  cursor: string | null,
  history: ChatTurn[],
  stored: StoredVars = {}
): Promise<ChatResult> {
  const flow = await readFlow();
  const nodes = (flow?.nodes ?? []) as FNode[];
  const edges = (flow?.edges ?? []) as FEdge[];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rawText = (n?: FNode) => n?.data?.text?.trim() ?? "";
  const outs = (id: string) => edges.filter((e) => e.source === id && byId.has(e.target));
  const isUser = (n: FNode) => n.type === "userRequest" || n.type === "userResponse";

  const result: ChatResult = { replies: [], actions: [], cursor: null, vars: {} };
  let steps = 0;
  let done = false;

  // {input} is always what the user really typed; {output} is what the last node generated.
  const vars: Vars = { ...stored, input: message, output: null };
  delete vars.data;

  const assign = (name: string, raw: string) => {
    const value = interpolate(raw, vars).trim();
    if (value === "{undefined}") delete vars[name];
    else vars[name] = value === "{null}" ? null : value;
  };

  /** Applies `{name} = value` lines and returns the remaining text lines. */
  function readLines(node: FNode, keepAssignments = false) {
    const kept: string[] = [];
    for (const line of rawText(node).split(/\r?\n/)) {
      const a = keepAssignments ? null : parseAssignment(line);
      if (a) assign(a[0], a[1]);
      else if (line.trim()) kept.push(line);
    }
    return kept;
  }

  // Text of the matched user node: reference context only, never the user's actual words.
  let userContext = "";
  const withContext = (s: string) => {
    const known = Object.entries(vars)
      .filter(([k, v]) => v !== undefined && !RESERVED_VARS.includes(k))
      .map(([k, v]) => `{${k}} = ${show(v).slice(0, 200)}`);
    return (
      s +
      (userContext
        ? `\n\nContexto del nodo de usuario (solo referencia de la intención esperada; lo que el usuario realmente escribió es el "Mensaje del usuario"):\n${userContext}`
        : "") +
      (vars.data ? `\n\nDatos obtenidos por una acción:\n${vars.data}` : "") +
      (known.length ? `\n\nVariables:\n${known.join("\n")}` : "")
    );
  };

  // Input: only user nodes can receive the message.
  async function matchUserNode(candidates: FNode[]) {
    if (!candidates.length) return null;
    const texts = candidates.map((n) =>
      rawText(n)
        .split(/\r?\n/)
        .filter((l) => !parseAssignment(l))
        .join("\n")
        .trim()
    );
    if (candidates.length === 1 && !texts[0]) return candidates[0];
    const { index } = await pick(
      "Elige el nodo de usuario cuyo texto describe mejor lo que el usuario escribió (por intención, no literalmente).",
      message,
      history,
      texts
    );
    return index < 0 ? null : candidates[index];
  }

  async function choose(node: FNode, context: string, options: FEdge[], instruction: string) {
    if (options.length <= 1) return { edge: options[0] ?? null, salida: "" };
    const labels = options.map((e) => {
      const handle = e.sourceHandle === "yes" ? "[Sí] " : e.sourceHandle === "no" ? "[No] " : "";
      const t = byId.get(e.target)!;
      return `${handle}${t.type}: ${interpolate(rawText(t), vars)}`;
    });
    const { index, salida } = await pick(
      withContext(`${instruction}\nContexto del nodo: ${context}`),
      message,
      history,
      labels
    );
    return { edge: index < 0 ? null : options[index], salida };
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
    } else if (node.type === "botResponse" || node.type === "botRequest") {
      const text = interpolate(readLines(node).join("\n"), vars).trim();
      vars.output = text;
      if (text) result.replies.push({ kind: node.type, text });
      if (node.type === "botRequest") {
        result.cursor = id;
        done = true;
      } else {
        await walk(id);
      }
    } else if (node.type === "action") {
      readLines(node);
      const type = node.data?.actionType ?? "api";
      const target = interpolate(node.data?.target?.trim() ?? "", vars, type === "api");
      const label = interpolate(rawText(node), vars);
      try {
        vars.data = await runAction(node, target, message, history);
        result.actions.push({ text: label, type, target, ok: true, preview: vars.data.slice(0, 200) });
      } catch (err) {
        vars.data = `Error: ${err instanceof Error ? err.message : "falló la acción"}`;
        result.actions.push({ text: label, type, target, ok: false, preview: vars.data });
      }
      vars.output = vars.data;
      await walk(id);
    } else if (node.type === "rules") {
      const lines = readLines(node, true);
      const expressions = lines.filter(isExpressionLine);
      const prose = lines.filter((l) => !isExpressionLine(l)).map((l) => interpolate(l, vars));

      let cumple = expressions.every((l) => evalExpression(l, vars));
      let salida = String(cumple);
      if (cumple && prose.length) {
        const verdict = await askJson<{ cumple?: boolean; salida?: string }>(
          'Evalúas reglas. Indica si el mensaje del usuario cumple TODAS las condiciones. Devuelve {"cumple": true|false, "salida": explicación breve}.',
          withContext(`Condiciones:\n${prose.join("\n")}\n\nHistorial:\n${transcript(history)}\n\nMensaje del usuario: ${message}`)
        );
        cumple = Boolean(verdict.cumple);
        salida = verdict.salida || String(cumple);
      }
      vars.output = salida;
      if (!cumple) return;
      const { edge } = await choose(node, prose.join("\n"), outs(id), "Elige la salida a la que debe continuar el flujo.");
      if (edge) await visit(edge.target, id);
    } else if (node.type === "determine") {
      const lines = readLines(node, true);
      const facts = lines
        .filter(isExpressionLine)
        .map((l) => `${interpolate(l, vars)}  =>  ${evalExpression(l, vars)}`);
      const prompt = [...lines.filter((l) => !isExpressionLine(l)).map((l) => interpolate(l, vars)), ...facts].join("\n");
      const { edge, salida } = await choose(
        node,
        prompt,
        outs(id),
        "El contexto del nodo es un prompt (las líneas con '=>' son condiciones ya evaluadas). Compáralo con el mensaje del usuario y elige la salida siguiente (Sí/No u otra)."
      );
      vars.output = salida || null;
      if (edge) await visit(edge.target, id);
    }
  }

  // 1. Find the entry user node: answers to the pending question first, then fresh requests.
  const pending = cursor && byId.has(cursor) ? outs(cursor).map((e) => byId.get(e.target)!).filter(isUser) : [];
  let entry = await matchUserNode(pending);
  if (!entry) entry = await matchUserNode(nodes.filter((n) => n.type === "userRequest"));

  // 2. Walk the flow from there.
  if (entry) {
    userContext = interpolate(readLines(entry).join("\n"), vars);
    await walk(entry.id);
  }

  if (!result.replies.length) result.replies.push({ kind: "botResponse", text: FALLBACK });

  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined && !RESERVED_VARS.includes(k)) result.vars[k] = v;
  }
  return result;
}
