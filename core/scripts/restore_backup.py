#!/usr/bin/env python3
"""Turn an M2 Core nightly backup (m2-core-YYYY-MM-DD.json.gz, from the R2 bucket m2-core-backups or the
Settings page) into SQL that rebuilds the database.

  python3 scripts/restore_backup.py m2-core-2026-10-03.json.gz restore.sql
  npx wrangler d1 create m2-core-restored                       # a fresh, empty database
  npx wrangler d1 execute m2-core-restored --remote --file=schema.sql
  npx wrangler d1 execute m2-core-restored --remote --file=restore.sql

Then point the worker's D1 binding at m2-core-restored (wrangler.toml) and deploy. Restore into a new
database, never over the live one, so nothing is lost if the restore goes wrong.
The output contains member data: keep it off GitHub and delete it when you're done.
"""
import gzip, json, sys

def lit(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

def main(src, out):
    data = json.load(gzip.open(src, "rt", encoding="utf-8"))
    n = 0
    with open(out, "w", encoding="utf-8") as f:
        f.write("PRAGMA foreign_keys = OFF;\n")
        for table, rows in data["tables"].items():
            if not rows: continue
            cols = list(rows[0].keys())
            f.write(f'DELETE FROM "{table}";\n')
            for i in range(0, len(rows), 50):
                chunk = rows[i:i + 50]
                vals = ",\n".join("(" + ",".join(lit(r.get(c)) for c in cols) + ")" for r in chunk)
                f.write(f'INSERT INTO "{table}" ({",".join(chr(34) + c + chr(34) for c in cols)}) VALUES\n{vals};\n')
            n += len(rows)
    print(f"{len(data['tables'])} tables, {n} rows, taken {data.get('taken_at')} -> {out}")

if __name__ == "__main__":
    if len(sys.argv) != 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
