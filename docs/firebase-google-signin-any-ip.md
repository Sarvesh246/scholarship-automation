# Allow Sign in with Google from any IP / network

If only certain IPs can use **Sign in with Google** (e.g. only your office WiFi), the limit is set in **Google Cloud Console**, not in this app. To let anyone sign in from any network:

---

## Finding your project: Firebase = Google Cloud

**Your Firebase project is the same as a Google Cloud project.** They share one Project ID. If you don’t see “a Google Cloud project that matches” your Firebase project, try this:

1. **Use the same Google account** in both places  
   In [Firebase Console](https://console.firebase.google.com/) you’re signed in as one Google account. In [Google Cloud Console](https://console.cloud.google.com/) you must be signed in as **that same account**. Switch account (top-right) in Cloud Console if needed.

2. **Get your Project ID from Firebase**  
   - Firebase Console → **Project settings** (gear next to “Project overview”).  
   - Copy **Project ID** (e.g. `my-app-12345`). That’s the same ID used in Google Cloud.

3. **Open Google Cloud Console for that project**  
   - Go to [Google Cloud Console](https://console.cloud.google.com/).  
   - At the top, click the **project dropdown** (“Select a project”).  
   - Search or scroll for the **exact Project ID** from step 2 and select it.  
   - Or go directly: `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID` (replace `YOUR_PROJECT_ID` with your Firebase Project ID).

4. **If it still doesn’t appear**  
   - In Firebase: **Project settings** → under “Your apps”, confirm the project.  
   - In Cloud Console: make sure you’re not filtering by organization/folder; try “All” and search by Project ID.

Once the correct project is selected in Google Cloud Console, the API key and OAuth settings you change there apply to your Firebase app.

---

## 1. Fix the Firebase Web API key (most common cause)

The browser uses your **Firebase Web API key** for Auth. If that key is restricted to specific IP addresses, sign-in fails from other networks.

1. In **Google Cloud Console**, ensure the project selected at the top is your Firebase project (same Project ID as in the “Finding your project” section above).
2. Open **APIs & Services** → **Credentials** (or use the direct link: `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID`).
3. Under **API Keys**, find the key that matches `NEXT_PUBLIC_FIREBASE_API_KEY` in your env (often named “Web client” or “Browser key”).
4. Click that key.
5. Under **Application restrictions**:
   - If it is **“IP addresses”**: switch to **“None”** so the key works from any IP (normal for a public web app), **or**
   - If you prefer to restrict by site: choose **“HTTP referrers (web sites)”** and add:
     - `https://your-production-domain.com/*`
     - `https://*.vercel.app/*` (if you use Vercel)
     - `http://localhost:*` (for local dev)
   - Do **not** use “IP addresses” if you want users on any WiFi/network to sign in.
6. Under **API restrictions**, you can leave **“Restrict key”** and allow only the APIs you need (e.g. **Identity Toolkit API** for Firebase Auth). That does not restrict by IP.
7. Click **Save**.

After saving, wait a short time and try Sign in with Google from a different network (e.g. phone hotspot or another WiFi). It should work without changing any app code.

## 2. OAuth consent and authorized domains (if it still fails)

- **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**: ensure your production domain and `localhost` are listed.
- **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**: if the app is in “Testing”, only test users can sign in; add the needed users or publish the app so any Google account can sign in.

## Summary

| Goal                         | Where to change it                          |
|-----------------------------|---------------------------------------------|
| Allow sign-in from any IP   | API key → Application restrictions → None (or HTTP referrers with your domains) |
| Allow sign-in from your site only | API key → HTTP referrers with your URLs     |
| Who can sign in (which Google accounts) | OAuth consent screen (Testing vs Production) |

This app does not enforce any IP checks; all such limits are in Google Cloud / Firebase configuration.
