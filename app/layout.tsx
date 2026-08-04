import type { Metadata } from 'next';
import { RekeyProvider } from '@rekey.dev/react';
import { auth } from '@rekey.dev/nextjs/server';
import { SiteHeader } from '@/app/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rekey starter',
  description: 'Next.js with Rekey auth and billing.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the session on the server and hand the token down. The provider needs
  // it so client components know who is signed in without a second round trip
  // on first paint.
  const session = await auth();

  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <RekeyProvider
          publishableKey={process.env.NEXT_PUBLIC_REKEY_PUBLIC_KEY!}
          apiUrl={process.env.NEXT_PUBLIC_REKEY_URL ?? 'https://api.rekey.dev'}
          accessToken={session?.accessToken}
        >
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
        </RekeyProvider>
      </body>
    </html>
  );
}
