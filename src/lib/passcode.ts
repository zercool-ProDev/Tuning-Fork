import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Hash a passcode for storage in the PASSCODE_HASH environment variable.
 * Format is `scrypt:<salt-hex>:<key-hex>`.
 *
 * scrypt is deliberately slow and memory-hard, so even a short passcode is
 * expensive to attack offline if the hash ever leaks.
 *
 * Node-only: this must never run in middleware or on the edge runtime.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passcode, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Constant-time check of a submitted passcode against a stored hash. */
export async function verifyPasscode(
  passcode: string,
  stored: string,
): Promise<boolean> {
  // Colon-separated, not `$`: dotenv-style loaders expand `$name` inside
  // .env files, which would silently mangle the stored hash.
  const [scheme, saltHex, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await scryptAsync(
    passcode,
    Buffer.from(saltHex, "hex"),
    KEY_LENGTH,
  );
  return timingSafeEqual(actual, expected);
}
