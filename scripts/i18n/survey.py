"""Đo khối lượng việt hóa thật của repo, tách comment khỏi chuỗi hiển thị.

Chạy:  python3 scripts/i18n/survey.py [--json] [root]

Con số quan trọng là "chuỗi có CJK", không phải "dòng có CJK": comment không bao
giờ đến tay người dùng nên không cần vào catalog i18n, còn chuỗi thì có.
"""

import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from golex import comments_with_cjk, strings_with_cjk  # noqa: E402

SKIP_DIRS = {".git", "node_modules", "vendor", "web", ".next", "dist", "workspace", "config"}


def walk_go(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn.endswith(".go"):
                yield os.path.join(dirpath, fn)


def bucket(rel):
    """Gom theo module để biết chỗ nào nặng."""
    parts = rel.split(os.sep)
    if parts[0] == "internal" and len(parts) > 2:
        return os.sep.join(parts[:3]) if parts[1] in ("entry", "host", "agents") else os.sep.join(parts[:2])
    if len(parts) > 1:
        return os.sep.join(parts[:2])
    return parts[0]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_json = "--json" in sys.argv
    root = args[0] if args else "."

    by_bucket = defaultdict(lambda: {"files": 0, "str": 0, "cmt": 0, "test_str": 0})
    all_strings = Counter()
    test_only = set()
    grand = {"files": 0, "str": 0, "cmt": 0, "test_str": 0}

    for path in walk_go(root):
        rel = os.path.relpath(path, root)
        try:
            src = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        s = strings_with_cjk(src)
        c = comments_with_cjk(src)
        if not s and not c:
            continue
        is_test = rel.endswith("_test.go")
        b = by_bucket[bucket(rel)]
        b["files"] += 1
        b["cmt"] += len(c)
        grand["files"] += 1
        grand["cmt"] += len(c)
        if is_test:
            b["test_str"] += len(s)
            grand["test_str"] += len(s)
        else:
            b["str"] += len(s)
            grand["str"] += len(s)
        for t in s:
            all_strings[t.text] += 1
            if is_test:
                test_only.add(t.text)

    prod_strings = {k: v for k, v in all_strings.items() if k not in test_only}

    if as_json:
        print(json.dumps({"buckets": by_bucket, "grand": grand, "unique_prod": len(prod_strings)}, indent=2))
        return

    rows = sorted(by_bucket.items(), key=lambda kv: -kv[1]["str"])
    print(f"{'MODULE':<28}{'file':>6}{'chuỗi-prod':>12}{'chuỗi-test':>12}{'comment':>10}")
    print("-" * 68)
    for name, d in rows:
        print(f"{name:<28}{d['files']:>6}{d['str']:>12}{d['test_str']:>12}{d['cmt']:>10}")
    print("-" * 68)
    print(f"{'TỔNG':<28}{grand['files']:>6}{grand['str']:>12}{grand['test_str']:>12}{grand['cmt']:>10}")
    print()
    print(f"Chuỗi CJK khác nhau (chỉ code prod, đã trừ chuỗi chỉ có trong test): {len(prod_strings)}")
    print(f"Chuỗi lặp lại ≥2 lần: {sum(1 for v in prod_strings.values() if v >= 2)}")
    print()
    print("→ Comment KHÔNG vào catalog i18n. Khối lượng catalog thật = cột chuỗi-prod.")


if __name__ == "__main__":
    main()
