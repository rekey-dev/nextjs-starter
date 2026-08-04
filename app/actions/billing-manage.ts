'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';

/**
 * Cancel at period end, which is the humane default: they keep what they paid
 * for until the period they bought runs out. On a provider-backed subscription
 * the row stays ACTIVE with `cancelAt` set, and the provider webhook is what
 * eventually ends it, so read `cancelAt` rather than waiting for `status` to
 * flip.
 */
export async function cancelSubscriptionAction() {
  const session = await auth();
  if (!session) return;

  await rekey().billing.cancelSubscription(session.accessToken);
  revalidatePath('/account');
  revalidatePath('/dashboard');
}
