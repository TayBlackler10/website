// M2 Core: point of sale at the desk.
// Products come from GymMaster's product list the first time, then the team keeps them here.
// Sales are taken by EFTPOS (the terminal on the desk) or cash and recorded against a member
// when there is one. Until GymMaster's POS is switched off, GymMaster and Xero don't see these sales.

export function makePos(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : null; };
  const CATS = ["Entry and key tags", "Supplements", "Drinks", "Clothing", "Towels", "Services", "Gift vouchers", "Other"];
  const PAY = { eftpos: "EFTPOS", cash: "Cash" };

  function guessCat(n) {
    n = n.toLowerCase();
    if (/key tag|casual|pool|spa|visit|pass/.test(n)) return "Entry and key tags";
    if (/hydrate|red ?bull|water|drink|electrolyte/.test(n) && !/protein water/.test(n)) return "Drinks";
    if (/kyro|creatine|protein|pre ?workout|pre ?lift|redcon|rule ?1|big noise|amino|burn|oxy|hyperload|whey|bcaa|supplement|nexus|ghost|bsc/.test(n)) return "Supplements";
    if (/zip|jacket|hood|tee|shirt|singlet|uniform|cap|hat|sock/.test(n)) return "Clothing";
    if (/towel/.test(n)) return "Towels";
    if (/tanita|scan|session|massage/.test(n)) return "Services";
    if (/voucher|gift/.test(n)) return "Gift vouchers";
    return "Other";
  }

  async function seed(env, who) {
    if (!env.GM_REPORT_KEY) return 0;
    const t = todayNz();
    const r = await fetch((env.GM_SITE || "https://m2trainingclub.gymmasteronline.com") + "/api/v2/report/standard_report", {
      method: "POST", headers: { "X-GM-API-KEY": String(env.GM_REPORT_KEY).trim(), "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: t, end_date: t, report_id: 124, company_id: +(env.COMPANY_ID || 4), displaymode: "ALL" }) });
    const d = await r.json().catch(() => ({}));
    const rows = Array.isArray(d.result) ? d.result : [];
    const stmts = rows.filter(x => x["Product Name"]).map((x, i) => {
      const name = String(x["Product Name"]).trim();
      return env.DB.prepare("INSERT OR IGNORE INTO pos_products(name, category, price, gm_name, sort, updated_by) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(name, guessCat(name), num(x["Sale Price"]) ?? 0, name, i, who ? who.id : null);
    });
    if (stmts.length) await env.DB.batch(stmts);
    await run(env, "INSERT INTO catalog_changes(item_id, staff_id, what) VALUES (NULL, ?, ?)", who ? who.id : null, "Point of sale: copied " + stmts.length + " products from GymMaster");
    return stmts.length;
  }

  async function products(env, who, can) {
    if (!can.add) return { error: "No access" };
    if (!(await one(env, "SELECT count(*) n FROM pos_products")).n) await seed(env, who).catch(() => 0);
    const items = await all(env, "SELECT id, name, category, price, active, sort FROM pos_products ORDER BY active DESC, category, sort, name");
    return { items, cats: CATS, pay: PAY };
  }

  async function saveProduct(env, who, can, b) {
    if (!can.add) return { ok: false, error: "No access" };
    const name = String(b.name || "").trim().slice(0, 80), price = num(b.price), cat = CATS.includes(b.category) ? b.category : "Other";
    if (!name) return { ok: false, error: "Give it a name." };
    if (price == null || price < 0 || price > 5000) return { ok: false, error: "Type a price, like 25.00" };
    if (b.id) {
      const cur = await one(env, "SELECT * FROM pos_products WHERE id = ?", +b.id);
      if (!cur) return { ok: false, error: "Not found" };
      const active = b.active === undefined ? cur.active : (b.active ? 1 : 0);
      await run(env, "UPDATE pos_products SET name = ?, category = ?, price = ?, active = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?", name, cat, r2(price), active, who.id, cur.id);
      const ch = [];
      if (cur.price !== r2(price)) ch.push("price $" + (+cur.price).toFixed(2) + " to $" + r2(price).toFixed(2));
      if (cur.name !== name) ch.push("renamed from " + cur.name);
      if (cur.active !== active) ch.push(active ? "back on sale" : "taken off sale");
      if (cur.category !== cat) ch.push("moved to " + cat);
      if (ch.length) await run(env, "INSERT INTO catalog_changes(item_id, staff_id, what) VALUES (NULL, ?, ?)", who.id, "Point of sale, " + name + ": " + ch.join(", "));
      return { ok: true };
    }
    const row = await one(env, "INSERT INTO pos_products(name, category, price, sort, updated_by) VALUES (?, ?, ?, 500, ?) RETURNING id", name, cat, r2(price), who.id);
    await run(env, "INSERT INTO catalog_changes(item_id, staff_id, what) VALUES (NULL, ?, ?)", who.id, "Point of sale: added " + name + " at $" + r2(price).toFixed(2));
    return { ok: true, id: row.id };
  }

  async function sell(env, who, can, b) {
    if (!can.add) return { ok: false, error: "No access" };
    const pay = PAY[b.paid_by] ? b.paid_by : null;
    if (!pay) return { ok: false, error: "Pick how they paid." };
    const lines = Array.isArray(b.lines) ? b.lines.slice(0, 40) : [];
    if (!lines.length) return { ok: false, error: "Add something to the sale first." };
    const ids = lines.map(l => +l.id).filter(Boolean);
    const prods = Object.fromEntries((await all(env, `SELECT id, name, price FROM pos_products WHERE active = 1 AND id IN (${ids.map(() => "?").join(",") || "0"})`, ...ids)).map(p => [p.id, p]));
    const clean = [];
    for (const l of lines) {
      const p = prods[+l.id], qty = Math.max(1, Math.min(50, Math.round(+l.qty || 1)));
      if (!p) return { ok: false, error: "Something in the sale isn't on sale any more. Take it out and try again." };
      // The price on the button, unless staff changed it for this sale (a discount), and never below zero.
      const price = l.price !== undefined && num(l.price) != null ? Math.max(0, r2(num(l.price))) : p.price;
      clean.push({ id: p.id, name: p.name, qty, price });
    }
    const total = r2(clean.reduce((a, l) => a + l.qty * l.price, 0));
    const member = +b.member_id || null;
    if (member && !(await one(env, "SELECT 1 FROM members WHERE id = ?", member))) return { ok: false, error: "Member not found" };
    const sale = await one(env, "INSERT INTO pos_sales(member_id, customer, staff_id, total, paid_by, note, day) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
      member, String(b.customer || "").trim().slice(0, 80) || null, who.id, total, pay, String(b.note || "").trim().slice(0, 200) || null, todayNz());
    const stmts = clean.map(l => env.DB.prepare("INSERT INTO pos_lines(sale_id, product_id, name, qty, price) VALUES (?, ?, ?, ?, ?)").bind(sale.id, l.id, l.name, l.qty, l.price));
    if (member) stmts.push(env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'purchase', ?)")
      .bind(member, who.id, "Bought " + clean.map(l => (l.qty > 1 ? l.qty + " x " : "") + l.name).join(", ") + " ($" + total.toFixed(2) + ", " + PAY[pay] + ")"));
    await env.DB.batch(stmts);
    return { ok: true, id: sale.id, total, key_tag: member && clean.some(l => /key tag/i.test(l.name)) };
  }

  async function sales(env, who, can, q) {
    if (!can.add) return { error: "No access" };
    const d = /^\d{4}-\d{2}-\d{2}$/.test(q.get("day") || "") ? q.get("day") : todayNz();
    const rows = await all(env, `SELECT s.id, s.at, s.total, s.paid_by, s.voided, s.note, s.customer, s.member_id, m.first_name, m.last_name, st.name staff,
                                   (SELECT group_concat(CASE WHEN l.qty > 1 THEN l.qty || ' x ' ELSE '' END || l.name, ', ') FROM pos_lines l WHERE l.sale_id = s.id) items
                                 FROM pos_sales s LEFT JOIN members m ON m.id = s.member_id LEFT JOIN staff st ON st.id = s.staff_id WHERE s.day = ? ORDER BY s.id DESC`, d);
    const totals = {};
    for (const r of rows) if (!r.voided) totals[r.paid_by] = r2((totals[r.paid_by] || 0) + r.total);
    return { day: d, rows, totals, can_void: !!can.collections };
  }

  async function voidSale(env, who, can, id, b) {
    if (!can.collections) return { ok: false, error: "Only Bekka and the owners can void a sale." };
    const reason = String(b.reason || "").trim();
    if (!reason) return { ok: false, error: "Say why it's being voided." };
    const s = await one(env, "SELECT * FROM pos_sales WHERE id = ?", id);
    if (!s || s.voided) return { ok: false, error: "That sale can't be voided." };
    await run(env, "UPDATE pos_sales SET voided = 1, note = coalesce(note || '. ', '') || ? WHERE id = ?", "Voided by " + who.name + ": " + reason.slice(0, 150), id);
    if (s.member_id) await run(env, "INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'purchase', ?)", s.member_id, who.id, "Sale of $" + (+s.total).toFixed(2) + " voided: " + reason.slice(0, 150));
    return { ok: true };
  }

  return { products, saveProduct, sell, sales, voidSale };
}
