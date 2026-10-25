# 🚗 Car Dealership Website + Admin Dashboard (Egypt · Arabic/English)

Full-stack dealership platform: public bilingual website (AR RTL / EN LTR), vehicle sales **and** rentals, admin-defined categories, the **"اختار معايا / Help Me Choose"** vehicle finder, customer inquiries, and a secure hidden admin panel.

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, server components, server actions) |
| Database | PostgreSQL via Drizzle ORM |
| Styling | Tailwind CSS v4 (white / light-gray / charcoal / **green** accent, theme colors editable by admin) |
| Images | Uploaded through the admin, validated, optimized with `sharp` (WebP ≤1600px), stored in PostgreSQL, served from `/api/media/:id` with immutable caching |
| Auth | Server-side sessions (HMAC-signed httpOnly cookie), scrypt password hashing, login throttling |

---

## 1. Project layout & the `index.html` question

```
index.html                     ← launcher page (see note below)
src/app/layout.tsx             ← root layout (lang/dir/theme CSS variables)
src/app/(public)/              ← public pages: / vehicles vehicles/[slug] choose about services contact privacy terms
src/app/admin/                 ← admin: login, setup, (panel)/* protected pages
src/app/admin/actions.ts       ← ALL admin mutations (every action re-checks the session server-side)
src/app/api/                   ← inquiries, media (public read), admin/media (upload), vehicles/search, health
src/components/                ← Header, Footer, VehicleCard, VehicleFinder (filter engine UI), admin UI
src/lib/                       ← i18n dictionary, auth, settings, vehicle search (SQL), media URL helpers
src/db/schema.ts               ← database schema (Drizzle)
scripts/reset-admin-password.mjs
```

**About `index.html`:** this is a **Next.js server application**, not a static site. The real entry point is
`src/app/(public)/page.tsx`; HTML is rendered by the Node server on every request (needed for the database, auth and
filtering). A static `index.html` therefore cannot *be* the website. The `index.html` in the project root is an honest
launcher: when served from the running app it forwards to `/`, and it documents how to run the project. The deployable
artifact is the whole project (`npm run build` → `.next/`), not a single HTML folder.

---

## 2. Run locally

```bash
cp .env.example .env            # edit DATABASE_URL and AUTH_SECRET
npm install
npx drizzle-kit push            # creates all tables + the stock-number sequence
npm run build
npm start                       # http://localhost:3000
```

Development: `npm run dev`.

### Environment variables

| Name | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ (production) | Long random string (≥32 chars) used to sign admin sessions. Generate: `openssl rand -hex 32` |
| `COOKIE_SECURE` | optional | Set `false` only if you run production over plain HTTP |

---

## 3. First admin account (secure bootstrap)

1. Open **`/admin/setup`** on a fresh database. This page **only works while zero admins exist**; after the first (primary) admin is created it permanently redirects to login.
2. Log in at **`/admin/login`**.
3. The admin panel is **not linked anywhere on the public site** (and is `Disallow`ed in robots.txt). Share the URL only with staff.
4. **Only the primary admin** (the account created in setup) can add/remove additional admins or reset their passwords (Admin → Account & Security). There is no public registration.

**Forgot password?** On the server run:
```bash
node scripts/reset-admin-password.mjs owner@example.com "NewStrongPassword123"
```

Prefer to create the first admin from the terminal instead of the browser?
```bash
node scripts/create-admin.mjs you@example.com "YourStrongPassword" "Your Name"
```
(Only works while no admin exists — for later resets use `reset-admin-password.mjs`.)

---

## 4. What the admin can manage

- **Vehicles** – first choose *For Sale* or *For Rent*, then the matching fields appear (sale price + optional installment info · rental price + daily/weekly/monthly period + deposit + conditions). AR/EN title, description, features; specs; multiple images with reorder & main image; multiple categories; draft/publish; availability; featured; SEO fields.
  - Every vehicle gets a **unique stock number** (`CAR-01001`, `CAR-01002`, …) shown on cards, details and WhatsApp messages.
  - Marking a vehicle **Sold** removes it from the public site automatically (it stays in the admin for records). Drafts are never public.
- **Categories** – unlimited admin-defined categories (AR/EN names, description, emoji icon **or uploaded icon image**, order, visibility, show-on-home). Many-to-many with vehicles; deleting a category never deletes vehicles. **Only these admin-created categories (with their icons) appear on "اختار معايا" and the homepage.**
- **Brands & models** – suggestion lists for the vehicle form.
- **Inquiries** – private; statuses New / Contacted / Closed; linked vehicle; quick WhatsApp reply.
- **Dealership info** – names, phone, WhatsApp, email, address, map embed, hours, about, footer, and **any number of page/social links** (Facebook, Instagram, TikTok, OLX…) shown on the Contact page and footer.
- **Services**, **Media library** (upload / alt text / delete with in-use warning), **Homepage** (hero + choose-banner texts, section order & visibility, counts), **Appearance** (logo, hero image, theme color presets + custom colors), **SEO** (titles, descriptions, site URL, OG image), **Privacy & Terms**, **Account & Security**, **Website preview**, **Logout**.
- Dashboard statistics are computed live from the database.

## 5. "اختار معايا" filter logic (implemented in `src/lib/vehicles.ts`)

- Multiple values inside one group = **OR** (e.g. categories 2011 + 2012 → either).
- Different groups = **AND** (e.g. (2011 OR 2012) AND automatic).
- Optional **"All selected categories"** mode (vehicle must belong to every selected category).
- Vehicles are never duplicated (EXISTS / COUNT sub-queries, not joins).
- Only `published` and not `sold` vehicles; availability/transaction filters respected; sorting; pagination; result count; removable filter chips; Clear All; shareable URL (`/choose?cat=1,2&transmission=automatic`).

---

## 6. Deployment

The app needs **Node.js + PostgreSQL**. Static hosting (Netlify static, GitHub Pages, shared PHP hosting) cannot run it.

### Option A – Vercel (app) + Neon / Supabase (PostgreSQL) — free tiers available
1. Create a PostgreSQL database on Neon or Supabase and copy the connection string.
2. Import the repository into Vercel. Build command `npm run build`, output: default. Root directory: project root.
3. Set env vars `DATABASE_URL`, `AUTH_SECRET` in Vercel → Settings → Environment Variables.
4. Run the schema once from your machine: `DATABASE_URL=... npx drizzle-kit push`.
5. Deploy, open `https://your-domain/admin/setup`, create the primary admin, then fill **Admin → SEO → Public site URL**.

Notes: Vercel free plan has a 4.5 MB request body limit for serverless functions — upload images one at a time or ≤4 MB each there (self-hosted servers accept up to 8 MB per file). Images are stored in PostgreSQL; for very large galleries (thousands of photos) consider moving storage to Supabase Storage / S3 later.

### Option B – Any VPS / Railway / Render (Node + Postgres)
```bash
npm ci && npx drizzle-kit push && npm run build && npm start   # behind nginx/Caddy with HTTPS
```
Railway and Render both offer Postgres add-ons; set the same two env vars.

### Not required
No third-party auth provider, no email service, no Supabase RLS (authorization is enforced in server code: every admin server action and the upload API call `requireAdmin()`; public reads only expose published, non-sold vehicles and public settings; inquiries are only readable inside the admin).

---

## 7. Security summary
- Server-side session cookie (httpOnly, SameSite=Lax, Secure in production), 7-day expiry, invalidated on password change (`token_version`).
- scrypt password hashing; login lockout after 5 failures / 15 min.
- Zod validation on every mutation; image uploads verified & re-encoded by `sharp` (type/size/dimension checks).
- Contact form: validation, honeypot, per-IP rate limiting (hashed IP stored).
- Admin routes protected in the layout **and** in every action/API (not a frontend-only guard).
- No secrets in the client bundle; `.env` is git-ignored (`.env.example` provided).

## 8. Database
Schema: `src/db/schema.ts` (tables: admins, settings, media, brands, vehicle_models, categories, vehicles, vehicle_images, vehicle_categories, services, inquiries; sequence `vehicle_stock_seq`; indexes on status/availability, transaction type, make, year, price, created_at, FK columns).
Apply with `npx drizzle-kit push` (or `npx drizzle-kit generate` + `migrate` if you prefer SQL migration files).

## 9. Testing
`tests/e2e.mjs` is a full browser test (Playwright) that drives the real UI on an **empty database**: admin setup → login/logout → settings → categories → adding sale/rent vehicles of several types with image upload → publishing → public pages, language switch, اختار معايا filter logic (OR / AND / ALL), details, inquiry, admin inquiry handling, category deletion safety, theme colors, unauthorized access, mobile layout.
```bash
npm i -D playwright && npx playwright install --with-deps chromium
npm run build && npm start &
BASE=http://localhost:3000 node tests/e2e.mjs
```
Last run: 56/56 passed. `tests/load.mjs` measures throughput/latency (`BASE=... CONC=50 DUR=12 node tests/load.mjs`).
Playwright is a dev-only tool and is **not** in `dependencies`, so production installs stay small.
