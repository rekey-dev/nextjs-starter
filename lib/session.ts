import { redirect } from 'next/navigation';
import { auth } from '@rekey.dev/nextjs/server';
import type { Session } from '@rekey.dev/nextjs/server';

/**
 * Read the session from a page or layout.
 *
 * Use this instead of `auth()` in anything that renders. `auth()` writes
 * cookies when it refreshes an expired token, Next forbids that during a
 * render, and the throw is not catchable into a null: it becomes a 500 on
 * every route, sign-in included. Here that throw is turned into a trip through
 * the one place allowed to write cookies.
 *
 * `proxy.ts` normally gets there first, so this is the belt to its braces: it
 * covers the narrow case of a token expiring between the proxy and the render.
 */
export async function getSession(returnTo = '/'): Promise<Session | null> {
  try {
    return await auth();
  } catch {
    redirect(`/api/session/refresh?next=${encodeURIComponent(returnTo)}`);
  }
}
