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
| `REKEY_URL` | Required, even on hosted Rekey: `https://api.rekey.dev`, or your own API if you self-host. |
| `NEXT_PUBLIC_REKEY_PUBLIC_KEY` | Safe in the browser. Identifies the Application; grants nothing on its own. |
| `NEXT_PUBLIC_REKEY_URL` | Same API, the browser-visible copy. |
| `APP_URL` | Where this app is reachable. Checkout returns the user here. Read at request time, so this is the one that matters in production. |
| `NEXT_PUBLIC_APP_URL` | The same value for local development. `NEXT_PUBLIC_*` is baked into the bundle at build, so on its own it freezes whatever the build machine had. |
| `REKEY_COOKIE_SECURE` | Optional, and only for serving over plain HTTP on a non-localhost hostname. Otherwise the browser refuses the session cookie and sign-in silently never sticks. |

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
| `proxy.ts` | A cookie-presence gate at the edge, with the public routes listed. |
| `lib/session.ts` | `getSession()`. Use this in pages, not `auth()`. |
| `lib/safe-path.ts` | Reduces a `?next=` value to a path on this site. |
| `app/api/session/refresh` | The one place allowed to write refreshed cookies. |
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
import { getSession } from '@/lib/session';

const session = await getSession();   // { user, accessToken } | null
session?.user.email;
```

Use `getSession()` rather than `auth()` directly in anything that renders. This
is not stylistic. `auth()` refreshes an expired token by *writing* cookies, Next
forbids cookie writes during a render, and the resulting throw is not catchable
into a null: it becomes a 500 on every route, sign-in included, fifteen minutes
after a user signs in. `lib/session.ts` turns that into a trip through
`app/api/session/refresh`, which is allowed to write cookies. `proxy.ts` usually
gets there first.

In a client component, `useUser()`, `<SignedIn>` and `<SignedOut>` read the
same session from the provider. There is no flash of the wrong state on first
paint, because the server already put the token into the provider in
`app/layout.tsx`.

### Protecting a route

Pages guard themselves:

```tsx
const session = await getSession();
if (!session) redirect('/sign-in');
```

Three lines at the top of the page, and the answer to "does this route need a
session" lives in the route.

`proxy.ts` also runs, and it does two things. It sends anyone holding a refresh
token but no access token through `/api/session/refresh` first, so a stale
session is repaired before a page renders rather than crashing it. And it checks
that a session cookie is **present**, redirecting everyone else to sign-in.

It never calls Rekey, so it costs nothing per request and it cannot know whether
a token is still valid. It is the doormat; `getSession()` in the page is the
lock. Keep both: the proxy means a page you forget to guard is protected by
default, and the page check catches a token that was revoked rather than merely
expired.

### MFA

**MFA is not implemented here, and the starter says so rather than half-doing
it.** If the account has two-factor enabled, `signIn()` returns a challenge
instead of a session, and `app/actions/auth.ts` sends the user to a page that
tells them plainly that this app cannot complete the sign-in. That is a dead end
on purpose: pretending otherwise would loop them forever on a form with no code
field.

To finish it: keep `outcome.mfaChallengeToken` in a short-lived httpOnly cookie,
add a code field, and call `mfaVerify({ mfaChallengeToken, code })` from
`@rekey.dev/nextjs/server`. It sets the session cookies exactly like `signIn`.

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
const plans = await rekey().billing.getPlans({ limit: 20 })
  .then((r) => r.items.filter((p) => p.active));

<PricingTable plans={plans} checkoutAction={checkoutAction} currentPlanSlug={currentPlanSlug} />
```

The table posts `planSlug` to your action, which creates the checkout session:

```ts
const { url } = await rekey().billing.createCheckout(session.accessToken, {
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
const { features, creditBalance } = await rekey().billing.getEntitlements(session.accessToken);
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
const { creditBalance } = await rekey().billing.getEntitlements(session.accessToken);
if (creditBalance < 1) return { ok: false, reason: 'no-credits' };

// ... the work ...

await rekey().credits.consume({ endUserId: session.user.id, amount: 1, idempotencyKey });
```

Pass something stable as `idempotencyKey` (a job id, a request id) and a retry
becomes a no-op instead of a double charge.

**Derive that key on your server.** Every export of a `'use server'` file is a
public endpoint, so a key accepted as a parameter is a key the caller controls:
send the same one every time and the first call deducts while every later call
is deduped, doing the work for free. `app/actions/credits.ts` builds it from the
unit of work instead.

The balance check is also not a lock. Two requests at balance 1 both pass it, so
the deduction is the real arbiter and its 402 has to be caught.

### Cancelling

`cancelSubscription()` asks for cancellation at period end, so the user keeps
what they paid for. A provider-backed subscription therefore stays `ACTIVE`
with `cancelAt` set, and the provider webhook is what eventually ends it. Read
`cancelAt` rather than waiting for `status` to flip.

`cancelAt` and `cancelsAtPeriodEnd()` answer different questions, and swapping
them is a bug worth avoiding by name because this starter shipped with it:

- **`subscription.cancelAt`** — is this *already* scheduled to end?
- **`cancelsAtPeriodEnd(subscription)`** — if I cancel *now*, does the user keep
  the rest of the period, or does access stop on click with no refund?

The second is `status === 'ACTIVE' && currentPeriodEnd !== null`, so it is
`true` for every healthy subscriber. Use it to word the button and it reads
correctly; use it to mean "already ending" and the cancel button disappears for
everyone who could have used it, while a `PAST_DUE` subscriber gets a button
labelled "cancel at period end" that actually ends their access immediately.

## Deploying

Set the same environment variables, with `APP_URL` pointing at your real origin,
and add that origin to the Application's allowed origins in the panel.

`APP_URL` is read per request, so it can be injected at container start.
`NEXT_PUBLIC_*` cannot: those are substituted into the bundle when you build. An
image built in CI without them keeps whatever the build machine had, which is
how a buyer ends up returned to `localhost` after paying.

Anywhere that runs Next.js works; there is nothing platform-specific here.

## Notes

- On Next 15, rename `proxy.ts` back to `middleware.ts`. Same export, older file
  convention.
- Organizations are supported but not used here. Turn them on if a company,
  rather than a person, is the thing that buys your product. There is
  [a guide](https://rekey.dev/blog/when-to-use-organizations).

## Licence

MIT. Take it apart.
