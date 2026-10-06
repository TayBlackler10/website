// M2 Core: "Ask M2", the command bar. Plain-English questions about members, answered by M2 Core itself.
//
// Security: no AI model sees member data. Each question is matched to one of a fixed set of
// read-only questions written here, with the person's own permissions applied:
//   - business totals (money owed in total, the debit run) are Taylor and Tim only
//   - reception and the manager can see what a single member owes
//   - trainers only ever see their own clients, so they get name search only
// Every question is written to the Activity log (see audit.js).

export function makeAsk(L) {
  const { nzDateTime, CLUB, B } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const nm = r => [r.first_name, r.last_name].filter(Boolean).join(" ") || "No name";
  const $ = n => "$" + Math.round(+n || 0).toLocaleString("en-NZ");
  const PLAN = `(SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1)`;
  const LAST = `(SELECT max(at) FROM (SELECT max(v.at) at FROM visits v WHERE v.member_id = m.id UNION ALL SELECT max(d.at) FROM app_doors d WHERE d.member_id = m.id))`;
  const FAMS = { perform: "perform", daily: "daily", class: "classes", recovery: "recovery", transporter: "transporter", passport: "passport", pool: "pool" };

  const SUGGEST = ["Who owes money but trained this week?", "Perform members who haven't been in 14 days", "Daily members ready for Perform",
    "Passport members under once a week", "How much do overdue members owe?", "Who has a one-year anniversary this week?",
    "Newer members who haven't used their free PT", "What's Monday's debit run?", "Who's on the red list?", "Trials ending this week", "Birthdays today"];

  const out = (answer, members, action, hl) => ({ answer, members: members || [], action: action || null, highlight: hl || [] });

  async function ask(env, who, can, q) {
    q = String(q || "").trim().slice(0, 200);
    const s = q.toLowerCase();
    const biz = !!can.business, desk = can.members === true;
    const suggestions = SUGGEST.filter(x => biz || !/how much|debit run/i.test(x));
    if (!q) return { ...out("Ask about your members the way you'd ask Bekka."), suggestions };
    if (!desk) {
      if (can.members !== "own") return out("Ask M2 isn't on for your login.");
      return nameSearch(env, who, can, q, suggestions);
    }
    const t = todayNz();

    // Monday's debit run (owners).
    if (/debit run|direct debit|billing run/.test(s)) {
      if (!biz) return out("Only Taylor and Tim see the debit run.");
      const dow = (new Date(t + "T12:00:00Z").getUTCDay() + 6) % 7, mon = dow === 0 ? t : addDays(t, 7 - dow);
      const r = await B.day(env, who, can, mon);
      return out(`Monday ${mon.slice(8, 10)}/${mon.slice(5, 7)}: ${r.rows.length.toLocaleString("en-NZ")} debits for ${$(r.total)}, plus ${r.skipped.length} skipped (holds and cancellations).`,
        [], { label: "Open Billing", go: "billing" }, [$(r.total), String(r.rows.length)]);
    }

    // How much is owed in total (owners).
    if (/how much.*(owe|owing|overdue|debt)|total (owed|owing|debt)/.test(s)) {
      if (!biz) return out("Only Taylor and Tim see money totals. Open Money owed to see each member's balance.", [], { label: "Open Money owed", go: "collections" });
      const r = await one(env, `SELECT round(sum(CASE WHEN m.status = 'active' THEN b.balance_owing END)) cur, sum(m.status = 'active') ncur,
                                 round(sum(CASE WHEN m.status <> 'active' THEN b.balance_owing END)) gone, sum(m.status <> 'active') ngone
                                FROM billing_accounts b JOIN members m ON m.id = b.member_id WHERE b.balance_owing > 0`);
      return out(`Current members owe ${$(r.cur)} across ${r.ncur || 0} people. Former members who left owing: ${$(r.gone)} across ${r.ngone || 0}.`,
        [], { label: "Open Money owed", go: "collections" }, [$(r.cur), $(r.gone)]);
    }

    // Owe money and still training.
    if (/(owe|owing|overdue|debt)/.test(s) && /(train|visit|came|come|in this week|been in|still)/.test(s)) {
      const days = /today/.test(s) ? 1 : /month|30/.test(s) ? 30 : 7;
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan, b.balance_owing owed, ${LAST} last FROM members m
        JOIN billing_accounts b ON b.member_id = m.id WHERE b.balance_owing > 0
          AND EXISTS (SELECT 1 FROM visits v WHERE v.member_id = m.id AND v.at >= ?) ORDER BY b.balance_owing DESC`, addDays(t, -days + 1));
      return out(`${rows.length} member${rows.length === 1 ? "" : "s"} owe money and trained in the last ${days === 1 ? "day" : days + " days"}.`,
        rows.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: "Owes " + $(r.owed) + ", last in " + String(r.last || "").slice(0, 10) })),
        { label: "Open Money owed", go: "collections" }, [String(rows.length)]);
    }

    // Ready for Perform / upgrades.
    if (/ready for perform|upgrade|train like perform/.test(s)) return fromPlay(env, "upgrade", "train 2.5 times a week or more on a Daily or Entry membership", biz);
    if (/free pt|haven'?t (used|had).*pt|no pt/.test(s)) return fromPlay(env, "pt", "joined in the last 90 days and haven't had their free PT", biz);
    if (/red list|at risk|risk|about to (cancel|leave)|health score/.test(s)) return fromPlay(env, "red", "are on the red list (health score 70 or more)", biz);

    // Passport under once a week.
    if (/passport/.test(s) && /(under|less|below|not|haven)/.test(s)) {
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan,
          (SELECT count(DISTINCT substr(v.at, 1, 10)) FROM visits v WHERE v.member_id = m.id AND v.at >= ?) days
        FROM members m JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport' WHERE m.status = 'active' AND coalesce(m.joined_on, '2000-01-01') <= ?`, addDays(t, -27), addDays(t, -28));
      const low = rows.filter(r => r.days < 4).sort((a, b) => a.days - b.days);
      return out(`${low.length.toLocaleString("en-NZ")} of ${rows.length.toLocaleString("en-NZ")} Passport members came in fewer than 4 days in the last 4 weeks. ${low.filter(r => !r.days).length.toLocaleString("en-NZ")} didn't come at all.`,
        low.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: r.days + " day" + (r.days === 1 ? "" : "s") + " in 4 weeks" })),
        { label: "Passport nudges", go: "passport" }, [String(low.length)]);
    }

    // "<family> members who haven't been in N days"
    const gap = s.match(/(?:haven'?t been|not been|no visit|haven'?t (?:come|visited|trained)).*?(\d+)\s*(day|week)/) || (/(haven'?t been|not been in|missing)/.test(s) ? [null, "14", "day"] : null);
    if (gap) {
      const n = +gap[1] * (gap[2] === "week" ? 7 : 1);
      const fam = Object.keys(FAMS).find(k => s.includes(k));
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan, ${LAST} last FROM members m
        WHERE m.status = 'active' AND EXISTS (SELECT 1 FROM memberships x JOIN plans y ON y.id = x.plan_id WHERE x.member_id = m.id AND x.status = 'current'
          AND ${fam ? "y.family = ?" : "y.family NOT IN ('staff', 'trial', 'pass')"}) AND coalesce(m.joined_on, '2000-01-01') <= ?`, ...(fam ? [FAMS[fam]] : []), addDays(t, -n));
      const cut = addDays(t, -n);
      const away = rows.filter(r => !r.last || r.last.slice(0, 10) < cut).sort((a, b) => String(a.last || "").localeCompare(String(b.last || "")));
      const label = fam ? fam.charAt(0).toUpperCase() + fam.slice(1) + " members" : "Members";
      return out(`${away.length.toLocaleString("en-NZ")} ${label.toLowerCase()} haven't been in for ${n} days or more.`,
        away.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: r.last ? "Last in " + r.last.slice(0, 10) : "No visits on record since August" })),
        { label: "Log calls", call: true }, [String(away.length)]);
    }

    // Anniversaries.
    if (/anniversar|one.year|1 year|a year/.test(s)) {
      const wk = [-3, -2, -1, 0, 1, 2, 3].map(i => addDays(t, i).slice(5));
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.joined_on, ${PLAN} plan FROM members m WHERE m.status = 'active'
        AND substr(m.joined_on, 1, 4) = ? AND substr(m.joined_on, 6, 5) IN (${wk.map(() => "?").join(",")}) ORDER BY m.joined_on`, String(+t.slice(0, 4) - 1), ...wk);
      return out(`${rows.length} member${rows.length === 1 ? " has" : "s have"} a one-year anniversary this week.`,
        rows.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: "Joined " + r.joined_on })), null, [String(rows.length)]);
    }

    // Trials.
    if (/trial|5 days|pass(es)? (ending|end)/.test(s)) {
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, p.gm_type_name plan, ms.end_date, ms.start_date FROM memberships ms JOIN plans p ON p.id = ms.plan_id
        JOIN members m ON m.id = ms.member_id WHERE ms.status = 'current' AND p.family IN ('trial', 'pass') ORDER BY coalesce(ms.end_date, '9999')`);
      const end = /end|finish|expir/.test(s) ? rows.filter(r => r.end_date && r.end_date <= addDays(t, 7)) : rows;
      return out(`${end.length} ${/end|finish|expir/.test(s) ? "trials and passes end in the next 7 days" : "people are on a trial or pass right now"}.`,
        end.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: (r.end_date ? "Ends " + r.end_date : "Started " + (r.start_date || "")) })),
        { label: "Member leads", go: "leads" }, [String(end.length)]);
    }

    // Birthdays.
    if (/birthday/.test(s)) {
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan FROM members m WHERE m.status = 'active' AND substr(m.dob, 6, 5) = ? ORDER BY m.first_name`, t.slice(5));
      return out(`${rows.length} birthday${rows.length === 1 ? "" : "s"} today.`, rows.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: "" })), null, [String(rows.length)]);
    }

    // Counts.
    if (/how many/.test(s)) {
      const fam = Object.keys(FAMS).find(k => s.includes(k));
      if (/in (the club|now)|here now|training now/.test(s)) {
        const a = nzDateTime(new Date(Date.now() - 90 * 60000));
        const n = (await one(env, "SELECT count(DISTINCT member_id) n FROM (SELECT member_id FROM visits WHERE at >= ? UNION ALL SELECT member_id FROM app_doors WHERE at >= ?)", a, a)).n;
        return out(`About ${n} people have come in during the last 90 minutes.`, [], null, [String(n)]);
      }
      const r = await one(env, `SELECT count(DISTINCT m.id) n FROM members m JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' JOIN plans p ON p.id = ms.plan_id
        WHERE m.status = 'active' AND ${fam ? "p.family = ?" : "p.family NOT IN ('staff', 'trial', 'pass')"}`, ...(fam ? [FAMS[fam]] : []));
      return out(`${r.n.toLocaleString("en-NZ")} ${fam ? fam + " members" : "members"} right now (staff, trials and passes not counted).`, [], null, [r.n.toLocaleString("en-NZ")]);
    }

    return nameSearch(env, who, can, q, suggestions);
  }

  async function fromPlay(env, id, phrase, biz) {
    const d = await CLUB.cached(env);
    const p = d.plays.find(x => x.id === id);
    const n = p.members.length;
    return out(`${n.toLocaleString("en-NZ")} member${n === 1 ? "" : "s"} ${phrase}.` + (biz ? ` Worth about $${Math.round(p.value).toLocaleString("en-NZ")} a year.` : ""),
      p.members.map(m => ({ id: m.id, name: m.name, plan: m.plan, why: id === "red" && !biz ? m.why : m.why })),
      biz ? { label: "Open the play", play: id } : { label: "Log calls", call: true }, [n.toLocaleString("en-NZ")]);
  }

  async function nameSearch(env, who, can, q, suggestions) {
    const like = "%" + q.toLowerCase() + "%", digits = q.replace(/\D/g, "");
    if (q.length < 2) return { ...out("Try a name, or one of these questions."), suggestions };
    const own = can.members === "own";
    const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan FROM members m
      WHERE (lower(m.first_name || ' ' || coalesce(m.last_name, '')) LIKE ? OR lower(coalesce(m.email, '')) LIKE ? ${digits.length >= 5 ? "OR m.mobile LIKE ?" : ""})
      ${own ? "AND m.trainer_id = ?" : ""} ORDER BY m.status = 'active' DESC, m.first_name LIMIT 25`, like, like, ...(digits.length >= 5 ? ["%" + digits + "%"] : []), ...(own ? [who.id] : []));
    if (rows.length) return out(`${rows.length === 25 ? "25 or more" : rows.length} member${rows.length === 1 ? "" : "s"} match "${q}".`, rows.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: "" })));
    return { ...out(`I can't answer that one yet. Try one of these.`), suggestions };
  }

  return { ask };
}
