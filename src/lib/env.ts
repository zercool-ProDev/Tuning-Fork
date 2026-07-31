/**
 * Central place to read required environment variables.
 *
 * These are read lazily so that a missing variable fails at request time with a
 * clear message, rather than crashing the whole build. Everything here is
 * server-only — nothing in this file may be imported from a client component.
 */

import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in .env.local for local development, or in the Vercel project settings for deployments.`,
    );
  }
  return value;
}

/** Postgres connection string. Injected automatically by the Neon/Vercel integration. */
export const databaseUrl = () => required("DATABASE_URL");

/** Secret used to sign the session cookie. Rotating this logs every device out. */
export const authSecret = () => required("AUTH_SECRET");

/** The login passcode. Stored in plain text; see lib/passcode.ts for why. */
export const appPasscode = () => required("APP_PASSCODE");
