"""Liệt kê các bản dịch mà bộ đối chiếu verb KHÔNG THỂ tự xác minh.

internal/i18n/verify.go so bộ format verb giữa msgid và bản dịch, nên nó bắt được
thiếu verb, thừa verb, và đổi kiểu verb (%d thành %s). Nhưng nó bất lực với một
lớp lỗi: khi msgid có từ hai verb CÙNG KIỂU trở lên, đảo trật tự chúng vẫn "khớp"
hoàn hảo về kiểu.

Đây không phải lỗi lý thuyết. Bản dịch rút từ kentjuno có đúng một ca như vậy:

    zh : 生成第 %d 卷第 %d 弧摘要（save_arc_summary）   <- (Volume, Arc)
    vi : Tạo tóm tắt cung %d tập %d (save_arc_summary)  <- gán Volume cho "cung"

tức số tập bị hiển thị thành số cung và ngược lại, im lặng, ở mọi lần chạy.

Vì không tự xác minh được, lớp này cần mắt người. Script in ra danh sách kèm chỗ
dùng trong code để soát nhanh. Cách chữa cho câu đã soát ra là sai: giữ đúng trật
tự của nguồn, hoặc dùng chỉ số tường minh %[n]d nếu tiếng Việt buộc phải đảo.

Chạy:  python3 scripts/i18n/review_ambiguous.py
       python3 scripts/i18n/review_ambiguous.py --with-sites
"""

import argparse
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_catalog import collect_prod_msgids  # noqa: E402

CATALOG = "internal/i18n/locales/vi.json"
VERB = re.compile(r"%[-+# 0]*(?:\[\d+\])?[\d*]*(?:\.[\d*]*)?([a-zA-Z])")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-sites", action="store_true", help="in kèm file:dòng dùng chuỗi đó")
    a = ap.parse_args()

    catalog = json.load(open(CATALOG, encoding="utf-8"))
    sites = collect_prod_msgids(".") if a.with_sites else {}

    risky = []
    for msgid, target in catalog.items():
        if not target:
            continue
        verbs = [m.group(1) for m in VERB.finditer(msgid)]
        if len(verbs) < 2:
            continue
        if max(Counter(verbs).values()) < 2:
            continue  # các verb khác kiểu nhau -> verify.go tự bắt được
        if "%[" in target:
            continue  # đã dùng chỉ số tường minh -> trật tự là hiển ngôn
        risky.append((msgid, target))

    print(f"{len(risky)} bản dịch có ≥2 verb cùng kiểu và không dùng chỉ số tường minh.")
    print("verify.go không xác minh nổi trật tự của chúng — cần soát bằng mắt.\n")
    for msgid, target in sorted(risky):
        print(f"  zh: {msgid}")
        print(f"  vi: {target}")
        if a.with_sites:
            for s in sites.get(msgid, [])[:3]:
                print(f"      dùng ở {s}")
        print()


if __name__ == "__main__":
    main()
