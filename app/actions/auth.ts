'use server';

import { redirect } from 'next/navigation';
import { RekeyError } from '@rekey.dev/node';
import { signIn, signUp, signOut } from '@rekey.dev/nextjs/server';

/**
 * These are the whole auth integration. `<SignIn>` and `<SignUp>` render the
 * form and hand you a FormData; everything else is these three functions.
 *
 * They set the session cookie themselves, so there is nothing to store and
 * nothing to pass around afterwards.
 *
 * Note the shape of the error handling. `redirect()` works by throwing, so a
 * try/catch wrapped around both the API call and the redirect would swallow the
 * redirect and turn a success into a failure. The SDK call goes in the try; the
 * redirect stays outside it.
 */

/** The API already distinguishes a wrong password from a locked account. */
function reason(err: unknown, fallback: string): string {
  return err instanceof RekeyError ? err.message : fallback;
}

export async function signInAction(next: string, formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  let destination: string;
  try {
    const outcome = await signIn({ email, password });

    // An MFA-enrolled account gets a challenge instead of a session. This
    // starter does not implement the second step, and says so rather than
    // looping the user on a form with no code field. To finish it: keep
    // outcome.mfaChallengeToken in a short-lived httpOnly cookie, add a code
    // field, and call mfaVerify() from @rekey.dev/nextjs/server.
    destination = outcome.kind === 'session' ? next : '/sign-in?mfa=1';
  } catch (err) {
    // Show the API's own message. Replacing it with "something went wrong"
    // moves the debugging onto your support inbox.
    destination = `/sign-in?error=${encodeURIComponent(reason(err, 'Could not sign you in.'))}`;
  }

  redirect(destination);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  let destination = '/dashboard';
  try {
    await signUp({ email, password });
  } catch (err) {
    destination = `/sign-up?error=${encodeURIComponent(reason(err, 'Could not create the account.'))}`;
  }

  redirect(destination);
}

export async function signOutAction() {
  await signOut('/');
}
