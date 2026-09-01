import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/users";
import { signSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const isValid = await verifyCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signSessionToken(email.trim().toLowerCase());

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (err) {
    // Most likely cause: required env vars (JWT_SECRET, AUTH_USER_EMAIL,
    // AUTH_USER_PASSWORD_HASH) aren't set in this environment — .env.local
    // is gitignored and is never uploaded to a hosting provider. Surface the
    // real reason instead of letting the client fall back to a generic
    // "network error" from a failed-to-parse response.
    console.error("Login failed due to server misconfiguration:", err);
    const message =
      err instanceof Error ? err.message : "Error de configuración del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
