# Next.js + Rekey (auth and billing)

A working Next.js app with authentication and billing already wired to
[Rekey](https://rekey.dev). Sign-up, sign-in, sessions, plans, hosted checkout,
entitlements and credits.

It is a starting point, not a framework. Every part of the integration is a
short file you can open and read, and there is nothing you have to keep.

- Next.js 16 (App Router, Turbopack, React 19)
- Tailwind CSS 4
- `@rekey.dev/nextjs`, `@rekey.dev/react`, `@rekey.dev/node`

## Getting it running

You need a Rekey Application. Either sign up at
[rekey.dev](https://rekey.dev), or run the whole thing yourself with
[the open source repo](https://github.com/rekey-dev/rekey). This starter does
not care which; only the API URL changes.

```bash
npx create-next-app@latest my-app --example https://github.com/rekey-dev/nextjs-starter
cd my-app
cp .env.example .env.local
```

Fill in `.env.local` from **Panel → your Application → Developer → API keys**:

| Variable | What it is |
| --- | --- |
| `REKEY_SECRET` | Server-only. Full API access for this Application. Never commit it, never import it from a client component. |
| `REKEY_URL` | `https://api.rekey.dev`, or your own API if you self-host. |
| `NEXT_PUBLIC_REKEY_PUBLIC_KEY` | Safe in the browser. Identifies the Application; grants nothing on its own. |
| `NEXT_PUBLIC_REKEY_URL` | Same API, the browser-visible copy. |
| `NEXT_PUBLIC_APP_URL` | Where this app is reachable. Checkout returns the user here, so it must be the real origin in production. |

Then:

```bash
npm run dev
```

Create an account at `/sign-up` and you are signed in. The billing pages stay
empty until you create a plan, which is the next section.

## What is where

| File | What it does |
| --- | --- |
| `lib/rekey.ts` | The server client. Holds the secret key. |
| `app/layout.tsx` | Reads the session on the server, hands the token to `<RekeyProvider>`. |
| `proxy.ts` | Refreshes the session cookie. Deliberately does not protect routes. |
| `app/actions/auth.ts` | Sign up, sign in, sign out. |
| `app/actions/billing.ts` | Plan click to hosted checkout URL, then redirect. |
| `app/actions/billing-manage.ts` | Cancel at period end. |
| `app/actions/credits.ts` | A metered feature, done safely. |
| `app/sign-in`, `app/sign-up` | `<SignIn>` and `<SignUp>` plus the actions above. |
| `app/pricing` | `<PricingTable>` fed by plans read from the API. |
| `app/dashboard` | A page that guards itself and reads entitlements server-side. |
| `app/account` | Plan status, cancel, credit balance. |

## Auth

Three server actions are the entire integration. They set the session cookie
themselves, so there is nothing to store and nothing to thread through your app.

```ts
// app/actions/auth.ts
import { signIn, signUp, signOut } from '@rekey.dev/nextjs/server';
```

`<SignIn>` and `<SignUp>` render the form, the OAuth buttons and the error
states, and hand you a `FormData`. If you would rather write your own form, do
that; the actions are the part that matters.

### Reading the session

```ts
import { auth } from '@rekey.dev/nextjs/server';

const session = await auth();      // { user, accessToken } | null
session?.user.email;
```

In a client component, `useUser()`, `<SignedIn>` and `<SignedOut>` read the
same session from the provider. There is no flash of the wrong state on first
paint, because the server already put the token into the provider in
`app/layout.tsx`.

### Protecting a route

Pages guard themselves:

```tsx
const session = await auth();
if (!session) redirect('/sign-in');
```

Three lines at the top of the page, and the answer to "does this route need a
session" lives in the route. The proxy is only there to keep the token fresh.
Move the check into `proxy.ts` if you prefer a central list; nothing stops you.

### MFA

If the account has two-factor enabled, `signIn()` returns a challenge instead of
a session. `app/actions/auth.ts` checks `outcome.kind` and redirects rather than
pretending the user is in. Collect the code and call `mfaVerify()` to finish.

## Billing

### Create a plan first

Panel, then your Application, then Billing, then Plans. Give it a slug, a price
and an interval, then add entitlements: feature flags, numeric limits, or a
credit grant. Those entitlements are what your app reads later.

Connect a provider (Stripe, Razorpay, PayPal or Paddle) under Billing then
Providers, or checkout will have nothing to redirect to.

### Selling

`/pricing` reads plans from the API, so no prices are hardcoded here. Edit a
plan in the panel and the page follows.

```tsx
const plans = await rekey.billing.getPlans({ limit: 20 })
  .then((r) => r.items.filter((p) => p.active));

<PricingTable plans={plans} checkoutAction={checkoutAction} currentPlanSlug={currentPlanSlug} />
```

The table posts `planSlug` to your action, which creates the checkout session:

```ts
const { url } = await rekey.billing.createCheckout(session.accessToken, {
  planSlug,
  successUrl: `${appUrl}/dashboard?checkout=done`,
  cancelUrl: `${appUrl}/pricing?checkout=canceled`,
});
redirect(url);
```

The subscription stays `PENDING` until the provider webhook confirms payment.
Rekey handles that webhook; you do not need an endpoint for it.

### Checking what someone is allowed to do

```ts
const { features, creditBalance } = await rekey.billing.getEntitlements(session.accessToken);
if (!features.export_csv) return notAllowed();
```

Do this on the server. A client-side check is a hint for your UI, not a gate.

One thing worth knowing before you price anything: where two subscriptions grant
the same numeric entitlement, the higher value wins, they are not added
together. So ten copies of a one-seat plan is not a ten-seat plan. Sell a
ten-seat plan.

### Credits

Check, do the work, then deduct, in that order, so a failure costs the user
nothing:

```ts
const { creditBalance } = await rekey.billing.getEntitlements(session.accessToken);
if (creditBalance < 1) return { ok: false, reason: 'no-credits' };

// ... the work ...

await rekey.credits.consume({ endUserId: session.user.id, amount: 1, idempotencyKey });
```

Pass something stable as `idempotencyKey` (a job id, a request id) and a retry
becomes a no-op instead of a double charge.

### Cancelling

`cancelSubscription()` defaults to cancelling at period end, so the user keeps
what they paid for. A provider-backed subscription therefore stays `ACTIVE`
with `cancelAt` set, and the provider webhook is what eventually ends it. Read
`cancelAt`, or the `cancelsAtPeriodEnd()` helper, rather than waiting for
`status` to flip.

## Deploying

Set the same environment variables, with `NEXT_PUBLIC_APP_URL` pointing at your
real origin, and add that origin to the Application's allowed origins in the
panel. Anywhere that runs Next.js works; there is nothing platform-specific
here.

## Notes

- On Next 15, rename `proxy.ts` back to `middleware.ts`. Same export, older file
  convention.
- Organizations are supported but not used here. Turn them on if a company,
  rather than a person, is the thing that buys your product. There is
  [a guide](https://rekey.dev/blog/when-to-use-organizations).

## Licence

MIT. Take it apart.
