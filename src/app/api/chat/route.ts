import { NextResponse } from "next/server";
import { runFlow, type ChatTurn } from "@/lib/flow-engine";

// Public endpoint (used by the chat widget on "/"); input is size-limited.
export async function POST(request: Request) {
  let body: { message?: unknown; cursor?: unknown; history?: unknown };
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

  try {
    return NextResponse.json(await runFlow(message, cursor, history));
  } catch (err) {
    console.error("chat flow error", err);
    return NextResponse.json({ error: "No se pudo procesar el mensaje" }, { status: 500 });
  }
}
