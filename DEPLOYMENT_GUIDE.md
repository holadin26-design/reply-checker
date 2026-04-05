# Reply Radar - Vercel Deployment Guide

To deploy **Reply Radar** to Vercel and fully enable background scanning across all connected Gmail inboxes, follow these steps exactly:

## 1. Prepare your GitHub Repository
1. Initialize a git repository in the `reply-radar` folder.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new repository on GitHub and push your code to it.

## 2. Deploy to Vercel
1. Go to [Vercel](https://vercel.com/) and click **Add New... > Project**.
2. Import your newly created GitHub repository.
3. Open **Environment Variables** during the project setup and add these keys (from your `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Required for the chron job to bypass RLS)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (Set this to your Vercel production URL later, e.g., `https://my-reply-radar.vercel.app`)
   - `OPENAI_API_KEY`
   - `NOTIFICATION_FROM_EMAIL` (The email that will send notifications)
   - `NOTIFICATION_EMAIL_PASSWORD` (App Password for Gmail, or API Key for SendGrid)
4. Click **Deploy**. Vercel will automatically generate a `CRON_SECRET` for your project to secure the cron API route.

## 3. Update Provider Callbacks
1. **Google Cloud Console:** Find your OAuth credentials. Under **Authorized redirect URIs**, add your live Vercel URL with `/api/auth/callback` attached:
   `https://[YOUR_VERCEL_APP_URL]/api/auth/callback`
2. **Supabase Dashboard:** Go to Authentication > URL Configuration. Update the **Site URL** and **Redirect URLs** to include your live Vercel URL.

## 4. Setup CRON Secret Security
Vercel handles Cron execution securely. When you define `vercel.json` with a cron path, Vercel hits that path and includes an `Authorization: Bearer [CRON_SECRET]` headed. 
Because you pushed the code using Vercel infrastructure, this environment variable is injected automatically in your production Vercel project, and `app/api/cron/scan/route.ts` expects it and will execute.

By default, the cron is scheduled to run every hour (`0 * * * *`). You can further edit `vercel.json` if you wish to run it more frequently (e.g. `*/15 * * * *` for every 15 minutes, depending on your Vercel plan limits).

That's it! Your Reply Radar app is now fully functional online and will automatically fetch and detect positive and negative replies in the background.
