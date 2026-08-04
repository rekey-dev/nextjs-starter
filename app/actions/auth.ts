'use server';

import { redirect } from 'next/navigation';
import { signIn, signUp, signOut } from '@rekey.dev/nextjs/server';

/**
 * These are the whole auth integration. `<SignIn>` and `<SignUp>` render the
 * form and hand you a FormData; everything else is these three functions.
 *
 * They set the session cookie themselves, so there is nothing to store and
 * nothing to pass around afterwards.
 */

export async function signInAction(next: string, formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const outcome = await signIn({ email, password });

  // An MFA-enrolled account gets a challenge instead of a session. Send them
  // somewhere that can collect the code rather than pretending they are in.
  if (outcome.kind !== 'session') {
    redirect('/sign-in?mfa=1');
  }
  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  await signUp({ email, password });
  redirect('/dashboard');
}

export async function signOutAction() {
  await signOut('/');
}
