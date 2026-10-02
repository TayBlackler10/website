# m2-join worker

Backend for m2club.co.nz/join.html. Keeps the GymMaster API key off the website and does the signup.

## Deploy (Cloudflare dashboard, about 5 minutes)

1. Cloudflare dashboard > Workers & Pages > Create > Create Worker. Name it `m2-join` and deploy the hello world.
2. Edit code, delete everything, paste in `worker.js`, Deploy.
3. Settings > Variables and Secrets, add these as plain text variables:
   - `GM_BASE` = `https://m2trainingclub.gymmasteronline.com/portal/api`
   - `COMPANY_ID` = `4`
   - `PT_SCRIPT` = the PT Leads Apps Script URL (in wrangler.toml)
   - `BILLING_GRACE_DAYS` = `3`
   - `ALLOWED_ORIGINS` = `https://m2club.co.nz,https://www.m2club.co.nz`
   - `HIDE_IDS` = leave blank, or comma separated membership IDs to keep off the page
   - `PASSPORT_IDS` = `844596` (the GymMaster "Fitness Passport" membership type)
   - `CORE_URL` = `https://m2-core.taylor-3e5.workers.dev`
4. Add the **Secrets**: `GM_API_KEY` = the GymMaster "Low Permission API Key", and `INTAKE_KEY` = the same value as M2 Core's `INTAKE_KEY` (sends new Passport members' IDs to the Core).
5. Check it: open `https://m2-join.taylor-3e5.workers.dev/memberships`, you should see the membership list.

If the worker ends up on a different URL, change `API` near the top of the script in join.html.

## Or with wrangler

    cd join-worker
    npx wrangler deploy
    npx wrangler secret put GM_API_KEY

## Links

- All options: `m2club.co.nz/join.html`
- Free trial straight away: `join.html?m=trial`
- A tier: `join.html?tier=perform` (daily, classes, perform, recovery)
- An exact membership: `join.html?m=844778` (GymMaster membership type ID)
- Track source: add `&utm_source=meta` etc. Pre-fill: `&first=Sam&last=Smith&email=...&phone=...`

## Fitness Passport

- Link: `join.html?m=passport` opens the Fitness Passport tab.
- The Fitness Passport ID is compulsory (5 to 12 digits). Passport sign-ups never take promo codes and pay nothing.
- GymMaster's online sign-up has no field for the ID, so it goes two places: M2 Core (reception's Today list, "Passport IDs to type into GymMaster") when `CORE_URL` and `INTAKE_KEY` are set, and an email to M2's inbox via Web3Forms as a backup. Reception types it into GymMaster: profile, Additional Details, Fitness Passport ID.
- GymMaster needs "Enable online sign-up" ticked on the Fitness Passport membership type (Settings, Membership Types, Fitness Passport, Sell Membership Online), or the sign-up is refused and the page asks them to come to reception.
