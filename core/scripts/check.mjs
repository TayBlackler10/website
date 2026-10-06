// M2 Core: checks that run before every deploy (wrangler [build] command) and before every push.
// If any check fails, the deploy stops and the live system stays as it was.
//
//   1. Every server file parses.
//   2. The staff page assembles from its parts, and its script parses.
//   3. No two page scripts declare the same top-level name. (This is what broke Growth, Marketing
//      and Add member on 7 Oct 2026: a new page reused a name another page already had.)
//   4. Every page link (data-go) has a page, and every page has a loader that exists.
//   5. Writing rules: no em dashes in anything staff or members read.
//
// Run it yourself:  node scripts/check.mjs

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const fails = [];
const fail = m => fails.push(m);

// 1. Server files parse.
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith(".js"))) {
  try { execFileSync(process.execPath, ["--check", path.join(SRC, f)], { stdio: "pipe" }); }
  catch (e) { fail(`src/${f} doesn't parse:\n${String(e.stderr || e.message).trim()}`); }
}

// 2. Assemble the staff page in the order ui.js lists the parts.
const uiJs = fs.readFileSync(path.join(SRC, "ui.js"), "utf8");
const imports = Object.fromEntries([...uiJs.matchAll(/^import (\w+) from "\.\/(.+?)";$/gm)].map(m => [m[1], m[2]]));
const order = [...uiJs.matchAll(/^\s*\["(.+?)", (\w+)\],?$/gm)].map(m => ({ file: m[1], v: m[2] }));
if (!order.length) fail("src/ui.js lists no parts");
for (const o of order) if (imports[o.v] !== o.file) fail(`src/ui.js: ${o.v} is listed as ${o.file} but imported from ${imports[o.v]}`);
const listed = new Set(order.map(o => o.file));
for (const dir of ["ui", "ui/views", "ui/client"]) {
  for (const f of fs.readdirSync(path.join(SRC, dir))) {
    const rel = dir + "/" + f;
    if (fs.statSync(path.join(SRC, rel)).isFile() && !listed.has(rel)) fail(`src/${rel} exists but isn't in src/ui.js, so it never reaches the page`);
  }
}
const parts = order.map(o => ({ ...o, text: fs.existsSync(path.join(SRC, o.file)) ? fs.readFileSync(path.join(SRC, o.file), "utf8") : (fail(`missing src/${o.file}`), "") }));
const html = parts.map(p => p.text).join("");
const clients = parts.filter(p => p.file.endsWith(".client.js"));
const script = clients.map(p => p.text).join("");
try { new vm.Script(script, { filename: "staff-page.js" }); } catch (e) { fail("The staff page script doesn't parse: " + e.message); }
for (const c of clients) { try { new vm.Script(c.text, { filename: c.file }); } catch (e) { fail(`src/${c.file} doesn't parse on its own: ${e.message}`); } }

// 3. Top-level names declared in more than one page script (or twice in one).
function topLevelNames(code) {
  const names = [];
  let depth = 0, i = 0, inStr = null, lineStart = true;
  // Walk the code tracking braces, strings and comments; record declarations at depth 0.
  while (i < code.length) {
    const ch = code[i], nx = code[i + 1];
    if (inStr) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++; continue;
    }
    if (ch === "/" && nx === "/") { const e = code.indexOf("\n", i); i = e < 0 ? code.length : e; continue; }
    if (ch === "/" && nx === "*") { const e = code.indexOf("*/", i + 2); i = e < 0 ? code.length : e + 2; continue; }
    if (ch === "/" && depth >= 0) {
      // Regex literal: a slash after an operator or opening bracket.
      let k = i - 1; while (k >= 0 && /\s/.test(code[k])) k--;
      if (k < 0 || "(,=:[!&|?{};+-*%<>~^".includes(code[k]) || /\b(return|typeof|in|of)$/.test(code.slice(Math.max(0, k - 6), k + 1))) {
        let j = i + 1, cls = false;
        while (j < code.length) { const c = code[j]; if (c === "\\") { j += 2; continue; } if (c === "[") cls = true; else if (c === "]") cls = false; else if (c === "/" && !cls) break; else if (c === "\n") break; j++; }
        i = j + 1; continue;
      }
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; i++; continue; }
    if (ch === "{" || ch === "(" || ch === "[") { depth++; i++; continue; }
    if (ch === "}" || ch === ")" || ch === "]") { depth--; i++; continue; }
    if (depth === 0) {
      const rest = code.slice(i, i + 200);
      let m;
      if ((m = rest.match(/^function\s+([A-Za-z_$][\w$]*)/)) && (i === 0 || /[\s;}]/.test(code[i - 1]))) { names.push(m[1]); i += m[0].length; continue; }
      if ((m = rest.match(/^(var|let|const)\s+/)) && (i === 0 || /[\s;}]/.test(code[i - 1]))) {
        // Collect each name in "var a=1,b=f(x),c" up to the end of the statement.
        let j = i + m[0].length, d = 0, expectName = true, q = null;
        while (j < code.length) {
          const c = code[j];
          if (q) { if (c === "\\") { j += 2; continue; } if (c === q) q = null; j++; continue; }
          if (c === '"' || c === "'" || c === "`") { q = c; j++; continue; }
          if ("([{".includes(c)) d++; else if (")]}".includes(c)) { if (d === 0) break; d--; }
          else if (d === 0 && c === ";") break;
          else if (d === 0 && c === "\n" && !/[,=+\-*/&|?:(]\s*$/.test(code.slice(i, j))) { const after = code.slice(j + 1).match(/^\s*(\S)/); if (!after || !",.?:+-*/&|".includes(after[1])) break; }
          else if (d === 0 && c === ",") { expectName = true; j++; continue; }
          if (expectName) { const n = code.slice(j).match(/^\s*([A-Za-z_$][\w$]*)/); if (n) { names.push(n[1]); j += n[0].length; expectName = false; continue; } }
          j++;
        }
        i = j; continue;
      }
    }
    i++;
  }
  return names;
}
const owner = new Map();
for (const c of clients) {
  for (const n of topLevelNames(c.text)) {
    if (owner.has(n)) fail(`"${n}" is declared in both src/${owner.get(n)} and src/${c.file}. The second one silently replaces the first. Rename one.`);
    else owner.set(n, c.file);
  }
}

// 4. Page links and loaders.
const views = new Set([...html.matchAll(/data-view="([a-z]+)"/g)].map(m => m[1]));
for (const m of html.matchAll(/data-go="([a-z]+)"/g)) if (!views.has(m[1])) fail(`A button opens "${m[1]}" but there's no page with data-view="${m[1]}"`);
for (const m of script.matchAll(/data-go="'\+(\w+)/g)) void m;   // dynamic links can't be checked statically
for (const m of script.matchAll(/if\(v==="([a-z]+)"\)\{?([A-Za-z_$][\w$]*)\(/g)) {
  if (!views.has(m[1])) fail(`show() handles "${m[1]}" but there's no page for it`);
  if (!owner.has(m[2]) && !(m[2] in globalThis)) fail(`show("${m[1]}") calls ${m[2]}() which no page script declares`);
}

// 5. Writing rules.
for (const p of parts) if (p.text.includes("—")) fail(`src/${p.file} has an em dash. M2 writing never uses them.`);
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith(".js"))) if (fs.readFileSync(path.join(SRC, f), "utf8").includes("—")) fail(`src/${f} has an em dash. M2 writing never uses them.`);

if (fails.length) {
  console.error("\nM2 Core checks FAILED, nothing will deploy:\n\n- " + fails.join("\n- ") + "\n");
  process.exit(1);
}
console.log(`M2 Core checks passed: ${fs.readdirSync(SRC).filter(f => f.endsWith(".js")).length} server files, ${parts.length} page parts, ${owner.size} page-script names, ${views.size} pages.`);
