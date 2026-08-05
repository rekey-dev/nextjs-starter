import Link from 'next/link';
import { SignedIn, SignedOut } from '@rekey.dev/react';

/**
 * The map below is the actual point of this starter: every piece of the
 * integration is one short file you can open, read and delete.
 */
const map = [
  {
    file: 'lib/rekey.ts',
    what: 'The server client. Holds the secret key, never imported from the browser.',
  },
  {
    file: 'app/actions/auth.ts',
    what: 'Sign up, sign in, sign out. Three functions; they set the cookie themselves.',
  },
  {
    file: 'app/actions/billing.ts',
    what: 'Turns a plan click into a hosted checkout URL and redirects there.',
  },
  {
    file: 'app/actions/credits.ts',
    what: 'A metered feature: check the balance, do the work, then deduct.',
  },
  {
    file: 'app/dashboard/page.tsx',
    what: 'A page that guards itself and reads entitlements on the server.',
  },
  {
    file: 'proxy.ts',
    what: 'Repairs a stale session, then gates anything not listed as public.',
  },
  {
    file: 'lib/session.ts',
    what: 'getSession(). Use it in pages: auth() cannot write cookies mid-render.',
  },
];

export default function Home() {
  return (
    <div className="py-8">
      <section className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          Rekey starter
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
          Next.js with auth and billing already wired up.
        </h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          Sign-up, sign-in, sessions, plans, checkout, entitlements and credits.
          Point it at your own Rekey Application, keep the parts you want and
          delete the rest. Nothing here is hidden behind a helper.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <SignedOut>
            <Link
              href="/sign-up"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Create an account
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Go to dashboard
            </Link>
          </SignedIn>
          <Link
            href="/pricing"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          Where everything lives
        </h2>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-800">
          {map.map((row) => (
            <div key={row.file} className="bg-neutral-50 p-5 dark:bg-neutral-950">
              <dt className="font-mono text-xs text-neutral-900 dark:text-neutral-100">
                {row.file}
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {row.what}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
