-- M2 Core database (Cloudflare D1, SQLite).
-- One record per member, one set of rules. Money is never stored here beyond
-- amounts owed and paid; bank and card details stay with Ezidebit.
-- Dates are ISO text (YYYY-MM-DD or full ISO timestamps, NZ time unless noted).

PRAGMA foreign_keys = ON;

-- ---------- people ----------

CREATE TABLE IF NOT EXISTS members (
  id              INTEGER PRIMARY KEY,          -- M2 Core id
  gm_id           INTEGER UNIQUE,               -- GymMaster member id while we sync
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  preferred_name  TEXT,
  email           TEXT,
  mobile          TEXT,                         -- stored as digits, NZ format
  dob             TEXT,
  gender          TEXT,
  suburb          TEXT,
  photo_url       TEXT,
  emergency_name  TEXT,
  emergency_phone TEXT,
  goal            TEXT,                         -- main goal, picked at sign-up
  lead_source     TEXT,                         -- required for new members
  lead_campaign   TEXT,                         -- utm_campaign or ad name
  referred_by     INTEGER REFERENCES members(id),
  trainer_id      INTEGER REFERENCES staff(id),
  key_tag         TEXT,
  passport_number TEXT,                         -- old Passport number GymMaster staff typed into the surname. Kept for reference only
  fp_id           TEXT,                         -- Fitness Passport ID (GymMaster: Additional Details). Passport pays on this, so it's compulsory for Passport members
  fp_id_in_gm     INTEGER NOT NULL DEFAULT 0,   -- 1 once the same ID is in GymMaster, which reports visits to Passport while it runs the doors
  status          TEXT NOT NULL DEFAULT 'active',   -- active, frozen, cancelled, prospect, former
  joined_on       TEXT,
  total_visits_gm INTEGER DEFAULT 0,             -- lifetime visits carried over from GymMaster
  marketing_email INTEGER DEFAULT 1,
  marketing_sms   INTEGER DEFAULT 0,
  app_installed   INTEGER DEFAULT 0,
  terms_signed_on TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS members_email  ON members(email);
CREATE INDEX IF NOT EXISTS members_mobile ON members(mobile);
CREATE INDEX IF NOT EXISTS members_status ON members(status);
CREATE UNIQUE INDEX IF NOT EXISTS members_key_tag ON members(key_tag) WHERE key_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_fp_id ON members(fp_id);

-- Every key tag ever handed out, so a found tag can be traced and a lost one never opens a door.
CREATE TABLE IF NOT EXISTS key_tags (
  id           INTEGER PRIMARY KEY,
  tag          TEXT NOT NULL,
  member_id    INTEGER NOT NULL REFERENCES members(id),
  status       TEXT NOT NULL DEFAULT 'active',   -- active, lost, returned, replaced
  assigned_at  TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by  INTEGER REFERENCES staff(id),
  ended_at     TEXT,
  in_gymmaster INTEGER NOT NULL DEFAULT 0          -- 1 once the tag is set on the GymMaster member too (doors read GymMaster until January)
);
CREATE INDEX IF NOT EXISTS key_tags_tag ON key_tags(tag);

-- Flags drive the rules: Passport is excluded from offers, gifted time never
-- goes to collections, corporate is never sold online, blocked stops entry.
CREATE TABLE IF NOT EXISTS member_flags (
  member_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  flag       TEXT NOT NULL,   -- passport, gifted_time, corporate, staff, trainer, do_not_contact, blocked, student
  detail     TEXT,            -- e.g. employer for corporate, reason for blocked
  set_by     INTEGER REFERENCES staff(id),
  set_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (member_id, flag)
);

-- Member photo, so staff can put a name to a face. Taken at the desk with the USB camera.
-- A small JPEG (480 x 480), kept as a data URL. One per member, the newest wins.
CREATE TABLE IF NOT EXISTS member_photos (
  member_id  INTEGER PRIMARY KEY REFERENCES members(id),
  jpeg       TEXT NOT NULL,
  taken_at   TEXT NOT NULL DEFAULT (datetime('now')),
  taken_by   INTEGER REFERENCES staff(id)
);

-- Health details only with the member's consent, visible to their trainer and owners.
CREATE TABLE IF NOT EXISTS member_health_notes (
  member_id   INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  note        TEXT,
  consent_on  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,             -- what they sign in with
  role        TEXT NOT NULL,                    -- owner, manager, reception, trainer, coach
  member_id   INTEGER REFERENCES members(id),   -- their own gym membership, if any
  active      INTEGER NOT NULL DEFAULT 1,
  list_order  INTEGER DEFAULT 100,              -- new trainers first for lead assignment
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- plans and memberships ----------

-- Every GymMaster membership type maps to one clean plan family.
CREATE TABLE IF NOT EXISTS plans (
  id              INTEGER PRIMARY KEY,
  gm_type_name    TEXT,                         -- GymMaster membership type name, exact
  gm_category     TEXT,                         -- GymMaster category, kept for history only
  family          TEXT NOT NULL,                -- perform, classes, daily, recovery, transporter, passport, pass, pool, trial, other
  frequency       TEXT,                         -- weekly, fortnightly, monthly, quarterly, upfront, in_person, yearly
  flexi           INTEGER NOT NULL DEFAULT 0,
  paid_in_full    INTEGER NOT NULL DEFAULT 0,
  corporate       INTEGER NOT NULL DEFAULT 0,
  employer        TEXT,
  student         INTEGER NOT NULL DEFAULT 0,
  legacy          INTEGER NOT NULL DEFAULT 0,   -- no longer sold
  gm_join_id      INTEGER,                      -- join.html ?m= id for plans sold online
  includes_classes  INTEGER NOT NULL DEFAULT 0,
  includes_recovery INTEGER NOT NULL DEFAULT 0,
  UNIQUE (gm_type_name, gm_category)
);

CREATE TABLE IF NOT EXISTS memberships (
  id                INTEGER PRIMARY KEY,
  member_id         INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id           INTEGER NOT NULL REFERENCES plans(id),
  price             REAL,                       -- per billing period, incl GST
  weekly_value      REAL,                       -- price converted to a weekly figure
  start_date        TEXT,
  min_term_end      TEXT,                       -- lock-in end
  end_date          TEXT,                       -- only paid in full and passes
  status            TEXT NOT NULL DEFAULT 'current',  -- current, frozen, ended, cancelled
  cancel_reason     TEXT,                       -- required when cancelled
  freeze_from       TEXT,
  freeze_to         TEXT,
  freeze_reason     TEXT,
  billed_by         TEXT NOT NULL DEFAULT 'ezidebit',  -- ezidebit, in_person, passport, none
  gm_billing_note   TEXT,
  discount_code     TEXT,
  sold_by           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS memberships_status ON memberships(status);

-- ---------- billing (Ezidebit stays the bank; this is our ledger) ----------

CREATE TABLE IF NOT EXISTS billing_accounts (
  member_id         INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  ezidebit_ref      TEXT,                       -- Ezidebit customer reference only
  billed_by_system  TEXT NOT NULL DEFAULT 'gymmaster',  -- gymmaster or core. Never both.
  next_debit_date   TEXT,
  next_debit_amount REAL,
  balance_owing     REAL NOT NULL DEFAULT 0,    -- drives the $250 block
  free_weeks_credit INTEGER NOT NULL DEFAULT 0, -- Bring a Mate, anniversary
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY,
  member_id    INTEGER REFERENCES members(id),
  amount       REAL NOT NULL,
  kind         TEXT NOT NULL,     -- debit, failed_debit, retry, eftpos, pay_link, settlement, refund
  status       TEXT NOT NULL,     -- paid, failed, pending
  failure_reason TEXT,
  occurred_at  TEXT NOT NULL,
  source       TEXT,              -- ezidebit, pos, gymmaster_import
  external_ref TEXT
);
CREATE INDEX IF NOT EXISTS payments_member ON payments(member_id, occurred_at);

-- The Core's own billing, ready for Ezidebit. Until a member is switched to billed_by_system = 'core'
-- GymMaster bills them and the Core only plans what it would debit (preview), so nothing is taken twice.
CREATE TABLE IF NOT EXISTS billing_profiles (
  member_id        INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  state            TEXT NOT NULL DEFAULT 'active',  -- active, hold, cancelled
  hold_from        TEXT,
  hold_to          TEXT,                            -- billing restarts the day after
  hold_reason      TEXT,
  amount_override  REAL,                            -- replaces the plan price from amount_from
  amount_from      TEXT,
  arrangement_extra REAL,                           -- added to each debit until the balance is cleared
  arrangement_note TEXT,
  method           TEXT,                            -- bank, card, none (from Ezidebit, never the numbers)
  method_label     TEXT,                            -- what Ezidebit shows, like "Bank account" or "Visa"
  cancel_reason    TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per planned or sent debit. Preview rows show what the Core would have taken that day.
CREATE TABLE IF NOT EXISTS billing_items (
  id             INTEGER PRIMARY KEY,
  member_id      INTEGER NOT NULL REFERENCES members(id),
  debit_date     TEXT NOT NULL,
  amount         REAL NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'regular',  -- regular, one_off, retry, fee, arrangement
  status         TEXT NOT NULL DEFAULT 'planned',  -- preview, planned, sent, paid, failed, cancelled, waived
  note           TEXT,
  retry_of       INTEGER REFERENCES billing_items(id),
  ezi_ref        TEXT,                             -- Ezidebit payment reference
  failure_reason TEXT,
  sent_at        TEXT,
  settled_at     TEXT,
  created_by     INTEGER REFERENCES staff(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_items_once ON billing_items(member_id, debit_date, kind) WHERE kind IN ('regular','fee');
CREATE INDEX IF NOT EXISTS billing_items_date ON billing_items(debit_date, status);
CREATE INDEX IF NOT EXISTS billing_items_member ON billing_items(member_id, debit_date);

-- Every billing change, who made it, and whether Ezidebit has it.
CREATE TABLE IF NOT EXISTS billing_events (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER REFERENCES members(id),
  kind       TEXT NOT NULL,     -- hold, resume, amount, one_off, arrangement, cancel, retry, fee, waive, switch, method, run, failed, paid
  detail     TEXT,
  staff_id   INTEGER REFERENCES staff(id),
  ezidebit   TEXT,              -- sent, not_needed, preview, error: ...
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS billing_events_member ON billing_events(member_id, at);

-- Free PT leads: the questionnaire answers and where each one is up to. One row per lead (kind free_pt).
CREATE TABLE IF NOT EXISTS pt_leads (
  lead_id       INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  sheet_id      TEXT UNIQUE,                     -- id in the PT Leads sheet while that still runs
  reason        TEXT,
  wants         TEXT,                            -- trainer preference
  style         TEXT,
  best_time     TEXT,
  injuries      TEXT,
  pt_status     TEXT NOT NULL DEFAULT 'new',     -- new (waiting for Tim), assigned, contacted, booked, client, lost
  sheet_trainer TEXT,
  assigned_at   TEXT,
  assigned_by   INTEGER REFERENCES staff(id),
  tim_note      TEXT,
  seen_at       TEXT,                            -- when the trainer first opened it
  notes         TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS pt_leads_status ON pt_leads(pt_status);

-- Phones that have turned on Core notifications (one row per phone).
CREATE TABLE IF NOT EXISTS push_subs (
  id         INTEGER PRIMARY KEY,
  staff_id   INTEGER NOT NULL REFERENCES staff(id),
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  ua         TEXT,
  fails      INTEGER NOT NULL DEFAULT 0,
  last_ok    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- What M2 sells: memberships, trials, passes, paid in full. The team edits this in "Memberships and prices".
CREATE TABLE IF NOT EXISTS catalog (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  kind              TEXT NOT NULL DEFAULT 'membership',  -- membership, trial, pass, paid_in_full, corporate, other
  family            TEXT NOT NULL DEFAULT 'other',       -- perform, classes, daily, recovery, transporter, pool, passport, other
  billing           TEXT NOT NULL DEFAULT 'weekly',      -- weekly, fortnightly, monthly, quarterly, once
  price             REAL,                                -- incl GST, per billing period
  joining_fee       REAL NOT NULL DEFAULT 0,
  tag_fee           REAL NOT NULL DEFAULT 0,
  lock_in_months    INTEGER,
  flexi             INTEGER NOT NULL DEFAULT 0,          -- 30 days notice instead of a lock-in
  length_days       INTEGER,                             -- trials, passes, paid in full
  visits            INTEGER,                             -- trip passes
  includes_classes  INTEGER NOT NULL DEFAULT 0,
  includes_recovery INTEGER NOT NULL DEFAULT 0,
  online            INTEGER NOT NULL DEFAULT 0,
  at_desk           INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'selling',     -- selling, existing (members keep it, not sold), retired
  gm_id             INTEGER,                             -- GymMaster membership id while GymMaster runs sign-ups
  gm_price          REAL,                                -- what GymMaster says, to spot differences
  gm_name           TEXT,
  gm_seen           INTEGER NOT NULL DEFAULT 1,
  blurb             TEXT,
  staff_note        TEXT,
  sort              INTEGER NOT NULL DEFAULT 500,
  created_by        INTEGER REFERENCES staff(id),
  updated_by        INTEGER REFERENCES staff(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_gm ON catalog(gm_id) WHERE gm_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS catalog_changes (
  id       INTEGER PRIMARY KEY,
  item_id  INTEGER REFERENCES catalog(id),
  staff_id INTEGER REFERENCES staff(id),
  what     TEXT NOT NULL,
  at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Email automations: the words for each one, editable in the Core, in M2's email style.
CREATE TABLE IF NOT EXISTS auto_content (
  key         TEXT PRIMARY KEY REFERENCES automations(key),
  subject     TEXT NOT NULL,
  heading     TEXT,
  body        TEXT NOT NULL,             -- plain text, a blank line between paragraphs. {first} becomes their first name
  button      TEXT,
  url         TEXT,
  sending     INTEGER NOT NULL DEFAULT 0, -- 1 once the matching GymMaster automation is off and the Core takes over
  updated_by  INTEGER REFERENCES staff(id),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Every email the Core works out, sends or would send, and what the person did afterwards.
CREATE TABLE IF NOT EXISTS email_log (
  id          INTEGER PRIMARY KEY,
  auto_key    TEXT,
  member_id   INTEGER REFERENCES members(id),
  email       TEXT,
  subject     TEXT,
  status      TEXT NOT NULL,             -- preview, sent, failed, held_out, skipped
  detail      TEXT,
  provider_id TEXT,
  day         TEXT NOT NULL,             -- NZ date it was due
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  goal_met_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS email_log_once ON email_log(auto_key, member_id, day);
CREATE INDEX IF NOT EXISTS email_log_member ON email_log(member_id, auto_key, at);
CREATE TABLE IF NOT EXISTS email_unsubs (
  email TEXT PRIMARY KEY,
  at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copies of GymMaster's report data the automations run on.
CREATE TABLE IF NOT EXISTS mship_seen (
  member_id  INTEGER NOT NULL,
  type_name  TEXT NOT NULL,
  category   TEXT,
  start_date TEXT NOT NULL DEFAULT '',
  end_date   TEXT,
  last_seen  TEXT,                -- last day it was current in GymMaster
  PRIMARY KEY (member_id, type_name, start_date)
);
CREATE INDEX IF NOT EXISTS mship_seen_end ON mship_seen(end_date);
CREATE TABLE IF NOT EXISTS gm_holds (
  member_id INTEGER NOT NULL, starts TEXT, ends TEXT, reason TEXT,
  PRIMARY KEY (member_id, starts)
);
CREATE TABLE IF NOT EXISTS gm_failed (
  member_id INTEGER NOT NULL, billing_date TEXT, amount REAL, status TEXT, reason TEXT, first_seen TEXT,
  PRIMARY KEY (member_id, billing_date, amount)
);
CREATE TABLE IF NOT EXISTS gm_cancels (
  member_id INTEGER NOT NULL, type_name TEXT, cancel_date TEXT, reason TEXT, first_seen TEXT,
  PRIMARY KEY (member_id, type_name, cancel_date)
);
-- The GymMaster automations and their emails, copied across so the Core can send the same ones.
CREATE TABLE IF NOT EXISTS gm_tasks (
  task_id     INTEGER PRIMARY KEY,
  name        TEXT,
  trigger     TEXT,
  qty         INTEGER,
  unit        TEXT,
  sign        TEXT,                -- Before, After, Immediately
  x           INTEGER,
  types       TEXT,                -- JSON list of GymMaster membership type names, or ["All Memberships"]
  template_id INTEGER,
  recipient   TEXT,                -- member or staff
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gm_templates (
  template_id INTEGER PRIMARY KEY,
  name        TEXT,
  subject     TEXT,
  body        TEXT,                -- GymMaster's HTML with its {58:Member Firstname} style fields
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- The designed HTML for an automation, when it came from GymMaster (else the simple editor is used).
CREATE TABLE IF NOT EXISTS auto_html (
  key  TEXT PRIMARY KEY,
  html TEXT NOT NULL
);

-- Point of sale at the desk.
CREATE TABLE IF NOT EXISTS pos_products (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Other',
  price      REAL NOT NULL,                 -- incl GST
  gm_name    TEXT,                          -- name in GymMaster, when it came from there
  active     INTEGER NOT NULL DEFAULT 1,
  sort       INTEGER NOT NULL DEFAULT 500,
  updated_by INTEGER REFERENCES staff(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pos_sales (
  id        INTEGER PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  customer  TEXT,                           -- walk-in name, when it's not a member
  staff_id  INTEGER REFERENCES staff(id),
  total     REAL NOT NULL,
  paid_by   TEXT NOT NULL,                  -- eftpos, cash
  note      TEXT,
  voided    INTEGER NOT NULL DEFAULT 0,
  day       TEXT NOT NULL,                  -- NZ date
  at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS pos_sales_day ON pos_sales(day);
CREATE TABLE IF NOT EXISTS pos_lines (
  sale_id    INTEGER NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES pos_products(id),
  name       TEXT NOT NULL,
  qty        INTEGER NOT NULL DEFAULT 1,
  price      REAL NOT NULL
);

-- Collections: current members and former members with money owing.
CREATE TABLE IF NOT EXISTS collections_cases (
  id             INTEGER PRIMARY KEY,
  member_id      INTEGER NOT NULL REFERENCES members(id),
  opened_on      TEXT NOT NULL,
  amount_owed    REAL NOT NULL,
  is_former      INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'open',  -- open, promised, settled, referred, written_off, closed
  settle_offer   REAL,                          -- 50% up to $1,500, 30% above
  referred_on    TEXT,                          -- Marshall Freeman, never under $1,000
  closed_on      TEXT
);

-- ---------- live data from GymMaster, Xero, Meta and the website ----------

-- Latest balance GymMaster holds for a member, checked on a rolling loop every 15 minutes.
CREATE TABLE IF NOT EXISTS balance_checks (
  member_id   INTEGER PRIMARY KEY REFERENCES members(id),
  owing       REAL NOT NULL DEFAULT 0,
  next_bill   TEXT,
  no_billing  INTEGER NOT NULL DEFAULT 0,  -- GymMaster says there's no way to bill them
  checked_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Monthly profit and loss from Xero (ex GST), owners only.
CREATE TABLE IF NOT EXISTS finance_months (
  month         TEXT PRIMARY KEY,           -- 2026-09
  income        REAL,
  cost_of_sales REAL,
  expenses      REAL,
  net           REAL,
  lines         TEXT,                       -- JSON: income and expense lines
  source        TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS finance_points (
  key     TEXT PRIMARY KEY,                 -- cash, payables, receivables, gst_owed ...
  label   TEXT,
  value   REAL,
  as_of   TEXT
);

-- One row a day so growth can be charted over time.
CREATE TABLE IF NOT EXISTS member_snapshots (
  day           TEXT PRIMARY KEY,
  members       INTEGER,
  passport      INTEGER,
  perform       INTEGER,
  daily         INTEGER,
  classes       INTEGER,
  recovery      INTEGER,
  other         INTEGER,
  weekly_billed REAL,
  owed          REAL
);

-- Ad spend and results by day and campaign (Meta and others).
CREATE TABLE IF NOT EXISTS marketing_days (
  day         TEXT NOT NULL,
  source      TEXT NOT NULL,                -- meta, google
  campaign    TEXT NOT NULL,
  spend       REAL,
  impressions INTEGER,
  clicks      INTEGER,
  leads       INTEGER,
  landing_views INTEGER,
  PRIMARY KEY (day, source, campaign)
);
-- Website sessions by channel (GA4).
CREATE TABLE IF NOT EXISTS web_days (
  day         TEXT NOT NULL,
  channel     TEXT NOT NULL,
  sessions    INTEGER,
  conversions INTEGER,
  PRIMARY KEY (day, channel)
);


-- ---------- from GymMaster, kept alongside the member ----------
CREATE TABLE IF NOT EXISTS member_gm (
  member_id   INTEGER PRIMARY KEY,
  gm_status   TEXT,                 -- Current, Hold, Expired, Recently Expired, Gifted Time, Concession Pack
  is_prospect INTEGER NOT NULL DEFAULT 0,
  created     TEXT,
  goal        TEXT,
  company     TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS member_gm_status ON member_gm(gm_status);

CREATE TABLE IF NOT EXISTS member_visit_months (
  member_id INTEGER NOT NULL,
  month     TEXT NOT NULL,          -- 2026-09
  visits    INTEGER NOT NULL,
  PRIMARY KEY (member_id, month)
);
CREATE INDEX IF NOT EXISTS member_visit_months_month ON member_visit_months(month);

CREATE TABLE IF NOT EXISTS class_counts (
  gm_class_id INTEGER PRIMARY KEY,
  day         TEXT NOT NULL,
  start       TEXT,
  name        TEXT,
  coach       TEXT,
  booked      INTEGER,
  max         INTEGER,
  waitlist    INTEGER,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS class_counts_day ON class_counts(day);

CREATE TABLE IF NOT EXISTS passport_months (
  month   TEXT PRIMARY KEY,
  visits  INTEGER,
  signups INTEGER,
  paid    REAL,                     -- what Passport paid for this month's visits (ex GST)
  source  TEXT
);

CREATE TABLE IF NOT EXISTS member_agreements (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER NOT NULL,
  plan       TEXT,
  body       TEXT,
  signature  TEXT,
  signed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  staff_id   INTEGER
);
CREATE INDEX IF NOT EXISTS member_agreements_member ON member_agreements(member_id);

CREATE TABLE IF NOT EXISTS roster_chunks (
  id   INTEGER PRIMARY KEY,
  json TEXT NOT NULL
);


-- ---------- reception roster (replaces Deputy) ----------
CREATE TABLE IF NOT EXISTS shifts (
  id         INTEGER PRIMARY KEY,
  staff_id   INTEGER NOT NULL REFERENCES staff(id),
  day        TEXT NOT NULL,
  start      TEXT NOT NULL,          -- 05:30
  end        TEXT NOT NULL,
  break_min  INTEGER NOT NULL DEFAULT 0,
  area       TEXT DEFAULT 'Reception',
  note       TEXT,
  published  INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES staff(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS shifts_day ON shifts(day);
CREATE TABLE IF NOT EXISTS shift_requests (
  id         INTEGER PRIMARY KEY,
  staff_id   INTEGER NOT NULL REFERENCES staff(id),
  kind       TEXT NOT NULL,          -- leave, swap, available
  day        TEXT NOT NULL,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  decided_by INTEGER REFERENCES staff(id),
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- visits, classes, bookings ----------

CREATE TABLE IF NOT EXISTS visits (
  id          INTEGER PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES members(id),
  at          TEXT NOT NULL,              -- check-in time
  door        TEXT,                       -- main, mens_recovery, womens_recovery
  via         TEXT,                       -- key_tag, app, desk, gate_scan
  gm_visit_id TEXT UNIQUE,
  fp_id       TEXT,                       -- Passport members: the Fitness Passport ID at the time of the visit
  fp_status   TEXT                        -- Passport members: NULL (GymMaster reports it), sent, failed or no_id once the Core reports visits itself
);
CREATE INDEX IF NOT EXISTS visits_member_at ON visits(member_id, at);
CREATE INDEX IF NOT EXISTS visits_at ON visits(at);

CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,              -- HYROX Strength, HYROX Threshold, HYROX Teams, Strength Club, Hatha yoga, Yin yoga
  starts_at   TEXT NOT NULL,
  ends_at     TEXT,
  coach_id    INTEGER REFERENCES staff(id),
  capacity    INTEGER NOT NULL DEFAULT 20,
  gm_class_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS bookings (
  id          INTEGER PRIMARY KEY,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  member_id   INTEGER NOT NULL REFERENCES members(id),
  status      TEXT NOT NULL DEFAULT 'booked',  -- booked, waitlist, attended, no_show, cancelled, late_cancel
  waitlist_pos INTEGER,
  booked_by   TEXT,                            -- app, staff:<id>
  booked_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, member_id)
);

-- ---------- leads and work ----------

CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY,
  member_id    INTEGER REFERENCES members(id),    -- set once they exist as a member or prospect
  name         TEXT,
  email        TEXT,
  mobile       TEXT,
  kind         TEXT NOT NULL,     -- trial, free_pt, unfinished_signup, bring_a_mate, app_upgrade, website_form, meta_form
  source       TEXT,              -- meta, google, instagram, referral, walk_in, website
  campaign     TEXT,
  stage        TEXT NOT NULL DEFAULT 'new',   -- new, contacted, trial, joined, lost
  assigned_to  INTEGER REFERENCES staff(id),
  goal         TEXT,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  contacted_at TEXT,
  closed_at    TEXT
);
CREATE INDEX IF NOT EXISTS leads_stage ON leads(stage, created_at);
CREATE INDEX IF NOT EXISTS leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS leads_mobile ON leads(mobile);

-- Jobs on the Today list, and what happened when someone did them.
CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY,
  kind         TEXT NOT NULL,     -- trial_ending, missing_billing, failed_payment, at_risk, free_pt_confirm, perform_no_pt, weekly_next_step
  member_id    INTEGER REFERENCES members(id),
  lead_id      INTEGER REFERENCES leads(id),
  owner_role   TEXT NOT NULL,     -- reception, manager, trainer
  assigned_to  INTEGER REFERENCES staff(id),
  value_at_stake REAL,            -- weekly dollars, used to rank the list
  due_on       TEXT NOT NULL,
  outcome      TEXT,              -- joined, joining_at_desk, call_back, no_answer, not_interested, paid, rebooked, done
  outcome_note TEXT,
  done_by      INTEGER REFERENCES staff(id),
  done_at      TEXT
);
CREATE INDEX IF NOT EXISTS tasks_due ON tasks(due_on, outcome);

-- Every action has a name on it.
CREATE TABLE IF NOT EXISTS activity (
  id          INTEGER PRIMARY KEY,
  member_id   INTEGER REFERENCES members(id),
  lead_id     INTEGER REFERENCES leads(id),
  staff_id    INTEGER REFERENCES staff(id),
  kind        TEXT NOT NULL,      -- note, call, sale, refund, freeze, cancel, plan_change, block, unblock, email, sms, push
  detail      TEXT,
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS activity_member ON activity(member_id, at);
CREATE INDEX IF NOT EXISTS activity_lead ON activity(lead_id, at);

-- ---------- messages and their results ----------

CREATE TABLE IF NOT EXISTS automations (
  id          INTEGER PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,   -- trial_ending, trial_comeback, passport_winback, we_miss_you, new_member_checkin, failed_payment, daily_to_perform, no_show
  name        TEXT NOT NULL,
  goal        TEXT NOT NULL,          -- joined, visited, paid, upgraded, booked_pt, attended
  goal_window_days INTEGER NOT NULL,
  holdout_pct INTEGER NOT NULL DEFAULT 10,
  active      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS message_sends (
  id            INTEGER PRIMARY KEY,
  automation_id INTEGER REFERENCES automations(id),
  member_id     INTEGER REFERENCES members(id),
  channel       TEXT NOT NULL,        -- email, sms, push
  held_out      INTEGER NOT NULL DEFAULT 0,   -- in the comparison group, not sent
  sent_at       TEXT NOT NULL,
  goal_met_at   TEXT                  -- filled when they did the thing
);
CREATE INDEX IF NOT EXISTS sends_auto ON message_sends(automation_id, sent_at);

-- ---------- point of sale ----------

CREATE TABLE IF NOT EXISTS products (
  id        INTEGER PRIMARY KEY,
  category  TEXT NOT NULL,     -- key_tags_visits, kyro, supplements, dr_hydrate, drinks, towel_hire, staff_uniform
  name      TEXT NOT NULL,
  price     REAL NOT NULL,     -- incl GST
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sales (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER REFERENCES members(id),
  staff_id   INTEGER REFERENCES staff(id),
  total      REAL NOT NULL,
  paid_by    TEXT NOT NULL,    -- eftpos, next_debit, cash
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sale_lines (
  sale_id    INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  label      TEXT NOT NULL,
  qty        INTEGER NOT NULL DEFAULT 1,
  price      REAL NOT NULL
);

-- ---------- sync bookkeeping ----------

CREATE TABLE IF NOT EXISTS sync_log (
  id          INTEGER PRIMARY KEY,
  source      TEXT NOT NULL,     -- gymmaster_members, gymmaster_csv, ezidebit, xero
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  rows_in     INTEGER DEFAULT 0,
  rows_changed INTEGER DEFAULT 0,
  ok          INTEGER,
  error       TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings(key, value) VALUES
  ('block_at_balance', '250'),
  ('settle_pct_upto_1500', '50'),
  ('settle_pct_over_1500', '30'),
  ('referral_min_amount', '1000'),
  ('class_capacity', '20'),
  ('late_cancel_hours', '12'),
  ('no_show_after_minutes', '10'),
  -- Fitness Passport pays per visit on monthly tiers that reset each month: up to visit N at $X. The last tier has no top.
  ('fp_tiers', '458:7.39,919:8.21,1380:9.12,1841:10.03,0:11.04'),
  -- 1 once a GymMaster export with the Fitness Passport ID column has been imported, so missing IDs are real gaps.
  ('fp_ids_loaded', '0'),
  ('fy_target_ex_gst', '1235600'),
  ('meta_budget_month', '3500'),
  ('balance_cursor', '0'),
  -- Billing rules. Debits go to Ezidebit this many days ahead so they make the bank cut-off.
  ('bill_lead_days', '2'),
  ('bill_failed_fee', '0'),
  ('bill_retry_days', '3'),
  ('bill_max_retries', '2');

INSERT OR IGNORE INTO automations(key, name, goal, goal_window_days, active) VALUES
  ('trial_ending',       'Trial ending',          'joined',    7,  0),
  ('trial_comeback',     'Trial come-back',       'joined',    14, 0),
  ('passport_winback',   'Fitness Passport win-back', 'visited', 7, 0),
  ('we_miss_you',        'We miss you',           'visited',   7,  0),
  ('new_member_checkin', 'New member check-in',   'visited',   7,  0),
  ('failed_payment',     'Failed payment',        'paid',      7,  0),
  ('daily_to_perform',   'Daily to Perform',      'upgraded',  14, 0),
  ('no_show',            'Class no-show',         'attended',  14, 0);

-- ---------- M2 member app, served by the Core ----------
CREATE TABLE IF NOT EXISTS app_hits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL);   -- sign-in and booking limits
CREATE TABLE IF NOT EXISTS app_tokens (member_id INTEGER PRIMARY KEY, token TEXT NOT NULL, exp INTEGER NOT NULL);   -- short-lived GymMaster member tokens
CREATE TABLE IF NOT EXISTS app_seen (member_id INTEGER NOT NULL, day TEXT NOT NULL, via TEXT, PRIMARY KEY (member_id, day));   -- who opened the app each day
CREATE TABLE IF NOT EXISTS app_requests (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER REFERENCES members(id),
  kind       TEXT NOT NULL,               -- delete, feedback, upgrade
  text       TEXT,
  at         TEXT NOT NULL DEFAULT (datetime('now')),
  done_at    TEXT,
  done_by    INTEGER REFERENCES staff(id)
);
CREATE TABLE IF NOT EXISTS app_doors (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER,
  door       TEXT,
  opened     INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  metres     INTEGER,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS app_log (id INTEGER PRIMARY KEY, at TEXT NOT NULL DEFAULT (datetime('now')), member_id INTEGER, action TEXT, via TEXT, ok INTEGER, signin INTEGER, note TEXT, ms INTEGER);
-- Core's Passport visit count against GymMaster's, month by month, before the Core reports visits itself.
CREATE TABLE IF NOT EXISTS passport_checks (month TEXT PRIMARY KEY, core INTEGER, gm INTEGER, fp INTEGER, members INTEGER, same INTEGER, diff_count INTEGER, diffs TEXT, checked_at TEXT);
