import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { firstSeen, getSession } from "@/lib/chat-sessions";
import { runFlow } from "@/lib/flow-engine";
import { sendWhatsAppText } from "@/lib/whatsapp";

type IncomingMessage = { id: string; from: string; type: string; text?: { body?: string } };

// Meta webhook verification handshake.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // signature check is opt-in
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handleMessage(msg: IncomingMessage) {
  const text = msg.text?.body?.trim().slice(0, 500);
  if (msg.type !== "text" || !text) return;

  const session = getSession(msg.from);
  try {
    const result = await runFlow(text, session.cursor, session.history.slice(-6));
    session.cursor = result.cursor;
    session.history.push({ role: "user", text });
    for (const reply of result.replies) {
      session.history.push({ role: "bot", text: reply.text });
      if (reply.text) await sendWhatsAppText(msg.from, reply.text);
    }
    session.history = session.history.slice(-12);
  } catch (err) {
    console.error("whatsapp flow error", err);
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: {
    entry?: { changes?: { value?: { messages?: IncomingMessage[] } }[] }[];
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (payload.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) => c.value?.messages ?? [])
    .filter((m) => firstSeen(m.id));

  // Acknowledge fast so Meta doesn't retry; process afterwards.
  after(async () => {
    for (const m of messages) await handleMessage(m);
  });
  return NextResponse.json({ ok: true });
}
