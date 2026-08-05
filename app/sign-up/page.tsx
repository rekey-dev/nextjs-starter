import { SignUp } from '@rekey.dev/react';
import { signUpAction } from '@/app/actions/auth';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-10">
      <SignUp action={signUpAction} signInUrl="/sign-in" error={error} />
    </div>
  );
}
