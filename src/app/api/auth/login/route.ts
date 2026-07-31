import { NextResponse } from "next/server";

import { appPasscode, authSecret } from "@/lib/env";
import { verifyPasscode } from "@/lib/passcode";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/session";

// node:crypto is used for the constant-time compare, so this stays on Node.
export const runtime = "nodejs";

export async function POST(request: Request) {
  let passcode: unknown;
  try {
    ({ passcode } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof passcode !== "string" || passcode.length === 0) {
    return NextResponse.json({ error: "Passcode is required." }, { status: 400 });
  }

  if (!verifyPasscode(passcode, appPasscode())) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(authSecret()),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
