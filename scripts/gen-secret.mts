/**
 * Generate a value for AUTH_SECRET.
 *
 *   npm run --silent gen-secret
 *
 * The passcode itself needs no generator: APP_PASSCODE is whatever you choose.
 */

import { randomBytes } from "node:crypto";

console.log(`AUTH_SECRET=${randomBytes(32).toString("base64url")}`);
