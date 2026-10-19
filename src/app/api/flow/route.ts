import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { readFlow, writeFlow } from "@/lib/flow-store";

async function authorized() {
  const cookieStore = await cookies();
  return Boolean(await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value));
}

export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ flow: await readFlow() });
}

export async function PUT(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body: { nodes?: unknown; edges?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return NextResponse.json({ error: "nodes y edges deben ser arreglos" }, { status: 400 });
  }
  try {
    await writeFlow({ nodes: body.nodes, edges: body.edges });
  } catch (err) {
    console.error("flow save error", err);
    return NextResponse.json(
      { error: `No se pudo guardar el flujo (${err instanceof Error ? err.message : "error"})` },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
