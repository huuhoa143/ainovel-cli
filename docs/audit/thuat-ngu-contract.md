# `契约` — đo trên bốn bề mặt rồi mới chọn từ

> Phạm vi: ĐO và ĐỀ XUẤT. Không sửa code. Mọi con số dưới đây đo trên cây làm việc
> tại `2b35687`, đếm bằng `grep`/`python3` trên tệp thật, không suy từ ký ức.
>
> Câu hỏi: khái niệm trung tâm của engine — bản cam kết của một chương
> (`core_event`, `hook`, `scenes`) mà Writer phải làm đúng và Editor phán xét —
> nên gọi là `contract` hay `hợp đồng`?

**Kết luận ngắn:** con số `17 contract – 2 hợp đồng` không đo đúng câu hỏi, vì **12
trong số đó là một khái niệm KHÁC** (contract của JSON Schema / của tool, không phải
khế ước chương). Đo đúng khái niệm đang hỏi thì catalog là **6 – 1**, còn đo cả sản
phẩm thì **`hợp đồng` thắng 14 – 10** — tức ngược hẳn.

Nhưng phe thắng vẫn không nên thắng. `hợp đồng` vỡ vì một lý do đo được, nằm trong
chính chữ MÔ HÌNH ĐỌC: **4/4 lần `hợp đồng` xuất hiện trong `assets/prompts/` đều là
CỰC ÂM** — "không phải hợp đồng máy móc / ký chết / ràng buộc". Gọi khế ước chương là
`hợp đồng` thì writer.md và editor.md tự cãi nhau đúng ở chỗ thiết kế cần phân biệt
nhất. Và đã có sẵn một từ thứ ba **trong chính câu định nghĩa khái niệm**: `khế ước`.

Đề xuất: **`khế ước chương`** cho khái niệm chương, **giữ `contract`** cho nghĩa
schema/tool, **không dịch** tên trường. Chi tiết ở §5.

---

## 1. Bảng đếm bốn bề mặt

Cột "khái niệm" phân biệt hai nghĩa của cùng chữ Hán `契约`:

- **B — khế ước chương**: cam kết nội dung của một chương (`章节契约`). Đây là câu hỏi.
- **A — contract của schema/tool**: hợp đồng JSON Schema, Prompt Contract, giao thức
  tool (`internal/llmcontract`). Cùng chữ Hán, khác khái niệm hoàn toàn.

| # | Bề mặt | Nghĩa B (khế ước chương) | Nghĩa A (schema/tool) | Vai của chữ |
|---|--------|--------------------------|------------------------|-------------|
| 1 | Catalog `internal/i18n/locales/vi.json` | **6 `contract` + 1 `hợp đồng`** | 12 `contract`, 0 `hợp đồng` | xem §1.1 |
| 2 | Giao diện web (`web/lib/nhan.ts`, `web/components/*.tsx`) | **7 chuỗi hiện ra / 8 lần dùng — 100% `hợp đồng`**, 0 `contract` | — | nhãn hiển thị |
| 3 | Prompt `assets/prompts/` (MÔ HÌNH ĐỌC) | **3 `khế ước` + 4 `contract` trần + 0 `hợp đồng`** · và 4 `hợp đồng` ở CỰC ÂM | 1 (`## Contract đầu ra`, qua catalog) | văn cho LLM |
| 3b | `assets/references/` (15 tệp) | **0** | 0 | trung tính |
| 4 | README + tài liệu người dùng | README 1 `hợp đồng` · DESIGN.md 3 · PRODUCT.md 0 | `config.example.jsonc` 1 · `docs/` ~52 | mặt tiền + nội bộ |

Tổng cho **nghĩa B** trên mọi bề mặt (chỉ đếm chữ hiển thị, không đếm định danh):

| Từ | Số chỗ | Ở đâu |
|----|--------|-------|
| `hợp đồng` | **14** | web 7 · catalog 1 · README 1 · DESIGN.md 3 · docs 2 |
| `contract` | **10** | catalog 6 · prompt 4 |
| `khế ước` | **3** | prompt 3 (writer.md ×2, editor.md ×1) |

Đây là chỗ số đếm gốc lệch: nó đếm 18 lần chữ `contract` trong `vi.json` mà không
tách nghĩa, rồi so với 1 chữ `hợp đồng` cũng trong `vi.json` — tức **đo một bề mặt,
và trong bề mặt đó đo lẫn hai khái niệm**.

### 1.1 Catalog, bóc từng dòng

19 mục có chứa `契约` / `合同` / `contract`. Không mục nào là định danh (§2) — tất cả
là văn xuôi cho người hoặc cho mô hình đọc.

**Nghĩa A — 12 mục, tất cả dùng `contract`, không mục nào nên đổi:**

| Dòng | Nơi gọi | Vai |
|------|---------|-----|
| 93, 94, 95, 113, 116, 117, 118 | `internal/llmcontract/validate.go:39–101` | lỗi cho **lập trình viên** (schema sai) |
| 648, 727 | `internal/llmcontract/execute.go:96,174` | lỗi thi hành |
| 74 | `internal/llmcontract/contract.go:150` | **văn MÔ HÌNH ĐỌC** — tiêu đề `## Contract đầu ra` khi rơi về chế độ Prompt Contract |
| 1782 | `internal/eval/collect.go:270` | lỗi cho người vận hành |
| 1692 | `internal/diag/runtime_rules.go:59` | chẩn đoán: "không khớp contract của công cụ" |

**Nghĩa B — 7 mục, 6 dùng `contract` + 1 dùng `hợp đồng`:**

| Dòng | Nơi gọi | Vai | Từ đang dùng |
|------|---------|-----|--------------|
| 1376 | `tools/save_review.go:59` (`contract_status`) | **mô hình đọc** — mô tả schema | contract |
| 1144 | `tools/save_review.go:60` (`contract_misses`) | **mô hình đọc** | contract |
| 855 | `tools/save_review.go:61` (`contract_notes`) | **mô hình đọc** | contract |
| 1127 | `tools/novel_context.go:787` | **mô hình đọc** — lý do recall nhồi vào ngữ cảnh | contract |
| 1425 | `tools/novel_context.go:788` | **mô hình đọc** — tóm tắt recall | contract |
| 763 | `diag/rules_quality.go:80` | **người vận hành** — tiêu đề chẩn đoán | **hợp đồng** |
| 264 | `diag/rules_quality.go:82` | **người vận hành** — gợi ý xử lý (2 lần) | contract |

Vai quan trọng hơn số: **5 trong 7 mục nghĩa B là văn MÔ HÌNH ĐỌC**, không phải nhãn
giao diện. Chúng là mô tả schema và văn recall — tức chúng dạy mô hình gọi khái niệm
này là gì, rồi mô hình viết lại từ đó ra sản phẩm (xem §4, mục dữ liệu đã xuống ổ).

### 1.2 Một dữ kiện làm số đếm gốc thành tự tham chiếu

`internal/i18n/locales/vi.json` **không phải tệp nguồn** — nó là sản phẩm dựng từ
`scripts/i18n/tm.json` (TM của `kentjuno/ainovel-cli@68eb92d`). Đối chiếu 19 mục:

```
diverges=2   same=3   not-in-TM=14
```

Và với 4 msgid gần trùng mà TM có bản dịch, TM chọn **`hợp đồng` 4/4** ở nghĩa B:

| msgid trong TM | TM dịch |
|----------------|---------|
| `章节契约完成度` | Mức độ hoàn thành **hợp đồng** chương |
| `未完成或违背的 contract 条目` | Các mục **hợp đồng** chưa hoàn thành hoặc vi phạm |
| `对 contract 履行情况的简要说明` | Ghi chú ngắn về tình trạng thực hiện **hợp đồng** |
| `合同履约率低 (%.0f%% 未达成)` | Tỉ lệ thực hiện **hợp đồng** thấp |

Nghĩa là: bản dịch có trước của chính những chuỗi này chọn `hợp đồng`; chữ `contract`
trong catalog hôm nay là **bản dịch tay của fork này, vừa mới đặt**. Cho nên số
`17 – 2` đang đo **chính cái đang được xét lại**, và "nhất quán với số đông" ở đây là
nhất quán với một lượt sửa chưa được duyệt. Không dùng làm căn cứ được.

(Ba mục `same` là 763, 1425, 1692. Hai mục `diverges` chỉ khác ở `Writer`/`Người viết`
và `Duyệt`/`Đánh giá` — sửa có chủ ý, không liên quan từ đang xét.)

### 1.3 Giao diện web — nó hiện ra thế nào

7 chuỗi người dùng thật sự đọc, tất cả `hợp đồng`:

| Chỗ | Chuỗi | Hiện ở đâu trên màn |
|-----|-------|---------------------|
| `nhan.ts:475` | `tabHopDong: 'Hợp đồng'` | **nhãn tab** Inspector (`Inspector.tsx:64`), cạnh Kiểm định / Bản thảo |
| `nhan.ts:518` | `hopDongChuong: 'Hợp đồng chương'` | tiêu đề `<h3>` khu lề khi đọc truyện (`DocTruyen.tsx:340`) |
| `nhan.ts:564` | `hopDong: 'Hợp đồng'` | nhãn `<dt>` trong bản duyệt, hạ chữ thường (`BanDuyet.tsx:78`) |
| `nhan.ts:492` | `hopDongThieu: 'Hợp đồng còn thiếu'` | tiêu đề mục `contract_misses` (`BanDuyet.tsx:100`) |
| `nhan.ts:154` | `plan: 'lập hợp đồng chương'` | nhãn công đoạn trên transport |
| `nhan.ts:680` | `chuaCoHopDong: 'Chương này chưa có hợp đồng — Writer lập hợp đồng ở bước plan.'` | rỗng-trạng-thái (2 lần trong 1 câu) |
| `nhan.ts:676` | `'Bấm một hàng… để xem hợp đồng, bản duyệt và bản thảo…'` | chữ hướng dẫn |

Không có chỗ nào web hiện chữ `contract` cho người dùng. Ngoài ra: 6 dòng chú thích
(không hiện), 9 định danh TypeScript (`hopDong`, `hopDongChuong`, `hopDongThieu`,
`tabHopDong`, `nhanHopDong`, `HopDong`, `TabHopDong`, khóa tab `'hopdong'`, `HOP_DONG`).

### 1.4 Prompt — bề mặt quyết định, và nó đang tự cãi nhau

`assets/references/` (15 tệp): **0** lần, cả ba biến thể. Trung tính.

`assets/prompts/` cho **nghĩa B**:

| Tệp:dòng | Chữ dùng | Trích |
|----------|----------|-------|
| `editor.md:26` | **khế ước** | "coi đó là **khế ước nghiệm thu** của chương này" ← câu ĐỊNH NGHĨA |
| `writer.md:7` | **khế ước** | "các trường **khế ước chương** trong ngữ cảnh cứ truyền thẳng" |
| `writer.md:39` | **khế ước** | "xung đột với chi tiết trong **khế ước**" |
| `editor.md:27` | contract | "Nếu **contract** có `emotion_target`…" |
| `editor.md:32` | contract | "đừng coi **contract** là một danh sách cứng" |
| `editor.md:122` | contract | "Khi **chapter contract** không áp dụng…" |
| `editor.md:142` | contract | "vì **contract** viết hăng hái…" |

`editor.md` định nghĩa khái niệm bằng `khế ước` ở dòng 26 rồi gọi nó là `contract` bốn
lần sau đó — **một tệp, hai từ**. Đây là lỗi có thật, độc lập với lựa chọn cuối.

Và đây là dữ kiện quyết định — **4 lần `hợp đồng` trong prompt, cả 4 đều là cực âm**:

| Tệp:dòng | Trích |
|----------|-------|
| `writer.md:53` | "đó là hướng sáng tác chứ **không phải hợp đồng máy móc**" |
| `architect-long.md:107` | "là chiếc la bàn điều chỉnh dọc đường, **không phải hợp đồng ký chết**" |
| `architect-long.md:177` | "Dàn ý phục vụ câu chuyện, **không phải hợp đồng ràng buộc** những dữ kiện đã xảy ra" |
| `architect-long.md:200` | "mục tiêu sáng tác, **không phải hợp đồng số từ máy móc**" |

Trong chữ mô hình đọc, `hợp đồng` **đã có nghĩa**: thứ ràng buộc chết mà mô hình phải
KHÔNG coi trọng. Còn khế ước chương thì buộc phải coi trọng. Hai thứ ngược nhau.

---

## 2. Định danh hay chữ hiển thị

Đây là bộ **không được dịch**, vì máy đọc nó:

| Định danh | Nơi khai | Loại |
|-----------|----------|------|
| `contract_status` | `domain/review.go`, `save_review.go:59`, `web/lib/types.ts:125` | tên trường JSON |
| `contract_misses` | `save_review.go:60`, `ctxpack/builder.go:45`, `types.ts:126` | tên trường JSON |
| `contract_notes` | `save_review.go:61`, `domain/review.go:62` | tên trường JSON |
| `chapter_contract` | `novel_context_builders.go:249` | khóa trong payload ngữ cảnh |
| `contract` | `web/lib/types.ts:172,198` | khóa payload |
| `FailureContract = "contract"` | `llmcontract/execute.go:23` | **giá trị enum** |
| `Contract` / `llmcontract` | `types.ts:129`, tên package | tên kiểu / package |
| `met` / `partial` / `missed` | `save_review.go:59`, kiểm lại ở `:148` | **enum kín** của `contract_status` |

Trả lời thẳng câu (a): **không, phần lớn 17 chỗ kia KHÔNG phải định danh** — cả 19 mục
catalog đều là văn xuôi, chỉ *nhắc tới* định danh ở gần. Nên số đếm không vỡ vì lý do
định danh. Nó vỡ vì lý do khác và nặng hơn: **12/19 là khái niệm A, không phải khái
niệm đang hỏi**. Bỏ 12 mục đó ra, "số đông" còn 6 – 1, và 4 trong 6 mâu thuẫn với TM.

Một cái bẫy phải nói rõ, vì nó đổi cách xử lý dữ liệu đã xuống ổ:

- `contract_status` là **tên trường** (giữ), nhãn hiển thị cho nó thì dịch được — đúng
  như đề bài phân biệt. `web/lib/nhan.ts:250–258` đã làm đúng: enum kín nên dịch chắc.
- Nhưng `dimension` và `type` của issue **không phải enum** — `save_review.go:48` và
  `:36` khai `schema.String(...)`, tức **chuỗi tự do do mô hình tự đặt**. Cho nên
  `"contract"` xuất hiện ở `type` (trong `save_review_test.go`) **không phải định danh
  kín**; nó là chữ mô hình viết ra. Kiểm chứng: dữ liệu thật trên ổ đã có
  `"type": "nhịp truyện"` và `"dimension": "nhất quán nhân vật"` — tiếng Việt.

---

## 3. Người Việt đọc "hợp đồng" có hiểu đúng không — và tiền lệ `giấy phép` có áp?

**Tiền lệ có thật và đã hạ cánh.** `docs/audit/proof-vietnamese.md:424,466–479` ghi lý
lẽ, và `suất chương` giờ nằm trong 14 chuỗi catalog (`vi.json:288,289,927,1282,
1389–1392,1418,1420,1421,1465,1592,1594`). Lý lẽ đó là: `许可` vốn là **một suất dùng
một lần**, dịch thành "giấy phép" đã **nâng đăng ký ngôn ngữ** thành giấy tờ pháp lý —
sai tới mức người đọc README tưởng sản phẩm có cơ chế license.

**Lý lẽ đó KHÔNG áp cho `契约` theo cách nó áp cho `许可`.** Khác biệt đo được: đăng ký
hợp-đồng ở đây là **cố ý trong thiết kế gốc**, không phải tai nạn dịch. Engine nói
`履约率` (tỉ lệ thực hiện), `违约` (vi phạm); Writer *thực hiện*, Editor *phán xét mức
hoàn thành* với `met/partial/missed`. Ẩn dụ khế ước chính là mô hình nhận thức. Nên
không thể kết luận "cả hai đều dở vì cùng lỗi giấy-phép" — nghĩa A của lỗi đó không có ở đây.

**Nhưng `hợp đồng` vẫn dở, vì một lý do khác, sắc hơn, và đo được:**

1. **Nó đã bị chiếm chỗ làm cực âm trong chính văn mô hình đọc** (§1.4, 4/4). Đặt tên
   khế ước chương là `hợp đồng` thì `writer.md:53` ("không phải hợp đồng máy móc") và
   `editor.md:26` (buộc phải tuân) nói ngược nhau bằng cùng một từ. Thiết kế cần đúng
   sự phân biệt "khế ước chương thì buộc, mục tiêu số từ thì không buộc" — và
   `hợp đồng` cho cả hai thì phá đúng chỗ đó. Đây là thiệt hại **chức năng**, không
   phải thẩm mỹ: nó nằm trong prompt.
2. **Màu thương mại–pháp lý**: hợp đồng lao động, hợp đồng mua bán — ký giữa hai bên,
   có chế tài. Khế ước chương không có bên thứ hai và không có chế tài. Đây đúng là
   phần lý lẽ `giấy phép` **có** áp: dịch đúng từ điển, sai đăng ký.
3. **Nó đang gánh nghĩa A trong `docs/`** — 52/54 lần `hợp đồng` trong `docs/` là
   contract của schema/framework/test ("kiểm thử hợp đồng", "vi phạm hợp đồng Schema
   nguyên bản", "Hợp đồng framework"). Chuẩn hóa nghĩa B về `hợp đồng` làm hai khái
   niệm A và B trùng tên hoàn toàn.

Còn `contract` thì đúng như đề bài nói: **biệt ngữ chưa dịch**. Nó chấp nhận được ở
nghĩa A (mặt lập trình viên, `Prompt Contract` là danh từ riêng trong `docs/`, package
tên `llmcontract`), nhưng ở nhãn tab cho người viết tiểu thuyết thì không.

**Vậy: có, cần một từ thứ ba.** Và không phải bịa ra — nó đã ở trong repo, đúng ở câu
định nghĩa khái niệm: **`khế ước`**.

---

## 4. Đổi bao nhiêu chỗ, và có gì vỡ

**Tin tốt trước: không test nào chốt các chuỗi tiếng Việt này.** Kiểm chứng:

- `internal/llmcontract`, `internal/tools`, `internal/diag`, `internal/host` đều có
  `i18n_locale_pin_test.go` với `func init() { _ = i18n.SetLocale(i18n.Chinese) }`.
  Assert của chúng so với **msgid tiếng Trung**, không với bản dịch. Ví dụ
  `novel_context_test.go:570` dò `"contract 漏项"` — đó là chuỗi zh, đổi bản dịch vi
  không chạm tới. `contract_test.go:248` dò `"enum 契约非法"` — cũng zh.
- `internal/i18n/i18n_test.go:78` gọi `VerifyCatalog(Vietnamese)`, nhưng
  `verify.go:132–155` chỉ đối chiếu **động từ định dạng** (`checkPair`). Giữ nguyên
  `%s / %d / %w / %.0f%%` là xanh.
- `internal/diag/i18n_varfreeze_test.go` soi **hình dạng mã nguồn** (biến cấp gói gọi
  `i18n.F`), không soi nội dung chuỗi.
- `web/` không có test nào.

### Danh sách chỗ phải đổi (chỉ nghĩa B)

| # | Tệp | Số chỗ | Ghi chú |
|---|-----|--------|---------|
| A | `internal/i18n/locales/vi.json` | **7 mục** (1376, 1144, 855, 1127, 1425, 763, 264) | 264 có 2 lần. Giữ nguyên 12 mục nghĩa A |
| B | `scripts/i18n/tm.json` | **7 mục tương ứng** | bắt buộc — xem R1 |
| C | `web/lib/nhan.ts` | **7 chuỗi hiện ra** (154, 475, 492, 518, 564, 676, 680) | +6 chú thích, +9 định danh (hoãn được) |
| D | `assets/prompts/editor.md` | **4 chỗ** (27, 32, 122, 142) | giữ `` `chapter_contract` `` ở :26 |
| E | `assets/prompts/writer.md` | **0** | đã dùng `khế ước`; nếu chạm thì xem R3 |
| F | `README.md:346`, `DESIGN.md:107,120` | **3 chỗ** | mặt tiền + nhãn tab đã thiết kế |
| G | `web/lib/nhan.ts` bảng `CHIEU` | **+2 alias** | xem R4 |
| — | KHÔNG đổi | `architect-long.md:107,177,200` + `writer.md:53` (cực âm) · 52 chỗ nghĩa A trong `docs/` · `config.example.jsonc:86` | |

Tổng: **21 chỗ** cho một lượt đủ (A 7 + B 7 + C 7), cộng D 4 + F 3 + G 2 = **30 chỗ**
nếu làm trọn cả prompt và mặt tiền.

### Rủi ro

**R1 — catalog là SẢN PHẨM DỰNG, không phải nguồn. (cao nhất, và có sẵn từ trước)**
`scripts/i18n/build_catalog.py:50–62` dựng lại `vi.json` **từ đầu** (`catalog = {}`)
và chỉ ghi msgid **có trong `tm.json`**; msgid không có TM thì rơi vào `missing` và
**bị loại khỏi catalog**. 14/19 mục đang xét không có trong TM (msgid upstream đã thêm
hậu tố `；无则为 null` sau khi TM được thu ở `zh_base d98aa0fb`). Nên một lần chạy đầy
đủ hôm nay sẽ **làm mất** 14 mục đó, chứ không chỉ hoàn nguyên. Đây là hiểm họa của
**toàn bộ phần catalog dịch tay**, không riêng từ này — nhưng nó có nghĩa: quyết định
từ ngữ phải được ghi vào `tm.json`, nếu không thì không bền. *Đây là mục mà lượt soát
trong phạm vi Go không thấy.* (Vì vậy lệnh cấm chạy `build_catalog.py` là đúng.)

**R2 — test: thấp.** Xem trên. Điều kiện duy nhất: giữ nguyên động từ định dạng.

**R3 — so byte với golden: có thật, máy móc.** `assets/load_test.go:24` khẳng định
`writer.md` sau khi lấp `{{VOICE}}` **bằng đúng từng byte** với
`assets/testdata/writer-golden.md` (golden chứa `khế ước` ×2). Sửa `writer.md` mà không
sửa golden y hệt là đỏ ngay. Hiện `writer.md` **không cần đổi**, nên rủi ro này bằng 0
nếu không chạm vào nó — nhưng phải biết trước khi ai đó "dọn cho nhất quán".

**R4 — dữ liệu đã xuống ổ: trung bình, và áp đúng tiền lệ `non_cjk_fragments`.**
`dimension` là chuỗi tự do (`save_review.go:48`), và store thật **đã có** chiều do mô
hình tự đặt tên `"hợp đồng chương"` — kiểm chứng ở `output/tran-yeu-ky/reviews/01.json`
và `output/chay-thu/reviews/01.json`, cả hai đều có
`{"dimension": "hợp đồng chương", "score": 70}`. `output*` nằm trong `.gitignore:45`,
nên đây là **dữ liệu cục bộ của người dùng**, không phải fixture trong repo — càng
không sửa được.

Xử lý: **không viết lại giá trị đã lưu.** Thêm alias vào bảng `CHIEU`
(`web/lib/nhan.ts:319`) cho cả `'hợp đồng chương'` và `'khế ước chương'` → cùng hiện
một nhãn. Đúng bài học `non_cjk_fragments`: tên đã nằm trong bản ghi thì giữ, đổi tên
là bỏ mồ côi bản ghi cũ. Lưu ý bảng `CHIEU` hiện **không** khớp cả hai (nó khớp tên
tiếng Anh `consistency`/`character`/…), nên hôm nay chiều này đang rơi về nhánh "hiện
nguyên văn" — thêm alias vừa sửa lỗi đang có, vừa che được lượt đổi từ.

`contract_status` không bị ảnh hưởng: `met/partial/missed` là enum kín, kiểm lại ở
`save_review.go:148`.

**R5 — lịch sử lẫn: thấp, không tránh được.** Sách viết vắt qua lần đổi prompt sẽ có
chương mang chiều `"hợp đồng chương"`, chương mang `"khế ước chương"`. Alias ở R4 làm
người dùng thấy **một** nhãn; JSON thô vẫn giữ cả hai. Đây là hệ quả cố hữu của trường
tự do do mô hình đặt tên, không phải của lựa chọn từ.

**R6 — tranh chấp tệp: cần xếp thứ tự.** `web/` và `internal/i18n/` đang có agent khác
sửa. `vi.json` và `nhan.ts` phải sửa sau khi các lượt đó xong, không song song.

---

## 5. Đề xuất

**Tách theo NGHĨA, không chuẩn hóa theo từ.** Một từ cho hai khái niệm mới là gốc của
mớ lệch này.

1. **Khái niệm chương (nghĩa B) → `khế ước chương`**, dạng ngắn `khế ước`.
2. **Nghĩa A (schema / Prompt Contract / giao thức tool) → giữ `contract`.** 12 mục
   catalog ở `llmcontract` / `eval` / `diag/runtime_rules` không đổi. Mặt lập trình
   viên, khớp `Prompt Contract` và tên package `llmcontract`. **Đừng** đổi chúng sang
   `hợp đồng`.
3. **Định danh (§2) → không dịch, không bàn.**
4. **Giá trị tự do đã xuống ổ → không viết lại; thêm alias hiển thị** (R4).

Vì sao `khế ước`, mỗi lý do một dòng, đều đo được:

- **Nó đã là từ định nghĩa khái niệm**: `editor.md:26` "khế ước nghiệm thu của chương
  này", `writer.md:7` "các trường khế ước chương". Chọn nó là **giảm** số chỗ phải
  sửa trong prompt, không tăng — và làm `editor.md` thôi tự cãi.
- **Nó để nguyên cực âm**: 4 dòng "không phải hợp đồng…" vẫn đúng, và từ chỗ **xung
  đột** trở thành **tương phản** có ích: khế ước chương thì buộc, hợp đồng số từ thì không.
- **Đăng ký đúng**: `khế ước` là cam kết long trọng giữa các bên theo nghĩa rộng
  (khế ước xã hội) — ràng buộc mà không mang màu thương mại đã hạ `giấy phép`.
- **Nó là tiếng Việt thật**, đáp đúng phản đối rằng `contract` là biệt ngữ chưa dịch —
  mà không buộc nghĩa A phải đổi theo.
- **Không đụng gì ở web**: `khế ước` xuất hiện 0 lần trong `web/`, nên không có xung đột.

Nói ngược ý đề bài, cho rõ: **`hợp đồng` KHÔNG nên thắng dù nó đang dẫn 14 – 10 và dù
web đã dùng.** Không phải vì `contract` tốt hơn — `contract` cũng thua ở nhãn giao
diện. Mà vì `hợp đồng` đã bị chiếm chỗ làm cực âm trong chính văn mô hình đọc, và vì
nó đang gánh nghĩa A ở 52 chỗ trong `docs/`. Bảy chuỗi web đã dùng `hợp đồng` là **chi
phí phải trả**, không phải căn cứ để giữ — chúng chưa phát hành, và số 14 gồm cả 2 chỗ
`docs/` nội bộ lẫn 3 chỗ `DESIGN.md` là tài liệu thiết kế, không phải mặt tiền.

Chi phí thật của `khế ước`, nói thẳng:

- **Ít thông dụng hơn `hợp đồng`, hơi văn chương.** Với công cụ viết tiểu thuyết thì
  đăng ký hơi văn chương là hợp, nhưng nên **chú giải lần đầu**: dùng lại đúng câu
  `writer.md:34` đã có — "khế ước chương: định nghĩa hoàn thành của chương này" — ở
  rỗng-trạng-thái web và ở README.
- **`khế ước` hiện bị dùng lẫn cho nghĩa A trong 6 chú thích Go** (`stylestat.go:193,196`,
  `stream_extract.go:54`, `stream_extract_test.go:49,56`, `anti_ai_tone_sync_test.go:27`)
  và 1 dòng `docs/`. Chỉ là chú thích — không hiện cho người, không gửi cho mô hình.
  Ghi vào việc-tồn, đừng chặn.
- **Phương án hai nếu muốn từ đời thường hơn: `giao ước chương`.** Cùng đăng ký, thông
  dụng hơn. Nhưng nó **không** có sẵn trong prompt, nên tốn thêm 3 chỗ sửa prompt +
  rủi ro golden (R3), và mất lợi thế "đã là từ định nghĩa". Chỉ chọn nếu đội thấy
  `khế ước` quá cổ.

Thứ tự làm, để không vỡ: **B (tm.json) → A (vi.json) → G (alias CHIEU) → C (web) →
D (editor.md) → F (README/DESIGN)**. Đặt tm.json trước vì R1; đặt alias trước web vì
nó sửa một lỗi đang có, độc lập với lượt đổi từ.
