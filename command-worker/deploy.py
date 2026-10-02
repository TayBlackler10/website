#!/usr/bin/env python3
"""Deploy the m2-command worker, its KV store, secrets, nightly snapshot and pages.
Usage: CF_TOKEN=... python3 deploy.py [--pages-only]
"""
import json, os, sys, urllib.request, urllib.error, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "/home/claude/website"
NAME = "m2-command"
TOKEN = os.environ["CF_TOKEN"]
API = "https://api.cloudflare.com/client/v4"

def call(method, path, data=None, ctype="application/json", raw=False):
    body = data if isinstance(data, (bytes, type(None))) else json.dumps(data).encode()
    req = urllib.request.Request(API + path, data=body, method=method,
                                 headers={"Authorization": "Bearer " + TOKEN, "Content-Type": ctype})
    try:
        with urllib.request.urlopen(req) as r:
            out = r.read()
            return out if raw else json.loads(out)
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        raise SystemExit(f"{method} {path} -> {e.code}: {msg[:400]}")

secrets = dict(l.strip().split("=", 1) for l in open(os.path.join(HERE, ".secrets")) if "=" in l)
acct = call("GET", "/accounts")["result"][0]["id"]
base = f"/accounts/{acct}"

# KV namespace
ns = next((n for n in call("GET", f"{base}/storage/kv/namespaces?per_page=100")["result"] if n["title"] == "M2CC"), None)
if not ns:
    ns = call("POST", f"{base}/storage/kv/namespaces", {"title": "M2CC"})["result"]
ns_id = ns["id"]

def kv_put(key, value):
    call("PUT", f"{base}/storage/kv/namespaces/{ns_id}/values/{urllib.request.quote(key, safe='')}",
         value.encode(), ctype="text/plain")

if "--pages-only" not in sys.argv:
    # Worker upload (module), keeping existing secrets on re-deploys
    meta = {
        "main_module": "worker.js",
        "compatibility_date": "2026-09-01",
        "bindings": [
            {"type": "kv_namespace", "name": "M2CC", "namespace_id": ns_id},
            {"type": "service", "name": "GM", "service": "m2-gymmaster", "environment": "production"},
            {"type": "plain_text", "name": "GM_WORKER", "text": "https://m2-gymmaster.taylor-3e5.workers.dev"},
            {"type": "plain_text", "name": "PT_SCRIPT", "text": "https://script.google.com/macros/s/AKfycbzd4BypnwjEdvToljlvMUpvfDMjmSAdSHaS7nnygv6TCulkC7Rax21Ure9flx_eLfpW/exec"},
        ] + ([{"type": "plain_text", "name": "XERO_SCOPES", "text": secrets["XERO_SCOPES"]}] if secrets.get("XERO_SCOPES") else []),
        "keep_bindings": ["secret_text"],
    }
    b = "----m2" + uuid.uuid4().hex
    parts = [
        f'--{b}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{json.dumps(meta)}\r\n',
        f'--{b}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n' + open(os.path.join(HERE, "worker.js")).read() + "\r\n",
        f"--{b}--\r\n",
    ]
    call("PUT", f"{base}/workers/scripts/{NAME}", "".join(parts).encode(), ctype=f"multipart/form-data; boundary={b}")
    for k in ["DASH_PASSWORD", "SESSION_SECRET", "PT_ADMIN_KEY", "GM_PROXY_KEY", "XERO_CLIENT_ID", "XERO_CLIENT_SECRET", "WINDSOR_API_KEY"]:
        if secrets.get(k):
            call("PUT", f"{base}/workers/scripts/{NAME}/secrets", {"name": k, "text": secrets[k], "type": "secret_text"})
    call("POST", f"{base}/workers/scripts/{NAME}/subdomain", {"enabled": True, "previews_enabled": False})
    # 10:45 UTC = 11:45pm NZDT / 10:45pm NZST, so the last run each month lands on the last day
    call("PUT", f"{base}/workers/scripts/{NAME}/schedules", [{"cron": "45 10 * * *"}])

# Pages
kv_put("page:command", open(os.path.join(HERE, "command.html"), encoding="utf-8").read().replace('href="/M2_PT.html"', 'href="/pt"'))
kv_put("page:pt", open(f"{SITE}/M2_PT.html", encoding="utf-8").read())
if os.path.exists(os.path.join(HERE, "billing.html")):
    kv_put("page:billing", open(os.path.join(HERE, "billing.html"), encoding="utf-8").read())
if os.path.exists(os.path.join(HERE, "crm.html")):
    kv_put("page:crm", open(os.path.join(HERE, "crm.html"), encoding="utf-8").read())

sub = call("GET", f"{base}/workers/subdomain")["result"]["subdomain"]
print(f"LIVE https://{NAME}.{sub}.workers.dev  (KV {ns_id})")
