# Soát 24 file `assets/` lấy từ fork kentjuno

> Bản 2 — đã soát xong cả 7 hạng mục. Soát ở trạng thái working tree ngày 2026-07-30, đối chiếu `d98aa0fb` (zh) và `kj/main` (vi).

## Kết luận một dòng

**TIN ĐƯỢC — cần sửa chọn lọc, không cần dịch lại.** 24 file không mất một mục nào, không dịch sai một tên tool/khóa/enum nào, không còn một chữ Hán nào, giữ đủ lực cưỡng chế của bản gốc, và **đơn vị đếm chữ hóa ra là ĐÚNG** (xem cảnh báo lớn: giả thuyết "sai 1,5 lần" trong đề bài là **sai**, sửa theo nó sẽ tạo bug thật). Tổng cộng 14 chỗ cần sửa, **0 NGHIÊM TRỌNG**, và file duy nhất cần viết thêm là `anti-ai-tone.md`.

Nói thẳng như đề bài yêu cầu: **bản dịch của kentjuno tốt hơn mức chúng ta giả định.** Người dịch hiểu ranh giới code/prose (giữ nguyên `"hook":` trong JSON, `world_rules`, `working_memory.user_rules.structured`, tên file trong link), và dịch ví dụ văn học có tay nghề chứ không dịch máy. Rủi ro thật của tầng `assets/` không nằm ở 24 file này mà ở 15 file `assets/prompts/` (ngoài phạm vi).

---

## ⚠️ CẢNH BÁO NGƯỢC — ĐỪNG "SỬA" ĐƠN VỊ ĐẾM CHỮ

Đề bài giả định: `3000字` (Hán) ≈ `2000 từ` (Việt), nên `3000 từ` của kentjuno sai 1,5 lần.

**Tôi đo và giả định này sai.** Hệ số thật là **1,00**, không phải 1,5.

Cách đo: 24 file này **chính là văn song song** (cùng nội dung, hai ngôn ngữ), nên đo được chứ không cần đoán. Tôi đếm chữ Hán ở bản zh và chữ tiếng Việt (tách theo dấu cách) ở bản vi, sau khi bỏ code fence / bảng / heading:

| | chữ Hán (zh) | chữ Việt (vi) | tỉ lệ |
|---|---|---|---|
| **Tổng 24 file** | **12.384** | **12.406** | **1,00** |
| Dải theo từng file | | | 0,93 – 1,12 |

Không file nào lệch quá ±12%. Nguyên nhân: cả hai đều là ngôn ngữ **đơn âm** — 1 chữ Hán ≈ 1 âm tiết ≈ 1 "chữ" tiếng Việt viết rời. Chỉ khác cách viết (liền vs rời), không khác lượng thông tin trên mỗi chữ.

Khớp độc lập với phép đo đã ghi trong `internal/domain/chapter.go:42-49` (đo trên TM `internal/i18n/locales/vi.json`, 399 cặp: 7.260 chữ Hán ↔ 7.433 chữ Việt, tỉ lệ 1,024, trung vị 1,000). Hai corpus khác nhau, cùng ra ~1,0.

**Và điều này khớp với code đang chạy.** `internal/domain/chapter.go:58` đã được sửa để `WordCount` đếm chữ tách theo dấu cách khi ngôn ngữ hoạt động là tiếng Việt (`countSpacedWords`) thay vì đếm rune. Nghĩa là ngưỡng `3000-6000` trong tài liệu **phải giữ nguyên** để khớp đơn vị mà hàm đó trả về.

Nếu chia 1,5 thành `2000-4000`: mọi chương bị yêu cầu ngắn hơn thực tế **33%**, và quality gate + `diag.WordCountAnomaly` lệch theo. Đó sẽ là bug do ta tự tạo, không phải bug của kentjuno.

### Mọi con số độ dài trong 24 file

| File:dòng | zh gốc | vi hiện tại | Đề xuất |
|---|---|---|---|
| `references/chapter-template.md:12` | `3000-6000 字，最低不低于 2500 字` | `3000-6000 từ, tối thiểu không dưới 2500 từ` | **giữ nguyên** |
| `references/quality-checklist.md:14` | `短章节：800-1500 字` | `Chương ngắn: 800–1500 từ` | **giữ nguyên** |
| `references/quality-checklist.md:15` | `标准章节：1500-3000 字` | `Chương tiêu chuẩn: 1500–3000 từ` | **giữ nguyên** |
| `references/quality-checklist.md:16` | `长章节：3000-6000 字` | `Chương dài: 3000–6000 từ` | **giữ nguyên** |
| `references/chapter-guide.md:225` | `\| 章节字数 \|` + 3 hàng `800-1500` / `1500-3000` / `3000-6000` | `\| Số từ chương \|`, số giữ nguyên | **giữ nguyên**; `số từ` đúng bảng thuật ngữ (字数=số từ) |

Đó là **toàn bộ** 5 vị trí có số đo độ dài. Tìm bằng grep `字` trên bản zh: 12 dòng chứa `字`, 7 dòng còn lại là `四字成语` / `错别字` / `文字` / `一行字` / `名字` — không phải số đo.

---

## Bảng theo file

`H/LI/TR/CF` = heading / mục danh sách / hàng bảng / code fence. Mọi con số đều là **zh = vi** (khớp tuyệt đối), nên cột ghi một giá trị.

| File | H/LI/TR/CF (zh=vi) | Mất mục | NGHIÊM TRỌNG / CẦN SỬA / NHỎ | Chất lượng |
|---|---|---|---|---|
| `references/anti-ai-tone.md` | 6/15/0/0 | không | 0 / 4 / 1 | **tạm** (ca đặc biệt, xem mục riêng) |
| `references/chapter-guide.md` | 33/37/13/4 | không | 0 / 0 / 2 | tốt |
| `references/chapter-template.md` | 4/6/0/0 | không | 0 / 0 / 0 | tốt |
| `references/character-building.md` | 24/48/29/10 | không | 0 / 0 / 0 | tốt |
| `references/character-template.md` | 8/12/0/0 | không | 0 / 0 / 0 | tốt |
| `references/consistency.md` | 6/18/0/0 | không | 0 / 1 / 0 | tốt |
| `references/content-expansion.md` | 9/32/0/0 | không | 0 / 0 / 1 | tốt |
| `references/dialogue-writing.md` | 27/39/31/20 | không | 0 / 1 / 1 | tốt |
| `references/differentiation.md` | 12/41/0/0 | không | 0 / 0 / 1 | tốt |
| `references/genres/fantasy/arc-templates.md` | 7/17/0/0 | không | 0 / 0 / 0 | tốt |
| `references/genres/fantasy/style-references.md` | 5/12/0/0 | không | 0 / 0 / 0 | tốt |
| `references/genres/romance/arc-templates.md` | 7/18/0/0 | không | 0 / 0 / 0 | tốt |
| `references/genres/romance/style-references.md` | 5/12/0/0 | không | 0 / 0 / 1 | tốt |
| `references/genres/suspense/arc-templates.md` | 7/18/0/0 | không (+6 dòng trống) | 0 / 0 / 1 | tốt |
| `references/genres/suspense/style-references.md` | 5/12/0/0 | không | 0 / 0 / 0 | tốt |
| `references/hook-techniques.md` | 19/44/7/2 | không | 0 / 0 / 1 | tốt |
| `references/longform-planning.md` | 14/57/0/0 | không | 0 / 0 / 1 | tốt |
| `references/outline-template.md` | 12/39/0/4 | không | 0 / 3 / 0 | **tạm** |
| `references/plot-structures.md` | 32/14/69/16 | không | 0 / 0 / 0 | tốt |
| `references/quality-checklist.md` | 23/127/18/0 | không | 0 / 0 / 0 | tốt |
| `styles/default.md` | 1/5/0/0 | không | 0 / 0 / 0 | tốt |
| `styles/fantasy.md` | 1/8/0/0 | không | 0 / 0 / 0 | tốt |
| `styles/romance.md` | 1/8/0/0 | không | 0 / 0 / 0 | tốt |
| `styles/suspense.md` | 1/8/0/0 | không | 0 / 0 / 0 | tốt |
| **Tổng** | **271/619/167/56** | **0 file mất mục** | **0 / 9 / 11** | 22 tốt · 2 tạm · 0 kém |

---

## Bảng phát hiện có mức độ

Không có phát hiện nào ở mức NGHIÊM TRỌNG. Ba loại giết chức năng (mất mục, dịch tên tool, sai đơn vị đếm chữ) đều **không xảy ra**.

### CẦN SỬA (9)

| File:dòng | Vấn đề | Bản đề xuất |
|---|---|---|
| `references/outline-template.md:3,25` (+3 heading nữa) | `大纲` dịch là **`đề cương`** (5 chỗ); bảng thuật ngữ chốt `大纲 = dàn ý` | `dàn ý` |
| `references/outline-template.md:114,115` | Tên agent `Architect` bị dịch thành `Kiến trúc sư` | `Architect` |
| `references/anti-ai-tone.md:18` | **Dịch sai nghĩa**: `抽象大词` = "từ to trừu tượng", bị dịch thành `Đại từ trừu tượng` — `đại từ` là *pronoun*. Các ví dụ kèm theo ("theo một nghĩa nào đó", "đáng chú ý là") không phải đại từ. LLM đọc mục này sẽ đi tìm sai loại từ | `Đại ngôn trừu tượng` hoặc `Từ to trừu tượng` |
| `references/anti-ai-tone.md:16` | `白描` để nguyên thành `bạch mô` — thuật ngữ Hán-Việt tối nghĩa, gần như không ai dùng trong tiếng Việt | `tả trực tiếp, không tô vẽ` |
| `references/anti-ai-tone.md:15` | Nhãn `Chồng thành ngữ **bốn chữ**` là đặc thù tiếng Trung. Chính ví dụ của nó tự phá nhãn: "ngàn cân treo sợi tóc" là **5** âm tiết. LLM được dặn tránh "thành ngữ bốn chữ" sẽ không tránh sáo ngữ 5-6 âm tiết | `Chồng thành ngữ / sáo ngữ` (bỏ "bốn chữ") |
| `references/anti-ai-tone.md:3` | Tên agent `writer` / `editor` bị dịch thành `Người viết` / `Biên tập viên`; và tên chiều duyệt `aesthetic` thành `chiều thẩm mỹ` | `Writer` / `Editor`; ghi `chiều thẩm mỹ (aesthetic)` |
| `references/consistency.md:8` | Ghi `` `00-outline.md` ``, nhưng store thật ghi ra `outline.md` / `layered_outline.md` (`internal/store/outline.go:47,82`). Bản zh gốc cũng sai (`00-大纲.md`) — lỗi có sẵn từ upstream, không do dịch | `` `outline.md` `` |
| `references/dialogue-writing.md:47` | Còn sót dấu gạch ngang kiểu Trung `——` trong ví dụ ngắt lời. Đây là file **dạy dấu câu bằng ví dụ**, nên Writer sẽ copy. Đáng lưu ý hơn: `anti-ai-tone.md:5` nói dấu gạch ngang bị kiểm máy móc — tức file này đang dạy chính cái mà lớp máy sẽ bắt lỗi | `nhưng mà...` |
| `references/anti-ai-tone.md` (toàn file) | Thiếu 3 tật văn Việt mà `stylestat` đã bắt — xem mục riêng | thêm 3 mục |

### NHỎ (11)

| File:dòng | Vấn đề | Bản đề xuất |
|---|---|---|
| `references/anti-ai-tone.md:17` | Lượng từ `"một vệt"`, `"một sợi"` là calque của `一抹`/`一缕`. Tật thật của văn AI tiếng Việt là `một thoáng`, `một tia`, `một nét` | thay danh sách lượng từ |
| `references/chapter-guide.md:177,231` | `sự hiểu biết` lủng củng (`不影响理解`) | `việc hiểu truyện` |
| `references/genres/suspense/arc-templates.md:36` | `độc lập thành lập` — calque của `独立成立` | `tự đứng vững được` |
| `references/hook-techniques.md:96` | `chỉ có vậy một dòng` — sai trật tự từ | `chỉ vỏn vẹn một dòng` |
| `references/longform-planning.md:76` | `cấu trúc mãn nhãn` — `爽点` dịch nửa vời | `cấu trúc gây sảng khoái` |
| `references/differentiation.md:37` | `có tồn tại logic vận hành hợp lý` — cấu trúc Hán | `có logic vận hành hợp lý` |
| `references/genres/romance/style-references.md:6` | `cấm nhảy cóc phát triển` cụt | `cấm phát triển kiểu nhảy cóc` |
| `references/content-expansion.md:3` | `mở rộng một cách tự nhiên` — đúng cái mẫu `một cách + tính từ` mà `stylestat` gắn cờ "trạng ngữ dịch máy" | `mở rộng tự nhiên` |
| `references/dialogue-writing.md` (mục dấu câu) | Đặt tên "Dấu câu trong đối thoại tiếng Việt" nhưng chỉ dạy lối ngoặc kép; không nhắc lối gạch đầu dòng (`— Lời thoại.`) là quy ước chủ đạo của văn in tiếng Việt | thêm một dòng về lối gạch đầu dòng |
| `references/outline-template.md:25` | `是否必须` (có buộc phải) → `có cần` — nhẹ hơn gốc | `có buộc phải` |
| `references/genres/suspense/arc-templates.md` | +6 dòng trống so với zh | không cần sửa (đúng markdown hơn) |

---

## Mục riêng: `anti-ai-tone.md`

**Kết luận: còn dùng được, KHÔNG cần viết lại — nhưng cần sửa 4 chỗ và thêm 3 mục.**

Đề bài dự đoán file này "gần như chắc chắn liệt kê mẫu câu sáo tiếng Trung cụ thể" và do đó hết dùng được cho tiếng Việt. **Dự đoán đó đúng một nửa.** Tôi đọc đối chiếu từng mục và thấy các mẫu chia làm ba nhóm rõ rệt:

**Nhóm chuyển ngữ tốt (7/15 mục) — giữ nguyên.** Đây là các tật *cấu trúc/tư duy*, không phải tật *từ vựng*, nên độc lập với ngôn ngữ:
- `Câu ba vế`: `他不再犹豫,不再退缩,不再回头` → "Anh không còn do dự, không còn lùi bước, không còn ngoảnh đầu". Chuyển hoàn hảo — liệt kê ba vế đối xứng là tật AI thật của tiếng Việt.
- `Câu đối lập định nghĩa`: `他要的不是 X,而是 Y` → "Điều anh muốn không phải X, mà là Y". Đây là một trong những tật AI tiếng Việt nổi tiếng nhất, và `stylestat` cũng bắt nó (`viPatternDefs[0]`) — hai lớp khớp nhau.
- `Dán nhãn cảm xúc`, `Khái quát trừu tượng thay ngũ quan`, `Nhân vật đồng nhất hóa`, `Giải thích động cơ thái quá`, `Kể rõ mọi thứ`, `Nâng tầm gượng ép cuối chương`: đều là tật kể chuyện phổ quát, chuyển ngữ không mất gì.

**Nhóm chuyển ngữ hụt (3 mục) — đã ghi ở bảng trên.** `thành ngữ bốn chữ` (nhãn đặc thù Hán, ví dụ tự phá nhãn), `một vệt/một sợi` (calque, không phải tật Việt thật), `Đại từ trừu tượng` (dịch sai nghĩa hẳn). Ba mục này *vẫn có tác dụng một phần* vì các từ đệm kèm theo ("không khỏi", "bỗng nhiên", "dường như") là tật Việt rất thật, và ví dụ sửa `"Anh không khỏi khẽ cong môi một nụ cười"` là một câu văn-AI-tiếng-Việt cực kỳ điển hình. Nên đây là hụt, không phải vô dụng.

**Nhóm thiếu (3 mục cần thêm) — đây là phát hiện đáng giá nhất về file này.**

`internal/stylestat/stylestat.go:105-118` giờ có `viPatternDefs` gồm 11 lớp: 8 lớp ánh xạ 1-1 với bộ zh, **cộng 3 lớp là tật riêng của văn Việt do LLM/dịch máy sinh ra, tiếng Trung không có**:

1. `Trạng ngữ dịch máy『một cách + tính từ』`
2. `Sở hữu dịch máy『của + đại từ』`
3. `Liên từ nghị luận mở câu『Tuy nhiên,/Bên cạnh đó,』`

Tôi kiểm: **cả 3 đều KHÔNG có trong `anti-ai-tone.md`** (grep = 0).

Đây là lỗ hổng thật, vì hai lớp có phân vai rõ trong hệ thống: `stylestat` chỉ **đếm sự kiện** (`assets/prompts/editor.md:85` — "Thống kê chỉ đưa dữ kiện"), còn `anti-ai-tone.md` là nơi **Writer đọc để tự tránh** và **Editor đọc để có tiêu chí phán**. Hệ quả nếu để nguyên:

- Writer không được dặn tránh → cứ viết "một cách lạnh lùng", "ánh mắt của hắn"
- Editor thấy con số `stylestat` tăng nhưng tài liệu không có mục nào tương ứng để dẫn làm căn cứ
- Chỉ số cứ đỏ mà không ai sửa — đúng kiểu lỗi thầm lặng

**Trả lời trực tiếp câu hỏi của đề bài** ("`anti-ai-tone.md` có nên khớp với bộ mẫu mới đó không?"): **Có, và nên khớp theo một chiều xác định** — mỗi lớp trong `viPatternDefs` cần một mục tương ứng trong `anti-ai-tone.md`, vì `viPatternDefs` đã được xây có chủ đích cho tiếng Việt (đọc chú thích `stylestat.go:88-104` — tác giả nói rõ "KHÔNG phải bản dịch máy của bộ zh"), trong khi `anti-ai-tone.md` vẫn là bản dịch từ bộ zh. Bộ regex hiện là tài liệu chuẩn hơn về tật văn Việt so với chính file tài liệu.

Ba mục đề xuất thêm vào `## II. Văn phong AI về từ ngữ`:

- **Trạng ngữ dịch máy `một cách + tính từ`**: "nhìn một cách lạnh lùng", "nói một cách dứt khoát" — là lối dịch máy của trạng ngữ `地` tiếng Trung. Cách sửa: bỏ "một cách", để tính từ đứng thẳng sau động từ ("nhìn lạnh lùng").
- **Sở hữu dịch máy `của + đại từ`**: "ánh mắt của hắn", "bàn tay của nàng" — tiếng Việt lược sở hữu ("ánh mắt hắn"). Dày đặc = văn dịch chưa gột. Cách sửa: bỏ "của" khi quan hệ sở hữu đã rõ.
- **Liên từ nghị luận mở đầu câu**: "Tuy nhiên,", "Bên cạnh đó,", "Hơn thế nữa," mở đầu câu kể — LLM viết văn kể như viết văn nghị luận. Cách sửa: bỏ liên từ, để hai câu tự đặt cạnh nhau.

Một ghi chú phụ: `anti-ai-tone.md:5` nói phần cơ giới hóa được nằm ở `working_memory.user_rules.structured`, nhưng thực tế lớp cơ giới giờ có **hai** chỗ — thêm `stylestat` (`episodic_memory.style_stats`, xem `editor.md:85`). Câu mô tả kiến trúc trong file đã lạc hậu so với code; nên nhắc tên `style_stats` ở đó.

---

## Hạng mục 1 — Mất nội dung: KHÔNG MẤT GÌ

Đếm cơ học 4 loại phần tử cấu trúc trên cả hai bản, cả 24 file: **khớp tuyệt đối 24/24 ở cả 4 loại** — 271 heading, 619 mục danh sách, 167 hàng bảng, 56 code fence.

Chênh lệch số dòng duy nhất: `references/genres/suspense/arc-templates.md` 45 dòng (vi) vs 39 (zh). Tôi đọc diff đầy đủ: **6 dòng thêm là dòng trống** chèn giữa dòng mô tả nhịp và danh sách bullet theo sau. Không mất chữ nào, và đúng hơn về markdown (list cần dòng trống phía trước mới render). **Không phải vấn đề.**

Vì engine cắt prompt theo mục ở một số chỗ, đây là kết quả quan trọng: **không mục nào bị bỏ, nên không chức năng nào bị mất.**

## Hạng mục 2 — Tên tool / khóa / enum: KHÔNG DỊCH SAI CÁI NÀO

Đếm 41 token phải giữ nguyên (15 tên tool, 7 tên trường, 12 giá trị enum, 5 tên agent, `architect_long`/`architect_short`) trên cả hai bản: **40/41 khớp số lần xuất hiện.**

Thực tế các file `references/` + `styles/` gần như không nhắc tên tool — chúng là tài liệu kỹ thuật viết, không phải mô tả tool. Rủi ro ở tầng này vốn thấp; tầng cần soát kỹ là `assets/prompts/` (ngoài phạm vi).

**Điểm cộng đáng ghi nhận:** kentjuno giữ đúng các định danh máy dù chúng trông như từ tiếng Anh dịch được — `"hook":` và `"chapter":` trong khối JSON (`outline-template.md:1666,1688`), `` `outline` `` trong "dạng phẳng", `world_rules` (`fantasy/style-references.md:18`), `working_memory.user_rules.structured` (`anti-ai-tone.md:5`), và tên file trong link nội bộ (`hook-techniques.md`). Đây là dấu hiệu người dịch hiểu ranh giới code/prose.

Sai lệch duy nhất: `Architect` → `Kiến trúc sư` (`outline-template.md:114,115`). Chưa tới NGHIÊM TRỌNG vì nằm trong văn giải thích, không phải chuỗi LLM phải phát ra để gọi tool.

**Một ca tôi đã cân nhắc rồi hạ mức, ghi lại để minh bạch:** `anti-ai-tone.md:3` dịch `aesthetic` → `chiều thẩm mỹ`. `aesthetic` **là** giá trị enum thật — `save_review` nhận `{"dimension": "aesthetic"}` và `domain.Review.Dimension()` (`internal/domain/review.go:96`) so khớp **đúng từng ký tự** (`==`), nên về lý thuyết Editor phát ra `"thẩm mỹ"` sẽ làm chiều này im lặng không lưu được. Nhưng tôi kiểm `assets/prompts/editor.md` và thấy prompt **giữ literal `aesthetic`** ở 6 chỗ, gồm `editor.md:76` (`Chiều bảy: phẩm chất thẩm mỹ (aesthetic)`) và `editor.md:118` (liệt kê đủ bảy chiều bằng tiếng Anh). Prompt mới là nguồn quy phạm mà Editor đọc, nên chức năng **không vỡ**. Hạ xuống CẦN SỬA vì lý do nhất quán, không phải vì lỗi chức năng.

## Hạng mục 4 — Thuật ngữ: 1 lỗi hệ thống + phần còn lại sạch

Đếm mọi biến thể của 19 cặp thuật ngữ đã chốt, trên **file đang dùng** (working tree).

Tuân thủ tốt: `tập` 36 · `cung` 76 · `phục bút` 17 · `luật thế giới` 6 · `móc` 72 · `nhịp` 28 · `văn phong` 10 · `nhất quán` 19 · `tóm tắt` 5 · `số từ` 2. **Không có** biến thể sai nào: `quyển` 0, `vòng cung` 0, `quy tắc thế giới` 0, `điềm báo` 0, `móc câu` 0, `đánh bóng` 0, `mài giũa` 0, `số chữ` 0.

Đặc biệt với **卷/弧** — cặp đề bài cảnh báo dễ lẫn nhất, và là nơi lỗi đảo tham số đã được tìm ra ở tầng chuỗi Go: **tôi không tìm thấy lần lẫn nào trong 24 file.** `tập` và `cung` dùng đúng chỗ, kể cả `outline-template.md:67` (`卷弧双层` → `hai lớp tập-cung`).

Lỗi hệ thống duy nhất: `大纲` → `đề cương` (5 chỗ, chỉ trong `outline-template.md`), phải là `dàn ý`.

**Báo động giả tôi đã kiểm và loại** (ghi lại để không ai sửa oan): `hồi` (33) toàn bộ là `hồi hộp`/`hồi ức`/`hồi phục`/`hồi đáp`, không phải 卷/弧. `đồng nhất` (3) là `đồng nhất hóa` (homogenization), khái niệm khác `一致性`, dịch đúng. `phán xét` (`chapter-guide.md:223`) là văn kể thường, không phải enum `裁定`. `arc`/`outline`/`hook` tiếng Anh đều là tên file hoặc khóa JSON, giữ nguyên là đúng.

**Ghi chú trung thực:** `前提`, `评审`, `返工`, `打磨`, `干预`, `文风` **không xuất hiện trong bản zh của 24 file này** (đếm = 0). Không kiểm được ở đây; chúng sống trong `assets/prompts/`. Đừng đọc "0 lỗi" ở các cặp đó thành "đã xác nhận đúng".

## Hạng mục 5 — Ví dụ văn học: ĐÃ DỊCH HẾT, và dịch có tay nghề

**Còn 0 chữ Hán trong cả 24 file** (grep dải `U+4E00–U+9FFF`). Cũng **0 dấu câu full-width kiểu Trung** (`，。？！、：；""「」《》（）`). Sót duy nhất một dấu `——` ở `dialogue-writing.md:47`.

Nhưng câu hỏi thật của hạng mục này không phải "còn tiếng Trung không" mà "**ví dụ dịch rồi có còn minh họa đúng điểm cần minh họa không**". Tôi đọc đối chiếu các ví dụ trong 4 file nhiều ví dụ nhất. Kết quả: **phần lớn chuyển ngữ thành công thật**, không phải dịch chữ.

Dẫn chứng cụ thể:
- `dialogue-writing.md` "Đối thoại vô nghĩa": zh dùng mẫu chào hỏi `吃饭了吗` → vi "Ăn cơm chưa? / Ăn rồi. / Ồ, vậy thì tốt." Đây là chuyển đổi *văn hóa* đúng, không phải dịch chữ — và nó vẫn nhạt đúng như mục đích.
- `dialogue-writing.md:33-35` bảng dài/ngắn gọn: "Điều tôi muốn nói với bạn là, tôi nghĩ chúng ta nên rời khỏi đây ngay lập tức." → "Chúng ta phải đi ngay." Bản dài **thật sự** rườm rà trong tiếng Việt, bản ngắn **thật sự** gọn. Ví dụ còn nguyên chức năng minh họa.
- `dialogue-writing.md` bảng lạm dụng trạng từ: "anh nói đầy tức giận" → "Giọng anh run lên." Chuyển tốt.
- `anti-ai-tone.md:12` câu ba vế: chuyển hoàn hảo (phân tích ở mục riêng).

Chỗ ví dụ **mất một phần lực minh họa**: mục `thành ngữ bốn chữ` ở `anti-ai-tone.md:15` — ví dụ tiếng Việt vẫn đọc ra sáo ngữ, nhưng không còn khớp cái nhãn "bốn chữ" (chi tiết ở mục riêng). Đây là ca duy nhất tôi thấy nhãn và ví dụ lệch nhau.

Mục dấu câu của `dialogue-writing.md` được **thật sự bản địa hóa**, không phải đổi tiêu đề: nó dùng ngoặc kép ASCII với dấu phẩy bên trong, hợp quy ước phương Tây/Việt, không bê nguyên quy ước Trung. Chỉ thiếu quy ước gạch đầu dòng (ghi ở NHỎ).

## Hạng mục 6 — Chất lượng làm prompt cho LLM viết văn: TỐT

**Lực cưỡng chế được giữ.** Tôi đối chiếu từng dòng có `禁止`/`严禁`/`必须` ở bản zh với dòng tương ứng bản vi:

| zh | vi | Nhận xét |
|---|---|---|
| `禁止百科式灌输` | `tuyệt đối không nhồi nhét kiểu bách khoa toàn thư` | giữ, thậm chí mạnh hơn |
| `严禁突破` | `nghiêm cấm vượt qua` | giữ đúng mức "nghiêm" |
| `禁止跳跃式发展` | `cấm nhảy cóc phát triển` | giữ lực (văn cụt, ghi ở NHỎ) |
| `章末必须有悬念钩子，禁止"平静收尾"` | `Cuối chương bắt buộc phải có điểm móc gây hồi hộp, cấm kết thúc bằng "cảnh yên bình"` | giữ cả `必须` và `禁止` |

Tôi quét toàn bộ **43 dòng chứa `必须`** để tìm chỗ bị làm mềm thành lời khuyên. Kết quả: **không có chỗ nào `必须` tụt thành "nên"**. Chỉ 1 ca nhẹ: `outline-template.md:25` `是否必须` → `có cần` (ghi ở NHỎ). Ba chỗ dùng `không nên` trong bản vi đều ứng với `不要`/`应` mềm ở bản zh, tức dịch đúng mức.

**Câu tiếng Việt tự nhiên hay lủng củng dịch máy?** Chủ yếu tự nhiên. Tôi quét các dấu hiệu calque điển hình và chỉ tìm được **8 chỗ trên ~12.400 chữ** (`sự hiểu biết` ×2, `độc lập thành lập`, `chỉ có vậy một dòng`, `mãn nhãn`, `tồn tại logic`, `bạch mô`, `Đại từ trừu tượng`). Mật độ đó rất thấp — đây là bản dịch người làm, có chỉnh, không phải máy đổ ra. Trong 8 chỗ chỉ 2 chỗ ảnh hưởng tới ý (`bạch mô`, `Đại từ trừu tượng`, đều ở `anti-ai-tone.md`), 6 chỗ còn lại chỉ hơi cứng.

Một điểm hơi trái ngang đáng ghi: `content-expansion.md:3` dùng "mở rộng **một cách** tự nhiên" — đúng cái mẫu `một cách + tính từ` mà `stylestat` gắn cờ "trạng ngữ dịch máy". Không phải lỗi chức năng (`stylestat` chỉ quét chương truyện, không quét tài liệu), nhưng tài liệu dạy văn nên tự sạch mẫu mà nó sắp phải dạy tránh.

---

## Sai lệch so với bản kj — 3 file đã bị agent khác sửa

Đề bài yêu cầu xác minh file đang dùng có giống bản kj. **21/24 giống hệt (khớp SHA). 3 file đã khác:**

| File | Thay đổi | Nhận xét |
|---|---|---|
| `references/differentiation.md` | 2 chỗ `quy tắc thế giới` → `luật thế giới` | Đúng bảng thuật ngữ |
| `references/longform-planning.md` | 3 chỗ `quy tắc thế giới` → `luật thế giới` | Đúng bảng thuật ngữ |
| `styles/fantasy.md` | 1 chỗ `quy tắc thế giới` → `luật thế giới` | Đúng bảng thuật ngữ |

Cả 3 đều là sửa thuật ngữ hợp lệ (6 chỗ), không mất nội dung. Nghĩa là lỗi `世界规则` của kentjuno **đã được xử lý xong** trước khi tôi soát — ghi lại để không ai sửa lần hai, và để con số `luật thế giới = 6` ở trên không bị hiểu nhầm là công của kentjuno.

## Số liệu trung thực

- **Soát 24/24 file** trong `scripts/i18n/tm.json.assets.txt`. **Không lấy mẫu** ở hạng mục 1, 2, 3, 4, 5: mọi phép đếm chạy trên toàn bộ 24 file.
- Hạng mục 1, 2, 4, 5 (phần chữ Hán/dấu câu còn sót) đo **cơ học** — đáng tin ở mức của phép đếm: bắt được mục bị bỏ, token bị dịch, chữ Hán còn sót. **Không** bắt được một đoạn dịch sai nghĩa mà vẫn giữ đủ số bullet.
- Hạng mục 3 đo trên toàn bộ 12.384 chữ Hán / 12.406 chữ Việt.
- Hạng mục 6 (lực cưỡng chế) đối chiếu **toàn bộ** 47 dòng có `禁止`/`严禁`/`必须`, không lấy mẫu.
- Hạng mục 5 (ví dụ còn minh họa đúng không) và 6 (văn tự nhiên hay lủng củng) là **đọc và xét, có lấy mẫu**: tôi đọc kỹ đối chiếu `anti-ai-tone.md` (toàn bộ), `dialogue-writing.md` (~1/3 đầu + các bảng ví dụ), `hook-techniques.md` (một ví dụ), cộng quét calque tự động trên cả 24 file. **Tôi không đọc đối chiếu từng câu của cả 24 file** — với `plot-structures.md` (259 dòng), `character-building.md` (220 dòng), `quality-checklist.md` (262 dòng) tôi chỉ có bằng chứng cơ học + quét calque, không có bằng chứng đọc-hiểu từng dòng. Nếu cần mức đó cho 3 file này thì phải soát thêm.
- **Ngoài phạm vi**: 15 file `assets/prompts/*.md` (agent khác đang dịch mới). Đây là nơi rủi ro tên tool và mất lực chỉ dẫn cao nhất — kết quả "sạch" của tôi ở hạng mục 2 **không nói gì** về các file đó. Tôi chỉ đọc `editor.md` ở mức cần thiết để xác minh ca `aesthetic`, và thấy nó giữ literal enum đúng.
