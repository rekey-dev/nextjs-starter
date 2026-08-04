import { Rekey } from '@rekey.dev/node';

/**
 * Server-side Rekey client.
 *
 * Holds the secret key, so it must never be imported from a Client Component.
 *
 * Built on first use rather than at import. The constructor validates the key,
 * and doing that at module scope means `next build` fails on any machine
 * without the secret, which includes most CI. Nothing here needs the client
 * until a request arrives.
 */
let client: Rekey | undefined;

export function rekey(): Rekey {
  client ??= new Rekey({
    secretKey: process.env.REKEY_SECRET!,
    apiUrl: process.env.REKEY_URL ?? 'https://api.rekey.dev',
  });
  return client;
}
