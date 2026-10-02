# M2 Core

The engine behind the M2 staff CRM, the M2 App and the website: one member record and one set of rules, running on Cloudflare (a Worker plus a D1 database). GymMaster keeps running the club until each part is proven here. The build spec is in [SPEC.md](SPEC.md).

**Phase 1 is read only.** The Core copies from GymMaster and shows you and Tim the numbers. Nothing staff or members do changes.

## What's here

| File | What it does |
|---|---|
| `schema.sql` | The database: members, flags, plans, memberships, billing ledger, collections, visits, classes, bookings, leads, tasks with outcomes, activity log, automations and results, point of sale, staff, settings |
| `seed_staff.sql` | The first logins: Taylor and Tim as owners |
| `scripts/import_gymmaster_csv.py` | Turns the GymMaster "Current Memberships" export into SQL. Maps GymMaster's 123 membership type names onto 12 clean plan families |
| `src/worker.js` | Sign-in check, role rules, Today jobs and outcomes, members, leads and website intake, add member, key tags, nightly GymMaster sync, the $250 block rule |
| `src/ui.js` | The staff app: Today, Members, Leads, Add member, Key tag lookup |
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
6. Add the two GymMaster keys (paste each when asked, never in chat):
   - `npx wrangler secret put GM_STAFF_KEY` for the nightly copy
   - `npx wrangler secret put GM_API_KEY`, the same "Low Permission API Key" m2-join uses, for Add member
7. Put it live: `npx wrangler deploy`. It prints the address, e.g. `https://m2-core.taylor-3e5.workers.dev`.

## Sign-in (Cloudflare Access, no passwords)

1. Cloudflare dashboard > Zero Trust. If asked, pick a team name (e.g. `m2club`) and the Free plan.
2. Settings > Authentication > add **One-time PIN**.
3. Access > Applications > Add > Self-hosted. Name `M2 Core`, domain = the worker address from step 7.
4. Policy: Allow, Include > Emails: `taylor@m2club.co.nz`, `tim@m2club.co.nz`. Add staff emails later as they get logins.
5. Add a second policy on the same app: **Bypass**, Include > Everyone, for the paths `/api/intake` and `/billing-done` (website forms and members' phones need these without signing in; the worker checks its own key on `/api/intake`).
6. Open the application's Overview and copy the **Application Audience (AUD) tag**. Run `npx wrangler secret put ACCESS_AUD` and paste it.
7. Put the team name in `wrangler.toml` as `ACCESS_TEAM`, then `npx wrangler deploy` again.

Open the address: Cloudflare emails you a code, you're in. Someone not in the staff table gets turned away even if Access lets them through.

## Testing on your own computer

Create `.dev.vars` (ignored by git) with `DEV_EMAIL=taylor@m2club.co.nz`, then `npx wrangler d1 execute m2-core --local --file schema.sql` (and the seeds) and `npx wrangler dev`. The sign-in shortcut only works on localhost.

## The staff app

- **Today.** Owners see the business strip (members, Passport, weekly billing, money owed). Everyone sees "Do this today": new leads to contact, new members with no bank details, trials finishing, call backs due, blocked members (manager and owners), new members with no key tag. Open a job and record what happened in one tap: joined, call back (with date and note), no answer, not for them, paid, bank details in, tag given. Every outcome is saved with who did it, so we can see which jobs make money.
- **Members.** Search by name, email, mobile or tag. Profile with plan, flags, goal, where they came from, Passport number, visits, billing (by role), key tag history, notes and history, and a "best next step". Edit details, set flags (gifted time and corporate are owner or manager only), give or replace a key tag.
- **Leads.** One board from new to joined, filter by type, add a walk-in, assign to a trainer, record outcomes. Free PT leads go to the trainer with the fewest open leads, new trainers first.
- **Key tag lookup.** Scan a found tag to see whose it is and its history.

### Website leads into the Core

`POST /api/intake` takes `{kind, name, email, mobile, goal, source, campaign, notes}` with the header `X-M2-Key` set to the `INTAKE_KEY` secret. Kinds: trial, free_pt, unfinished_signup, bring_a_mate, app_upgrade, website_form, meta_form. Call it from the website's workers (m2-join, the free PT form), never from browser code, so the key stays private. The same person and type within 14 days updates the open lead instead of making a second one.

Set the key with `npx wrangler secret put INTAKE_KEY` (any long random string) and add the same value to the worker that calls it.

## Add member

The **Add member** button (owners, manager, reception) walks through:

1. **Membership.** Perform first, then frequency and Flexi. Prices come live from GymMaster.
2. **Details.** Name, email, mobile, date of birth, emergency contact. Goal and where they heard about us are compulsory. Fitness Passport tick. Bring a Mate: search the member who brought them.
3. **Terms and signature** on screen.
4. **Bank details.** Opens on the same screen. While GymMaster bills, it opens the member's GymMaster billing page. Once billing moves (`BILLING_MODE = "ezidebit"`), it opens Ezidebit's secure form, with a QR code so the member can type their details on their own phone. M2 never sees the numbers either way.
5. **Key tag.** Scan the tag; the reader types the number. One tag per person, every tag kept in history (active, lost, replaced, returned), so a found tag can be traced.

The member is created in GymMaster first (same signup the join page uses), then in the Core with the same id, so the two always agree. Until doors move off GymMaster, the tag also needs adding on the GymMaster profile; the screen gives a link straight to it.

Built-in checks: no duplicate people (email or mobile), Fitness Passport members can't take trials or use Bring a Mate, Bring a Mate gives both people 4 weeks credit, and anyone with billing gets a "missing billing" job on Today until it's done.

## Fitness Passport

Passport pays M2 per visit, matched on each member's **Fitness Passport ID**. No ID, no money for that visit.

- **Add member.** Pick Fitness Passport (or tick the Passport box) and the Fitness Passport ID is compulsory. The same ID can't be on two people.
- **GymMaster still reports the visits.** GymMaster's sign-up doesn't take the ID, so after adding a Passport member the screen asks reception to type it into GymMaster (profile, Additional Details, Fitness Passport ID). It stays on Today as "Passport IDs to type into GymMaster" until someone taps "It's in GymMaster".
- **Today** also lists Passport members with no ID, with a box to add it on the spot.
- **Fitness Passport page.** Every Passport visit for the month with the ID it's paid on, visits with no ID, IDs on two people, and a CSV download (ID, name, visits). Owners also see the estimated payout from the tier rates, the current rate, visits to the next rate and the money lost to missing IDs.
- **Getting the IDs in.** Add the Fitness Passport ID column to the GymMaster member export, then run the import. The import picks it up and sets `fp_ids_loaded`, which switches on the "missing ID" list for everyone.
- **Tier rates** are in the `fp_tiers` setting (`up to visit:rate`, last one open-ended).
- **After GymMaster.** GymMaster talks to Fitness Passport with a site token and a device token. For the Core to report check-ins itself, Fitness Passport has to give M2 their integration details (or approve the Core as a provider). Ask before the doors move.

## Rules built in now

- **$250 block.** Owing $250 or more adds a `blocked` flag nightly (doors, app and class bookings check it). Gifted-time members are never blocked. Paying clears it on the next run. Live balances arrive with the Ezidebit phase.
- **Who sees what.** Owners: everything. Manager and reception: members and what a single member owes, never totals. Trainers and coaches: only their own clients, no billing.
- **One system bills each member.** `billing_accounts.billed_by_system` is `gymmaster` for everyone until the billing pilot.
