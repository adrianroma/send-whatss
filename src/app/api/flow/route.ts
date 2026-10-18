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
  await writeFlow({ nodes: body.nodes, edges: body.edges });
  return NextResponse.json({ ok: true });
}
