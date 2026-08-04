import { Rekey } from '@rekey.dev/node';

/**
 * Server-side Rekey client.
 *
 * Holds the secret key, so it must never be imported from a Client Component.
 * Anything in this file runs on your server only.
 */
export const rekey = new Rekey({
  secretKey: process.env.REKEY_SECRET!,
  apiUrl: process.env.REKEY_URL ?? 'https://api.rekey.dev',
});
