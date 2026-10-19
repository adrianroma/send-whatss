import { NextResponse } from "next/server";
import { RESERVED_VARS } from "@/lib/flow-vars";
import { runFlow, type ChatTurn, type StoredVars } from "@/lib/flow-engine";

// Public endpoint (used by the chat widget on "/"); input is size-limited.
export async function POST(request: Request) {
  let body: { message?: unknown; cursor?: unknown; history?: unknown; vars?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });

  const cursor = typeof body.cursor === "string" ? body.cursor : null;
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (t): t is ChatTurn =>
            (t?.role === "user" || t?.role === "bot") && typeof t?.text === "string"
        )
        .slice(-6)
        .map((t) => ({ role: t.role, text: t.text.slice(0, 500) }))
    : [];

  // Client-held variables: bounded and sanitized (reserved names are set by the engine).
  const vars: StoredVars = {};
  if (body.vars && typeof body.vars === "object" && !Array.isArray(body.vars)) {
    for (const [k, v] of Object.entries(body.vars).slice(0, 50)) {
      if (/^[A-Za-z_][\w.]*$/.test(k) && !RESERVED_VARS.includes(k) && (v === null || typeof v === "string")) {
        vars[k] = v === null ? null : v.slice(0, 500);
      }
    }
  }

  try {
    return NextResponse.json(await runFlow(message, cursor, history, vars));
  } catch (err) {
    console.error("chat flow error", err);
    return NextResponse.json({ error: "No se pudo procesar el mensaje" }, { status: 500 });
  }
}
