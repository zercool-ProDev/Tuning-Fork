import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tf_session";

/** 90 days. Long-lived on purpose: this is a personal app on trusted devices. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

const ISSUER = "tuning-fork";
const SUBJECT = "owner";

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

/** Mint a signed session token. The payload carries no secrets — presence is the claim. */
export async function createSessionToken(secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key(secret));
}

/**
 * Verify a session token. Returns false for anything malformed, expired, or
 * signed with a different secret.
 *
 * Uses jose rather than node:crypto so this is callable from middleware, which
 * runs on the edge runtime.
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, key(secret), { issuer: ISSUER, subject: SUBJECT });
    return true;
  } catch {
    return false;
  }
}
