# M2 Core build spec

Version 1, 2 October 2026. Owner: Taylor Blackler. Designs: the M2 Staff CRM canvas (14 screens) and the M2 Core blueprint, both in Claude.

This repo is public, so this file holds no business figures and no member data. Those live in the Core itself, owner logins only.

## 1. What we're building

One member platform for M2 that replaces GymMaster. Every screen reads and writes the same record:

- **Staff CRM** for reception, the manager, trainers and owners
- **M2 App** for members and coach mode (already built, moves onto the Core)
- **Website**: join page, timetable, free PT, forms
- **Owners view**: money, staff and access

Principles:

1. The system tells staff what to do. The Today list ranks the day's jobs by money at stake.
2. Rules live in the system, not in people's heads (Passport exclusions, gifted time, the $250 block).
3. Every action has a name on it and every job records what happened.
4. Money moves last. Members, leads and bookings first, billing only once everything else is proven.
5. Exactly one system bills each member at any time. Never both.
6. Bank and card details never touch M2. Ezidebit holds them; we keep their customer reference.

## 2. Architecture

- **Cloudflare Worker `m2-core`** with a **D1 database** (`core/`). Same account as the join page and Command Centre.
- **Sign-in:** Cloudflare Access with email one-time codes. The worker checks the Access token, then the `staff` table for the role. No shared passwords.
- **GymMaster sync:** nightly copy while GymMaster runs the club. Members via the staff API (`/v1/members?when=`), memberships and visits via the API once GymMaster confirms access (until then, a weekly CSV import).
- **Ezidebit:** direct API once the account questions are answered. Hosted form for new members' bank details.
- **Email sending:** moves to the Core in November (an email service on m2club.co.nz with DKIM), so every send is tracked against outcomes.
- **Xero:** read by the existing `m2-command` worker; the Money screen reads from it.

## 3. Data model

Full definitions in `core/schema.sql`.

| Area | Tables | Notes |
|---|---|---|
| People | `members`, `member_flags`, `member_health_notes`, `staff` | Flags: passport, gifted_time, corporate (with employer), staff, trainer, do_not_contact, blocked, student. Health notes only with consent, trainer and owners only |
| Plans | `plans`, `memberships` | Each GymMaster type maps to one clean family. Memberships carry price, weekly value, lock-in end, end date, freeze, cancel reason (required) |
| Money | `billing_accounts`, `payments`, `collections_cases` | Ledger only. `balance_owing` drives the block. `billed_by_system` = gymmaster or core |
| Club | `visits`, `classes`, `bookings` | Visits from doors, app and gate scans. Bookings: booked, waitlist, attended, no_show, cancelled, late_cancel |
| Work | `leads`, `tasks`, `activity` | Every lead source in one table. Tasks carry value at stake and the outcome |
| Messages | `automations`, `message_sends` | Each automation has a goal and a window; sends record whether the goal was met, with a held-back comparison group |
| Sales | `products`, `sales`, `sale_lines` | GymMaster's real product list |
| System | `sync_log`, `settings` | Rule numbers live in `settings`, not in code |

### Plan families

GymMaster has 123 membership type names across 13 categories (Old, Old Corporate, Promotions, Discontinued and so on). They map to 12 families:

| Family | Includes | Notes |
|---|---|---|
| perform | Gym, classes, recovery | Includes legacy Gateway |
| classes | Gym, classes | |
| daily | Gym floor | Includes legacy Entry |
| recovery | Recovery area | No free PT |
| transporter | Everything | Legacy |
| passport | Everything | Fitness Passport, paid per visit, excluded from all offers |
| pass | Everything | 10 and 20 trip passes |
| pool | Pool | Legacy swimming pool memberships |
| trial | Everything | 5 Days for $5 and older trials |
| challenge | | 8 Week Challenge and older challenges |
| staff | | Staff and PT rent |
| other | | Test and add-on types |

Corporate, student, flexi, paid in full and frequency are attributes on the plan, not separate families.

## 4. Roles

| Area | Owner | Manager | Reception | Trainer or coach |
|---|---|---|---|---|
| Member profiles and visits | All | All | All | Own clients |
| Check-in, sign-up, trials | Yes | Yes | Yes | No |
| Leads | All | All | Trial calls | Own leads |
| Classes and rosters, booking members in | Yes | Yes | Yes | Classes they coach |
| What one member owes | Yes | Yes | Yes | No |
| Collections and at-risk calls | Yes | Yes (Bekka) | No | No |
| Monthly totals, revenue, Xero, P&L | Yes | No | No | No |
| Settings, prices, staff logins | Yes | No | No | No |

Owners: Taylor and Tim. Each staff member has their own login. Their gym membership (doors) is separate from their login (CRM).

## 5. Rules

**Offers and access**
- Fitness Passport members are excluded from every deal (Bring a Mate, 5 Days for $5, anniversary weeks, giveaways). They do get the free PT session.
- Corporate prices are never shown or sold online. Corporate needs 10 or more people.
- Never send anyone to the GymMaster checkout. Every trial and membership button opens `join.html?m=<id>`.
- Perform is listed first everywhere. New trainers first in listings and lead assignment: Matthew, Eden, Joe, Te.
- Bring a Mate: referrer and mate both get 4 weeks free, mate skips the $49 joining fee and $25 key tag. Applied automatically from the mate's link.
- Trainers are contracted and set their own prices. PT sessions are not sold through point of sale.

**Money**
- **$250 block:** owing $250 or more blocks the member at the doors, in the app and from booking classes, until paid. The app shows the amount and a pay link. Access returns as soon as they pay. Gifted-time members are never blocked.
- Collections settlement: owing up to $1,500, offer 50%; over $1,500, offer 30%.
- Never refer anyone owing under $1,000 to Marshall Freeman. Never include gifted-time members in collections.
- Collections has two tabs: current members, and people who left with money owing. Settled and ready-to-refer are pinned to the top.
- Paid memberships give bank details online through Ezidebit's hosted form. Trials converting in person can still do it at reception. To be tested before committing.

**Key tags**
- One tag per person. Every tag ever issued is kept with its status (active, lost, replaced, returned) and who handed it out.
- Until doors move off GymMaster, a new tag is also added on the GymMaster profile.

**Classes**
- Cap of 20. Cancel 12 or more hours before; late cancels count as no-shows.
- Gate scan checks people in. Not scanned 10 minutes after start: no-show, spot offered to the waitlist.
- Walk-ins blocked at 20. Staff can book a member in; if full they go to the top of the waitlist.

**Data at the door**
- Lead source and goal are compulsory at sign-up, captured automatically from ad links (UTM tags) where possible.
- A cancel reason is required for every cancellation, and a reason for every freeze.
- Unfinished online sign-ups become leads the same day.

**Messages**
- Automations are judged by what people did next (joined, visited, paid, upgraded, booked a PT), not opens.
- A comparison group of about 10% is held back from each automation. Decision pending from Taylor.
- Replies are drafted in Taylor's voice and sent by a person.

## 6. Screens

All screens follow the website's look: black sidebar with the lime logo, paper background, white rounded cards, Archivo headings, DM Sans body, lime pill buttons. Never lime text on white.

| Screen | Who | What it does |
|---|---|---|
| Today | Everyone (business strip owners only) | Ranked jobs with owner, who's in the club now with flags, today's classes, Ask M2 |
| Call mode | Reception, manager | Works through a job's list one person at a time: context, what to say, one-tap outcome |
| Member profile | By role | Flags, best next step, visits trend, billing and what they owe, history, details |
| Leads | Reception, trainers (own) | Board from new to joined, filter by source |
| Classes | Reception, coaches | Week timetable, roster, waitlist, book someone in, attendance |
| Collections | Manager, owners | Two tabs, rules, door status per person, settlement offers, totals for owners only |
| Fitness Passport | Everyone (money owners only) | Month's visits against the payment tiers, trends, win-back lists |
| Add member | Reception, manager, owners | Plan (Perform first, live prices), details with compulsory goal and source, Passport and Bring a Mate, on-screen signature, bank details on the same screen, key tag scan. Creates the member in GymMaster then the Core |
| Point of sale | Reception | GymMaster's product categories, member lookup, adds what they owe to the sale |
| Messages | Owners, manager | Automations and their status, one inbox for email, text and app replies |
| Email results | Owners | Live: sent today, results today, each automation's rate with a status, happening-now feed |
| Reports | By role | GymMaster favourites rebuilt, one filterable member list instead of 40 variations, save any Ask M2 answer |
| Trainer view | Trainers | Their leads, clients' visits, their own numbers. No billing |
| Money | Owners | FY progress, month-by-month P&L from Xero, revenue by stream, what the numbers are saying |
| Staff and access | Owners | Roles, logins, view as another role |

## 7. Phases

| Stage | When | What | Go/no-go check |
|---|---|---|---|
| 1. Core, read only | October | Members imported, nightly sync, owner logins, summary and member search | Member counts match GymMaster to the person |
| 2. Staff CRM on the Core | November | Today, profiles, leads, classes, collections, POS. Email sending moves to the Core | Reception runs a full week without opening GymMaster for daily work |
| 3. App on the Core | November | App screens repointed with a web update, no store build | Bookings and door check-ins match GymMaster |
| 4. Billing pilot | Late November | New members only billed through the Core | Two clean debit cycles, matched to the cent |
| 5. Members move across | December | In batches by billing day. GymMaster gets 30 days' notice once the last batch is clean | Every member has had one clean debit through the Core |
| 6. Doors, then cancel | January | App entry main, key tags backup, final export, cancel GymMaster | Doors work without GymMaster |

If the billing pilot isn't clean by early December, existing members wait until mid January rather than moving over Christmas.

## 8. Open questions

- **Ezidebit:** account and debit authorities in M2's name; whether disconnecting GymMaster cancels schedules; API access and sandbox; hosted bank form; fees per debit and per failure; settlement reports. Email drafted 2 October.
- **GymMaster:** do the door gatekeepers work on a smaller or doors-only plan, and the price; fuller API access (memberships, visits, bookings, write access, rate limits, webhooks); confirm 30 days' notice. Email drafted 2 October.
- **Door readers** after cancelling: keep GymMaster doors-only, or move to app entry and new readers (ties into the access gates project).
- **Comparison group** for automations: 10% held back, or send to everyone.
- **Who sees money** on the trainer side if trainers ever rent space differently.

## 9. Findings from the GymMaster exports

- 123 membership type names collapse into 12 clean families.
- Lead source is recorded for about 1 in 5 current members.
- Of everyone who took a trial since January 2024, about 14% are current members today. The Core links trials to joins by phone and email, so this becomes a live number.
- GymMaster's email report shows 0% of trial emails leading to a join, while plenty of trials joined. The join page creates a new member record, so GymMaster can't link them. The Core fixes this.
- The "New member check-in" automation sent nothing in September.
