import { rekeyMiddleware } from '@rekey.dev/nextjs/middleware';

/**
 * Next 16 renamed this file convention from `middleware` to `proxy`. Same
 * runtime, same export shape; on Next 15 rename it back to `middleware.ts`.
 *
 * Refreshes the session cookie when the access token is close to expiring, so a
 * signed-in person is not bounced to sign-in mid-session.
 *
 * It does not protect routes. Route protection is a decision per page, and
 * doing it here would mean the list of protected paths lives somewhere other
 * than the pages themselves. See app/dashboard/page.tsx for how a page guards
 * itself.
 */
export default rekeyMiddleware();

export const config = {
  // Everything except static assets. Adjust freely.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
