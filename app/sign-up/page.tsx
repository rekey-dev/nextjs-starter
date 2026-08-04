import { SignUp } from '@rekey.dev/react';
import { signUpAction } from '@/app/actions/auth';

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <SignUp action={signUpAction} signInUrl="/sign-in" />
    </div>
  );
}
