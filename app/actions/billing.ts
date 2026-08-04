'use server';

import { redirect } from 'next/navigation';
import { auth } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * `<PricingTable>` and `<CheckoutButton>` post a form with `planSlug` in it.
 * This turns that into a hosted-checkout URL and sends the browser there.
 *
 * Checkout is per-user, so it needs the signed-in user's access token. A
 * signed-out visitor gets bounced to sign-in with the plan remembered, which
 * is why the pricing page is public.
 */
export async function checkoutAction(formData: FormData) {
  const planSlug = String(formData.get('planSlug') ?? '');
  if (!planSlug) return;

  const session = await auth();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/pricing?plan=${planSlug}`)}`);
  }

  const { url } = await rekey().billing.createCheckout(session.accessToken, {
    planSlug,
    successUrl: `${appUrl}/dashboard?checkout=done`,
    cancelUrl: `${appUrl}/pricing?checkout=canceled`,
  });

  redirect(url);
}
