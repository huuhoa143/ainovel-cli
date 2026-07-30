"""Bọc chuỗi hiển thị tiếng Trung ở các vị trí cú pháp mà wrap.py không với tới.

wrap.py chỉ bọc đối số của fmt.Errorf/Sprintf/… — đủ cho tầng engine, nơi hầu hết
chuỗi đi qua fmt. Nhưng tầng giao diện (internal/entry) đặt chuỗi ở chỗ khác hẳn:
giá trị trong struct literal, phần tử slice, giá trị map, biến gán, đối số của
lipgloss .Render(), tham số hàm dựng khung. Trong internal/entry có 390 chuỗi như
vậy, tức phần lớn chữ người dùng thật sự đọc.

Bọc rộng hơn nghĩa là rủi ro cao hơn, nên script này CHỈ chạy trên thư mục được
chỉ định và loại trừ tường minh những vị trí mà chuỗi là DỮ LIỆU chứ không phải
chữ hiển thị:

  - nhánh `case "…":`            → so sánh, dịch là nhánh chết
  - `== "…"` / `!= "…"`          → so sánh
  - `strings.HasPrefix/Contains/HasSuffix/TrimPrefix/…` với chuỗi CJK
  - `regexp.MustCompile`         → mẫu nhận dạng
  - khóa trong map literal (`"…": value`)
  - dòng đã có `i18n.F(`         → đã bọc rồi

Chạy:
    python3 scripts/i18n/wrap_display.py --dry-run internal/entry
    python3 scripts/i18n/wrap_display.py --apply internal/entry
"""

import argparse
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from golex import has_cjk, tokenize  # noqa: E402

I18N_IMPORT = '"github.com/voocel/ainovel-cli/internal/i18n"'

# Hàm so sánh/tra cứu chuỗi: chuỗi CJK làm đối số của chúng là dữ liệu.
COMPARE_FUNCS = (
    "HasPrefix", "HasSuffix", "Contains", "ContainsAny", "TrimPrefix", "TrimSuffix",
    "EqualFold", "Index", "LastIndex", "SplitN", "Split", "Cut", "ReplaceAll",
    "MustCompile", "Compile", "Count", "TrimLeft", "TrimRight", "Trim",
)

CASE_RE = re.compile(r"^\s*case\s")
MAPKEY_RE = re.compile(r'^\s*"[^"]*"\s*:')
COMPARE_RE = re.compile(r"(==|!=)\s*$")


def line_of(src, off):
    """Trả về (chỉ số dòng bắt đầu từ 0, nội dung dòng) chứa offset."""
    start = src.rfind("\n", 0, off) + 1
    end = src.find("\n", off)
    if end == -1:
        end = len(src)
    return src.count("\n", 0, off), src[start:end]


def is_data_context(src, tok):
    """True khi chuỗi ở vị trí dữ liệu, không phải chữ hiển thị."""
    _, line = line_of(src, tok.start)
    stripped = line.strip()

    if "i18n.F(" in line:
        return True  # đã bọc, hoặc dòng có bọc khác — để yên cho an toàn
    if CASE_RE.match(line):
        return True
    if MAPKEY_RE.match(stripped):
        return True

    before = src[max(0, tok.start - 90):tok.start]
    if COMPARE_RE.search(before.rstrip()):
        return True
    for fn in COMPARE_FUNCS:
        # "…HasPrefix(x, " ngay trước chuỗi
        if re.search(re.escape(fn) + r"\s*\([^()]*$", before):
            return True
    return False


def process(path, apply):
    src = open(path, encoding="utf-8").read()
    toks = tokenize(src)

    edits = []
    stats = Counter()
    for t in toks:
        if t.kind not in ("string", "raw_string") or not has_cjk(t.text):
            continue
        if is_data_context(src, t):
            stats["bỏ_qua_vì_là_dữ_liệu"] += 1
            continue
        raw = src[t.start:t.end]
        edits.append((t.start, t.end, f"i18n.F({raw})"))
        stats["bọc"] += 1

    if not any(k == "bọc" for k in stats):
        return stats, False

    out = src
    for s, e, rep in sorted(edits, key=lambda x: -x[0]):
        out = out[:s] + rep + out[e:]
    out = ensure_import(out)

    if apply:
        open(path, "w", encoding="utf-8").write(out)
    return stats, True


def ensure_import(src):
    if I18N_IMPORT in src:
        return src
    m = re.search(r"^import \(\n(.*?)^\)\n", src, re.S | re.M)
    if not m:
        m2 = re.search(r'^import (".*?")\n', src, re.M)
        if not m2:
            return src
        src = src[:m2.start()] + f"import (\n\t{m2.group(1)}\n)\n" + src[m2.end():]
        m = re.search(r"^import \(\n(.*?)^\)\n", src, re.S | re.M)
    return src[:m.end(1)] + "\t" + I18N_IMPORT + "\n" + src[m.end(1):]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    apply = a.apply and not a.dry_run

    total = Counter()
    touched = []
    for root in a.paths:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in {".git", "web", "node_modules"}]
            for fn in sorted(filenames):
                if not fn.endswith(".go") or fn.endswith("_test.go"):
                    continue
                p = os.path.join(dirpath, fn)
                st, changed = process(p, apply)
                total.update(st)
                if changed:
                    touched.append((p, st["bọc"]))

    print("=== BỌC CHUỖI HIỂN THỊ ===" + ("" if apply else "  (DRY RUN)"))
    for k, v in total.most_common():
        print(f"  {k:<26} {v}")
    print(f"  {'file bị sửa':<26} {len(touched)}")
    print("\nnhiều nhất:")
    for p, c in sorted(touched, key=lambda x: -x[1])[:12]:
        print(f"  {c:>4}  {p}")


if __name__ == "__main__":
    main()
