import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/pricing'];
const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/api/session/refresh'];

/**
 * Two jobs, and it is worth being precise about both.
 *
 * **Refresh handoff.** A session that holds a refresh token but no access token
 * is not signed out, it is stale. Pages cannot fix that themselves: refreshing
 * writes cookies and Next forbids cookie writes during a render, so `auth()`
 * throws rather than returning null. Anyone in that state is sent to
 * /api/session/refresh, which is allowed to write, and comes straight back.
 *
 * **A cheap gate.** Everything not listed as public needs a session cookie to
 * reach, so a page you forget to guard is protected by default. It never calls
 * Rekey, so it costs nothing per request and it cannot know whether a token is
 * still valid. It is the doormat; `getSession()` in the page is the lock.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`. On Next 15
 * rename it back; same export, older name.
 */
export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasAccess = Boolean(req.cookies.get('rekey_access')?.value);
  const hasRefresh = Boolean(req.cookies.get('rekey_refresh')?.value);

  if (!hasAccess && hasRefresh && !pathname.startsWith('/api/session/refresh')) {
    const url = new URL('/api/session/refresh', req.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  const isPublic =
    PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isPublic && !hasAccess) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
