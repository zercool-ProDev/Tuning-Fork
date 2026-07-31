import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compare a submitted passcode against the configured one.
 *
 * The passcode is stored as plaintext in the APP_PASSCODE environment variable.
 * That is a deliberate trade for a single-user personal app: the Vercel account
 * that can read the variable is already the thing guarding the deployment, so
 * hashing would protect against a threat that does not really exist here, while
 * costing a setup step that has to happen on a machine with a terminal.
 *
 * Both sides are hashed to a fixed-width digest before comparison for two
 * reasons: timingSafeEqual requires equal-length buffers, and hashing first
 * means the comparison time reveals nothing about the passcode's length.
 */
export function verifyPasscode(submitted: string, configured: string): boolean {
  if (configured.length === 0) return false;

  const a = createHash("sha256").update(submitted, "utf8").digest();
  const b = createHash("sha256").update(configured, "utf8").digest();
  return timingSafeEqual(a, b);
}
