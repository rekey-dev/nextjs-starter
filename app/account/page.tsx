import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { cancelsAtPeriodEnd } from '@rekey.dev/node';
import { rekey } from '@/lib/rekey';
import { cancelSubscriptionAction } from '@/app/actions/billing-manage';

/**
 * Everything a paying user needs to look after their own account, so you do
 * not end up answering "how do I cancel" by hand.
 */
export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const [subscription, entitlements] = await Promise.all([
    rekey().billing.getSubscription(session.accessToken, { includeEnded: true }).catch(() => null),
    rekey().billing.getEntitlements(session.accessToken).catch(() => null),
  ]);

  // Two different questions, and conflating them is how the cancel button ends
  // up hidden from every healthy subscriber.
  //   cancelAt            -> is this ALREADY scheduled to end?
  //   cancelsAtPeriodEnd  -> if I cancel NOW, do they keep the rest of the
  //                          period, or does access stop on click with no refund?
  const alreadyEnding = Boolean(subscription?.cancelAt);
  const gracefulCancel = subscription ? cancelsAtPeriodEnd(subscription) : false;
  const live = subscription?.status === 'ACTIVE' || subscription?.status === 'PAST_DUE';

  return (
    <div className="space-y-8 py-2">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Account</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">{session.user.email}</p>
      </header>

      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">Plan</h2>

        {live ? (
          <>
            <p className="mt-3 text-lg">{subscription.status}</p>
            {subscription.currentPeriodEnd ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {alreadyEnding ? 'Access until' : 'Renews on'}{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            ) : null}

            {alreadyEnding ? (
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                Already set to end. Nothing more to do.
              </p>
            ) : (
              <form action={cancelSubscriptionAction} className="mt-5">
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  {gracefulCancel ? 'Cancel at period end' : 'Cancel now'}
                </button>
                <p className="mt-2 text-xs text-neutral-500">
                  {gracefulCancel
                    ? 'You keep access until the date above.'
                    : 'This subscription is not ACTIVE, so cancelling ends access immediately and there is no refund for the remainder.'}
                </p>
              </form>
            )}
          </>
        ) : (
          <div className="mt-3">
            <p className="text-neutral-600 dark:text-neutral-400">
              {subscription ? `Ended (${subscription.status.toLowerCase()}).` : 'No plan yet.'}
            </p>
            <Link href="/pricing" className="mt-2 inline-block text-sm underline">
              See plans
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">Credits</h2>
        <p className="mt-3 text-lg tabular-nums">{entitlements?.creditBalance ?? 0}</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Spent with <code className="font-mono text-xs">rekey().credits.consume()</code> from your
          server. See app/actions/credits.ts.
        </p>
      </section>
    </div>
  );
}
