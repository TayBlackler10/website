# M2 Chat Proxy - Deployment Guide

The website chat widget talks to `/api/chat`. GitHub Pages can't run server
code, so this small Cloudflare Worker holds the Anthropic API key and answers
that endpoint. The key lives only on Cloudflare's side, never in the browser.

You only need to do this once. Budget about 15 minutes.

---

## Before you start

1. **Rotate the old key.** The previous key was public in the website code, so
   treat it as compromised. Go to https://console.anthropic.com, delete the old
   key, and create a fresh one. Copy the new key somewhere safe for a moment.

2. Create a free Cloudflare account if you don't have one:
   https://dash.cloudflare.com/sign-up

3. Install Node.js if you don't have it: https://nodejs.org (LTS version).

---

## There are two paths. Pick one.

### Path A (recommended): your domain is on Cloudflare

This serves the chat from `m2club.co.nz/api/chat` and needs NO website change.

To use this path, `m2club.co.nz` must use Cloudflare for DNS. If it doesn't yet,
you can add the site to Cloudflare (Dashboard > Add a site) and update your
nameservers at your domain registrar. GitHub Pages keeps working through
Cloudflare with no downtime when set up correctly.

Steps:

1. Open a terminal in the `chat-proxy` folder:
   ```
   cd chat-proxy
   ```

2. Log in to Cloudflare from the terminal:
   ```
   npx wrangler login
   ```

3. Store the new API key as an encrypted secret (paste the key when prompted):
   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

4. Deploy:
   ```
   npx wrangler deploy
   ```

5. Test it:
   ```
   curl -X POST https://m2club.co.nz/api/chat \
     -H "Content-Type: application/json" \
     -d '{"system":"You are a test.","messages":[{"role":"user","content":"hi"}]}'
   ```
   You should get back JSON with a `content` field. Then open m2club.co.nz and
   try the chat bubble. Done - no website change needed.

---

### Path B: keep DNS where it is (no Cloudflare DNS)

This deploys the Worker to a free `*.workers.dev` URL and points the widget at it.

1. In `wrangler.toml`, delete the entire `[[routes]]` block (the three lines).

2. From the `chat-proxy` folder:
   ```
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler deploy
   ```

3. The deploy prints a URL like:
   `https://m2-chat-proxy.YOURNAME.workers.dev`
   Copy it.

4. Tell me that URL (or whoever maintains the site). The widget currently calls
   `/api/chat`; it needs to call that full workers.dev URL instead. It's a
   one-line change on each page that has the chat widget. After that, also add
   your workers.dev hostname to `ALLOWED_ORIGINS` is not needed - the allowed
   origins are about which sites may call the Worker, which stays m2club.co.nz.

---

## Notes

- **Cost:** Cloudflare's free tier covers 100,000 Worker requests/day, far more
  than a gym site chat needs. The only spend is your normal Anthropic usage.
- **The key is never in the website.** It's an encrypted Worker secret. If you
  ever need to change it, just run the `wrangler secret put` command again.
- **Model/limits** (Haiku, 400 max tokens) are set in `worker.js`. Change them
  there and redeploy if you want longer replies or a different model.
- The Worker only accepts requests from m2club.co.nz and caps message count, so
  it can't easily be abused as a free general-purpose AI endpoint.
