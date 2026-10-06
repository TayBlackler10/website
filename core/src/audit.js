// M2 Core: the activity log. Every member record a staff member opens or changes, every search,
// report and export, and every settings or staff change is written down with who, when and from where.
// Owners see it on the Activity log page, and get a buzz when something looks off:
//   - someone (not an owner) opens 60+ different members in an hour
//   - someone (not an owner) pulls 5+ reports or exports in a day
//   - someone (not an owner) uses the Core between 11pm and 5am
//   - anyone uses the Core from outside New Zealand
// Each kind of alert goes out at most once a day per person. Entries are kept for a year.

export function makeAudit(L) {
  const { nzDateTime, P } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();

  const LIMITS = { views_per_hour: 60, exports_per_day: 5, quiet_from: 23, quiet_to: 5 };
  const LABEL = {
    view_member: "Opened a member", change_member: "Changed a member", add_member: "Added a member", billing_link: "Made a bank details link",
    search: "Searched members", browse: "Browsed members", report: "Ran a report", export: "Downloaded a file",
    staff_change: "Changed staff access", settings_change: "Changed settings", collections: "Collections action", sale: "Point of sale",
    lead_view: "Opened a lead", lead_change: "Changed a lead", change: "Other change",
  };

  // What a request means, or null for the routine page loads that aren't worth logging.
  function classify(method, path, q) {
    let m;
    const post = method === "POST";
    if ((m = path.match(/^\/api\/members\/(\d+)$/)) && !post) return { action: "view_member", member: +m[1] };
    if ((m = path.match(/^\/api\/members\/(\d+)\/(notes|flags|details|key-tag|photo)$/)) && post) return { action: "change_member", member: +m[1], detail: m[2] };
    if ((m = path.match(/^\/api\/members\/(\d+)\/billing-link$/))) return { action: "billing_link", member: +m[1] };
    if (path === "/api/members" && post) return { action: "add_member" };
    if (path === "/api/members" && q.get("q")) return { action: "search", detail: String(q.get("q")).slice(0, 60) };
    if (path === "/api/members/browse") return { action: "browse", detail: [q.get("f"), q.get("filter"), q.get("page")].filter(Boolean).join(" ").slice(0, 60) || null };
    if (path === "/api/ask") return { action: "search", detail: ("Ask M2: " + (q.get("q") || "")).slice(0, 120) };
    if (/^\/api\/plays\/[a-z]+$/.test(path)) return { action: "report", detail: "money on the table: " + path.split("/").pop() };
    if (path === "/api/report") return { action: "report", detail: [q.get("kind") || "current_members", q.get("from"), q.get("to")].filter(Boolean).join(" ") };
    if ((m = path.match(/^\/api\/members\/(\d+)\/privacy$/))) return { action: "export", member: +m[1], detail: "privacy request file" };
    if (/\.csv$/.test(path)) return { action: "export", detail: path.replace("/api/", "") + (q.get("month") ? " " + q.get("month") : "") };
    if ((m = path.match(/^\/api\/leads\/(\d+)$/))) return { action: post ? "lead_change" : "lead_view", detail: "lead " + m[1] };
    if (!post) return null;
    if (path === "/api/staff-admin") return { action: "staff_change" };
    if (["/api/settings", "/api/billing/rules", "/api/app", "/api/classes/source", "/api/passport/nudges", "/api/timetable"].includes(path)) return { action: "settings_change", detail: path.replace("/api/", "") };
    if (path === "/api/collections") return { action: "collections" };
    if (path === "/api/pos/sale") return { action: "sale" };
    if (path === "/api/push" || path === "/api/jobs") return null;   // phone sign-ups and ticking off Today's jobs
    return { action: "change", detail: path.replace("/api/", "") };
  }

  async function record(env, ctx, who, req, url) {
    const c = classify(req.method, url.pathname, url.searchParams);
    if (!c) return;
    const ip = req.headers.get("CF-Connecting-IP") || null, country = (req.cf && req.cf.country) || null;
    const job = (async () => {
      await env.DB.prepare("INSERT INTO audit_log(staff_id, action, member_id, detail, ip, country) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(who.id, c.action, c.member || null, c.detail || null, ip, country).run();
      await check(env, who, c, country);
    })().catch(e => console.log("audit", String(e)));
    if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  }

  // Once a day per person per kind of alert.
  async function once(env, who, kind) {
    const key = "audit_alert:" + kind + ":" + who.id, today = nzDateTime(new Date()).slice(0, 10);
    const r = await one(env, "SELECT value FROM settings WHERE key = ?", key);
    if (r && r.value === today) return false;
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, today).run();
    return true;
  }
  async function alert(env, who, kind, title, body) {
    if (!(await once(env, who, kind))) return;
    await env.DB.prepare("INSERT INTO audit_log(staff_id, action, detail) VALUES (?, 'alert', ?)").bind(who.id, title).run();
    const owners = (await all(env, "SELECT id FROM staff WHERE role = 'owner' AND active = 1")).map(r => r.id);
    await P.toStaff(env, owners, { title, body, url: "/#activity", tag: "audit-" + kind }).catch(() => {});
  }

  async function check(env, who, c, country) {
    const owner = who.role === "owner";
    if (country && country !== "NZ" && country !== "XX")   // XX = unknown; T1 (Tor) does alert
      await alert(env, who, "country", who.name + " is using the Core from outside NZ (" + country + ")", "If that isn't expected, remove their access in Staff and access.");
    if (owner) return;
    const hour = +nzDateTime(new Date()).slice(11, 13);
    if (hour >= LIMITS.quiet_from || hour < LIMITS.quiet_to)
      await alert(env, who, "late", who.name + " is using the Core at " + nzDateTime(new Date()).slice(11, 16), "Late-night use. Tap to see what they opened.");
    if (c.action === "view_member") {
      const n = (await one(env, "SELECT count(DISTINCT member_id) n FROM audit_log WHERE staff_id = ? AND action = 'view_member' AND at >= datetime('now', '-1 hour')", who.id)).n;
      if (n >= LIMITS.views_per_hour) await alert(env, who, "views", who.name + " opened " + n + " members in the last hour", "That's more than usual. Tap to see which ones.");
    }
    if (c.action === "report" || c.action === "export") {
      const n = (await one(env, "SELECT count(*) n FROM audit_log WHERE staff_id = ? AND action IN ('report', 'export') AND at >= datetime('now', '-1 day')", who.id)).n;
      if (n >= LIMITS.exports_per_day) await alert(env, who, "exports", who.name + " has pulled " + n + " reports or files today", "Tap to see which ones.");
    }
  }

  // Owners only.
  async function view(env, can, q) {
    if (!can.settings) return { error: "Only Taylor and Tim can see the activity log." };
    const staff = +q.get("staff") || null, member = +q.get("member") || null, action = q.get("action") || null;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(q.get("day") || "") ? q.get("day") : null;
    const where = [], args = [];
    if (staff) { where.push("a.staff_id = ?"); args.push(staff); }
    if (member) { where.push("a.member_id = ?"); args.push(member); }
    if (action) { where.push("a.action = ?"); args.push(action); }
    if (day) { where.push("a.at >= datetime(?, '-13 hours') AND a.at < datetime(?, '+11 hours')"); args.push(day, day); }
    const rows = await all(env, `SELECT a.id, a.at, a.action, a.member_id, a.detail, a.ip, a.country, s.name staff, s.role,
                                   trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) member
                                 FROM audit_log a LEFT JOIN staff s ON s.id = a.staff_id LEFT JOIN members m ON m.id = a.member_id
                                 ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY a.id DESC LIMIT 300`, ...args);
    rows.forEach(r => { r.at = nzDateTime(new Date(r.at.replace(" ", "T") + "Z")); r.label = r.action === "alert" ? "Alert" : (LABEL[r.action] || r.action); });
    const today = await all(env, `SELECT s.id, s.name, s.role, count(*) actions, count(DISTINCT CASE WHEN a.action = 'view_member' THEN a.member_id END) members,
                                    sum(a.action IN ('report', 'export')) reports, max(a.at) last
                                  FROM audit_log a JOIN staff s ON s.id = a.staff_id WHERE a.at >= datetime('now', '-1 day') AND a.action <> 'alert'
                                  GROUP BY s.id ORDER BY actions DESC`);
    today.forEach(r => { r.last = nzDateTime(new Date(r.last.replace(" ", "T") + "Z")).slice(11, 16); });
    const alerts = (await one(env, "SELECT count(*) n FROM audit_log WHERE action = 'alert' AND at >= datetime('now', '-7 days')")).n;
    const people = await all(env, "SELECT id, name FROM staff ORDER BY active DESC, name");
    return { rows, today, alerts_week: alerts, limits: LIMITS, labels: LABEL, people };
  }

  // A member's own history: who looked at or changed their record. Owners only.
  async function forMember(env, can, id) {
    if (!can.settings) return [];
    const rows = await all(env, `SELECT a.at, a.action, a.detail, s.name staff FROM audit_log a LEFT JOIN staff s ON s.id = a.staff_id
                                 WHERE a.member_id = ? ORDER BY a.id DESC LIMIT 30`, id);
    rows.forEach(r => { r.at = nzDateTime(new Date(r.at.replace(" ", "T") + "Z")); r.label = LABEL[r.action] || r.action; });
    return rows;
  }

  async function prune(env) {
    await env.DB.prepare("DELETE FROM audit_log WHERE at < datetime('now', '-365 days')").run();
  }

  return { record, view, forMember, prune, classify };
}
