// M2 Core: opens the staff page in a real browser and visits every page, failing if any page throws.
// The server is faked: /api/me says "owner" (so every page is on), everything else answers
// {"error":"Test mode"}, the same shape a real error has. No member data is used.
//
// Run it:  node scripts/smoke.mjs        (needs Playwright; runs before every push, see .githooks)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let chromium;
for (const p of ["playwright", "/opt/npm-tools/node_modules/playwright", "playwright-core"]) { try { ({ chromium } = require(p)); break; } catch {} }
if (!chromium) { console.error("Playwright isn't installed, so the browser check can't run."); process.exit(1); }

const ui = fs.readFileSync(path.join(ROOT, "src/ui.js"), "utf8");
const files = [...ui.matchAll(/^\s*\["(.+?)", (\w+)\],?$/gm)].map(m => m[1]);
const html = files.map(f => fs.readFileSync(path.join(ROOT, "src", f), "utf8")).join("");
const views = [...new Set([...html.matchAll(/data-view="([a-z]+)"/g)].map(m => m[1]))];
const CAN = { members: true, add: true, collections: true, business: true, settings: true };

const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const problems = [];
for (const [role, can] of [["owner", CAN], ["reception", { members: true, add: true }], ["trainer", { members: "own" }]]) {
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.message || e)));
  await page.route("**/*", r => {
    const u = new URL(r.request().url());
    if (u.hostname !== "core.test") return r.fulfill({ status: 200, body: "", contentType: u.pathname.endsWith(".js") ? "text/javascript" : "text/plain" });
    if (u.pathname === "/") return r.fulfill({ status: 200, body: html, contentType: "text/html" });
    if (u.pathname === "/api/me") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ name: "Test Person", role, can }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ error: "Test mode" }) });
  });
  await page.goto("https://core.test/");
  await page.waitForTimeout(500);
  if (errs.length) problems.push(`${role}, opening M2 Core: ${errs.join("; ")}`);
  for (const v of views) {
    errs.length = 0;
    await page.evaluate(v => { try { show(v); } catch (e) { setTimeout(() => { throw e; }); } }, v);
    await page.waitForTimeout(150);
    if (errs.length) problems.push(`${role}, page "${v}": ${[...new Set(errs)].join("; ")}`);
  }
  // Ask M2 and the sign-up steps.
  errs.length = 0;
  await page.evaluate(() => { openAsk("Who owes money"); });
  await page.waitForTimeout(150);
  if (errs.length) problems.push(`${role}, Ask M2: ${errs.join("; ")}`);
  await page.close();
}
await browser.close();
if (problems.length) { console.error("\nBrowser check FAILED:\n- " + problems.join("\n- ") + "\n"); process.exit(1); }
console.log(`Browser check passed: ${views.length} pages opened as owner, reception and trainer with no errors.`);
