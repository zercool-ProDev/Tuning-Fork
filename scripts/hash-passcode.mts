/**
 * Generate the PASSCODE_HASH value for a chosen passcode.
 *
 *   npm run hash-passcode -- "my passcode here"
 *
 * Copy the printed line into .env.local and into the Vercel project's
 * environment variables. The passcode itself is never stored anywhere.
 */

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const passcode = process.argv[2];

if (!passcode) {
  console.error('Usage: npm run hash-passcode -- "your passcode"');
  process.exit(1);
}

const salt = randomBytes(16);
const key = await scryptAsync(passcode, salt, 64);

console.log(`PASSCODE_HASH=scrypt:${salt.toString("hex")}:${key.toString("hex")}`);
console.log(`AUTH_SECRET=${randomBytes(32).toString("base64url")}`);
