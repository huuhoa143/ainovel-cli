# Đối chiếu văn phong: bản gốc tiếng Trung ↔ bản việt hóa

Mốc gốc: `68eb92d~1`. Đo trên **prompt đã lắp** (`assets.Load` + `BuildWriterPrompt` + `WithSimulationGuidance`), không đo tệp thô.

## Kết luận

**Không hỏng.** Trên 31 cặp tệp còn sống và 111 chỉ thị cưỡng chế cứng của bản gốc, tôi **không tìm được chỉ thị nào bị mất** mà không truy được về một thay đổi code cố ý.

Ba phát hiện thật, đều nhẹ, đều nằm ở lớp **ví dụ minh họa** và **một chỗ hạ mức cưỡng chế**. Không có chỗ nào ở lớp "mất chỉ thị".

Và lớp 4 — lớp anh dự đoán có giá trị nhất — **đã được xử lý theo đúng hướng anh mô tả, trước khi tôi tới**. Chi tiết ở mục cuối; đó là phần đáng đọc nhất của báo cáo này.

## Đã so bao nhiêu

| Phép đo | Số lượng |
|---|---|
| Cặp tệp `.md` đối chiếu | 31 còn sống + 4 tệp bị xóa (đã truy nguyên) |
| Dòng mang chỉ thị (bullet + hàng bảng + mục đánh số) | 1085 gốc → 1058 nay (**−27**) |
| Chỉ thị cưỡng chế cứng (`必须`/`禁止`/`严禁`/`绝不`/`不得`/`务必`/`不许`/`一律`) trích và soi từng cái | **111** |
| Trong đó tự tay đối chiếu câu-với-câu | ~84 (toàn bộ references/genres/styles, architect, editor, writer) |
| Tên tiêu đề premise kiểm bằng máy (prompt ↔ parser, hai chiều) | 24 |
| Chuỗi mô tả schema công cụ kiểm phủ i18n vi | 137 (thiếu: 0) |
| Lớp mẫu đếm giọng-AI | 8 (zh) → 11 (vi) |

Phân bố `−27` dòng chỉ thị: **19 tệp references + 4 styles + 6 tệp genres đều đúng `+0`** (bảo toàn từng dòng); architect-long `+9`, architect-short `+5`; chỉ `editor.md` (`−18`) và `writer.md` (`−28`) thiếu hụt. Cả hai đã truy nguyên hết ở dưới.

Mức cưỡng chế đi **lên** gần như mọi nơi (`禁止` → `cấm`, `严禁` → `nghiêm cấm`, `必须` → `buộc phải`/`bắt buộc`, và ở `simulationGuidance` thì `应` → `phải`). Không có dấu hiệu làm mềm mang tính hệ thống.

---

## Nhóm 1 — Chỉ thị bị mất hẳn: **0**

Sáu chỗ *trông như* mất, đã truy ra bằng chứng code cho từng chỗ:

| Chỗ trông như mất | Truy nguyên |
|---|---|
| `editor.md` mất bảng liệt `dimensions` "**必须是数组，且正好 7 项**" | `internal/tools/save_review.go:256` `validateDimensions` nay chỉ đòi **≥1** chiều; schema ghi rõ "可按任务补充更具体维度". Prompt vi nói "thường bao trọn ... có thể thêm chiều" là **khớp code**, không phải làm mềm. Bảy tên chiều vẫn còn nguyên trong prompt. |
| `editor.md` + `writer.md` mất hàng `chapter_words` | `internal/rules/snapshot.go:37` — "v2：chapter_words 退出 structured（字数是语义软约束，走 preferences）". Cố ý. |
| `editor.md` + `writer.md` mất đoạn `user_directives` (kể cả luật `at_chapter` không hồi tố) | `save_directive` đã bị xóa; `internal/tools/novel_context_test.go:925` `TestContextToolDoesNotInjectUserDirectives` chốt chiều ngược lại. Cố ý. |
| `writer.md` mất trọn mục "commit_chapter 参数" (11 tham số + 2 enum) | `internal/tools/commit_chapter.go:102-111` giữ đủ 11 trường, `hook_type`/`dominant_strand` vẫn là enum thật (`domain.HookTypes()`/`DominantStrands()`). Prompt thôi nhân bản schema công cụ. |
| `simulation-merge.md` + `simulation-source.md` mất trọn khối JSON schema (7 mục / 10 trường) | Chuyển thành structured-output contract: `internal/host/sim/contracts.go` `synthesisContract()` giữ **đủ 7 mục và 35 trường con**, `sourceReportContract()` giữ **đủ 10 trường**. `role_guidance` rụng `coordinator` là vì `coordinator.md` bị bỏ — nhất quán. |
| `assets/rules/default.md` bị xóa (chapter_words + 4 forbidden_phrases + 16 fatigue_words) | Chuyển vào `internal/rules/snapshot.go:180` `SystemDefaults()`, có bảng **theo ngôn ngữ**. Xem Nhóm 4 — đây là chỗ hay nhất. |

`editor.md` còn **thêm** một mục hoàn toàn mới không có ở gốc: "Ranh giới thẩm quyền của can thiệp người dùng" (5 chỉ thị chặn việc nống phạm vi viết lại ra cả sách).

---

## Nhóm 2 — Hạ mức cưỡng chế: **1** (nhẹ, ở 2 tệp)

### 2.1 Chiến lược sửa JSON lỗi bị đảo chiều

Có ở cả `assets/prompts/architect-long.md:88` và `assets/prompts/architect-short.md:98`.

**Gốc** (`architect-long.md:83`, `architect-short.md:93` — hai tệp cùng một câu):

> **注意**：layered_outline / characters / world_rules 的 content 直接传 JSON 数组，不要手动转义成字符串。JSON 字符串值内部**所有**双引号必须转义为 `\"`、换行为 `\n`、制表符为 `\t`，**禁止出现字面双引号或控制字符**。工具解析失败会返回 `parse xxx JSON (line L col C)` 精确定位错误位置，看到此错误时**完整重写**该段 JSON，**不要尝试局部打补丁**。

**Bản việt hóa hiện tại:**

> Với layered_outline / characters / world_rules thì `content` cứ truyền thẳng mảng JSON, đừng serialize thành chuỗi trước; khi phân tích thất bại thì dựa vào vị trí cụ thể mà công cụ trả về để sửa nội dung.

**Điều gì đã mất:**

1. Đặc tả escape (`"` → `\"`, xuống dòng → `\n`, tab → `\t`) — mất trắng.
2. Lệnh cấm cứng `禁止出现字面双引号或控制字符` — mất trắng.
3. Nghiêm trọng hơn cả hai: gốc **cấm** vá cục bộ (`不要尝试局部打补丁`) và **buộc** viết lại cả khối. Bản vi nói "dựa vào vị trí cụ thể ... để sửa nội dung" — tức là **đúng cái việc bản gốc cấm**. Đây là đảo nghĩa, không phải làm mềm.

**Vì sao tôi vẫn xếp mức nhẹ:** cả đặc tả escape lẫn lệnh "viết lại toàn bộ" đã chuyển vào chính thông điệp lỗi, và **đã dịch** — `internal/tools/save_foundation.go:389`:

> Nguyên nhân phổ biến: dấu ngoặc kép trong giá trị chuỗi chưa được escape thành `\"`, xuống dòng chưa escape thành `\n`, hoặc thiếu dấu phẩy giữa các trường của đối tượng. **Hãy sinh lại toàn bộ đoạn một lần nữa.**

Chỉ dẫn tới đúng lúc cần (khi lỗi xảy ra) thay vì nằm sẵn trong context — đổi chỗ có chủ đích, và hướng dẫn lúc lỗi mới là hướng dẫn có quyền quyết định. Nhưng câu trong prompt vẫn đang **đẩy nhẹ mô hình về phía vá cục bộ**, ngược với thông điệp lỗi. Sửa một câu là xong.

---

## Nhóm 3 — Ví dụ minh họa bị mất: **2** (một chỗ không được bù)

Cả hai ở `assets/prompts/editor.md`, mục "Tóm tắt cung" (gốc: "save_arc_summary 参数").

### 3.1 `taboos` mất cả ba ví dụ — KHÔNG được bù

**Gốc** (`editor.md:193`):

> - taboos：本小说需避免的写法（从审美维度发现中提取）
>   示例："避免章末独白超 200 字""避免单章视角混乱切换""禁止以天气开场"

**Bản việt hóa hiện tại** (`editor.md:159`):

> - taboos chỉ ghi những điều kỵ thẩm mỹ không thể máy móc hóa; ngưỡng từ mỏi vẫn do `user_rules.structured` quản.

**Điều gì đã mất:** cả ba ví dụ cụ thể. Và schema công cụ **không** bù — `internal/tools/save_arc_summary.go:60` chỉ ghi `"本小说需避免的写法"`, không kèm ví dụ nào.

Đây là phát hiện duy nhất trong báo cáo **không có lớp bù nào**. Hệ quả đúng như anh mô tả: chỉ thị thành trừu tượng, mô hình phải tự đoán một điều kỵ thẩm mỹ "không máy móc hóa được" trông như thế nào. Ba ví dụ gốc dạy đúng ba hình dạng khác nhau (ngưỡng độ dài / lỗi góc nhìn / lệnh cấm mở đầu).

### 3.2 `prose` / `dialogue` — ví dụ bị rút, phần lớn được bù

**Gốc** (`editor.md:182-191`) có: `prose` 3-5 mục mỗi mục ≤50 chữ + **hai** ví dụ tốt + **một** ví dụ xấu kèm lý do ("文笔优美，描写细腻" — "太空洞，无法执行"); `dialogue` mỗi nhân vật 2-3 mục ≤30 chữ + cặp ví dụ **đúng/sai** về hình dạng JSON (`[{name, rules}]` chứ không phải `["..."]`).

**Bản việt hóa** giữ **một** ví dụ tốt và một câu phủ định gọn ("đừng viết những câu rỗng kiểu 'văn hay'"), bỏ lý do của ví dụ xấu, bỏ cặp đúng/sai JSON.

**Được bù ở đâu:** mọi ngưỡng số vẫn nằm trong schema và **đã dịch** — `save_arc_summary.go:57-59`: "3-5 条叙述风格规则（每条 ≤50 字，要具体可执行）", "2-3 条语言特征规则（每条 ≤30 字）", "弧摘要（500字以内）". Cặp đúng/sai JSON được bù bằng thông điệp lỗi lúc chạy (`save_arc_summary.go:76`: "style_rules.dialogue must be an array of objects {name, rules}, not strings"). Còn thiếu thật: **lý do** của ví dụ xấu ("太空洞，无法执行") — cái dạy mô hình *vì sao* câu đó không dùng được.

### 3.3 Khối JSON mẫu 7 chiều — được bù

`editor.md:118-129` gốc có khối JSON mẫu đúng-hình-dạng + câu "工具参数必须使用原生 JSON 结构，不要把数组或对象包成字符串". Bản vi bỏ cả hai. Được bù: `SaveReviewTool.StrictSchema()` trả `true`, nên hình dạng do structured-output cưỡng chế, không còn phụ thuộc lời nhắc.

---

## Nhóm 4 — Ví dụ mất tính minh họa: **0 — và đã được đảo ngược**

Đây là phần anh đoán có giá trị nhất. Anh đoán đúng chỗ, nhưng công việc đã làm rồi, và làm kỹ hơn mức một bản dịch cần.

### 4.1 Đúng cái bẫy "四字成语" bị gọi tên và bác bỏ

`assets/references/anti-ai-tone.md:15` không dịch `四字成语堆砌` thành "chồng thành ngữ bốn chữ" rồi thôi. Nó viết thêm:

> Không giới hạn ở cụm bốn tiếng — **sáo ngữ tiếng Việt dài năm sáu tiếng tính y như vậy**.

Ví dụ cũng đổi sang sáo ngữ Việt thật ("rợn người kinh hãi, ngàn cân treo sợi tóc, hiểm nguy rình rập") thay vì dịch chữ ba thành ngữ Trung.

### 4.2 Ba lớp sáo ngữ CHỈ CÓ ở tiếng Việt được thêm mới

`internal/stylestat/stylestat.go:113` `viPatternDefs` có 11 lớp, trong đó 8 lớp đầu ánh xạ 1-1 với 8 lớp `zhPatternDefs`, và **3 lớp cuối không có nguồn tiếng Trung nào** — chúng là dấu vết dịch máy của riêng tiếng Việt:

- `Trạng ngữ dịch máy (một cách + tính từ)` — "nhìn một cách lạnh lùng"
- `Sở hữu dịch máy (của + đại từ)` — "ánh mắt của hắn"
- `Liên từ nghị luận mở câu` — "Tuy nhiên," / "Bên cạnh đó," mở đầu câu kể

`anti-ai-tone.md:20` gọi lớp thứ nhất là "dấu hiệu dịch máy mạnh nhất". `anti-ai-tone.md` cũng thêm 4 mục không có ở gốc (mẫu thần thái / phản ứng cơ thể, nhịp im lặng, đánh dấu suy nghĩ, lượng từ thời gian) — trong đó mục "Mẫu thần thái" nói thẳng nó là **cái giá phải trả** khi sửa "dán nhãn cảm xúc" bằng phản ứng cơ thể: "đổi một tật lấy một tật". Đó là mức lập luận trên cả bản gốc.

### 4.3 Chính cái lỗi lớp-4 anh mô tả đã từng xảy ra thật, và đã bị bắt

`internal/rules/snapshot.go:196` chép lại nguyên văn:

> checker so khớp **CHUỖI CON LITERAL** với văn bản do mô hình sinh ra. Bảng tiếng Trung khớp **0 lần** trong văn tiếng Việt, nên cả 16 ngưỡng chết lặng — không lỗi, không log, và mọi chương đều "sạch từ gây mỏi".

Bảng `fatigueWords()` tiếng Việt được chọn theo **chức năng** của bản gốc, không dịch chữ: liên từ chuyển ý (`此外`/`然而` → "ngoài ra"/"tuy nhiên"), lượng từ mờ (`一丝`/`一抹` → "một thoáng"/"một tia"), nhịp im lặng, đơn vị thời gian tiên hiệp. Ngưỡng giữ nguyên số vì hệ số chữ Hán→chữ Việt đo được ~1,0.

### 4.4 Có hợp đồng máy chặn đúng lớp hỏng này

`assets/anti_ai_tone_sync_test.go` `TestAntiAIToneCoversEveryCountedPattern`: mỗi lớp `stylestat` đếm **buộc phải** có một mục trong `anti-ai-tone.md`, nếu không thì test đỏ. Lý do ghi trong tệp: "con số cứ tăng mà không ai có căn cứ để ra issue: chỉ số đỏ mà không ai sửa, đúng kiểu **lỗi không phát ra tiếng**". Một test nữa (`TestAntiAIToneKeepsAgentNamesInEnglish`) chặn việc dịch `Writer`/`Editor`/`aesthetic` — vì `aesthetic` là enum thật.

Chạy `go test ./assets/... ./internal/stylestat/... ./internal/rules/... ./internal/tools/... ./internal/host/sim/... -count=1`: **toàn bộ ok**.

### 4.5 Còn thêm một luật riêng của tiếng Việt mà bản gốc không thể có

`assets/references/dialogue-writing.md:69-71` thêm luật dấu thoại — ngoặc kép hay gạch đầu dòng — kèm ràng buộc "**cả sách phải chọn một lối và giữ nguyên**; trộn hai lối trong cùng một truyện là lỗi trình bày". Tiếng Trung không có lựa chọn này. Đây là bổ sung đúng hướng lớp 4: dạy mô hình tránh một tật **thật sự tồn tại trong tiếng Việt**.

### 4.6 Về `不是…而是…` cụ thể

Anh hỏi liệu dịch thành "không phải… mà là…" thì nó có còn là sáo ngữ tiếng Việt không. Có, và nó **đang được đếm thật**:

```go
{"Câu chỉnh nghĩa (không phải… mà là…)",
  regexp.MustCompile(`(?i)(?:không|chẳng) phải[^.!?…\n]{1,40}?,?\s*mà (?:là|vì|do|bởi)`)},
```

Regex bắt cả `chẳng phải`, cả bốn biến thể `mà là/vì/do/bởi` — rộng hơn bản zh (chỉ `不是…(而)是`). Mục tương ứng có trong `anti-ai-tone.md:19` với nhãn `[style_stats: Câu chỉnh nghĩa]`, nên Editor dẫn được con số và Writer biết phải hạ con số nào.

---

## Ghi chú: hai chỗ lệch không phải lỗi việt hóa

Nêu ra để khỏi bị báo động lần nữa — cả hai **có sẵn ở bản gốc**:

1. **`editor.md:40` nói sai về cách suy verdict.** Câu "kết luận pass/warning/fail do hệ thống tự suy ra từ score" không còn đúng: `internal/domain/review.go:50` ghi `Verdict` "兼容旧审阅；**运行时不再用阈值覆盖模型判断**", và grep toàn repo không còn chỗ nào suy pass/warning/fail từ score. Bản gốc `editor.md:115` cũng nói y như vậy (`≥80 pass / 60-79 warning / <60 fail`) — nên đây là **code trôi khỏi prompt**, không phải dịch sai. Bản vi bỏ mấy con số ngưỡng là *đúng*; chỉ còn nửa câu bị cũ.

2. **Tên tiêu đề premise có phần trong ngoặc.** Prompt liệt "Định vị thể loại (người đọc mục tiêu, điểm tiêu thụ cốt lõi)" nhưng parser chỉ khớp "Định vị thể loại". Bản gốc y hệt ("题材定位（目标读者、核心消费点）" ↔ alias `题材定位`). Kiểm bằng máy: **24/24 tên tiêu đề của cả hai tệp architect đều giải được về canonical, và 24/24 canonical mà code đòi đều được prompt yêu cầu** — không có mục nào rụng lặng lẽ. `internal/tools/premise_structure.go` giữ cả alias tiếng Trung cho sách cũ.

---

## Nếu sửa, sửa theo thứ tự này

1. `assets/prompts/editor.md:159` — trả lại ba ví dụ `taboos` (mục 3.1). Đây là chỗ duy nhất không có lớp bù nào.
2. `assets/prompts/architect-long.md:88` + `architect-short.md:98` — bỏ vế "dựa vào vị trí ... để sửa nội dung", thay bằng "sinh lại toàn bộ đoạn" cho khớp thông điệp lỗi (mục 2.1).
3. `assets/prompts/editor.md` mục "Tóm tắt cung" — trả lại lý do của ví dụ xấu ("quá rỗng, không thi hành được") (mục 3.2).
4. `assets/prompts/editor.md:40` — bỏ nửa câu đã cũ về việc suy verdict từ score (ghi chú 1). Không phải lỗi việt hóa.

Cả bốn đều là sửa một-vài-câu. Không có việc nào ở mức phải dịch lại.
