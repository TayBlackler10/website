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
open(os.path.join(here, "dist/worker.bundle.js"), "w").write(w.replace(imp, "// ui.js (bundled)\n" + u, 1))
print("dist/worker.bundle.js written")
