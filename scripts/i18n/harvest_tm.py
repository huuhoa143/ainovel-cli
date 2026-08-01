"""Rút translation memory zh→vi từ bản việt hóa của kentjuno.

kentjuno/ainovel-cli@68eb92d việt hóa toàn repo nhưng dựa trên upstream d98aa0fb —
đi sau 65 commit, và lớp Coordinator mà nó sửa đã bị upstream xóa (52042fe thay
bằng Engine+Arbiter). Nên KHÔNG merge được commit đó; chỉ rút phần dịch ra dùng.

Cách căn: kentjuno dịch tại chỗ, không thêm/bớt chuỗi. Nên với mỗi file có ở cả
hai phía, chuỗi CJK thứ N ở bản zh ứng với chuỗi thứ N ở bản vi. Chỉ nhận cặp khi
số lượng token khớp nhau (căn an toàn); file lệch số lượng thì bỏ, tránh dịch sai
lệch hàng loạt.

Chạy:
    python3 scripts/i18n/harvest_tm.py --emit scripts/i18n/tm.json
    python3 scripts/i18n/harvest_tm.py --coverage    # đo TM phủ upstream bao nhiêu
"""

import argparse
import json
import os
import subprocess
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from golex import has_cjk, strings_with_cjk, tokenize  # noqa: E402

ZH_BASE = "d98aa0fb"  # upstream mà kentjuno fork từ đó
VI_HEAD = "kj/main"  # bản việt hóa của kentjuno
CUR = "upstream/main"  # upstream hiện tại

ASSET_RE = ("assets/prompts/", "assets/references/", "assets/styles/")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=False)


def ls(rev, pattern=None):
    out = git("ls-tree", "-r", "--name-only", rev).stdout.splitlines()
    if pattern:
        out = [f for f in out if f.endswith(pattern)]
    return out


def show(rev, path):
    r = git("cat-file", "-p", f"{rev}:{path}")
    return r.stdout if r.returncode == 0 else None


def harvest_go():
    """Cặp zh→vi từ file .go. Chỉ nhận file khớp số lượng chuỗi CJK."""
    pairs = {}
    stats = Counter()
    for path in ls(ZH_BASE, ".go"):
        zh_src = show(ZH_BASE, path)
        vi_src = show(VI_HEAD, path)
        if zh_src is None or vi_src is None:
            stats["thiếu_một_phía"] += 1
            continue

        zh_toks = strings_with_cjk(zh_src)
        if not zh_toks:
            continue

        # Bản vi: lấy TẤT CẢ chuỗi (đã dịch nên phần lớn không còn CJK), rồi căn
        # theo vị trí của các chuỗi tương ứng. Dùng cùng thứ tự token string.
        zh_all = [t for t in tokenize(zh_src) if t.kind in ("string", "raw_string")]
        vi_all = [t for t in tokenize(vi_src) if t.kind in ("string", "raw_string")]
        if len(zh_all) != len(vi_all):
            stats["lệch_số_lượng_chuỗi"] += 1
            continue

        stats["file_căn_được"] += 1
        for z, v in zip(zh_all, vi_all):
            if not has_cjk(z.text):
                continue
            if z.text == v.text:
                stats["kentjuno_bỏ_sót"] += 1
                continue
            if has_cjk(v.text):
                stats["dịch_một_phần"] += 1
            pairs.setdefault(z.text, v.text)
            stats["cặp_thu_được"] += 1
    return pairs, stats


def harvest_assets():
    """File markdown asset: chỉ nhận file mà zh KHÔNG đổi giữa base và upstream."""
    dropin, changed = [], []
    for path in ls(CUR):
        if not path.endswith(".md") or not path.startswith(ASSET_RE):
            continue
        base, cur, vi = show(ZH_BASE, path), show(CUR, path), show(VI_HEAD, path)
        if base is None or vi is None:
            changed.append((path, "kentjuno chưa có"))
        elif base == cur:
            dropin.append(path)
        else:
            changed.append((path, "zh đã đổi"))
    return dropin, changed


def coverage(pairs):
    """TM phủ được bao nhiêu phần chuỗi CJK của upstream hiện tại."""
    total = hit = 0
    uniq_total, uniq_hit = set(), set()
    per_file_gap = Counter()
    for path in ls(CUR, ".go"):
        if path.endswith("_test.go"):
            continue
        src = show(CUR, path)
        if not src:
            continue
        for t in strings_with_cjk(src):
            total += 1
            uniq_total.add(t.text)
            if t.text in pairs:
                hit += 1
                uniq_hit.add(t.text)
            else:
                per_file_gap[path] += 1
    return {
        "chuỗi_upstream": total,
        "TM_trúng": hit,
        "tỉ_lệ_trúng": round(100.0 * hit / total, 1) if total else 0,
        "chuỗi_khác_nhau": len(uniq_total),
        "khác_nhau_trúng": len(uniq_hit),
        "tỉ_lệ_khác_nhau": round(100.0 * len(uniq_hit) / len(uniq_total), 1) if uniq_total else 0,
        "top_file_còn_thiếu": per_file_gap.most_common(15),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emit")
    ap.add_argument("--coverage", action="store_true")
    a = ap.parse_args()

    pairs, stats = harvest_go()
    dropin, changed = harvest_assets()

    print("=== HARVEST TỪ kentjuno@68eb92d ===")
    for k, v in stats.most_common():
        print(f"  {k:<26} {v}")
    print(f"  {'cặp zh→vi khác nhau':<26} {len(pairs)}")
    print()
    print(f"=== ASSET MARKDOWN ===\n  dùng thẳng: {len(dropin)}   cần xử lý: {len(changed)}")
    for p, why in changed:
        print(f"    - {p}  ({why})")

    if a.coverage:
        print()
        cov = coverage(pairs)
        print("=== TM PHỦ UPSTREAM HIỆN TẠI (chỉ code prod) ===")
        for k, v in cov.items():
            if k != "top_file_còn_thiếu":
                print(f"  {k:<22} {v}")
        print("  file còn thiếu nhiều nhất:")
        for p, c in cov["top_file_còn_thiếu"]:
            print(f"    {c:>4}  {p}")

    if a.emit:
        os.makedirs(os.path.dirname(a.emit), exist_ok=True)
        with open(a.emit, "w", encoding="utf-8") as f:
            json.dump(
                {"source": "kentjuno/ainovel-cli@68eb92d", "zh_base": ZH_BASE, "pairs": pairs},
                f,
                ensure_ascii=False,
                indent=1,
                sort_keys=True,
            )
        print(f"\n→ ghi {len(pairs)} cặp vào {a.emit}")
        print(f"  dropin assets ghi vào {a.emit}.assets.txt")
        with open(a.emit + ".assets.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(dropin) + "\n")


if __name__ == "__main__":
    main()
