// M2 Core: phone notifications (Web Push).
// Staff add the Core to their home screen, tap "Turn on notifications", and the Core can then
// buzz their phone, for example when Tim gives a trainer a PT lead. No app store build needed:
// iPhones (iOS 16.4+) and Android both support this for home screen web apps.
//
// The signing keys (VAPID) are made by the Core the first time they're needed and kept in the
// settings table, so there's nothing to set up in Cloudflare.

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const enc = new TextEncoder();
const concat = (...parts) => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

export function makePush() {
  async function keys(env) {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'vapid_keys'").first();
    if (row) return JSON.parse(row.value);
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const k = { priv: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
    await env.DB.prepare("INSERT OR IGNORE INTO settings(key, value) VALUES ('vapid_keys', ?)").bind(JSON.stringify(k)).run();
    return JSON.parse((await env.DB.prepare("SELECT value FROM settings WHERE key = 'vapid_keys'").first()).value);
  }

  async function vapidHeader(env, endpoint) {
    const k = await keys(env);
    const aud = new URL(endpoint).origin;
    const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
    const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:reception@m2club.co.nz" })));
    const key = await crypto.subtle.importKey("jwk", k.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
    return "vapid t=" + head + "." + body + "." + b64u(sig) + ", k=" + k.pub;
  }

  // RFC 8291 message encryption (aes128gcm), so the notification text can't be read in transit.
  async function encrypt(sub, text) {
    const uaPub = unb64u(sub.p256dh), auth = unb64u(sub.auth);
    const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
    const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
    const prkKey = await hmac(auth, shared);
    const ikm = (await hmac(prkKey, concat(enc.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])))).slice(0, 32);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const prk = await hmac(salt, ikm);
    const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
    const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
    const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(enc.encode(text), new Uint8Array([2]))));
    const rs = new Uint8Array([0, 0, 16, 0]);
    return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
  }

  async function sendOne(env, sub, msg) {
    const body = await encrypt(sub, JSON.stringify(msg));
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: { Authorization: await vapidHeader(env, sub.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
      body,
    });
    if (r.status === 404 || r.status === 410) { await env.DB.prepare("DELETE FROM push_subs WHERE id = ?").bind(sub.id).run(); return "gone"; }
    await env.DB.prepare("UPDATE push_subs SET last_ok = CASE WHEN ? THEN datetime('now') ELSE last_ok END, fails = CASE WHEN ? THEN 0 ELSE fails + 1 END WHERE id = ?")
      .bind(r.ok ? 1 : 0, r.ok ? 1 : 0, sub.id).run();
    return r.ok ? "sent" : "error " + r.status;
  }

  // Buzz every phone a staff member has turned notifications on for.
  async function toStaff(env, staffIds, msg) {
    const ids = [].concat(staffIds).map(Number).filter(Boolean);
    if (!ids.length) return { sent: 0 };
    const subs = (await env.DB.prepare(`SELECT * FROM push_subs WHERE staff_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all()).results || [];
    let sent = 0;
    for (const s of subs) { try { if ((await sendOne(env, s, msg)) === "sent") sent++; } catch (e) { console.log("push", String(e)); } }
    return { sent, phones: subs.length };
  }

  async function subscribe(env, who, b) {
    const s = b && b.sub;
    if (!s || !/^https:\/\//.test(s.endpoint || "") || !s.keys || !s.keys.p256dh || !s.keys.auth) return { ok: false, error: "That phone didn't give a usable subscription." };
    await env.DB.prepare(`INSERT INTO push_subs(staff_id, endpoint, p256dh, auth, ua) VALUES (?, ?, ?, ?, ?)
                          ON CONFLICT(endpoint) DO UPDATE SET staff_id = excluded.staff_id, p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua, fails = 0`)
      .bind(who.id, s.endpoint, s.keys.p256dh, s.keys.auth, String(b.ua || "").slice(0, 160)).run();
    const test = b.test ? await toStaff(env, who.id, { title: "M2 Core", body: "Notifications are on. You'll get a buzz when something needs you.", url: "/" }) : null;
    return { ok: true, test };
  }

  async function status(env, who) {
    const n = await env.DB.prepare("SELECT count(*) n FROM push_subs WHERE staff_id = ?").bind(who.id).first();
    return { key: (await keys(env)).pub, phones: n.n };
  }

  return { keys, toStaff, subscribe, status };
}

// The service worker: shows the notification and opens the right page when it's tapped.
export const SW_JS = `
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "M2 Core", {
    body: d.body || "Something needs you in the M2 Core.", icon: "https://m2club.co.nz/assets/icon-192.png",
    badge: "https://m2club.co.nz/assets/icon-192.png", tag: d.tag || undefined, data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
`;
