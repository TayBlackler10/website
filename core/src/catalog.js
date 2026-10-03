// M2 Core: memberships, trials, passes and prices. The team's own list of what M2 sells.
// Owners, the manager and reception can add, edit and retire anything here, and every change
// is logged with who made it. Trainers can't (they're contractors).
//
// While GymMaster still runs sign-ups, billing and the doors, each item carries its GymMaster id
// and the Core shows when GymMaster's price is different, so nothing drifts. Add member only
// offers items that are selling here AND exist in GymMaster. Once GymMaster is off, this list is
// the only place prices live.
// Members already on a plan keep their price when a price changes (M2 rule), so a change here
// only affects new sales.

export function makeCatalog(L) {
  const { gmLive } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : null; };

  const KINDS = { membership: "Membership", trial: "Trial", pass: "Visit pass", paid_in_full: "Paid in full", corporate: "Corporate", other: "Other" };
  const FAMILIES = { perform: "Perform (everything)", classes: "Classes (gym and classes)", daily: "Daily (gym floor)", recovery: "Recovery only", transporter: "Transporter", pool: "Pool", passport: "Fitness Passport", other: "Other" };
  const BILLING = { weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly", quarterly: "Quarterly", once: "One payment" };
  const STATUS = { selling: "Selling", existing: "Existing members only", retired: "Retired" };
  const FIELDS = ["name", "kind", "family", "billing", "price", "joining_fee", "tag_fee", "lock_in_months", "flexi", "length_days", "visits",
                  "includes_classes", "includes_recovery", "online", "at_desk", "status", "gm_id", "blurb", "staff_note", "sort"];
  const LABEL = { name: "Name", kind: "Type", family: "Access", billing: "Billing", price: "Price", joining_fee: "Joining fee", tag_fee: "Key tag fee",
                  lock_in_months: "Lock-in", flexi: "Flexi", length_days: "Length", visits: "Visits", includes_classes: "Classes", includes_recovery: "Recovery",
                  online: "Sold online", at_desk: "Sold at the desk", status: "Status", gm_id: "GymMaster id", blurb: "Description", staff_note: "Staff note", sort: "Order" };

  // Starting list: what M2 sells today (join ids from the website), named and priced from GymMaster.
  const START = [
    ["perform", "weekly", 0, 844762], ["perform", "weekly", 1, 844772], ["perform", "fortnightly", 0, 844766], ["perform", "fortnightly", 1, 844773],
    ["perform", "monthly", 0, 844778], ["perform", "monthly", 1, 844782], ["perform", "once", 0, 844786, "paid_in_full"],
    ["classes", "weekly", 0, 844761], ["classes", "weekly", 1, 844768], ["classes", "fortnightly", 0, 844765], ["classes", "fortnightly", 1, 844769],
    ["classes", "monthly", 0, 844776], ["classes", "monthly", 1, 844781],
    ["daily", "weekly", 0, 844760], ["daily", "weekly", 1, 844770], ["daily", "fortnightly", 0, 844764], ["daily", "fortnightly", 1, 844771],
    ["daily", "monthly", 0, 844777], ["daily", "monthly", 1, 844780], ["daily", "quarterly", 0, 844784], ["daily", "once", 0, 844785, "paid_in_full"],
    ["recovery", "weekly", 0, 844763], ["recovery", "weekly", 1, 844774], ["recovery", "fortnightly", 0, 844767], ["recovery", "fortnightly", 1, 844775],
    ["recovery", "monthly", 0, 844779], ["recovery", "monthly", 1, 844783],
    ["perform", "once", 0, 844624, "trial", 5], ["perform", "once", 0, 844673, "trial", 1], ["perform", "once", 0, 844524, "trial", 7],
  ];

  async function seed(env, who) {
    const live = await gmLive(env).catch(() => new Map());
    const stmts = [];
    START.forEach(([family, billing, flexi, gm, kind, days], i) => {
      const m = live.get(gm) || {};
      const name = String(m.name || "").trim() || (kind === "trial" ? days + " day trial" : kind === "paid_in_full" ? (family[0].toUpperCase() + family.slice(1)) + " - Paid in full"
        : (family[0].toUpperCase() + family.slice(1)) + (flexi ? " Flexi" : "") + " - " + BILLING[billing]);
      const lock = kind ? null : flexi ? 0 : family === "daily" ? 12 : 6;
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO catalog(name, kind, family, billing, price, joining_fee, tag_fee, lock_in_months, flexi, length_days, includes_classes, includes_recovery,
                                   online, at_desk, status, gm_id, gm_price, gm_name, sort, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'selling', ?, ?, ?, ?, ?)`)
        .bind(name, kind || "membership", family, billing, num(m.price), kind === "trial" || family === "perform" ? 0 : num(m.signupfee) ?? 49, kind === "trial" || family === "perform" ? 0 : 25,
              lock, flexi, kind === "paid_in_full" ? 365 : days || null, ["perform"].includes(family) || family === "classes" ? 1 : 0, family === "perform" || family === "recovery" ? 1 : 0,
              gm, num(m.price), m.name || null, i, who ? who.id : null));
    });
    await env.DB.batch(stmts);
    await run(env, "INSERT INTO catalog_changes(item_id, staff_id, what) VALUES (NULL, ?, ?)", who ? who.id : null, "Started the list from what's on the website and in GymMaster (" + START.length + " items)");
    return START.length;
  }

  async function list(env, who, can) {
    if (!can.add) return { error: "No access" };
    if (!(await one(env, "SELECT count(*) n FROM catalog")).n) await seed(env, who);
    // Keep GymMaster's current name and price next to ours so differences show up.
    let gmOk = false;
    try {
      const live = await gmLive(env);
      gmOk = live.size > 0;
      const items = await all(env, "SELECT id, gm_id, gm_price, gm_name FROM catalog WHERE gm_id IS NOT NULL");
      const ups = [];
      for (const it of items) {
        const m = live.get(+it.gm_id);
        const p = m ? num(m.price) : null, n = m ? String(m.name || "").trim() : null;
        if (m && (p !== it.gm_price || n !== it.gm_name)) ups.push(env.DB.prepare("UPDATE catalog SET gm_price = ?, gm_name = ?, gm_seen = 1 WHERE id = ?").bind(p, n, it.id));
        if (!m && gmOk) ups.push(env.DB.prepare("UPDATE catalog SET gm_seen = 0 WHERE id = ?").bind(it.id));
      }
      if (ups.length) await env.DB.batch(ups);
    } catch {}
    const items = await all(env, `SELECT c.*, s.name updated_by_name,
                                    (SELECT count(DISTINCT ms.member_id) FROM memberships ms JOIN plans p ON p.id = ms.plan_id JOIN members m ON m.id = ms.member_id
                                     WHERE ms.status = 'current' AND m.status = 'active' AND lower(trim(p.gm_type_name)) = lower(trim(coalesce(c.gm_name, c.name)))) members
                                  FROM catalog c LEFT JOIN staff s ON s.id = c.updated_by ORDER BY c.status = 'retired', c.sort, c.id`);
    const changes = await all(env, `SELECT ch.at, ch.what, ch.item_id, c.name item, s.name staff FROM catalog_changes ch LEFT JOIN catalog c ON c.id = ch.item_id
                                    LEFT JOIN staff s ON s.id = ch.staff_id ORDER BY ch.id DESC LIMIT 40`);
    return { items, changes, gm_ok: gmOk, kinds: KINDS, families: FAMILIES, billing: BILLING, statuses: STATUS };
  }

  function clean(b) {
    const v = {};
    const str = (k, n) => { if (b[k] !== undefined) v[k] = String(b[k] ?? "").trim().slice(0, n) || null; };
    const money = k => { if (b[k] !== undefined) { const n = num(b[k]); v[k] = n == null ? null : r2(n); } };
    const int = k => { if (b[k] !== undefined) { const n = num(b[k]); v[k] = n == null ? null : Math.round(n); } };
    const flag = k => { if (b[k] !== undefined) v[k] = b[k] === true || b[k] === 1 || b[k] === "1" || b[k] === "on" ? 1 : 0; };
    str("name", 80); str("blurb", 400); str("staff_note", 400);
    if (b.kind !== undefined) v.kind = KINDS[b.kind] ? b.kind : "other";
    if (b.family !== undefined) v.family = FAMILIES[b.family] ? b.family : "other";
    if (b.billing !== undefined) v.billing = BILLING[b.billing] ? b.billing : "once";
    if (b.status !== undefined) v.status = STATUS[b.status] ? b.status : "selling";
    money("price"); money("joining_fee"); money("tag_fee");
    int("lock_in_months"); int("length_days"); int("visits"); int("gm_id"); int("sort");
    flag("flexi"); flag("includes_classes"); flag("includes_recovery"); flag("online"); flag("at_desk");
    return v;
  }
  const show = (k, x) => x == null || x === "" ? "blank" : ["price", "joining_fee", "tag_fee"].includes(k) ? "$" + (+x).toFixed(2)
    : ["flexi", "includes_classes", "includes_recovery", "online", "at_desk"].includes(k) ? (x ? "yes" : "no")
    : k === "status" ? STATUS[x] : k === "billing" ? BILLING[x] : k === "kind" ? KINDS[x] : k === "family" ? FAMILIES[x] : String(x);

  async function save(env, who, can, b) {
    if (!can.add) return { ok: false, error: "No access" };
    const v = clean(b || {});
    if (b.id) {
      const cur = await one(env, "SELECT * FROM catalog WHERE id = ?", +b.id);
      if (!cur) return { ok: false, error: "Not found" };
      const diffs = Object.keys(v).filter(k => FIELDS.includes(k) && String(v[k] ?? "") !== String(cur[k] ?? ""));
      if (!diffs.length) return { ok: true, unchanged: true };
      if ("name" in v && !v.name) return { ok: false, error: "It needs a name." };
      if ("price" in v && v.price == null && cur.kind !== "other") return { ok: false, error: "It needs a price (0 is fine for a free trial)." };
      await env.DB.batch([
        env.DB.prepare("UPDATE catalog SET " + diffs.map(k => k + " = ?").join(", ") + ", updated_by = ?, updated_at = datetime('now') WHERE id = ?").bind(...diffs.map(k => v[k]), who.id, cur.id),
        ...diffs.map(k => env.DB.prepare("INSERT INTO catalog_changes(item_id, staff_id, what) VALUES (?, ?, ?)").bind(cur.id, who.id, LABEL[k] + ": " + show(k, cur[k]) + " to " + show(k, v[k]))),
      ]);
      const warn = "price" in v && cur.gm_id && cur.gm_price != null && v.price !== cur.gm_price
        ? "Saved. GymMaster still says $" + cur.gm_price.toFixed(2) + ", so change it there too until GymMaster is switched off. Members already on this keep their price." : null;
      return { ok: true, warn };
    }
    if (!v.name) return { ok: false, error: "Give it a name, like \"M2 Perform - Weekly\"." };
    if (v.price == null) return { ok: false, error: "Type a price (0 for a free trial)." };
    const row = await one(env, `INSERT INTO catalog(name, kind, family, billing, price, joining_fee, tag_fee, lock_in_months, flexi, length_days, visits, includes_classes, includes_recovery,
                                  online, at_desk, status, gm_id, blurb, staff_note, sort, created_by, updated_by)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      v.name, v.kind || "membership", v.family || "other", v.billing || "weekly", v.price, v.joining_fee ?? 0, v.tag_fee ?? 0, v.lock_in_months ?? null, v.flexi ?? 0,
      v.length_days ?? null, v.visits ?? null, v.includes_classes ?? 0, v.includes_recovery ?? 0, v.online ?? 0, v.at_desk ?? 1, v.status || "selling", v.gm_id ?? null,
      v.blurb ?? null, v.staff_note ?? null, v.sort ?? 500, who.id, who.id);
    await run(env, "INSERT INTO catalog_changes(item_id, staff_id, what) VALUES (?, ?, ?)", row.id, who.id, "Added " + v.name + " at $" + v.price.toFixed(2) + " " + (BILLING[v.billing || "weekly"] || "").toLowerCase());
    return { ok: true, id: row.id, warn: v.gm_id ? null : "Added. While GymMaster still runs sign-ups, also create it in GymMaster and put its id here, so it can be sold at the desk and online." };
  }

  // What Add member offers: selling here, sold at the desk, and set up in GymMaster.
  async function forSale(env) {
    const rows = await all(env, "SELECT * FROM catalog WHERE status = 'selling' AND at_desk = 1 AND gm_id IS NOT NULL ORDER BY sort, id");
    return rows.length ? rows : null;
  }

  return { list, save, forSale, KINDS, FAMILIES, BILLING };
}
