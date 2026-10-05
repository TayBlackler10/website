// M2 Core: a member's own data, in one file, for a Privacy Act request.
// Under the Privacy Act 2020 a member can ask for a copy of the personal information we hold about them
// (we must answer within 20 working days) and ask for it to be corrected. Reception downloads this file from
// the member's page, checks it, and sends it to the member. Passwords, sign-in tokens and other people's
// details are left out; the photo and signature are noted rather than embedded.

const SECTIONS = [
  ["members", "Your details", "id = ?"],
  ["memberships", "Memberships"],
  ["member_agreements", "Agreements you signed"],
  ["billing_accounts", "Account balance"],
  ["billing_profiles", "Billing set-up (bank details are held by Ezidebit, not by M2)"],
  ["billing_items", "Billing items"],
  ["billing_events", "Billing history"],
  ["payments", "Payments"],
  ["gm_failed", "Payments that didn't go through"],
  ["gm_holds", "Holds"],
  ["gm_cancels", "Cancellation notices"],
  ["collections_cases", "Money owed follow-up"],
  ["pos_sales", "Purchases at reception"],
  ["sales", "Sales"],
  ["visits", "Visits"],
  ["member_visit_months", "Visits by month"],
  ["bookings", "Class bookings (GymMaster)"],
  ["class_bookings", "Class bookings"],
  ["class_attendance", "Class attendance"],
  ["key_tags", "Key tags"],
  ["member_flags", "Flags on your account"],
  ["member_health_notes", "Health notes you gave us"],
  ["activity", "Notes and contact history"],
  ["leads", "Enquiries"],
  ["email_log", "Emails we sent you"],
  ["message_sends", "Messages we sent you"],
  ["app_requests", "Requests from the M2 app"],
  ["app_doors", "Doors opened from the M2 app"],
  ["app_nudges", "Reminders shown in the M2 app"],
];
// Never handed out: secrets, and columns that only make sense inside the system.
const HIDE = /(^|_)(token|hash|salt|secret|password|signature|photo_data|image|ip)$/i;

export function makePrivacy(L) {
  const { nzDateTime } = L;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nice = k => k.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

  async function cols(env, table) {
    try { return ((await env.DB.prepare(`PRAGMA table_info(${table})`).all()).results || []).map(c => c.name); } catch { return []; }
  }

  async function exportFile(env, who, can, id) {
    if (can.members !== true) return new Response("Only reception, the manager and owners can do this.", { status: 403 });
    const m = await env.DB.prepare("SELECT first_name, last_name FROM members WHERE id = ?").bind(id).first();
    if (!m) return new Response("Member not found", { status: 404 });
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
    let body = "", total = 0;
    for (const [table, title, where] of SECTIONS) {
      const c = await cols(env, table);
      if (!c.length || (!where && !c.includes("member_id"))) continue;
      const rows = ((await env.DB.prepare(`SELECT * FROM ${table} WHERE ${where || "member_id = ?"} LIMIT 5000`).bind(id).all()).results) || [];
      if (!rows.length) continue;
      const keep = c.filter(k => !HIDE.test(k) && k !== "member_id");
      total += rows.length;
      body += `<h2>${esc(title)} <small>${rows.length}</small></h2>`;
      if (rows.length === 1 && keep.length > 6) {
        body += "<table>" + keep.filter(k => rows[0][k] != null && rows[0][k] !== "").map(k => `<tr><th>${esc(nice(k))}</th><td>${esc(rows[0][k])}</td></tr>`).join("") + "</table>";
      } else {
        const used = keep.filter(k => rows.some(r => r[k] != null && r[k] !== ""));
        body += "<table><tr>" + used.map(k => `<th>${esc(nice(k))}</th>`).join("") + "</tr>" +
          rows.map(r => "<tr>" + used.map(k => `<td>${esc(r[k])}</td>`).join("") + "</tr>").join("") + "</table>";
      }
    }
    const photo = await env.DB.prepare("SELECT count(*) n FROM member_photos WHERE member_id = ?").bind(id).first().catch(() => ({ n: 0 }));
    const sig = await env.DB.prepare("SELECT count(*) n FROM member_agreements WHERE member_id = ?").bind(id).first().catch(() => ({ n: 0 }));
    const login = await env.DB.prepare("SELECT count(*) n FROM member_logins WHERE member_id = ?").bind(id).first().catch(() => ({ n: 0 }));
    const held = [photo.n ? "a photo of you for check-in" : null, sig.n ? "your signature on the agreements above" : null, login.n ? "an M2 app password (stored scrambled, so nobody at M2 can read it)" : null].filter(Boolean);
    const when = nzDateTime(new Date()).slice(0, 16);
    const html = `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your information held by M2 Training Club</title><style>
body{font:15px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#111;max-width:980px;margin:32px auto;padding:0 16px}
h1{font-size:26px;margin:0 0 6px}h2{font-size:17px;margin:28px 0 8px;border-bottom:2px solid #D7FF3C;padding-bottom:4px}h2 small{color:#777;font-weight:400}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #e5e5e5;vertical-align:top}th{background:#f6f6f2;font-weight:600}
.note{background:#f6f6f2;padding:12px 14px;border-radius:8px;margin:14px 0}</style></head><body>
<h1>Your information held by M2 Training Club</h1>
<p>${esc(name)}, member ${id}. Prepared ${esc(when)} (NZ time) by ${esc(who.name)}.</p>
<div class="note">This is everything M2 Training Club holds about you in our member system, ${total} records in all.${held.length ? " We also hold " + esc(held.join(", ")) + "." : ""} Bank and card details are held by our payment provider, Ezidebit, not by M2. If anything here is wrong, reply to us or tell reception and we'll correct it. Questions: reception@m2club.co.nz, 09 558 1408, 8 Nugent Street, Grafton, Auckland.</div>
${body || "<p>No other records.</p>"}
</body></html>`;
    const file = ("M2 information for " + name).replace(/[^\w .-]/g, "").trim() + ".html";
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" } });
  }

  return { exportFile };
}
