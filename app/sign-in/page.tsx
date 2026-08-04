import { SignIn } from '@rekey.dev/react';
import { signInAction } from '@/app/actions/auth';

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
  searchParams: Promise<{ mfa?: string; next?: string }>;
}) {
  const { mfa, next } = await searchParams;

  // Only ever a path on this site. An absolute URL here would turn the sign-in
  // page into an open redirect.
  const dest = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  return (
    <div className="mx-auto max-w-sm py-10">
      <SignIn
        action={signInAction.bind(null, dest)}
        signUpUrl="/sign-up"
        error={mfa ? 'This account uses two-factor authentication. Enter your code to continue.' : undefined}
      />
    </div>
  );
}
