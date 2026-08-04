'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';

/**
 * The shape of a metered feature: check first, do the work, then deduct.
 *
 * Deduct *after* the work succeeds, so a failed call does not cost the user
 * anything. `idempotencyKey` makes a retry a no-op rather than a double charge,
 * so pass something stable for the unit of work (a job id, a request id).
 */
export async function runMeteredThing(idempotencyKey: string) {
  const session = await auth();
  if (!session) return { ok: false as const, reason: 'signed-out' as const };

  const { creditBalance } = await rekey.billing.getEntitlements(session.accessToken);
  if (creditBalance < 1) return { ok: false as const, reason: 'no-credits' as const };

  // ... your actual work goes here ...

  await rekey.credits.consume({
    endUserId: session.user.id,
    amount: 1,
    idempotencyKey,
  });

  revalidatePath('/account');
  return { ok: true as const };
}
