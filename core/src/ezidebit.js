// M2 Core: the Ezidebit connection (their SOAP web service, v3-5 non-PCI).
// The Core never sees bank or card numbers: members enter those on Ezidebit's own form,
// and the Core only adds, removes and reads payments against the member's reference (M2-<id>).
//
// Secrets and vars (Cloudflare, never in git):
//   EZIDEBIT_DIGITAL_KEY   the 36 character key from Ezidebit (sandbox key while testing)
//   EZIDEBIT_API_URL       defaults to the sandbox. Ezidebit confirm the live NZ address.
//   BILLING_MODE           "ezidebit" lets the Core send real debits. Anything else is preview.

const NS = "https://px.ezidebit.com.au/";
export const SANDBOX_URL = "https://api.demo.ezidebit.com.au/v3-5/nonpci";

const xmlEsc = s => String(s ?? "").replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const tag = (xml, name) => { const m = xml.match(new RegExp("<(?:\\w+:)?" + name + ">([\\s\\S]*?)</(?:\\w+:)?" + name + ">")); return m ? m[1] : null; };
const tags = (xml, name) => [...xml.matchAll(new RegExp("<(?:\\w+:)?" + name + ">([\\s\\S]*?)</(?:\\w+:)?" + name + ">", "g"))].map(m => m[1]);
const unesc = s => s == null ? s : s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export function makeEzidebit() {
  const url = env => env.EZIDEBIT_API_URL || SANDBOX_URL;
  const sandbox = env => /demo/i.test(url(env));
  const ready = env => !!env.EZIDEBIT_DIGITAL_KEY;

  async function call(env, method, params) {
    if (!ready(env)) throw new Error("Ezidebit isn't connected yet");
    const body = Object.entries({ DigitalKey: env.EZIDEBIT_DIGITAL_KEY, ...params })
      .map(([k, v]) => "<px:" + k + ">" + xmlEsc(v) + "</px:" + k + ">").join("");
    const envelope = '<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:px="' + NS + '">' +
      "<soapenv:Header/><soapenv:Body><px:" + method + ">" + body + "</px:" + method + "></soapenv:Body></soapenv:Envelope>";
    const r = await fetch(url(env), {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: NS + "INonPCIService/" + method },
      body: envelope,
    });
    const xml = await r.text();
    const fault = tag(xml, "faultstring");
    if (fault) throw new Error("Ezidebit: " + unesc(fault));
    const err = +(tag(xml, "Error") || 0);
    if (err) throw new Error("Ezidebit " + err + ": " + unesc(tag(xml, "ErrorMessage") || "error"));
    return xml;
  }

  const ref = memberId => "M2-" + memberId;

  // Debits are added one at a time, so the Core decides every amount (holds, arrears, arrangements).
  async function addPayment(env, memberId, date, amount, reference) {
    const xml = await call(env, "AddPayment", {
      EziDebitCustomerID: "", YourSystemReference: ref(memberId), DebitDate: date,
      PaymentAmountInCents: Math.round(amount * 100), PaymentReference: reference, Username: "M2 Core",
    });
    return unesc(tag(xml, "Data")) || "S";
  }

  async function deletePayment(env, memberId, date, amount, reference) {
    await call(env, "DeletePayment", {
      EziDebitCustomerID: "", YourSystemReference: ref(memberId), PaymentReference: reference,
      DebitDate: date, PaymentAmountInCents: Math.round(amount * 100), Username: "M2 Core",
    });
    return true;
  }

  // Results for every member over a date range: paid, failed or still processing.
  async function getPayments(env, from, to) {
    const xml = await call(env, "GetPayments", {
      PaymentType: "ALL", PaymentMethod: "ALL", PaymentSource: "ALL", PaymentReference: "",
      DateFrom: from, DateTo: to, DateField: "PAYMENT", EziDebitCustomerID: "", YourSystemReference: "",
    });
    return tags(xml, "Payment").map(p => {
      const f = n => unesc(tag(p, n));
      const st = (f("PaymentStatus") || "").toUpperCase();
      return {
        system_ref: f("YourSystemReference"), reference: f("PaymentReference"), ezi_id: f("PaymentID"),
        amount: +(f("PaymentAmount") || 0), debit_date: (f("DebitDate") || "").slice(0, 10), settled: (f("SettlementDate") || "").slice(0, 10) || null,
        status: st === "S" ? "paid" : st === "F" || st === "D" ? "failed" : "processing",
        reason: f("BankFailedReason") || f("BankReturnCode") || null,
      };
    });
  }

  async function changeStatus(env, memberId, status, reason) {
    await call(env, "ChangeCustomerStatus", { EziDebitCustomerID: "", YourSystemReference: ref(memberId), NewStatus: status, Username: "M2 Core", Reason: reason || "" });
    return true;
  }

  async function customer(env, memberId) {
    const xml = await call(env, "GetCustomerDetails", { EziDebitCustomerID: "", YourSystemReference: ref(memberId) });
    const f = n => unesc(tag(xml, n));
    return { ezi_id: f("EziDebitCustomerID"), status: f("CustomerStatus"), method: f("PaymentMethod"), name: [f("CustomerFirstName"), f("CustomerName")].filter(Boolean).join(" ") };
  }

  // Connection test: asks Ezidebit for a reference that won't exist. A "not found" style
  // answer means the key works; a key error means it doesn't.
  async function test(env) {
    if (!ready(env)) return { ok: false, error: "No Ezidebit key in Cloudflare yet" };
    try { await customer(env, "connection-test"); return { ok: true, sandbox: sandbox(env) }; }
    catch (e) {
      const m = String(e.message || e);
      if (/digital ?key|invalid key|authenticat/i.test(m)) return { ok: false, error: m };
      return { ok: true, sandbox: sandbox(env), note: m };
    }
  }

  return { ready, sandbox, url, ref, addPayment, deletePayment, getPayments, changeStatus, customer, test };
}
