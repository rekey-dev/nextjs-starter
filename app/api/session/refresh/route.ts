import { NextResponse, type NextRequest } from 'next/server';
import { createSession } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';
import { safePath } from '@/lib/safe-path';

/**
 * Exchanges the refresh cookie for a new session.
 *
 * This exists because of a sharp edge worth understanding rather than working
 * around. `auth()` refreshes an expired access token by *writing* cookies, and
 * Next forbids cookie writes during a render. Call `auth()` from a page or a
 * layout with an expired access token and it does not return null, it throws,
 * and with no error boundary that is a 500 on every route including sign-in.
 *
 * Route handlers may write cookies, so the refresh happens here. `proxy.ts`
 * sends anyone holding a refresh token but no access token through this route
 * first, so by the time a page runs, `auth()` has nothing to write.
 */
export async function GET(req: NextRequest) {
  const next = safePath(req.nextUrl.searchParams.get('next'), '/');
  const refreshToken = req.cookies.get('rekey_refresh')?.value;

  const signIn = `/sign-in?next=${encodeURIComponent(next)}`;

  if (!refreshToken) return seeOther(signIn);

  try {
    const fresh = await rekey().auth.refresh(refreshToken);
    await createSession(fresh);
    return seeOther(next);
  } catch {
    // The refresh token is spent, revoked or invalid. Clear both cookies so the
    // proxy stops sending them back here, and ask for a password.
    const res = seeOther(signIn);
    res.cookies.delete('rekey_access');
    res.cookies.delete('rekey_refresh');
    return res;
  }
}

/**
 * A relative Location, deliberately.
 *
 * `NextResponse.redirect()` needs an absolute URL, and building one from
 * `req.url` bakes in whatever host Next resolved — which is not necessarily the
 * host the browser used. Redirect to `localhost` a browser that asked for
 * `127.0.0.1` and the cookies just set are on the wrong origin and the session
 * evaporates; behind a proxy it leaks the internal hostname. A relative
 * Location is resolved by the browser against the URL it actually requested,
 * which is always right.
 */
function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { location } });
}
