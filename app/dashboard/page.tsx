import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@rekey.dev/nextjs/server';
import { cancelsAtPeriodEnd } from '@rekey.dev/node';
import { rekey } from '@/lib/rekey';

/**
 * A page that guards itself.
 *
 * The check is here rather than in middleware on purpose: whether a route needs
 * a session is a property of the route, and keeping it local means you can read
 * one file and know. Middleware still runs, but only to keep the session fresh.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/sign-in');

  // Entitlements are resolved server-side. Never gate anything that matters on
  // a client-side check: the browser can lie, your server cannot be made to.
  const [subscription, entitlements] = await Promise.all([
    rekey().billing.getSubscription(session.accessToken).catch(() => null),
    rekey().billing.getEntitlements(session.accessToken).catch(() => null),
  ]);

  const endingEarly = subscription ? cancelsAtPeriodEnd(subscription) : false;

  return (
    <div className="space-y-8 py-2">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">{session.user.email}</p>
      </header>

      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          Subscription
        </h2>

        {subscription ? (
          <div className="mt-3 space-y-1">
            <p className="text-lg">{subscription.status}</p>
            {subscription.currentPeriodEnd ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {endingEarly ? 'Access until' : 'Renews on'}{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-neutral-600 dark:text-neutral-400">No active plan.</p>
            <Link href="/pricing" className="mt-2 inline-block text-sm underline">
              See plans
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          What this account can use
        </h2>
        {entitlements && Object.keys(entitlements.features ?? {}).length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(entitlements.features).map(([key, value]) => (
              <li key={key} className="flex justify-between border-b border-neutral-100 py-1.5 last:border-0 dark:border-neutral-900">
                <span className="font-mono text-xs">{key}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{String(value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Nothing granted yet. Entitlements come from the plan, so add some to a
            plan in the panel and they appear here.
          </p>
        )}
      </section>
    </div>
  );
}
