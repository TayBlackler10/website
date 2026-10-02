#!/usr/bin/env python3
"""Join src/ui.js into src/worker.js as one file (dist/worker.bundle.js), for pasting into the Cloudflare dashboard editor."""
import os
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
w = open(os.path.join(here, "src/worker.js")).read()
u = open(os.path.join(here, "src/ui.js")).read()
imp = 'import { APP_HTML } from "./ui.js";'
assert imp in w
u = u.replace("export const APP_HTML", "const APP_HTML", 1)
os.makedirs(os.path.join(here, "dist"), exist_ok=True)
sc = open(os.path.join(here, "src/schema_sql.js")).read().replace("export const ", "const ")
imp2 = 'import { SCHEMA, STAFF_SEED, SCHEMA_VERSION } from "./schema_sql.js";'
assert imp2 in w
w = w.replace(imp2, "// schema_sql.js (bundled)\n" + sc, 1)
hub = open(os.path.join(here, "src/hub.js")).read().replace("export function makeHub", "function makeHub", 1)
imp3 = 'import { makeHub } from "./hub.js";'
assert imp3 in w
w = w.replace(imp3, "// hub.js (bundled)\n" + hub, 1)
open(os.path.join(here, "dist/worker.bundle.js"), "w").write(w.replace(imp, "// ui.js (bundled)\n" + u, 1))
print("dist/worker.bundle.js written")
