"""Bọc các chuỗi hiển thị tiếng Trung bằng i18n.F() tại điểm gọi.

# Vì sao dùng danh sách CHO PHÉP, không dùng danh sách LOẠI TRỪ

Bọc bừa mọi chuỗi có chữ Trung sẽ phá sản phẩm một cách âm thầm, vì rất nhiều
chuỗi tiếng Trung trong repo này là DỮ LIỆU chứ không phải thông báo:

    regexp.MustCompile(`第\\s*(\\d+)\\s*章`)      -> mẫu nhận diện tiêu đề chương
    `零〇○Ｏ０一二三四五六七八九十百千万`          -> tập ký tự số đếm tiếng Trung
    case "题材定位":                              -> so sánh, không phải hiển thị
    map[string]X{"伏笔": ...}                     -> khóa tra cứu

Dịch mấy chuỗi đó thì regex không khớp gì nữa, switch rơi vào default, map tra
không ra — không có lỗi biên dịch, không có test đỏ, chỉ có tính năng chết lặng.
Nên script này chỉ bọc ở những vị trí đã biết chắc là hiển thị.

# Vì sao phân nhánh theo số tham số

go vet (Go 1.24+) báo lỗi "non-constant format string" khi format string không
phải hằng VÀ không có tham số nào. Đã kiểm bằng thực nghiệm: fmt.Errorf(F(s), x)
sạch, còn fmt.Errorf(F(s)) thì vet đỏ. Nên:

    fmt.Errorf("zh", args...)  -> fmt.Errorf(i18n.F("zh"), args...)
    fmt.Errorf("zh")           -> errors.New(i18n.F("zh"))     [vet-safe, và
                                  đúng hơn: errors.New không diễn giải dấu %]
    fmt.Sprintf("zh")          -> i18n.F("zh")                 [Sprintf không
                                  tham số vốn đã vô nghĩa]

Chạy:
    python3 scripts/i18n/wrap.py --dry-run internal/host
    python3 scripts/i18n/wrap.py --apply internal/host internal/tools
"""

import argparse
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from golex import has_cjk, tokenize  # noqa: E402

I18N_IMPORT = '"github.com/voocel/ainovel-cli/internal/i18n"'

# tên hàm -> chỉ số tham số chứa chuỗi hiển thị
DISPLAY_CALLS = {
    "fmt.Errorf": 0,
    "fmt.Sprintf": 0,
    "errors.New": 0,
    "fmt.Printf": 0,
    "fmt.Println": 0,
    "fmt.Print": 0,
    "fmt.Sprint": 0,
    "fmt.Fprintf": 1,
    "fmt.Fprintln": 1,
    "fmt.Fprint": 1,
}

CALL_RE = re.compile(r"\b(" + "|".join(re.escape(k) for k in DISPLAY_CALLS) + r")\s*\(")


def masked_offsets(src, toks):
    """Tập offset nằm trong chuỗi/comment — bỏ qua khi dò cấu trúc dấu ngoặc."""
    mask = bytearray(len(src))
    for t in toks:
        for i in range(t.start, min(t.end, len(src))):
            mask[i] = 1
    return mask


def split_args(src, open_paren, mask):
    """Trả về (danh sách (start,end) của từng tham số, offset dấu ')' khớp)."""
    depth = 0
    i = open_paren
    args = []
    cur = None
    n = len(src)
    while i < n:
        if mask[i]:
            i += 1
            continue
        c = src[i]
        if c in "([{":
            depth += 1
            if depth == 1:
                cur = i + 1
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                if cur is not None:
                    args.append((cur, i))
                return args, i
        elif c == "," and depth == 1:
            args.append((cur, i))
            cur = i + 1
        i += 1
    return args, -1


def lone_string_token(src, span, toks_by_start):
    """Nếu tham số CHỈ gồm đúng một chuỗi literal thì trả token đó, ngược lại None.

    Yêu cầu "chỉ gồm" là cố ý: `"zh"+x` hay `foo("zh")` bọc vào sẽ sai nghĩa.
    """
    s, e = span
    text = src[s:e].strip()
    if not text or text[0] not in '"`':
        return None
    off = s + (len(src[s:e]) - len(src[s:e].lstrip()))
    tok = toks_by_start.get(off)
    if tok is None or tok.kind not in ("string", "raw_string"):
        return None
    # phải chiếm hết tham số, không còn gì khác
    if src[tok.end : e].strip():
        return None
    return tok


def process(path, apply):
    src = open(path, encoding="utf-8").read()
    toks = tokenize(src)
    mask = masked_offsets(src, toks)
    by_start = {t.start: t for t in toks}

    edits = []  # (start, end, thay_bằng)
    stats = Counter()

    for m in CALL_RE.finditer(src):
        if mask[m.start()]:
            continue  # tên hàm nằm trong comment/chuỗi
        fn = m.group(1)
        idx = DISPLAY_CALLS[fn]
        open_paren = m.end() - 1
        args, close = split_args(src, open_paren, mask)
        if close < 0 or len(args) <= idx:
            continue
        tok = lone_string_token(src, args[idx], by_start)
        if tok is None or not has_cjk(tok.text):
            continue

        raw = src[tok.start : tok.end]
        trailing = len(args) - idx - 1  # số tham số sau format string

        if trailing == 0 and fn == "fmt.Errorf":
            # vet chặn format string không hằng mà không có tham số
            edits.append((m.start(), close + 1, f"errors.New(i18n.F({raw}))"))
            stats["errorf_khong_tham_so→errors.New"] += 1
        elif trailing == 0 and fn == "fmt.Sprintf":
            edits.append((m.start(), close + 1, f"i18n.F({raw})"))
            stats["sprintf_khong_tham_so→i18n.F"] += 1
        elif trailing == 0 and fn in ("fmt.Printf", "fmt.Fprintf"):
            # Printf/Fprintf không tham số cũng bị vet chặn; bỏ chữ 'f' là xong,
            # và đúng hơn vì bản dịch có thể chứa dấu % literal.
            prefix = src[m.start() : m.end()].replace(fn, fn[:-1], 1)
            edits.append((m.start(), m.end(), prefix))
            edits.append((tok.start, tok.end, f"i18n.F({raw})"))
            stats[f"{fn}_khong_tham_so→bo_chu_f"] += 1
        else:
            edits.append((tok.start, tok.end, f"i18n.F({raw})"))
            stats["bọc_tại_chỗ"] += 1

    if not edits:
        return stats, False

    # áp từ cuối về đầu để offset phía trước không bị lệch
    out = src
    for s, e, rep in sorted(edits, key=lambda x: -x[0]):
        out = out[:s] + rep + out[e:]

    needs_errors = any("errors.New(" in rep for _, _, rep in edits)
    out = ensure_imports(out, needs_errors)
    out = drop_orphan_fmt(out)

    if apply:
        open(path, "w", encoding="utf-8").write(out)
    return stats, True


def ensure_imports(src, needs_errors):
    """Thêm import i18n (và errors nếu cần) vào khối import đã có."""
    m = re.search(r"^import \(\n(.*?)^\)\n", src, re.S | re.M)
    if not m:
        # import đơn dòng: nâng thành khối
        m2 = re.search(r'^import (".*?")\n', src, re.M)
        if not m2:
            return src
        block = f"import (\n\t{m2.group(1)}\n)\n"
        src = src[: m2.start()] + block + src[m2.end() :]
        m = re.search(r"^import \(\n(.*?)^\)\n", src, re.S | re.M)
    body = m.group(1)
    add = []
    if I18N_IMPORT not in body:
        add.append("\t" + I18N_IMPORT + "\n")
    if needs_errors and not re.search(r'^\t"errors"$', body, re.M):
        add.append('\t"errors"\n')
    if not add:
        return src
    return src[: m.end(1)] + "".join(add) + src[m.end(1) : ]


def drop_orphan_fmt(src):
    """Bỏ import "fmt" nếu file không còn dùng fmt nữa.

    Chuyển fmt.Errorf(x) thành errors.New(...) có thể lấy đi chỗ dùng fmt cuối
    cùng của file, khi đó Go báo lỗi biên dịch "imported and not used".
    """
    body_start = src.find(")\n", src.find("import ("))
    if body_start == -1:
        return src
    after = src[body_start:]
    if re.search(r"\bfmt\.", after):
        return src
    return re.sub(r'^\t"fmt"\n', "", src[:body_start], flags=re.M) + after


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
                if os.path.join("internal", "i18n") in p:
                    continue
                st, changed = process(p, apply)
                total.update(st)
                if changed:
                    touched.append((p, sum(st.values())))

    print("=== BỌC i18n ===" + ("" if apply else "  (DRY RUN — chưa ghi gì)"))
    for k, v in total.most_common():
        print(f"  {k:<34} {v}")
    print(f"  {'tổng điểm bọc':<34} {sum(total.values())}")
    print(f"  {'file bị sửa':<34} {len(touched)}")
    print("\nfile nhiều nhất:")
    for p, c in sorted(touched, key=lambda x: -x[1])[:15]:
        print(f"  {c:>4}  {p}")


if __name__ == "__main__":
    main()
