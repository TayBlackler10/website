// M2 Core: the Ezidebit connection (their SOAP web service, v3-5 non-PCI).
// The Core never sees bank or card numbers: members enter those on Ezidebit's own form,
// and the Core only adds, removes and reads payments against the member's Ezidebit record.
//
// Secrets and vars (Cloudflare, never in git):
//   EZIDEBIT_DIGITAL_KEY   the 36 character key from Ezidebit (sandbox key while testing)
//   EZIDEBIT_API_URL       defaults to the sandbox. Live is https://api.ezidebit.com.au/v3-5/nonpci
//   BILLING_MODE           "ezidebit" lets the Core send real debits. Anything else is preview.
//
// Rules from Ezidebit's docs (https://www.getpayments.com/docs/) this file follows:
//   - every field of a method is sent, in the order Ezidebit lists it, blank when not used
//   - a customer is named by EziDebitCustomerID or YourSystemReference, never both
//   - an update only worked when Data is "S". Anything else is treated as not done.
//   - debits go in with AddPaymentUnique, so sending the same PaymentReference twice can't charge twice

const NS = "https://px.ezidebit.com.au/";
export const SANDBOX_URL = "https://api.demo.ezidebit.com.au/v3-5/nonpci";
export const MIN_CENTS = 200;   // Ezidebit's smallest debit is $2.00

// The Core's own payment references: M2-<billing item id>, with a short suffix when a debit is sent again.
export const OUR_REF = /^M2-\d+(?:-[a-z0-9]+)?$/;

const xmlEsc = s => String(s ?? "").replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const tag = (xml, name) => { const m = xml.match(new RegExp("<(?:\\w+:)?" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?" + name + ">")); return m ? m[1] : null; };
const tags = (xml, name) => [...xml.matchAll(new RegExp("<(?:\\w+:)?" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?" + name + ">", "g"))].map(m => m[1]);
const unesc = s => s == null ? s : s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();

// kind on a thrown error:
//   network   no clear answer, so whether Ezidebit did it is unknown
//   fault     Ezidebit rejected the request outright (nothing was done)
//   ezidebit  Ezidebit answered with an error number (nothing was done)
//   unknown   an answer without the "S" that confirms an update
function fail(msg, kind, code) { const e = new Error(msg); e.kind = kind; if (code != null) e.code = code; return e; }

export function makeEzidebit() {
  const url = env => env.EZIDEBIT_API_URL || SANDBOX_URL;
  const sandbox = env => /demo/i.test(url(env));
  const ready = env => !!env.EZIDEBIT_DIGITAL_KEY;

  async function call(env, method, params) {
    if (!ready(env)) throw fail("Ezidebit isn't connected yet", "setup");
    const body = Object.entries({ DigitalKey: env.EZIDEBIT_DIGITAL_KEY, ...params })
      .map(([k, v]) => "<px:" + k + ">" + xmlEsc(v) + "</px:" + k + ">").join("");
    const envelope = '<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:px="' + NS + '">' +
      "<soapenv:Header/><soapenv:Body><px:" + method + ">" + body + "</px:" + method + "></soapenv:Body></soapenv:Envelope>";
    let r, xml;
    try {
      r = await fetch(url(env), { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: NS + "INonPCIService/" + method }, body: envelope });
      xml = await r.text();
    } catch (e) { throw fail("Couldn't reach Ezidebit: " + (e.message || e), "network"); }
    const fault = tag(xml, "faultstring");
    if (fault) throw fail("Ezidebit: " + unesc(fault), "fault");
    if (!r.ok) throw fail("Ezidebit answered " + r.status, "network");
    const err = +(tag(xml, "Error") || 0);
    if (err) throw fail("Ezidebit " + err + ": " + (unesc(tag(xml, "ErrorMessage")) || "error"), "ezidebit", err);
    return xml;
  }
  const confirmed = (xml, what) => { if ((unesc(tag(xml, "Data")) || "") !== "S") throw fail("Ezidebit didn't confirm " + what, "unknown"); return true; };

  const ref = memberId => "M2-" + memberId;
  // A customer is named by Ezidebit's own customer ID when the Core has it, otherwise by a reference.
  const ids = c => c && c.cid ? { EziDebitCustomerID: String(c.cid), YourSystemReference: "" } : { EziDebitCustomerID: "", YourSystemReference: String((c && c.ref) || "") };

  // One debit. AddPaymentUnique refuses a PaymentReference Ezidebit already has, so a repeat can't charge twice.
  async function addPayment(env, cust, date, cents, reference) {
    if (!(cents >= MIN_CENTS)) throw fail("Ezidebit's smallest debit is $2.00", "setup");
    const xml = await call(env, "AddPaymentUnique", {
      ...ids(cust), DebitDate: date, PaymentAmountInCents: cents, PaymentReference: reference, Username: "M2 Core",
    });
    return confirmed(xml, "the debit was added");
  }
  const isDuplicate = e => !!e && e.kind === "ezidebit" && /already|duplicate|unique|exists/i.test(e.message || "");

  // Remove a debit still waiting at Ezidebit (status W). By our reference (the amount must then be 0),
  // or by date and amount for a payment another system added.
  async function deletePayment(env, cust, { reference, date, cents }) {
    const xml = await call(env, "DeletePayment", reference
      ? { ...ids(cust), PaymentReference: reference, DebitDate: "", PaymentAmountInCents: 0, Username: "M2 Core" }
      : { ...ids(cust), PaymentReference: "", DebitDate: date, PaymentAmountInCents: cents, Username: "M2 Core" });
    return confirmed(xml, "the debit was removed");
  }
  const notFound = e => !!e && e.kind === "ezidebit" && /not be found|not found|could not find|no payment|does not exist/i.test(e.message || "");

  // Clears a repeating schedule another system set up for this customer. KeepManualPayments YES keeps single
  // payments added one at a time (the Core's own), so only the repeating schedule goes.
  async function clearSchedule(env, cust) {
    const xml = await call(env, "ClearSchedule", { ...ids(cust), KeepManualPayments: "YES", Username: "M2 Core" });
    return confirmed(xml, "the schedule was cleared");
  }

  // Payments over a date range. field is PAYMENT (debit date) or SETTLEMENT (date paid out, or the date it failed).
  async function getPayments(env, { from, to, field = "PAYMENT", reference = "", cust = null, type = "ALL" }) {
    const xml = await call(env, "GetPayments", {
      PaymentType: type, PaymentMethod: "ALL", PaymentSource: "ALL", PaymentReference: reference,
      DateFrom: from, DateTo: to, DateField: field, ...(cust ? ids(cust) : { EziDebitCustomerID: "", YourSystemReference: "" }),
    });
    return tags(xml, "Payment").map(p => {
      const f = n => unesc(tag(p, n));
      const code = (f("PaymentStatus") || "").toUpperCase();
      return {
        system_ref: f("YourSystemReference") || "", ezi_customer: f("EziDebitCustomerID") || "", reference: f("PaymentReference") || "", ezi_id: f("PaymentID") || "",
        amount: +(f("PaymentAmount") || 0), scheduled: f("ScheduledAmount") ? +f("ScheduledAmount") : null,
        fee_client: +(f("TransactionFeeClient") || 0), fee_customer: +(f("TransactionFeeCustomer") || 0), invoice_id: f("InvoiceID") || "",
        debit_date: (f("DebitDate") || "").slice(0, 10), settled: (f("SettlementDate") || "").slice(0, 10) || null,
        code, status: code === "S" ? "paid" : code === "F" || code === "D" ? "failed" : code === "W" ? "waiting" : "processing",
        fatal: code === "F", reason: f("BankFailedReason") || null, return_code: f("BankReturnCode") || "",
      };
    });
  }

  // A (active), H (hold) or C (cancelled). Ezidebit can't move a cancelled customer back, so the Core uses H to stop billing.
  async function changeStatus(env, cust, status) {
    const xml = await call(env, "ChangeCustomerStatus", { ...ids(cust), NewStatus: status, Username: "M2 Core" });
    return confirmed(xml, "the status change");
  }

  async function customer(env, cust) {
    const xml = await call(env, "GetCustomerDetails", ids(cust));
    const f = n => unesc(tag(xml, n));
    return { cid: f("EziDebitCustomerID") || "", ref: f("YourSystemReference") || "", status: (f("StatusCode") || "").toUpperCase(), status_text: f("StatusDescription") || "",
             method: f("PaymentMethod") || "", first: f("CustomerFirstName") || "", last: f("CustomerName") || "",
             name: [f("CustomerFirstName"), f("CustomerName")].filter(Boolean).join(" ") };
  }
  // Ezidebit only debits customers on these statuses (their Customer Status Codes table).
  const processing = status => ["A", "N"].includes(String(status || "").toUpperCase());

  // Connection test: asks Ezidebit for a reference that won't exist. A "not found" style
  // answer means the key works; a key error means it doesn't.
  async function test(env) {
    if (!ready(env)) return { ok: false, error: "No Ezidebit key in Cloudflare yet" };
    try { await customer(env, { ref: "connection-test" }); return { ok: true, sandbox: sandbox(env) }; }
    catch (e) {
      const m = String(e.message || e);
      if (e.code === 102 || e.kind === "network" || /digital ?key|invalid key|authenticat/i.test(m)) return { ok: false, error: m };
      return { ok: true, sandbox: sandbox(env), note: m };
    }
  }

  return { ready, sandbox, url, ref, addPayment, deletePayment, clearSchedule, getPayments, changeStatus, customer, processing, isDuplicate, notFound, test };
}
