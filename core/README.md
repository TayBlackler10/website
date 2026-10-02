# M2 Core

The engine behind the M2 staff CRM, the M2 App and the website: one member record and one set of rules, running on Cloudflare (a Worker plus a D1 database). GymMaster keeps running the club until each part is proven here. The build spec is in [SPEC.md](SPEC.md).

**Phase 1 is read only.** The Core copies from GymMaster and shows you and Tim the numbers. Nothing staff or members do changes.

## What's here

| File | What it does |
|---|---|
| `schema.sql` | The database: members, flags, plans, memberships, billing ledger, collections, visits, classes, bookings, leads, tasks with outcomes, activity log, automations and results, point of sale, staff, settings |
| `seed_staff.sql` | The first logins: Taylor and Tim as owners |
| `scripts/import_gymmaster_csv.py` | Turns the GymMaster "Current Memberships" export into SQL. Maps GymMaster's 123 membership type names onto 12 clean plan families |
| `src/worker.js` | Sign-in check, role rules, the first screen (summary and member search), nightly GymMaster sync, the $250 block rule |
| `wrangler.toml` | Cloudflare settings, nightly schedule (2:15am) |

Member data never goes in git. Exports and `data/` are in `.gitignore`.

## Set it up (about 20 minutes, once)

Run these from this `core` folder on your Mac. You need Node installed.

1. Sign in to Cloudflare: `npx wrangler login`
2. Make the database: `npx wrangler d1 create m2-core`. Copy the `database_id` it prints into `wrangler.toml`.
3. Build the tables: `npx wrangler d1 execute m2-core --remote --file schema.sql`
4. Add the owner logins: `npx wrangler d1 execute m2-core --remote --file seed_staff.sql`
5. Load the members. In GymMaster run Report > Current Memberships for today, and again from 2024-01-01 to today. Then:

        mkdir -p data
        python3 scripts/import_gymmaster_csv.py today.csv since-2024.csv > data/seed.sql
        npx wrangler d1 execute m2-core --remote --file data/seed.sql

   It prints a summary. Check `current_members` against the GymMaster dashboard.
6. Add the GymMaster staff key: `npx wrangler secret put GM_STAFF_KEY` (paste it when asked, never in chat).
7. Put it live: `npx wrangler deploy`. It prints the address, e.g. `https://m2-core.taylor-3e5.workers.dev`.

## Sign-in (Cloudflare Access, no passwords)

1. Cloudflare dashboard > Zero Trust. If asked, pick a team name (e.g. `m2club`) and the Free plan.
2. Settings > Authentication > add **One-time PIN**.
3. Access > Applications > Add > Self-hosted. Name `M2 Core`, domain = the worker address from step 7.
4. Policy: Allow, Include > Emails: `taylor@m2club.co.nz`, `tim@m2club.co.nz`. Add staff emails later as they get logins.
5. Open the application's Overview and copy the **Application Audience (AUD) tag**. Run `npx wrangler secret put ACCESS_AUD` and paste it.
6. Put the team name in `wrangler.toml` as `ACCESS_TEAM`, then `npx wrangler deploy` again.

Open the address: Cloudflare emails you a code, you're in. Someone not in the staff table gets turned away even if Access lets them through.

## Testing on your own computer

Create `.dev.vars` (ignored by git) with `DEV_EMAIL=taylor@m2club.co.nz`, then `npx wrangler d1 execute m2-core --local --file schema.sql` (and the seeds) and `npx wrangler dev`. The sign-in shortcut only works on localhost.

## Rules built in now

- **$250 block.** Owing $250 or more adds a `blocked` flag nightly (doors, app and class bookings check it). Gifted-time members are never blocked. Paying clears it on the next run. Live balances arrive with the Ezidebit phase.
- **Who sees what.** Owners: everything. Manager and reception: members and what a single member owes, never totals. Trainers and coaches: only their own clients, no billing.
- **One system bills each member.** `billing_accounts.billed_by_system` is `gymmaster` for everyone until the billing pilot.
