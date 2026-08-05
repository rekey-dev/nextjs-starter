import { SignIn } from '@rekey.dev/react';
import { signInAction } from '@/app/actions/auth';
import { safePath } from '@/lib/safe-path';

/**
 * `<SignIn>` renders the form, the OAuth buttons and the error states. You
 * supply the action, which is where the session actually gets created.
 *
 * Delete this page and write your own form if you would rather. The action is
 * the only part that matters.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mfa?: string; error?: string; next?: string }>;
}) {
  const { mfa, error, next } = await searchParams;

  // Only ever a path on this site. See lib/safe-path.ts for why the obvious
  // check is not enough.
  const dest = safePath(next, '/dashboard');

  return (
    <div className="mx-auto max-w-sm py-10">
      <SignIn
        action={signInAction.bind(null, dest)}
        signUpUrl="/sign-up"
        error={
          mfa
            ? 'This account has two-factor authentication turned on, and this starter does not implement the second step. See the MFA section of the README to add it.'
            : error
        }
      />
    </div>
  );
}
