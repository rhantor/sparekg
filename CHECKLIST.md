# SpareKG — Build Checklist

> Source of truth for current work. Reference design: `Claude Ver-2.html` (boss-provided).
> Rule: **follow the reference, don't copy it.** Keep the palette **light & clean**, adapt into
> the existing Next.js 16 + Tailwind 4 setup (`globals.css` tokens, `btn`/`badge`/`glass-card`).

---

## A. Carried-over bugs & foundation fixes

- [x] **Build was broken** — root `tsconfig.json` was type-checking the separate `functions/`
      package (`firebase-functions/v2` not installed). Excluded `functions` → `next build` passes.
- [x] **Admin KYC actions trusted a client-passed `adminUid`** — added Firebase **session-cookie**
      auth (`lib/auth-server.ts` + `api/auth/session` route, wired into `auth-context`).
      `approve/rejectKycSubmission` + `getSignedImageUrl` now call `requireAdmin()`; the queue page
      guards with `getServerUser()`. Client no longer passes a uid.
- [x] **`KYC_ENCRYPTION_KEY` missing** — added a stable 64-hex key to `.env.local`; `encryption.ts`
      now throws on a missing/wrong-length key instead of silently using a random one.
- [x] **Admin KYC queue showed only one submission** — `admin/kyc/page.tsx` now renders the full
      PENDING/UNDER_REVIEW list.
- [x] **`/profile/kyc/success` missing** — added the success route.
- [x] **`(app)` route group had no layout** — added `(app)/layout.tsx`: auth gate, user top/bottom
      nav, theme/logout, and a KYC-status banner. `auth-context` now exposes `isAdmin`/`kycApproved`.

> ⚠️ **Env dependency:** `FIREBASE_SERVICE_ACCOUNT_KEY` is still empty in `.env.local`. The session
> cookie, admin verification, and KYC decryption need valid Admin SDK credentials to run at runtime.

---

## B. Design system (light & clean — adapt the reference)

> **Design direction: premium travel brand** (revised from the boss reference per request) —
> clean grotesk headings, deep navy + teal primary + ocean-blue secondary on warm neutrals,
> lucide icons (no emoji), tighter spacing. Still light & clean.

- [x] Fonts: **Space Grotesk** (display headings) + **Inter** (body/UI) via `next/font/google` CSS
      variables (`--font-display`, `--font-body`). Admin unchanged.
- [x] Premium palette in `globals.css` `@theme`: `navy`(+700/900), `teal`(+500/700),
      `ocean`(+700), `leaf`, `gold`, warm neutrals `ink`/`ash`/`sand`/`paper`/`line`, refined
      `shadow-soft`/`shadow-float`.
- [x] `.site` base wrapper (light, grotesk headings, tight tracking); admin theme untouched.
- [x] Reusable components in `src/components/ui/`: `SectionHeader`, `Card`, `Avatar` (ocean/teal/navy
      gradients), `TrustBadge`, `PriorityBadge` (+ `PriorityBar`) — all **lucide icons**, `Modal`.

---

## C. Public site (unauthenticated landing) — `/(marketing)` ✅

Built light & clean in `src/app/(marketing)/` + `src/components/marketing/`. `/` is now the landing
page (old root redirect removed). Sample content in `lib/marketing-samples.ts`.

- [x] **Nav** — fixed, logo, anchor links, Join Beta + Sign In, mobile menu.
- [x] **Hero** — headline + italic emphasis, CTAs, 3 stats, rotating slider (light).
- [x] **How It Works** — Traveler / Sender panels, 3 steps each, role badges.
- [x] **Videos** — responsive card grid + iframe modal.
- [x] **Feeds** — the centerpiece (`Feeds.tsx` + `FeedCard.tsx`):
  - [x] Live **ticker** (CSS marquee) of active bids per route.
  - [x] **Bidding-window** banner with live countdown timer.
  - [x] **Traveler / Sender tabs**.
  - [x] **Feed cards** — avatar + verified tick, rating/trips, trust badges, route,
        detail rows, priority bar/badge, bid row, Contact + Bid actions.
  - [x] **Contact modal** (WhatsApp deep-link).
  - [x] **Bid modal** — Accept vs Counter → WhatsApp deep-link.
- [x] **Beta signup** form (name/phone/email/role/route/date) + success state.
- [x] **Trust & Safety** — 6 principle cards.
- [x] **About** — story copy + KUL→DAC route visual (one navy accent panel) + stat cards.
- [x] **Footer** — brand, link columns, socials, legal (light/cream).

---

## D. Authenticated user app — `/(app)` ✅

Built in the premium light theme. Shared pieces in `src/components/app/` (`PageHeader`, `FlightCard`,
`StatusBadge`); demo data in `lib/app-samples.ts`. Existing KYC submission + success pages restyled
to light to match.

- [x] **`(app)/layout.tsx`** — restyled to premium light: top nav (Home/Flights/Post/Bids/Profile),
      points chip, avatar, KYC banner, mobile bottom nav, framer page transitions.
- [x] **Home / dashboard** (`/home`) — stat cards, quick actions, your flights, recent bids.
- [x] **Flights browse** (`/flights`) — search + destination + sort filters, `FlightCard` grid.
- [x] **Flight detail** (`/flights/[id]`) — full info + place-bid flow / incoming bids if it's yours.
- [x] **Post a flight** (`/flights/new`) — route, date, airline, kg, price, category chips + success.
- [x] **Bids** (`/bids`) — As sender / As traveler tabs with accept/decline.
- [x] **Profile** (`/profile`) — identity card, stats, account links, sign out.
- [x] **KYC success** (`/profile/kyc/success`) + submission wizard restyled to light.

> Data is mock (`app-samples.ts`); real Firestore reads + the points chip/balance come in Section E.

---

## E. Routing / wiring (after pages exist)

- [ ] Decide route groups: `(marketing)` public, `(app)` authed, `admin/` staff.
- [ ] Update root `/` and `/login` redirects for user vs admin (currently both → `/admin`).
- [ ] Extend `auth-context` to model regular users (not only admin roles).
- [ ] Replace mock data with Firestore reads once UI is settled.

---

### Open decisions
- Hero/footer: keep fully light, or a softened-navy band? (default: light)
- Build order in D: start with **`(app)` shell + dashboard** (recommended) or jump to Flights browse?
