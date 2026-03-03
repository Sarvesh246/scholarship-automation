# ApplyPilot

A calm, structured web app for managing scholarship applications: track deadlines, organize documents, and draft essays in one dashboard. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Firebase Auth.

## Features

- **Public**: Landing, Pricing, Sign in / Sign up / Forgot password
- **App (auth required)**: Dashboard, Scholarships list/detail, Applications pipeline & workspace, Essays, Deadlines, Profile, Settings
- **Auth**: Google Sign-In + Email/Password (Firebase Auth)
- **Theme**: Light/dark mode with CSS variables; toggle persists in `localStorage` and respects system preference by default
- **No AI**: Base UI/UX only; no AI assistant, scoring, or drafting

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication**:
   - **Sign-in method** → enable **Email/Password**
   - **Sign-in method** → enable **Google** (add support email if prompted)
3. Register a web app in the project; copy the config object.

### 3. Environment variables

Copy the example env file and fill in your Firebase config:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or sign in; you’ll be redirected to `/app/dashboard`.

## Route protection

- **Middleware** (`middleware.ts`): Protects `/app/*` by checking for an `auth` cookie. If missing, redirects to `/auth/sign-in`.
- **Client guard** (`AuthGate`): After loading the app layout, checks Firebase `onAuthStateChanged`. If there’s no user, redirects to sign-in.

On successful login/signup we set `document.cookie = "auth=1; path=/"`. On sign out we clear it. This is acceptable for a base UI; for production you can harden by:

- Using httpOnly cookies set by a backend after verifying the Firebase ID token.
- Validating the token in middleware (e.g. with a small API route or edge function).

## Project structure

- `app/` – Next.js App Router pages and layouts
- `components/ui/` – Design system (Button, Card, Input, Modal, Toast, etc.)
- `components/layout/` – AppShell, SidebarNav, TopBar, PageHeader, AuthGate
- `components/feature/` – PipelineBoard, ScholarshipRowCard, DeadlineList, Checklist, DocumentSlot, PromptBlock, EssayCard
- `lib/` – Firebase init, auth helpers, theme utils
- `data/mockData.ts` – Mock scholarships, applications, essays, deadlines
- `types/` – Shared TypeScript types

## Scripts

- `npm run dev` – Start dev server
- `npm run build` – Production build
- `npm run start` – Start production server
- `npm run lint` – Run ESLint

## Deploy to Vercel

Vercel is the recommended deployment platform for this app. It supports full Next.js (API routes, middleware, auth) and the cron job for scholarship sync.

### 1. Connect your repo

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project** and import your `scholarship-automation` repo.
3. Vercel will auto-detect Next.js; no build settings needed.

### 2. Environment variables

In **Project Settings → Environment Variables**, add:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`

For **Admin** and **cron sync** (optional): `FIREBASE_SERVICE_ACCOUNT_KEY`, `ADMIN_EMAILS`, `CRON_SECRET`, `SCHOLARSHIP_API_URL`. See Admin section below.

### 3. Firebase authorized domains

In Firebase Console → **Authentication → Settings → Authorized domains**, add your Vercel domain (e.g. `your-app.vercel.app`).

### 4. Allow Sign in with Google from any network (no IP restriction)

If only certain IPs can sign in with Google, the restriction is in **Google Cloud Console**, not in this app.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select your Firebase project.
2. Go to **APIs & Services → Credentials**.
3. Find the **API key** used by your web app (the same value as `NEXT_PUBLIC_FIREBASE_API_KEY`).
4. Click the key → **Application restrictions**.
5. If it is set to **“IP addresses”** (or “HTTP referrers” that don’t include your site), either:
   - Set to **“None”** so the key works from any IP (typical for a public web app), or  
   - Add the origins/URLs you need (e.g. `https://your-app.vercel.app/*`, `http://localhost:3000/*`) under **“HTTP referrers”** so any visitor can sign in from any network.
6. Save. Sign in with Google should then work from any WiFi or network.

See also **docs/firebase-google-signin-any-ip.md** for step-by-step details.

### 5. Deploy

Push to `main` (or your configured branch). Vercel deploys automatically. The cron job runs hourly via `vercel.json`.

## Admin: managing scholarships

You can add, edit, and delete scholarships from the app so the catalog grows without code or seed changes.

### 1. Enable admin APIs

- **Local:** Create `scripts/serviceAccountKey.json` (Firebase Console → Project Settings → Service Accounts → Generate new private key). The Admin API routes use it automatically when `FIREBASE_SERVICE_ACCOUNT_KEY` is not set.
- **Production (e.g. Vercel):** Set env vars:
  - `FIREBASE_SERVICE_ACCOUNT_KEY` – full JSON string of the service account key (no newlines; paste the whole object).
  - `ADMIN_EMAILS` – comma-separated emails that can access admin (e.g. `you@example.com,other@example.com`).

### 2. Who sees Admin

Only users whose **email** is in `ADMIN_EMAILS` see the **Admin** link in the sidebar and can open **Admin → Scholarships** to add, edit, or delete scholarships. Everyone else gets a “no permission” message on `/app/admin/scholarships`.

### 3. Adding scholarships

Use **Admin → Scholarships** in the app: click **Add scholarship**, fill title, sponsor, amount, deadline, description, categories, eligibility, and essay prompts. New scholarships show up for all users after you save. No deploy or seed script needed.

---

## Automated scholarship sync (cron + external API)

A cron job can periodically fetch scholarships from an external API and upsert them into Firestore so new opportunities appear without manual Admin entry.

### 1. API route

- **URL:** `GET` or `POST` `/api/cron/sync-scholarships`
- **Auth:** Request must include either:
  - `Authorization: Bearer <CRON_SECRET>`, or
  - `?secret=<CRON_SECRET>`
- **Behavior:** Fetches from `SCHOLARSHIP_API_URL`, maps each item to your `Scholarship` shape, and writes/updates Firestore `scholarships` (id = slug from title or external id). Returns `{ ok, created, updated, errors? }`.

### 2. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes (for cron) | Shared secret so only your cron can call the route. Generate a random string and set it in Vercel (and in your external cron caller if you don’t use Vercel Cron). |
| `SCHOLARSHIP_API_URL` | Yes (for sync) | Full URL that returns a JSON array (or `{ data: [] }` / `{ scholarships: [] }` / `{ results: [] }`) of scholarship objects. |
| `SCHOLARSHIP_API_KEY` | No | If the API requires a key, set it here. It’s sent as `Authorization: Bearer <key>` and `x-api-key: <key>`. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes (production) | Required for the sync route to write to Firestore (same as Admin). |

### 3. Expected API response shape

Each item in the array can have (all optional except a title-like field):

- `title` or `name` – used as scholarship title (required for a useful row).
- `sponsor`, `provider`, or `organization`
- `amount` (number or string)
- `deadline` (e.g. `YYYY-MM-DD`)
- `description`
- `eligibility` (string or array of strings)
- `categories` or `category` (mapped to STEM, Arts, Community, Leadership, FinancialNeed where possible)
- `prompts` or `essay_prompts` (array of strings)

Ids are generated from `id` if present, otherwise from a slug of the title so the same scholarship updates in place on later syncs.

### 4. Vercel Cron

The repo includes a `vercel.json` that schedules the sync every hour:

```json
{
  "crons": [{ "path": "/api/cron/sync-scholarships", "schedule": "0 * * * *" }]
}
```

On Vercel, set `CRON_SECRET` and `SCHOLARSHIP_API_URL` (and `SCHOLARSHIP_API_KEY` if needed) in the project environment. Vercel will call the route on the schedule and send `Authorization: Bearer <CRON_SECRET>`.

### 5. Other cron providers

To trigger from [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com/), or a Cloud Function:

- Call `GET` or `POST` `https://your-domain.com/api/cron/sync-scholarships` on your desired schedule.
- Send `Authorization: Bearer <CRON_SECRET>` (or use `?secret=<CRON_SECRET>`).

---

## Custom web scraper

A Python scraper in `scripts/scrape_scholarships/` can scrape scholarship sites and import into Firestore:

```bash
cd scripts/scrape_scholarships
pip install -r requirements.txt
python main.py -o scraped.json              # Save to file
python main.py --post http://localhost:3000 --token YOUR_FIREBASE_TOKEN  # Import directly
```

Includes a scraper for collegescholarships.org (23,000+ scholarships). See `scripts/scrape_scholarships/README.md` for adding new sites.

---

## Optional: manual Admin only

If you prefer not to use an external API, use **Admin → Scholarships** (and `ADMIN_EMAILS`) to add and edit scholarships by hand. No cron or API keys required.
