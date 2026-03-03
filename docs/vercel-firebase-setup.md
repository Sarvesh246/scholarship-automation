# Vercel + Firebase setup

Follow this so your Vercel deployment shows scholarships and recognizes you as admin when you sign in with Google.

## Why the deployed site shows no scholarships

The app loads scholarships from **Firestore** via the `/api/scholarships` route. That route uses the **Firebase Admin SDK**, which on Vercel **requires** the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable (there is no local key file). If it’s missing, the API fails and the UI shows no scholarships.

So you must configure Firebase (client + service account) and, if you want admin access on the live site, your email in `ADMIN_EMAILS`.

---

## 1. Environment variables in Vercel

In your Vercel project: **Settings → Environment Variables**. You can add variables one by one or use **Import** to load from a file.

### Importing from a file

Vercel lets you **Import** a `.env` file (e.g. paste contents or upload):

1. **Prepare a file** with one variable per line in the form `KEY=value`. Use [.env.local.example](../.env.local.example) in this repo as a template — copy it and fill in your values. Or copy from your project’s local env file: [.env.local](../.env.local) (project root; not in the repo so the link only works when you have the project open locally).
2. Copy from your local `.env.local` if you have one — but see the note about `FIREBASE_SERVICE_ACCOUNT_KEY` below.
3. In Vercel → **Environment Variables** → **Import** (or paste into the import box), then choose which environments (Production, Preview, Development) to apply to.
4. **Do not commit** that file to git if it contains real secrets. Use it only for the one-time import, then delete it or keep it local.

**Important for `FIREBASE_SERVICE_ACCOUNT_KEY`:** The service account is a multi-line JSON. For import, it must be **one line**. Put the whole JSON on a single line (minified), and in the env file use quotes so the value is one line:

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
```

If your `.env.local` has the key split across lines, copy the key into a [JSON minifier](https://www.google.com/search?q=json+minify), then put the result in one line in the import file. After import, you can add or edit `FIREBASE_SERVICE_ACCOUNT_KEY` manually in Vercel if needed.

---

### Required for the app to work (auth + scholarships)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console → Project settings → Your apps → config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | e.g. `your-project-id.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase config |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional; e.g. `G-XXXXXXXXXX` for Analytics |
| **`FIREBASE_SERVICE_ACCOUNT_KEY`** | **Required for scholarships.** See below. |

### Required for you to be admin on the deployed site

| Variable | Description |
|----------|-------------|
| **`ADMIN_EMAILS`** | Comma-separated list of emails that can access Admin. Set this to **the same Google account email you use to sign in** (e.g. `yourname@gmail.com`). Only those emails see the Admin section and can manage scholarships. |

### Optional (cron sync, etc.)

- `CRON_SECRET` – if you use the cron sync route  
- `SCHOLARSHIP_OWL_API_KEY`, `SCHOLARSHIP_API_URL`, etc. – if you use those features  

---

## 2. Getting `FIREBASE_SERVICE_ACCOUNT_KEY`

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Click the **gear** → **Project settings** → **Service accounts**.
3. Click **Generate new private key** (confirm if prompted).
4. A JSON file downloads. Open it; it looks like:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     ...
   }
   ```
5. In Vercel, create an env var **`FIREBASE_SERVICE_ACCOUNT_KEY`**.
6. Paste the **entire JSON as a single line** (no newlines). You can minify it (e.g. copy from a JSON minifier) or replace newlines with `\n` inside the `private_key` string and then put the whole object on one line.

   **Important:** The value must be valid JSON. If the key has newlines, keep them as `\n` inside the string; do not put literal line breaks in the Vercel value.

7. Save. **Redeploy** the project so the new variable is used.

---

## 3. Firebase Authorized domains

So Google Sign-In works on your Vercel URL:

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**.
2. Add your Vercel domain, e.g.:
   - `your-project.vercel.app`
   - Or your custom domain if you use one.

Without this, sign-in will fail on the deployed site.

---

## 4. Confirm admin on Vercel

1. Set **`ADMIN_EMAILS`** in Vercel to your Google email (e.g. `you@gmail.com`). No spaces; for multiple admins use a comma: `a@example.com,b@example.com`.
2. Redeploy if you just added or changed it.
3. Open your Vercel app URL and sign in with that Google account.
4. You should see the **Admin** item in the sidebar and be able to open **Admin → Scholarships** (and other admin pages). If you see “You don’t have permission…”, double-check the email in `ADMIN_EMAILS` matches the one shown in Firebase Auth (or in your Google account).

The app decides admin only by **email**: whoever’s email is in `ADMIN_EMAILS` is treated as admin when they sign in; no other config is required.

---

## 5. Checklist

- [ ] All `NEXT_PUBLIC_FIREBASE_*` vars set in Vercel (same as your local `.env.local`).
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set in Vercel (full JSON, one line).
- [ ] `ADMIN_EMAILS` set to your Google sign-in email (so you’re admin on the deployment).
- [ ] Vercel domain added to Firebase **Authentication → Authorized domains**.
- [ ] Redeploy after changing env vars.

After that, the Vercel deployment should show scholarships (from the same Firestore as local) and recognize you as admin when you sign in with Google.
