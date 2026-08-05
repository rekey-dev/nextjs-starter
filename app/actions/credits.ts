'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { RekeyError } from '@rekey.dev/node';
import { auth } from '@rekey.dev/nextjs/server';
import { rekey } from '@/lib/rekey';

/**
 * The shape of a metered feature: check, do the work, then deduct.
 *
 * Two things here are load-bearing and easy to get wrong.
 *
 * **The idempotency key is derived on the server.** Every export of a
 * `'use server'` file is a public endpoint, so a key taken as a parameter is a
 * key the caller controls: send the same one every time and the first call
 * deducts while every later call is deduped server-side, doing the work for
 * free. Derive it from the unit of work instead.
 *
 * **The balance check is not a lock.** Two requests at balance 1 both pass it.
 * The deduction is the real arbiter, so the 402 it throws has to be handled
 * rather than escaping as a 500.
 */
export async function runMeteredThing() {
  const session = await auth();
  if (!session) return { ok: false as const, reason: 'signed-out' as const };

  // Cheap pre-check so the common "no credits" case does not do the work first.
  const { creditBalance } = await rekey().billing.getEntitlements(session.accessToken);
  if (creditBalance < 1) return { ok: false as const, reason: 'no-credits' as const };

  // Whatever identifies this unit of work for you: a job row id, an upload id.
  // It must come from your side, never from the caller.
  const jobId = randomUUID();

  // ... your actual work goes here ...

  try {
    await rekey().credits.consume({
      endUserId: session.user.id,
      amount: 1,
      idempotencyKey: `${session.user.id}:${jobId}`,
    });
  } catch (err) {
    // Someone else spent the last credit between the check and here.
    if (err instanceof RekeyError && err.code === 'CREDITS_INSUFFICIENT') {
      return { ok: false as const, reason: 'no-credits' as const };
    }
    throw err;
  }

  revalidatePath('/account');
  return { ok: true as const, jobId };
}
