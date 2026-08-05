'use server';

import { redirect } from 'next/navigation';
import { RekeyError } from '@rekey.dev/node';
import { auth } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';

/**
 * Read at call time, from a server-only variable.
 *
 * `NEXT_PUBLIC_*` is substituted into the bundle at build time, so an image
 * built in CI without it freezes `http://localhost:3000` and no amount of
 * setting it on the container helps. The buyer pays and is returned to a dead
 * address. A server-only name read inside the function is evaluated per
 * request, which is what a return URL needs.
 */
function appUrl(): string {
  const url = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error('APP_URL is not set. Checkout needs it to send the buyer back here.');
  }
  return url.replace(/\/$/, '');
}

/**
 * `<PricingTable>` and `<CheckoutButton>` post a form with `planSlug` in it.
 * This turns that into a hosted-checkout URL and sends the browser there.
 *
 * Checkout is per-user, so it needs the signed-in user's access token. A
 * signed-out visitor gets bounced to sign-in with the plan remembered, which
 * is why the pricing page is public.
 *
 * `redirect()` throws, so it stays outside the try. Wrapping both would catch
 * the redirect and report a successful checkout as a failure.
 */
export async function checkoutAction(formData: FormData) {
  const planSlug = String(formData.get('planSlug') ?? '');
  if (!planSlug) return;

  const session = await auth();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/pricing?plan=${planSlug}`)}`);
  }

  let destination: string;
  try {
    const { url } = await rekey().billing.createCheckout(session.accessToken, {
      planSlug,
      successUrl: `${appUrl()}/dashboard?checkout=done`,
      cancelUrl: `${appUrl()}/pricing?checkout=canceled`,
    });
    destination = url;
  } catch (err) {
    // A missing provider, a disabled plan and a declined card all arrive here
    // with different messages. Showing the API's own is more use to you than a
    // 500, and more use to the buyer than a blank page.
    const message =
      err instanceof RekeyError ? err.message : 'Could not start checkout.';
    destination = `/pricing?error=${encodeURIComponent(message)}`;
  }

  redirect(destination);
}
