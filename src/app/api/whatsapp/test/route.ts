import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function POST(request: Request) {
  // Not covered by proxy.ts's matcher, so the session is re-checked here.
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const to = body.to?.trim();
  if (!to) {
    return NextResponse.json(
      { error: "El número de destino (to) es obligatorio" },
      { status: 400 }
    );
  }

  try {
    const result = await sendWhatsAppTemplate(to);

    if (!result.ok) {
      return NextResponse.json(
        { error: "La API de WhatsApp devolvió un error", details: result.data },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, details: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
