// M2 Core: online sign-ups from m2club.co.nz/join.html land here.
//
// While GymMaster runs billing and doors (join_mode "gymmaster", the default in m2-join):
//   1. join_start: the moment someone submits, the Core records them as an unfinished sign-up lead,
//      so nobody is lost if GymMaster then fails.
//   2. m2-join creates them in GymMaster as before.
//   3. online_join: the Core creates the member straight away (same id as GymMaster), with their
//      membership, lead source, photo, signed agreement, a password hash for the M2 App, the
//      "get bank details" job and a notification to the team. The hourly copy then lines up on the same row.
// When GymMaster stops (JOIN_MODE = "core" on m2-join), step 2 is skipped and the Core gives the member
// their own number (from 1,000,000 up, so it never clashes with a GymMaster number).

export function makeJoin(L) {
  const { nzDateTime, normMobile, classify, passportJoin, P } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const clean = (s, n = 120) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, n);
  const WK = { weekly: 1, fortnightly: 2, monthly: 52 / 12, quarterly: 13 };

  // Password hash for the M2 App (PBKDF2-SHA256). The password itself is never stored.
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  async function hashPassword(pw, saltB64) {
    const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
    return { salt: b64(salt), hash: b64(bits) };
  }
  async function checkPassword(env, email, pw) {
    const r = await one(env, "SELECT member_id, salt, hash FROM member_logins WHERE email = ?", String(email || "").trim().toLowerCase());
    if (!r || !pw) return null;
    const h = await hashPassword(String(pw), r.salt);
    return h.hash === r.hash ? r.member_id : null;
  }

  async function start(env, b) {
    const email = clean(b.email).toLowerCase(), mobile = normMobile(b.mobile);
    if (!email && !mobile) return { ok: false, error: "No contact details" };
    const name = clean([b.first, b.last].filter(Boolean).join(" "));
    const open = await one(env, `SELECT id FROM leads WHERE kind = 'unfinished_signup' AND stage NOT IN ('joined', 'lost') AND created_at >= datetime('now', '-14 days')
                                 AND ((? <> '' AND lower(email) = ?) OR (? IS NOT NULL AND mobile = ?)) LIMIT 1`, email, email, mobile, mobile);
    const note = "Started joining online: " + clean(b.plan_name) + (b.code ? " (code " + clean(b.code, 30) + ")" : "");
    if (open) { await run(env, "UPDATE leads SET notes = ? WHERE id = ?", note, open.id); return { ok: true, lead_id: open.id }; }
    const row = await one(env, `INSERT INTO leads(name, email, mobile, kind, source, campaign, stage, notes) VALUES (?, ?, ?, 'unfinished_signup', ?, ?, 'new', ?) RETURNING id`,
      name || null, email || null, mobile, clean(b.source) || "Online signup", clean(b.campaign) || null, note);
    return { ok: true, lead_id: row.id };
  }

  async function planFor(env, b) {
    const name = clean(b.plan_name, 160);
    let p = b.plan_id ? await one(env, "SELECT * FROM plans WHERE gm_join_id = ?", +b.plan_id) : null;
    if (!p && name) p = await one(env, "SELECT * FROM plans WHERE gm_type_name = ? ORDER BY id LIMIT 1", name);
    if (!p && name) {
      const c = classify(name, "Sold online", "");
      p = await one(env, `INSERT INTO plans(gm_type_name, gm_category, family, frequency, flexi, paid_in_full, includes_classes, includes_recovery, gm_join_id)
                          VALUES (?, 'Sold online', ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(gm_type_name, gm_category) DO UPDATE SET gm_join_id = coalesce(plans.gm_join_id, excluded.gm_join_id) RETURNING *`,
        name, c.family, c.frequency, c.flexi, c.paid_in_full, c.includes_classes, c.includes_recovery, b.plan_id ? +b.plan_id : null);
    }
    return p;
  }

  async function finish(env, b) {
    const t = todayNz();
    const first = clean(b.first) || "Unknown", last = clean(b.last) || null, email = clean(b.email).toLowerCase() || null, mobile = normMobile(b.mobile);
    let id = +b.gm_id || null;
    if (!id) {
      // Core-only sign-up (GymMaster switched off): refuse a second account on the same email.
      if (email && await one(env, "SELECT 1 FROM members WHERE lower(email) = ? AND status IN ('active', 'frozen')", email)) return { ok: false, exists: true, error: "You're already in our system with that email." };
      const top = await one(env, "SELECT max(id) n FROM members");
      id = Math.max(1000000, ((top && top.n) || 0) + 1);
    }
    const plan = await planFor(env, b);
    const price = Number.isFinite(+b.price) ? Math.round(+b.price * 100) / 100 : null;
    const passport = !!b.fp_id || (plan && plan.family === "passport");
    const billedBy = passport ? "passport" : b.paid ? "ezidebit" : "none";
    const stmts = [
      env.DB.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, dob, gender, suburb, lead_source, lead_campaign, status, joined_on, terms_signed_on)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                      ON CONFLICT(id) DO UPDATE SET email = coalesce(members.email, excluded.email), mobile = coalesce(members.mobile, excluded.mobile),
                        dob = coalesce(members.dob, excluded.dob), gender = coalesce(members.gender, excluded.gender), suburb = coalesce(members.suburb, excluded.suburb),
                        lead_source = coalesce(members.lead_source, excluded.lead_source), lead_campaign = coalesce(members.lead_campaign, excluded.lead_campaign),
                        status = 'active', joined_on = coalesce(members.joined_on, excluded.joined_on), terms_signed_on = excluded.terms_signed_on, updated_at = datetime('now')`)
        .bind(id, b.gm_id ? id : null, first, last, email, mobile, clean(b.dob, 10) || null, { M: "Male", F: "Female", O: "Other" }[b.gender] || null, clean(b.suburb) || null,
              clean(b.source) || "Online signup", clean(b.campaign) || null, t, b.agreed ? t : null),
    ];
    if (plan && !(await one(env, "SELECT 1 FROM memberships WHERE member_id = ? AND plan_id = ? AND status = 'current'", id, plan.id)))
      stmts.push(env.DB.prepare(`INSERT INTO memberships(member_id, plan_id, price, weekly_value, start_date, status, billed_by, discount_code, sold_by)
                                 VALUES (?, ?, ?, ?, ?, 'current', ?, ?, 'Online')`)
        .bind(id, plan.id, price, price != null && WK[plan.frequency] ? Math.round(price / WK[plan.frequency] * 100) / 100 : null, t, billedBy, clean(b.code, 30) || null));
    await env.DB.batch(stmts);

    const notes = [];
    if (typeof b.photo === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.photo) && b.photo.length <= 600_000)
      await run(env, "INSERT INTO member_photos(member_id, jpeg) VALUES (?, ?) ON CONFLICT(member_id) DO UPDATE SET jpeg = excluded.jpeg, taken_at = datetime('now')", id, b.photo);
    else if (b.photo) notes.push("photo too big or not a JPEG, take one at reception");
    if (b.agreed) await run(env, "INSERT INTO member_agreements(member_id, plan, body, signature) VALUES (?, ?, ?, ?)", id, clean(b.plan_name, 160),
      "Agreed to the membership terms and signed online at m2club.co.nz/join.html",
      typeof b.signature === "string" && /^data:image\/png;base64,/.test(b.signature) && b.signature.length <= 400_000 ? b.signature : null);
    if (email && b.password && String(b.password).length >= 6) {
      const h = await hashPassword(String(b.password));
      await run(env, "INSERT INTO member_logins(email, member_id, salt, hash) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET member_id = excluded.member_id, salt = excluded.salt, hash = excluded.hash, set_at = datetime('now')", email, id, h.salt, h.hash);
    }
    // The lead they came from (or their unfinished sign-up) becomes joined.
    await run(env, `UPDATE leads SET stage = 'joined', member_id = ? WHERE stage NOT IN ('joined', 'lost') AND (id = ? OR (? IS NOT NULL AND lower(email) = ?) OR (? IS NOT NULL AND mobile = ?))`,
      id, +b.lead_id || 0, email, email, mobile, mobile);
    if (b.paid && !passport && !(await one(env, "SELECT 1 FROM tasks WHERE kind = 'missing_billing' AND member_id = ? AND outcome IS NULL", id)))
      await run(env, "INSERT INTO tasks(kind, member_id, owner_role, due_on) VALUES ('missing_billing', ?, 'reception', ?)", id, t);
    if (b.fp_id) { const pr = await passportJoin(env, { gm_id: id, fp_id: b.fp_id, first, last, email, mobile: b.mobile, dob: b.dob, source: b.source }); if (!pr.ok) notes.push(pr.error); }
    const label = clean(b.plan_name) + (price ? " ($" + price.toFixed(2) + ")" : "") + (b.code ? ", code " + clean(b.code, 30) : "");
    await run(env, "INSERT INTO activity(member_id, kind, detail) VALUES (?, 'sale', ?)", id, "Joined online: " + label + (b.source ? ". Came from " + clean(b.source) : "") + (notes.length ? ". " + notes.join(". ") : ""));
    const to = (await all(env, "SELECT id FROM staff WHERE active = 1 AND role IN ('owner', 'manager', 'reception')")).map(r => r.id);
    if (P) await P.toStaff(env, to, { title: "Joined online: " + first + " " + (last || ""), body: label + (b.paid && !passport ? ". Needs bank details." : ""), url: "/#members", tag: "join" }).catch(() => {});
    return { ok: true, member_id: id, plan: plan ? plan.gm_type_name : null };
  }

  return { start, finish, checkPassword, hashPassword };
}
