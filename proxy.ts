import { rekeyMiddleware } from '@rekey.dev/nextjs/middleware';

/**
 * A cheap first gate: it checks that a session cookie is *present* and sends
 * everyone else to sign-in. It deliberately does not call Rekey, so it costs
 * nothing per request and it cannot tell you whether the token is still valid.
 *
 * That check is the page's job, and the pages still do it, which is why
 * app/dashboard/page.tsx calls `auth()` itself rather than assuming this ran.
 * This is the doormat, not the lock.
 *
 * Everything not listed as public needs a cookie to reach, so a new page is
 * protected by default rather than by remembering to add it here.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`. On Next 15
 * rename it back; same export, older name.
 */
export default rekeyMiddleware({
  publicRoutes: ['/', '/pricing', '/sign-in', '/sign-up'],
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
