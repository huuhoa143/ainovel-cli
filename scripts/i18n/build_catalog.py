"""Sinh internal/i18n/locales/vi.json từ translation memory + code hiện tại.

Catalog chỉ chứa msgid THẬT SỰ còn trong code prod: giữ lại cặp của những chuỗi
upstream đã xóa làm độ phủ trông cao hơn thực tế, và không ai biết chỗ nào còn
thiếu. Bản TM đầy đủ vẫn nằm ở scripts/i18n/tm.json làm kho lưu.

Chạy:  python3 scripts/i18n/build_catalog.py
       python3 scripts/i18n/build_catalog.py --report-missing missing.json
"""

import argparse
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from golex import strings_with_cjk  # noqa: E402
from survey import walk_go  # noqa: E402

TM = "scripts/i18n/tm.json"
OUT = "internal/i18n/locales/vi.json"


def collect_prod_msgids(root="."):
    """Mọi chuỗi CJK trong code prod, kèm nơi xuất hiện để báo cáo chỗ thiếu."""
    msgids = {}
    for path in walk_go(root):
        rel = os.path.relpath(path, root)
        if rel.endswith("_test.go"):
            continue
        # i18n tự nó nói về chuỗi zh nên chứa msgid mẫu, không phải chuỗi hiển thị
        if rel.startswith(os.path.join("internal", "i18n")):
            continue
        try:
            src = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        for t in strings_with_cjk(src):
            msgids.setdefault(t.text, []).append(f"{rel}:{t.line}")
    return msgids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report-missing")
    ap.add_argument("--root", default=".")
    a = ap.parse_args()

    tm = json.load(open(TM, encoding="utf-8"))["pairs"]
    prod = collect_prod_msgids(a.root)

    catalog, missing = {}, {}
    for msgid, sites in prod.items():
        if msgid in tm:
            catalog[msgid] = tm[msgid]
        else:
            missing[msgid] = sites

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1, sort_keys=True)

    total = len(prod)
    print(f"msgid trong code prod        : {total}")
    print(f"đã có bản dịch (từ kentjuno) : {len(catalog)}  ({100*len(catalog)//total}%)")
    print(f"còn thiếu                    : {len(missing)}")
    print(f"→ ghi {OUT}")

    by_mod = Counter()
    for sites in missing.values():
        for s in sites[:1]:
            by_mod[os.path.dirname(s)] += 1
    print("\nmodule còn thiếu nhiều nhất:")
    for mod, c in by_mod.most_common(12):
        print(f"  {c:>4}  {mod}")

    if a.report_missing:
        with open(a.report_missing, "w", encoding="utf-8") as f:
            json.dump(missing, f, ensure_ascii=False, indent=1, sort_keys=True)
        print(f"\n→ danh sách chỗ thiếu: {a.report_missing}")


if __name__ == "__main__":
    main()
