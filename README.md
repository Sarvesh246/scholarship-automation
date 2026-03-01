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
