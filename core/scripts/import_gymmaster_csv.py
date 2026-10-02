#!/usr/bin/env python3
"""Turn GymMaster "Current Memberships" CSV exports into SQL for the M2 Core database.

Usage:
    python3 scripts/import_gymmaster_csv.py CURRENT.csv [HISTORY.csv] > data/seed.sql
    npx wrangler d1 execute m2-core --remote --file data/seed.sql

CURRENT.csv  Report > Current Memberships, run for today only. Every current member.
HISTORY.csv  The same report over a long period (e.g. 2024-01-01 to today). Used for
             trial history, so trial to member conversion can be measured.

The output wipes and reloads the imported tables, so it is safe to run again.
Member data never goes into git: keep exports and data/ out of the repo.
A short summary is printed to stderr so the counts can be checked against the
GymMaster dashboard (current members, Passport members).
"""
import csv, json, re, sys
from collections import Counter

if len(sys.argv) < 2:
    sys.exit(__doc__)

def rows(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    v = str(v).strip()
    if v == "":
        return "NULL"
    return "'" + v.replace("'", "''") + "'"

def num(v, default=None):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return default

def split_passport(last):
    """GymMaster keeps the Fitness Passport number in the surname ("Cohen - 1090377", or just "1085508")."""
    last = (last or "").strip()
    m = re.match(r"^(.*?)[\s-]*\(?\s*(?:FP|ID:?)?\s*(\d{6,8})\s*\)?\s*$", last, re.I)
    if not m:
        return last, None
    return m.group(1).strip(" -") or None, m.group(2)

def mobile(v):
    d = re.sub(r"\D", "", v or "")
    if d.startswith("64"):
        d = "0" + d[2:]
    return d or None

EMPLOYERS = ["woods", "smartfit", "hectre", "bnb group", "red bull", "msd", "auckland council"]

def classify(name, category, price_desc):
    """Map a GymMaster membership type to one clean plan."""
    n = re.sub(r"\s+", " ", (name or "").lower())
    c = (category or "").lower()
    pd_ = (price_desc or "").lower()
    plan = {"family": "other", "frequency": None, "flexi": 0, "paid_in_full": 0, "corporate": 0,
            "employer": None, "student": 0, "legacy": 0, "includes_classes": 0, "includes_recovery": 0}
    if "fitness passport" in n:
        plan["family"] = "passport"
    elif "trip pass" in n:
        plan["family"] = "pass"
    elif "trial" in n or "day pass" in n or "hour pass" in n or re.search(r"days (for|on us)|days\. \d|free class|bring a friend", n):
        plan["family"] = "trial"
    elif "challenge" in c or re.search(r"\b\d?wc\b", n):
        plan["family"] = "challenge"
    elif n in ("staff", "personal trainer rent") or "staff" in c:
        plan["family"] = "staff"
    elif "transporter" in n or "transpoter" in n:
        plan["family"] = "transporter"
    elif "swimming pool" in n:
        plan["family"] = "pool"
    elif "recovery" in n:
        plan["family"] = "recovery"
    elif "perform" in n or "gateway" in n:
        plan["family"] = "perform"
    elif "classes" in n:
        plan["family"] = "classes"
    elif "daily" in n or "entry" in n:
        plan["family"] = "daily"

    fam = plan["family"]
    plan["includes_classes"] = int(fam in ("perform", "classes", "transporter", "passport", "pass", "trial"))
    plan["includes_recovery"] = int(fam in ("perform", "recovery", "transporter", "pass", "trial"))

    plan["flexi"] = int("flexi" in n)
    plan["paid_in_full"] = int(any(k in n for k in ("paid in full", "pif", "lifetime")) or
                               ("fixed term" in pd_ and fam not in ("pass", "trial")))
    if fam == "passport":
        plan["frequency"] = "yearly"
    elif plan["paid_in_full"] or fam == "pass":
        plan["frequency"] = "upfront"
    else:
        for f, keys in (("fortnightly", ("fortnight", "fornight")), ("monthly", ("month",)),
                        ("quarterly", ("quarter",)), ("weekly", ("week",))):
            if any(k in n for k in keys) or any(k in pd_ for k in keys):
                plan["frequency"] = f
                break

    emp = next((e for e in EMPLOYERS if e in n), None)
    if "corporate" in c or emp or "% off" in n or "student" in n:
        plan["corporate"] = 1
        plan["employer"] = emp.title() if emp else None
    plan["student"] = int("student" in n)
    plan["legacy"] = int(c in ("old", "old corporate memberships", "discontinued", "promotions")
                         or n.startswith(("entry", "flexi - entry", "flexi - gateway", "gateway"))
                         or "transpoter" in n)
    return plan

WEEKS = {"weekly": 1, "fortnightly": 2, "monthly": 52 / 12, "quarterly": 13}

def weekly_value(price, plan):
    f = plan["frequency"]
    if price is None or f not in WEEKS:
        return None
    return round(price / WEEKS[f], 2)

def billed_by(plan, price_desc):
    pd_ = (price_desc or "").lower()
    if plan["family"] == "passport":
        return "passport"
    if "in person" in pd_:
        return "in_person"
    return "ezidebit"

current = rows(sys.argv[1])
history = rows(sys.argv[2]) if len(sys.argv) > 2 else []

out = []
w = out.append
w("-- Generated by scripts/import_gymmaster_csv.py. Contains member data: never commit.")
w("PRAGMA foreign_keys = OFF;")
for t in ("member_flags", "memberships", "billing_accounts", "plans", "members"):
    w(f"DELETE FROM {t} WHERE 1=1;")
w("DELETE FROM leads WHERE kind = 'trial' AND notes = 'gymmaster_import';")

plans, plan_ids = {}, {}
for r in current + history:
    key = (r["Membership Type Name"].strip(), r["Membership Type Category Name"].strip())
    if key not in plans:
        plans[key] = classify(key[0], key[1], r.get("Price Description"))
for i, ((name, cat), p) in enumerate(sorted(plans.items()), start=1):
    plan_ids[(name, cat)] = i
    w("INSERT INTO plans(id, gm_type_name, gm_category, family, frequency, flexi, paid_in_full, corporate, employer, "
      "student, legacy, includes_classes, includes_recovery) VALUES (" + ", ".join(map(q, [
        i, name, cat, p["family"], p["frequency"], p["flexi"], p["paid_in_full"], p["corporate"], p["employer"],
        p["student"], p["legacy"], p["includes_classes"], p["includes_recovery"]])) + ");")

seen = set()
passport_numbers = 0
fam_count, flag_count = Counter(), Counter()
weekly_total = 0.0
for r in current:
    gm = int(r["Member ID"])
    if gm in seen:
        continue
    seen.add(gm)
    key = (r["Membership Type Name"].strip(), r["Membership Type Category Name"].strip())
    p = plans[key]
    price = num(r.get("Membership Type Price"))
    wv = weekly_value(price, p)
    by = billed_by(p, r.get("Price Description"))
    last, pp_no = split_passport(r["Member Last Name"])
    first = r["Member First Name"].strip()
    if pp_no:
        passport_numbers += 1
    if not last and " " in first:
        # Surname was only the Passport number, and the full name sits in the first name.
        first, last = first.rsplit(" ", 1)
    w("INSERT INTO members(id, gm_id, first_name, last_name, passport_number, email, mobile, gender, lead_source, status, joined_on, "
      "total_visits_gm) VALUES (" + ", ".join(map(q, [
        gm, gm, first, last, pp_no, (r.get("Member Email") or "").lower(),
        mobile(r.get("Member Cell")), r.get("Member Gender"), r.get("Member Source Promotion"), "active",
        r.get("Membership Start Date"), int(num(r.get("Member Total Visit"), 0))])) + ");")
    w("INSERT INTO memberships(member_id, plan_id, price, weekly_value, start_date, min_term_end, end_date, status, "
      "billed_by, gm_billing_note, discount_code, sold_by) VALUES (" + ", ".join(map(q, [
        gm, plan_ids[key], price, wv, r.get("Membership Start Date"), r.get("Membership Minimum Term End Date"),
        r.get("Membership End Date"), "current", by, r.get("Member Billing Comment"), r.get("Discount Code Used"),
        r.get("Sales Rep")])) + ");")
    if by == "ezidebit":
        w(f"INSERT INTO billing_accounts(member_id, billed_by_system) VALUES ({gm}, 'gymmaster');")
    flags = []
    if p["family"] == "passport":
        flags.append(("passport", None))
    if p["corporate"]:
        flags.append(("corporate", p["employer"]))
    if p["student"]:
        flags.append(("student", None))
    for f, d in flags:
        flag_count[f] += 1
        w(f"INSERT INTO member_flags(member_id, flag, detail) VALUES ({gm}, {q(f)}, {q(d)});")
    fam_count[p["family"]] += 1
    if by == "ezidebit" and wv:
        weekly_total += wv

# Trial history becomes trial leads, marked joined if that person is a member now.
current_ids = seen
trials = 0
for r in history:
    cat = r["Membership Type Category Name"].strip()
    if cat != "Trials & Limited Passes":
        continue
    name = r["Membership Type Name"].lower()
    if "trip pass" in name:
        continue
    gm = int(r["Member ID"])
    stage = "joined" if gm in current_ids else "lost"
    trials += 1
    w("INSERT INTO leads(member_id, name, email, mobile, kind, source, stage, created_at, notes) VALUES (" + ", ".join(map(q, [
        gm if gm in current_ids else None, (r["Member First Name"] + " " + r["Member Last Name"]).strip(),
        (r.get("Member Email") or "").lower(), mobile(r.get("Member Cell")), "trial",
        r.get("Member Source Promotion"), stage, r.get("Membership Start Date"), "gymmaster_import"])) + ");")

w("PRAGMA foreign_keys = ON;")
w(f"INSERT INTO sync_log(source, started_at, finished_at, rows_in, rows_changed, ok) VALUES "
  f"('gymmaster_csv', datetime('now'), datetime('now'), {len(current) + len(history)}, {len(seen) + trials}, 1);")
print("\n".join(out))

summary = {
    "current_members": len(seen),
    "by_family": dict(fam_count.most_common()),
    "flags": dict(flag_count),
    "gm_type_names": len(plans),
    "clean_families": len(set(p["family"] for p in plans.values())),
    "ezidebit_weekly_value": round(weekly_total, 2),
    "lead_source_recorded_pct": round(100 * sum(1 for r in current if (r.get("Member Source Promotion") or "").strip()) / max(len(current), 1), 1),
    "trial_leads": trials,
    "passport_numbers_moved_out_of_surname": passport_numbers,
}
print(json.dumps(summary, indent=2), file=sys.stderr)
