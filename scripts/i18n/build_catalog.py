"""Lấp chỗ thiếu cho internal/i18n/locales/vi.json từ translation memory.

Catalog chỉ chứa msgid THẬT SỰ còn trong code prod: giữ lại cặp của những chuỗi
upstream đã xóa làm độ phủ trông cao hơn thực tế, và không ai biết chỗ nào còn
thiếu. Bản TM đầy đủ vẫn nằm ở scripts/i18n/tm.json làm kho lưu.

# Script này từng XÓA 58% catalog, và đó là lỗi cấu trúc chứ không phải lỗi dùng sai

Bản trước dựng lại catalog TỪ ĐẦU (`catalog = {}`) và chỉ ghi msgid có trong
tm.json. Nhưng tm.json là **bản chụp TM nhập từ kentjuno/ainovel-cli@68eb92d**
(1.159 cặp), còn catalog hôm nay có 1.822 cặp — phần chênh là **dịch tay của fork
này**. Nên chạy script bản cũ hôm nay sẽ xóa **1.061 mục, 58% catalog**, và xóa
không báo gì.

Nó còn tệ hơn một mức: TM là bản chụp cũ nên với những msgid có ở CẢ hai nơi, nó
ghi đè bản dịch tay bằng bản TM — tức **tái sinh những lỗi đã sửa**. Đã có lỗi
thật thuộc loại này: hai chuỗi hoán vị tham số `卷`/`弧` trong TM đã được sửa tay
trong catalog.

Vì hai điều đó, script này từng bị cấm chạy. Nhưng cấm chạy chỉ là băng dán: người
sau tìm thấy script, thấy nó tên là "build_catalog", và chạy.

# Nên nguồn sự thật đã đổi, và script đổi vai theo

- **tm.json là BẤT BIẾN.** Nó mang `source` + `zh_base` để truy xuất xứ; ghi bản
  dịch của ta vào đó sẽ phá luôn khả năng phân biệt cái gì của kentjuno, cái gì
  của ta. Đừng ghi vào nó.
- **vi.json là nguồn sự thật.** Bản dịch đã có luôn THẮNG bản TM.
- Script chỉ còn một việc: **lấp msgid chưa có bản dịch nào** bằng TM.

Và nó từ chối ghi nếu sẽ mất mục — xem `--prune`.

Chạy:  python3 scripts/i18n/build_catalog.py
       python3 scripts/i18n/build_catalog.py --report-missing missing.json
       python3 scripts/i18n/build_catalog.py --prune   # cho phép bỏ mục đã chết
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
    ap.add_argument(
        "--prune",
        action="store_true",
        help="cho phép bỏ những mục đã có bản dịch mà msgid không còn trong code prod",
    )
    a = ap.parse_args()

    tm = json.load(open(TM, encoding="utf-8"))["pairs"]
    prod = collect_prod_msgids(a.root)

    dang_co = {}
    if os.path.exists(OUT):
        dang_co = json.load(open(OUT, encoding="utf-8"))

    catalog, missing, tu_tm = {}, {}, 0
    for msgid, sites in prod.items():
        # Bản dịch đang có THẮNG bản TM. TM là bản chụp cũ, nên lấy nó ghi đè sẽ
        # tái sinh những lỗi đã sửa tay — đã xảy ra thật với hai chuỗi hoán vị
        # tham số 卷/弧.
        if dang_co.get(msgid):
            catalog[msgid] = dang_co[msgid]
        elif msgid in tm:
            catalog[msgid] = tm[msgid]
            tu_tm += 1
        else:
            missing[msgid] = sites

    # Mục có bản dịch mà msgid không còn trong code prod: hoặc upstream đã xóa chuỗi
    # (bỏ là đúng), hoặc bộ thu thập msgid đang lỗi (bỏ là phá). Không phân biệt được
    # từ đây, nên KHÔNG tự quyết — bản trước tự quyết và xóa 58% catalog.
    se_mat = sorted(k for k, v in dang_co.items() if v and k not in prod)
    if se_mat and not a.prune:
        print(f"DỪNG: sẽ mất {len(se_mat)} mục đã có bản dịch (trên {len(dang_co)}).")
        print("Chưa ghi gì cả. Trước khi dùng --prune, hãy kiểm vài mục dưới đây còn")
        print("trong code prod thật không — nếu còn thì bộ thu thập msgid đang lỗi,")
        print("và --prune sẽ xóa bản dịch đúng.")
        for k in se_mat[:12]:
            print(f"  {k[:70]!r}")
        if len(se_mat) > 12:
            print(f"  … và {len(se_mat)-12} mục nữa")
        return 1

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1, sort_keys=True)

    total = len(prod)
    print(f"msgid trong code prod : {total}")
    print(f"đã có bản dịch        : {len(catalog)}  ({100*len(catalog)//total}%)")
    print(f"  giữ từ catalog cũ   : {len(catalog)-tu_tm}")
    print(f"  lấp mới từ TM       : {tu_tm}")
    print(f"còn thiếu             : {len(missing)}")
    if se_mat:
        print(f"đã bỏ (--prune)       : {len(se_mat)}")
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
    # sys.exit chứ không gọi trần: main() trả 1 khi nó TỪ CHỐI ghi vì sẽ mất mục.
    # Gọi trần thì mã thoát luôn là 0 và người gọi tưởng đã thành công — đúng loại
    # im lặng mà cả script này sinh ra để tránh.
    sys.exit(main() or 0)
