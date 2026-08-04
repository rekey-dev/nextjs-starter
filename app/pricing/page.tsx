import { PricingTable } from '@rekey.dev/react';
import { auth } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';
import { checkoutAction } from '@/app/actions/billing';

/**
 * Plans are read from your Rekey Application on the server, so there are no
 * prices hardcoded here. Edit a plan in the panel and this page follows.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  const [plans, session] = await Promise.all([
    rekey.billing
      .getPlans({ limit: 20 })
      .then((r) => r.items.filter((p) => p.active))
      .catch(() => []),
    auth(),
  ]);

  // Mark the plan they are already on so the table renders it as current
  // instead of offering to sell it to them again. The subscription carries a
  // planId, so match it against the plans we already fetched.
  const sub = session
    ? await rekey.billing.getSubscription(session.accessToken).catch(() => null)
    : null;
  const currentPlanSlug =
    sub && sub.status === 'ACTIVE'
      ? (plans.find((p) => p.id === sub.planId)?.slug ?? null)
      : null;

  return (
    <div className="py-6">
      <div className="mb-8 max-w-xl">
        <h1 className="text-2xl font-medium tracking-tight">Pricing</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Read live from your Rekey Application.
        </p>
      </div>

      {checkout === 'canceled' ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Checkout was canceled. Nothing was charged.
        </p>
      ) : null}

      {plans.length > 0 ? (
        <PricingTable
          plans={plans}
          checkoutAction={checkoutAction}
          currentPlanSlug={currentPlanSlug}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          No active plans yet. Create one in the panel under Billing, then
          reload this page.
        </p>
      )}
    </div>
  );
}
