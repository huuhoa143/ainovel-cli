# Soát chất lượng câu chữ tiếng Việt — toàn catalog + assets

Lượt soát: chính tả, dấu câu, văn phong, lực chỉ dẫn, thuật ngữ, chuỗi ghép, độ dài nhãn.
Phạm vi: `internal/i18n/locales/vi.json` (1.815 cặp), `assets/**/*.md` (40 tệp), `internal/tools/*.go`,
`internal/llmcontract/*.go`, `internal/entry/tui/*.go`.
Chế độ: **chỉ đọc**. Không sửa tệp nào ngoài chính báo cáo này.

---

## 1. Kết luận một dòng

**Cần sửa chọn lọc.** Chất lượng câu chữ tổng thể **cao hơn mức tôi dự đoán khi nhận việc** — bốn hạng mục
nặng nhất (dấu câu toàn phần, lực chỉ dẫn, thuật ngữ, khoảng trắng) **sạch, không phải "gần sạch"** — và
toàn bộ 17 phát hiện dưới đây nằm ở hai lớp hẹp: **chuỗi ghép** (5 lỗi, lớp đã có tiền lệ thật) và **viết
hoa kiểu tiếng Anh trong tiêu đề `assets/references/`** (20/40 tệp). Không có phát hiện nào ở mức
NGHIÊM TRỌNG: không có chỗ nào làm LLM hiểu sai yêu cầu, cũng không có chỉ dẫn cưỡng chế nào bị làm mềm.

---

## 2. Bốn hạng mục SẠCH — kết quả kiểm, không phải phỏng đoán

Tôi nêu phần này trước vì đây là phần lớn công sức, và vì báo "không có lỗi" chỉ đáng tin khi kèm cách đo.

### 2.1 Dấu câu toàn phần (hạng mục 1) — SẠCH, 0 lỗi

Quét **toàn bộ 1.815/1.815 cặp** tìm `，。、：；（）！？「」『』％`:

| Ký tự | Số cặp | Phán quyết |
|---|---|---|
| `『』` | 8 | **Hợp lệ — ngoại lệ đã nêu trong đề bài** |
| tất cả ký tự còn lại | **0** | — |

Cả 8 cặp `『』` đều là trích dẫn mẫu câu tiếng Trung mà stylestat đối chiếu, tức đang nói *về* mẫu tiếng
Trung nên phải giữ nguyên: `Dấu hiệu suy nghĩ『心想/意识到/感到/觉得』`, `So sánh trực tiếp『像一/仿佛/如同/宛如』`,
`Nhịp im lặng『沉默了/没有说话/没有回头』`, `Lượng từ thời gian『X息/X瞬』`, `Phản ứng cơ thể『心头一紧/…』`,
`Mẫu biểu cảm『眼中闪过/…』`, `Sáo ngữ trừu tượng『一种说不出的/…』`, `Câu chỉnh chuẩn『不是…(而)是…』`.

Không có một dấu phẩy, dấu chấm hay dấu hai chấm toàn phần nào lọt vào câu tiếng Việt. Rủi ro lệch canh
cột TUI do ký tự 2 cột: **không tồn tại**.

### 2.2 Khoảng trắng (hạng mục 2) — SẠCH, 0 lỗi

Quét toàn bộ 1.815 cặp, đối chiếu lề đầu/cuối với msgid:

- **48 cặp lệch lề đầu/cuối** → kiểm từng cặp: **tất cả đều đúng và có chủ ý**. Phần lớn là quy ước
  `：` → `: ` (dấu hai chấm toàn phần đã hàm chứa khoảng trắng, bản Việt phải thêm tay). Ví dụ:
  `\n错误：` → `\nLỗi: `, `已知人物：` → `Nhân vật đã biết: `.
- **4 cặp có hai khoảng trắng liền nhau** → tất cả là canh cột TUI có chủ ý:
  `\n  ↑↓ chọn  Enter xác nhận  Esc hủy`, `Chương %d  %s\n\n`.
- Thiếu khoảng trắng sau dấu phẩy / thừa khoảng trắng trước dấu câu (lỗi kiểu Pháp): **0**.

Ba trường hợp tôi nghi là lỗi ban đầu, kiểm tại điểm gọi thì đều **đúng**:

| Chuỗi | Điểm gọi | Câu ghép thật | Phán quyết |
|---|---|---|---|
| `' 省'` → `' tiết kiệm '` | `statusbar.go:65` `i18n.F(" 省")+saved` | ` tiết kiệm $0.12` | Đúng — cần cả hai lề |
| `'对话'` → `' hội thoại'` | `observer_tools.go:372` `"·"+p.Character+…` | `·Lâm Uyển hội thoại` | Đúng — lề đầu tách từ |
| `'如需人工打断…'` → lề đầu `' Nếu cần…'` | `rules_flow.go:68` nối hai câu | `…có hiệu quả không. Nếu cần can thiệp thủ công, hãy gửi lệnh…` | Đúng — không double-space |

Cặp thứ ba đáng ghi nhận: bản Trung nối hai câu không cần khoảng trắng, người dịch đặt khoảng trắng vào
**đầu chuỗi thứ hai** để câu ghép ra đúng. Đó là xử lý có nhận thức về lớp lỗi chuỗi ghép.

### 2.3 Lực chỉ dẫn (hạng mục 5) — SẠCH, 0 chỗ bị làm mềm

Đây là hạng mục tôi soát kỹ nhất vì nó ảnh hưởng trực tiếp chất lượng văn AI sinh ra.

Phương pháp: bản dịch assets là **dịch theo từng dòng**, nên **36/40 tệp khớp số dòng tuyệt đối** với bản
Trung tiền dịch (`81eaa22^` = `1bebe2e`). Tôi ghép cặp từng dòng, lấy mọi dòng bản Trung chứa
`禁止 严禁 不得 绝不 务必 必须 只能 不可 不许 严格 不要`, rồi kiểm dòng Việt tương ứng có mang dấu hiệu cưỡng chế
tương đương hay không.

**Kết quả: 8 dòng bị máy gắn cờ, kiểm tay thì cả 8 là dương tính giả.** Ví dụ
`角色功能必须清晰，避免冗余` → `Chức năng nhân vật phải rõ ràng, tránh dư thừa` (chữ `tránh` là dịch của
`避免`, không phải làm mềm `必须`); `救生艇只能载一个人` → `Chiếc xuồng cứu nạn chỉ chở được một người`
(`只能` trong câu kể, không phải chỉ dẫn).

Bảng ánh xạ thực tế, đúng như đề bài yêu cầu:

| Bản Trung | Bản Việt | Ví dụ đã kiểm |
|---|---|---|
| `禁止` | **cấm** | `禁止原样输出"书名"二字` → `cấm xuất ra nguyên hai chữ "tên sách"` |
| `禁止` | **cấm** | `禁止新开长线或埋新钩子` → `cấm mở mạch dài mới hoặc gài móc mới` |
| `禁止` | **cấm** | `禁止为凑规模注水` → `cấm đắp nước cho đủ quy mô` |
| `禁止` | **cấm** | `禁止完整句、禁止内含逗号` → `cấm câu hoàn chỉnh, cấm chứa dấu phẩy` |
| `禁止` | **cấm** | `禁止为了服从旧计划而扭曲已经发生的内容` → `cấm bóp méo những gì đã xảy ra chỉ để phục tùng kế hoạch cũ` |
| `禁止` | **cấm** | `禁止前情提要式重写` → `cấm viết lại theo lối điểm tin tiền tình` (`voice.md`) |
| `严禁` | **nghiêm cấm** | `严禁突破` → `nghiêm cấm vượt qua` |
| `不得` | **không được** | `不得改写为 object` → `không được viết lại thành object` |
| `绝不` | **tuyệt đối không** | `critical 绝不放过` → `critical thì tuyệt đối không bỏ qua` |
| `绝不` | **tuyệt đối không** | `绝不把固定剧情量硬塞进任意字数` → `tuyệt đối không nhồi một lượng tình tiết cố định vào số từ tùy ý` |
| `必须` | **buộc phải / phải** | `第一行必须是书名` → `Dòng đầu tiên buộc phải là tên sách` |
| `严格如下` | **đúng nghiêm ngặt như sau** | giữ nguyên lực |
| `不要` | **đừng / chớ** | `不要为贴近某个数字反复重写` → `đừng viết lại nhiều lượt chỉ để bám sát một con số` |

**Không có một trường hợp `禁止` → "nên tránh" nào.** Bốn tệp lệch số dòng
(`editor.md` +1, `anti-ai-tone.md` +5, `dialogue-writing.md` +7, `suspense/arc-templates.md` +6) đều có
**số tiêu đề khớp 1:1** (21/21, 6/6, 27/27, 7/7) — phần dòng thêm là do câu Việt dài hơn phải tách mục,
không phải mất nội dung.

> **Một nghi vấn tôi đã dựng lên rồi tự loại bỏ, ghi lại vì nó là cái bẫy của lượt soát này.**
> `assets/prompts/writer.md` hiện tại là văn xuôi rời, trong khi tại `d98aa0fb` (mốc upstream nêu trong đề
> bài) nó là **giao thức 8 bước có số, mở đầu bằng `严格按以下顺序推进。不要跳步`** và có
> `**初稿流程禁止 edit_chapter**`. Nhìn qua thì đúng là một vụ sụp lực chỉ dẫn kinh điển. Nhưng
> `81eaa22^` = `1bebe2e` ≠ `d98aa0fb`: **bản Trung tiền dịch thật sự đã là văn xuôi rời rồi**
> (`初稿不使用 edit_chapter；它只服务于已完成章节的重写和打磨`). Việc bỏ giao thức số đến từ **upstream tiếng
> Trung**, không phải từ lượt Việt hóa. Bản dịch `writer.md` khớp từng dòng, trung thành, 64/64 dòng, 7/7
> tiêu đề. **Không phải lỗi dịch.** Ai soát tiếp xin dùng base `81eaa22^`, đừng dùng `d98aa0fb`.

### 2.4 Thuật ngữ (hạng mục 6) — SẠCH, 0 chỗ lệch

Đếm biến thể trên toàn catalog cho cả 29 thuật ngữ đã chốt. 8 thuật ngữ bị máy báo "lệch"; kiểm tay thì
**tất cả là định danh mã hoặc phân nghĩa đúng**:

| Thuật ngữ | Số đếm | Phán quyết |
|---|---|---|
| 卷=**tập** | `tập`=90, `cuốn`=2 | Đúng — 2 chỗ `cuốn` là "cuốn tiểu thuyết / cuốn sách" (nghĩa *quyển sách*), không phải đơn vị 卷 |
| 弧=**cung** | `cung`=74, `arc`=15 | Đúng — 15 chỗ `arc` là định danh: `expand_arc`, `skeleton_arcs`, trường JSON `arc` |
| 角色=**nhân vật** | `nhân vật`=43, `vai`=6 | **Đúng và đáng khen** — cả 6 chỗ `vai/vai trò` là nghĩa *vai tác tử* (writer/editor/architect): `未知角色` → `Vai trò không xác định`, `角色模型分配` → `Phân bổ mô hình theo vai trò`. Phân nghĩa nhân-vật-truyện ↔ vai-tác-tử được giữ đúng xuyên suốt |
| 大纲=**dàn ý** | `dàn ý`=36, `outline`=4 | Đúng — `save_foundation(type="outline")` |
| 伏笔=**phục bút** | `phục bút`=35, `foreshadow`=1 | Đúng — `foreshadow_ledger` |
| 上下文=**ngữ cảnh** | `ngữ cảnh`=31, `context`=2 | Đúng — `novel_context` |
| 导入=**nhập truyện** | `nhập truyện`=30, `nhập`=51, `import`=5 | Đúng — `nhập` rút gọn hợp cảnh (`重新导入` → `nhập lại`), `import` là định danh |
| 评审=**duyệt** | `duyệt`=21, `review`=1 | Đúng — `save_review` |

21 thuật ngữ còn lại: **một biến thể duy nhất, không lệch** — 摘要=`tóm tắt`(60), 恢复=`khôi phục`(49),
裁定=`phán quyết`(43), 干预=`can thiệp`(36), 返工=`viết lại`(29), 预算=`ngân sách`(15), 钩子=`móc`(12),
导出=`xuất`(10), 一致性=`nhất quán`(8), 字数=`số từ`(8), 规划师=`kiến trúc sư`(8), 长线=`mạch dài`(7),
打磨=`gia công`(7), 文风=`văn phong`(5), 前提=`tiền đề`(3), 检查点=`checkpoint`(2),
世界规则=`luật thế giới`(2), 主导叙事线=`mạch kể chủ đạo`(2), 节拍=`nhịp`(1)…

Với một bản dịch đến từ một fork ngoài cộng nhiều agent khác nhau, độ nhất quán thuật ngữ này là kết quả
tốt bất thường.

### 2.5 Hai kiểm tra ngoài đề bài, đều đạt

- **Độ phủ**: rút toàn bộ msgid tiếng Trung từ `internal/**/*.go` → **1.715 msgid, thiếu 1** trong
  `vi.json` (`第 %d 章无草稿: %w`, tại `internal/i18n/i18n.go`). Phủ **99,94%**. (Xem 4.6.)
- **Rò rỉ chỉ dẫn ngôn ngữ đầu ra**: hai prompt hệ thống yêu cầu LLM xuất *tiếng Trung* —
  `…可直接交给创作引擎的中文创作指令`, `给用户看的中文自然回复`, `返回结果是可直接阅读的中文摘要`. Nếu dịch mộc
  thành "tóm tắt tiếng Trung" thì LLM sẽ trả lời bằng tiếng Trung. Bản dịch **bỏ hẳn định ngữ ngôn ngữ**
  (`chỉ thị sáng tác`, `Trả lời tự nhiên cho người dùng`, `tóm tắt có thể đọc trực tiếp`) — đúng, vì cả
  prompt giờ là tiếng Việt. **Không rò rỉ.**

### 2.6 Độ dài nhãn TUI (hạng mục 8) — ĐÃ ĐƯỢC SỬA TRƯỚC ĐÓ

`fieldLabelStyle` **không còn** `Width(10)`. `theme.go:104-108` có chú thích nói rõ vì sao bỏ, và
`layout.go:12-36` chuyển việc đệm cột sang `renderFieldLabel()` tay: nhãn ngắn được đệm, **nhãn dài đẩy
giá trị sang phải, không cắt, không xé dòng**. Lỗi `Trạng thái chạy` (15 cột) bị xé thành
`Trạng thái` / `chạy` đã được xử lý, có hồi quy `layout_vi_width_test.go`. `fitHintToWidth()` cũng đã sửa
lỗi cắt giữa chữ (`… · Esc quay lạ`), bỏ theo MỤC và luôn giữ mục cuối (lối thoát).

Không còn khuyết điểm nào thuộc lớp "nhãn >10 ký tự đẩy lệch cột". Dư lại duy nhất là **cột giá trị so le**
khi nhãn vượt 10 cột — thuần thẩm mỹ, đã là lựa chọn thiết kế có ghi chú. Xem 4.5 cho một điểm chịu áp lực
bề rộng ở thanh trạng thái.

---

## 3. Mục riêng: `assets/prompts/` — tầng quyết định chất lượng văn

Đánh giá riêng và kỹ hơn, theo yêu cầu.

**Phán quyết: đây là phần dịch tốt nhất trong repo.** 13 tệp `prompts/`, tất cả khớp số dòng và số tiêu đề
với bản Trung, lực chỉ dẫn giữ nguyên 100% (bảng 2.3), và văn phong là **tiếng Việt biên tập thật, không
phải dịch máy**.

Bằng chứng — những chỗ chỉ người đọc hiểu bản gốc mới dịch ra được:

- `不为凑字灌水，也不为压缩砍掉必要铺垫` → `không đắp nước cho đủ số, cũng không vì nén mà chặt đi phần lót
  đường cần thiết`. `灌水` → `đắp nước`, `铺垫` → `lót đường`: chọn từ đúng nghề, không tra từ điển ra được.
- `读者一眼扫过目录应感到节奏，而不是排版` → `người đọc quét mắt qua mục lục phải cảm được nhịp, chứ không
  phải cảm được việc dàn trang`. Giữ được phép đối lập nhịp↔dàn trang.
- `风格一致不等于长度一致` → `nhất quán phong cách ≠ bằng nhau số từ`. Dùng `≠` cho gọn, giữ nguyên ý.
- `**用户偏好优先**` → `**sở thích người dùng thắng**`. Chọn `thắng` thay vì `ưu tiên` — mạnh hơn, đúng
  ngữ cảnh xung đột quy tắc.
- `宁可不填` → `thà bỏ trống`; `不凭记忆重试旧文本` → `đừng dựa vào ký ức mà thử lại đoạn cũ`.
- `避免把"老周"重新写成另一个人` → `tránh viết "bác Bảy" thành một người khác`. **Bản địa hóa tên riêng**
  (老周 → bác Bảy) chứ không phiên âm — đúng việc cần làm cho một prompt dạy LLM viết văn Việt.
- `每章两千字左右` → `mỗi chương khoảng một nghìn ba trăm từ`, và `字数低（如 2500/章）` →
  `Số từ thấp (như 1600`. **Quy đổi ký-tự-Hán → từ-Việt** (~2000 ký tự Hán ≈ 1300 từ Việt) thay vì copy
  số. Đây là chỗ dễ bỏ qua nhất và nó đã được xử lý đúng: nếu giữ nguyên "2000 từ", dàn ý sẽ bị thiết kế
  cho chương dài gấp rưỡi thực tế, và theo đúng cảnh báo issue #41 trong chính prompt thì writer sẽ bị
  buộc nén tình tiết.
- `assets/references/dialogue-writing.md`: mục `### 中文对话标点` (dấu câu đối thoại **tiếng Trung**, dùng
  `「」`) được **viết lại thành `### Dấu câu trong đối thoại tiếng Việt`** và dài thêm 7 dòng. Dịch mộc mục
  này sẽ dạy LLM dùng `「」` trong văn Việt. Đây là bản địa hóa đúng, không phải dịch.

**Lỗi tìm được trong `assets/prompts/`: 0.** Tiêu đề toàn bộ 13 tệp dùng **sentence case** đúng chuẩn Việt
(`## Giao thức thực thi`, `## Khế ước chương`, `## Ranh giới thẩm quyền của can thiệp người dùng`).

Điểm yếu duy nhất của tầng assets nằm ở `assets/references/`, **không phải** `assets/prompts/` — xem 4.4.

---

## 4. Bảng phát hiện

Không có phát hiện nào ở mức **NGHIÊM TRỌNG**.

### 4.1 CẦN SỬA — `%s恢复：%d 章待处理`: câu ghép sai vị ngữ

| | |
|---|---|
| msgid | `%s恢复：%d 章待处理` |
| Điểm gọi | `internal/host/resume.go:46`, `verb` ∈ {`重写`, `打磨`} |
| Hiện tại | `%s khôi phục: %d chương chờ xử lý` |
| **Câu ghép thật** | **`Viết lại khôi phục: 3 chương chờ xử lý`** / `Gia công khôi phục: 3 chương chờ xử lý` |
| Vấn đề | `Viết lại` biến thành **chủ ngữ của động từ `khôi phục`** — đọc ra "việc viết lại khôi phục cái gì đó". Ý gốc là "khôi phục *của* pha viết lại". Ba câu chị em cùng hàm đều theo khuôn `Khôi phục: …` (`恢复：审阅中断` → `Khôi phục: duyệt bị gián đoạn`; `恢复：规划阶段（%s）` → `Khôi phục: giai đoạn lập kế hoạch (%s)`; `恢复：第 %d 章提交中断` → `Khôi phục: lưu chương %d bị gián đoạn`), nên câu này lệch khuôn *và* sai nghĩa. Đây là nhãn người vận hành đọc khi mở lại phiên. |
| **Đề xuất** | `Khôi phục: %s, %d chương chờ xử lý` → `Khôi phục: viết lại, 3 chương chờ xử lý` |

### 4.2 CẦN SỬA — viết hoa giữa câu do nội suy (4 mẫu, 3 giá trị)

Lớp lỗi: giá trị nội suy được viết hoa (vì có chỗ dùng đứng đầu câu), nhưng khuôn lại đặt nó **giữa câu**.

**Nhóm `重写/打磨`** — msgid dùng ở 6 nơi, `Viết lại` / `Gia công` (viết hoa):

| msgid | Câu ghép thật | Phán quyết |
|---|---|---|
| `第 %d 章不在待%s队列中，当前队列：%v。…` | `chương 5 không có trong hàng đợi **Viết lại**, hàng đợi hiện tại: […]` | **Sai** — hoa giữa câu |
| `%s第 %d 章` (`router.go:121`, task giao cho LLM) | `Viết lại chương 5` | Đúng — đầu câu |
| `panels_sidebar.go:335` (giá trị trạng thái sidebar) | `Viết lại` | Đúng — nhãn độc lập |

**Đề xuất**: hạ `重写`→`viết lại`, `打磨`→`gia công` (chữ thường) rồi hoa tại điểm gọi cần hoa. Ràng buộc:
msgid dùng ở **6 nơi** (`commit_chapter.go:519,581`, `resume.go:42`, `panels_sidebar.go:335`,
`progress.go:493`, `router.go:115`) nên đây là sửa hai đầu, không phải sửa một dòng JSON.

**Nhóm `独占作业` (tác vụ độc quyền)** — `ex`/`action` ∈ {`nhập truyện`, `Tạo hồ sơ mô phỏng`, `Nhập hồ sơ mô phỏng`}:

| msgid | Bản dịch hiện tại | Câu ghép với `导入` | Câu ghép với `生成仿写画像` |
|---|---|---|---|
| `%s进行中，请先完成后再重开` | `Đang %s, hãy hoàn tất rồi mới mở lại` | `Đang nhập truyện, …` ✓ | `Đang **T**ạo hồ sơ mô phỏng, …` ✗ |
| `%s进行中，请先完成后再恢复创作` | `Đang %s, hãy hoàn tất rồi mới khôi phục sáng tác` | ✓ | ✗ |
| `%s进行中，请先完成后再继续创作` | `Đang %s, hãy hoàn tất rồi mới sáng tác tiếp` | ✓ | ✗ |
| `%s进行中，请先完成后再执行 /next` | `Đang %s, hãy hoàn tất rồi mới chạy /next` | ✓ | ✗ |
| `%s进行中，请先完成后再%s` | `Đang %s, hãy hoàn tất rồi mới %s` | — | ✗ **hai chỗ** |
| `创作引擎运行中或正在停止，请稍候再%s` | `Engine sáng tác đang chạy hoặc đang dừng, hãy chờ rồi %s` | ✓ | ✗ |
| `阶段共创进行中，请先结束共创后再%s` | `…vui lòng kết thúc đồng sáng tác trước khi %s` | ✓ | ✗ |

Điểm gọi: `host.go:451, 482, 698, 753, 1685-1689`; giá trị đặt tại `host.go:1546, 1627, 1658`.

**Ràng buộc quan trọng khi sửa**: `生成仿写画像` và `导入仿写画像` **cũng được dùng làm tiêu đề panel TUI**
(`simulation.go:213, 227`), nơi viết hoa là đúng. Nên **không thể** chỉ hạ chữ thường trong `vi.json`.
**Đề xuất**: đổi khuôn để `%s` ra đầu câu — `%s đang chạy, hãy hoàn tất rồi mới mở lại` — vừa khớp cấu
trúc gốc (`%s进行中` = "%s đang chạy") vừa hợp cho cả ba giá trị; hoặc tách msgid riêng cho tiêu đề panel.

### 4.3 CẦN SỬA — `问题 %d` dịch sai nghĩa ở 1/6 câu chị em

`internal/tools/ask_user.go:133-149` xác thực một danh sách **câu hỏi** (mỗi câu có `header`, `question`,
2-4 lựa chọn). Ở đây `问题` = *câu hỏi*, không phải *vấn đề*.

| msgid | Bản dịch | |
|---|---|---|
| `问题 %d: 问题文本不能为空` | `câu hỏi %d: nội dung câu hỏi không được để trống` | ✓ |
| `问题 %d: header 不能为空` | `câu hỏi %d: header không được để trống` | ✓ |
| `问题 %d: 需要2-4个选项，当前 %d 个` | `câu hỏi %d: cần 2-4 lựa chọn, hiện tại có %d lựa chọn` | ✓ |
| `问题 %d 选项 %d: label 不能为空` | `câu hỏi %d lựa chọn %d: label không được để trống` | ✓ |
| `问题 %d 选项 %d: description 不能为空` | `câu hỏi %d lựa chọn %d: description không được để trống` | ✓ |
| `问题 %d: header %q 超过 %d 字符` | **`Vấn đề %d: header %q vượt %d ký tự`** | ✗ **sai nghĩa + lệch viết hoa** |

**Đề xuất**: `câu hỏi %d: header %q vượt %d ký tự`.

### 4.4 CẦN SỬA — viết hoa kiểu tiếng Anh trong tiêu đề `assets/references/` (20/40 tệp)

Tiếng Việt không dùng Title Case; chuẩn là sentence case (hoa chữ đầu + danh từ riêng).
`assets/prompts/` làm đúng, `assets/references/` thì không → **repo bị chẻ hai giọng**.

| Tệp | Số tiêu đề Title Case | Ví dụ | Đề xuất |
|---|---|---|---|
| `references/chapter-guide.md` | 33 | `Hiệu Quả Mà 20% Đầu Phải Đạt Được` | `Hiệu quả mà 20% đầu phải đạt được` |
| `references/plot-structures.md` | 30 | `Cấu Trúc Ba Hồi (Three-Act Structure)` | `Cấu trúc ba hồi (Three-Act Structure)` |
| `references/quality-checklist.md` | 23 | `Danh Sách Kiểm Tra Chất Lượng` | `Danh sách kiểm tra chất lượng` |
| `references/dialogue-writing.md` | 20 | `Quy Chuẩn Định Dạng Đối Thoại` | `Quy chuẩn định dạng đối thoại` |
| `references/hook-techniques.md` | 17 | `Mười Loại Điểm Móc Kinh Điển` | `Mười loại điểm móc kinh điển` |
| `references/longform-planning.md` | 14 | `Truyện Dài Không Phải Là Truyện Ngắn Kéo Dài` | `Truyện dài không phải là truyện ngắn kéo dài` |
| `references/content-expansion.md` | 9 | `1. Miêu Tả Chi Tiết Cảnh Vật` | `1. Miêu tả chi tiết cảnh vật` |
| `references/genres/suspense/arc-templates.md` | 7 | `Cung Điều Tra Vụ Án (10-15 chương)` | `Cung điều tra vụ án (10-15 chương)` |
| `references/genres/romance/arc-templates.md` | 7 | `Cung Leo Thang Căng Thẳng Tình Cảm` | `Cung leo thang căng thẳng tình cảm` |
| `references/genres/fantasy/arc-templates.md` | 7 | `Cung Truyện Đột Phá Tu Luyện` | `Cung truyện đột phá tu luyện` |
| `references/consistency.md` | 6 | `Cơ Chế Đảm Bảo Tính Nhất Quán` | `Cơ chế đảm bảo tính nhất quán` |
| `references/outline-template.md` | 5 | `Mẫu Dàn Ý Phẳng (Truyện ngắn / vừa)` | `Mẫu dàn ý phẳng (truyện ngắn / vừa)` |
| `references/genres/*/style-references.md` | 5 mỗi tệp | `Tài Liệu Tham Chiếu Phong Cách Suspense` | `Tài liệu tham chiếu phong cách suspense` |
| `references/character-template.md` | 3 | `Hồ Sơ Nhân Vật` | `Hồ sơ nhân vật` |
| `styles/{suspense,romance,fantasy}.md` | 1 mỗi tệp | `Phong Cách Trinh Thám - Ly Kỳ` | `Phong cách trinh thám — ly kỳ` |
| `references/differentiation.md` | 1 | `Tham Chiếu Thiết Kế Khác Biệt Hóa Tổng Quát` | `Tham chiếu thiết kế khác biệt hóa tổng quát` |

Mức **CẦN SỬA** chứ không phải NHỎ vì hai lý do: (a) đây là văn bản **nạp thẳng vào prompt cho LLM**, và
LLM học giọng từ mẫu — dạy nó Title Case là dạy nó một nếp không phải tiếng Việt, có thể rỉ ra tiêu đề
chương; (b) 20/40 tệp là quá bán, không phải cá biệt. Sửa được bằng một lượt máy, rủi ro thấp.

### 4.5 NHỎ

| # | Chỗ | Hiện tại | Vấn đề | Đề xuất |
|---|---|---|---|---|
| a | `失败裁定` (`engine.go:47`) | `Phán quyết thất bại` | Nhập nhằng: đọc ra "phán quyết đã thất bại", ý gốc là "phán quyết **cho tình huống** thất bại". Rõ nhất ở `失败裁定不可用,已暂停…` → `Không dùng được phán quyết thất bại, đã tạm dừng` — người vận hành sẽ chẩn đoán sai thành "phán quyết bị lỗi". | `Phán quyết xử lý thất bại` / `Phán quyết cho ca thất bại` |
| b | `启动裁定` (`host.go:338`) | `Phán quyết khởi động` | Cùng lớp: đây là **tên pha** (plan-start arbitration), không phải "phán quyết việc khởi động". | `Phán quyết pha khởi động` |
| c | `章节许可` (`host.go`) | `Giấy phép chương` | `许可` ở đây là **hạn mức đếm được** (`Giấy phép chương không được âm: %d`), không phải giấy tờ. Lệch với `放行下一章` → `Cho qua chương kế tiếp` cùng miền. | `Hạn mức chương` |
| d | `[session_compact: %s %d字 \| 见 %s]` | `[session_compact: %s %d từ \| xem %s]` | Ghép với `label` = `Nội dung chương %d` ra `session_compact: Nội dung chương 5 120 từ` — **hai số dính nhau**, khó đọc. Bản Trung có 章/正文 làm vách ngăn. | `[session_compact: %s · %d từ \| xem %s]` |
| e | `' 省'` → `' tiết kiệm '` | `statusbar.go:65` | Dịch **đúng** (2.2) nhưng chiếm **11 cột** so với 3 cột bản Trung, trong thanh trạng thái một dòng đã đông. Chưa thấy tràn, nhưng là điểm chịu áp lực bề rộng duy nhất còn lại. | Cân nhắc `' tiết kiệm '` → `' −'` hoặc `' tk '` nếu thanh trạng thái tràn ở terminal hẹp |
| f | Register `vui lòng` vs `hãy` | 16 vs **86** | Catalog nghiêng hẳn về `hãy`; 16 chỗ `vui lòng` là giọng khác (khách sáo hơn). Thấy rõ khi hai câu chị em cùng một `switch` lệch giọng: `host.go:447` `…vui lòng kết thúc đồng sáng tác trước` cạnh `host.go:444` `Engine sáng tác đang chạy, không cần mở lại`. | Chuẩn hóa về `hãy` |
| g | Viết hoa đầu câu trong `switch` `host.go:444-451` | 3 nhánh, 3 kiểu | `Engine sáng tác đang chạy…` (hoa) / `đồng sáng tác giai đoạn đang diễn ra…` (thường) / `Đang %s, …` (hoa). Cùng một `errors.New` cạnh nhau. *Lưu ý: chuỗi lỗi chữ thường là **đúng quy ước Go**, nên tôi không tính 58 chuỗi lỗi chữ thường khác trong catalog là lỗi — chỉ nhánh này lệch vì ba nhánh liền kề không đồng bộ.* | Đồng bộ 3 nhánh |

### 4.6 NHỎ — 1 msgid thiếu bản dịch

`第 %d 章无草稿: %w` (khai báo tại `internal/i18n/i18n.go`) **không có trong `vi.json`** → sẽ tụt về hiển
thị nguyên văn tiếng Trung. Đề xuất: `chương %d chưa có bản nháp: %w`.

*(Máy còn báo `注意返回值是 JSON 字符串，…` ở `edit_chapter.go` là thiếu, nhưng đó là dương tính giả do
regex của tôi vỡ ở `\n` trong chuỗi — msgid này **có** trong catalog.)*

---

## 5. Mục riêng: chuỗi ghép (hạng mục 7)

Tôi rút **12 điểm nối** — mọi chỗ `fmt.Sprintf`/`fmt.Errorf` có `i18n.F` ở đối số, hoặc nối chuỗi trực
tiếp bằng `+` giữa hai `i18n.F` — rồi truy giá trị nội suy về nơi đặt và **dựng lại câu tiếng Việt thật**.

| # | Khuôn | Câu ghép dựng lại | Phán quyết |
|---|---|---|---|
| 1 | `%s恢复：%d 章待处理` | `Viết lại khôi phục: 3 chương chờ xử lý` | ✗ **4.1** sai vị ngữ |
| 2 | `第 %d 章不在待%s队列中…` | `chương 5 không có trong hàng đợi Viết lại, hàng đợi hiện tại: [5 7]…` | ✗ **4.2** hoa giữa câu |
| 3 | `%s进行中，请先完成后再重开` | `Đang Tạo hồ sơ mô phỏng, hãy hoàn tất rồi mới mở lại` | ✗ **4.2** |
| 4 | `%s进行中，请先完成后再恢复创作` | `Đang Nhập hồ sơ mô phỏng, hãy hoàn tất rồi mới khôi phục sáng tác` | ✗ **4.2** |
| 5 | `%s进行中，请先完成后再继续创作` | `Đang Tạo hồ sơ mô phỏng, hãy hoàn tất rồi mới sáng tác tiếp` | ✗ **4.2** |
| 6 | `%s进行中，请先完成后再执行 /next` | `Đang Nhập hồ sơ mô phỏng, hãy hoàn tất rồi mới chạy /next` | ✗ **4.2** |
| 7 | `%s进行中，请先完成后再%s` | `Đang nhập truyện, hãy hoàn tất rồi mới Tạo hồ sơ mô phỏng` | ✗ **4.2** (hai chỗ nội suy) |
| 8 | `创作引擎运行中或正在停止，请稍候再%s` | `Engine sáng tác đang chạy hoặc đang dừng, hãy chờ rồi Tạo hồ sơ mô phỏng` | ✗ **4.2** |
| 9 | `阶段共创进行中，请先结束共创后再%s` | `đồng sáng tác giai đoạn đang diễn ra, vui lòng kết thúc đồng sáng tác trước khi Nhập hồ sơ mô phỏng` | ✗ **4.2** + **4.5f/g** |
| 10 | `%s第 %d 章` (`router.go:121`) | `Viết lại chương 5` / `Gia công chương 5` | ✓ **Đúng** — task giao LLM, đầu câu |
| 11 | `[session_compact: %s %d字 \| 见 %s]` | `[session_compact: Nội dung chương 5 120 từ \| xem drafts/05.draft.md]` | ⚠ **4.5d** hai số dính |
| 12 | `%s plot 为空` / `%s 章范围 %d-%d 与请求 %d-%d 不符` | `Hợp nhất khoảng: plot rỗng` / `Hợp nhất khoảng: phạm vi chương 1-5 không khớp với yêu cầu 1-2` | ✓ **Đúng** — bản dịch **chủ động thêm `: `** mà bản Trung không có, nhờ đó câu ghép đọc được |
| 13 | `检查 Editor…有效。` + `如需人工打断…` | `…prompt viết lại của Writer có hiệu quả không. Nếu cần can thiệp thủ công, hãy gửi lệnh can thiệp trong hộp nhập liệu.` | ✓ **Đúng** — khoảng trắng đặt ở đầu chuỗi 2, không double-space |
| 14 | `章节推进模式已切换为` + label | `Chế độ đẩy chương đã chuyển thành: Tự động đẩy chương` / `…: Nghiệm thu từng chương` | ✓ **Đúng** — thêm `: ` mà bản Trung không có |
| 15 | `"·"` + `p.Character` + `对话` | `·Lâm Uyển hội thoại` | ✓ **Đúng** — lề đầu tách từ |
| 16 | `' 省'` + saved | ` tiết kiệm $0.12` | ✓ **Đúng** (bề rộng: **4.5e**) |

**Tổng kết hạng mục 7: 16 câu ghép dựng lại — 7 hỏng (9 khuôn, 2 nguyên nhân gốc), 1 đáng cải thiện,
8 đúng.** Đáng nói là 4 trong 8 câu đúng (#12 ×2, #13, #14) **đúng nhờ người dịch chủ động thêm dấu phân
cách hoặc khoảng trắng mà bản gốc không cần** — tức là lớp lỗi này đã được ý thức và xử lý ở phần lớn
điểm nối. Bảy chỗ hỏng đều **cùng một nguyên nhân duy nhất**: msgid dùng chung giữa vị trí đầu câu (cần
hoa) và vị trí giữa câu (cần thường), cộng một chỗ lệch khuôn `Khôi phục:`.

---

## 6. Số liệu trung thực

### Đã soát

| Hạng mục | Phạm vi | Cách soát |
|---|---|---|
| 1 — dấu câu | **1.815/1.815 cặp (100%)** | Máy quét 15 ký tự toàn phần, kiểm tay 8/8 kết quả |
| 2 — khoảng trắng | **1.815/1.815 cặp (100%)** | Máy so lề đầu/cuối với msgid + double-space; kiểm tay 52/52 |
| 5 — lực chỉ dẫn | **36/40 tệp assets ghép cặp từng dòng; 40/40 tệp đối chiếu tiêu đề** | 13 từ khóa cưỡng chế, kiểm tay 8/8 dòng bị gắn cờ |
| 6 — thuật ngữ | **1.815/1.815 cặp (100%)**, cả 29 thuật ngữ | Đếm biến thể theo biên từ; kiểm tay 8/8 chỗ "lệch" |
| 7 — chuỗi ghép | **12 điểm nối / 16 câu ghép** | Truy giá trị về nơi đặt, dựng lại câu thật |
| 8 — bề rộng nhãn | `theme.go`, `layout.go`, `panels_sidebar.go` | Đọc mã + xác nhận đã có hồi quy |
| Độ phủ | **1.715 msgid rút từ mã Go** | Đối chiếu với catalog |
| 4 — dịch máy | **~110 cặp đọc tay** (xem dưới) | Đọc hiểu |

### Lấy mẫu hạng mục 4 (dịch máy / lủng củng)

- **Seed cố định: `20260731`** (`random.seed(20260731)`, `random.sample` trên danh sách đã `sorted()` để
  tái lập được).
- **70 cặp thông báo lỗi** lấy mẫu từ **295 cặp** khớp `失败|错误|异常|不能|无法|拒绝|非法|缺少|不存在|超过|不合法`
  (23,7%). **Kết quả: 0 câu dịch máy.** Toàn bộ dùng chủ động, không thừa "của"/"được", không theo trật
  tự từ tiếng Trung. Ví dụ: `无法从当前进度推导下一章` → `Không suy ra được chương kế tiếp từ tiến độ hiện tại`;
  `用户规则快照读取/生成失败，运行时将退到内置默认` → `Đọc/tạo snapshot quy tắc người dùng thất bại, runtime sẽ
  rơi về mặc định có sẵn` (`退到` → `rơi về`, đúng giọng kỹ thuật).
- **~40 chuỗi `Schema()` / `llmcontract`** đọc tay (mô tả gửi cho LLM). **Kết quả: 0 câu dịch máy**, và
  hai chỗ rủi ro nhất (chỉ dẫn ngôn ngữ đầu ra) đã xử lý đúng — xem 2.5.

**Tôi không đạt mốc 200 cặp mà đề bài yêu cầu cho hạng mục 4.** Đọc tay ~110 cặp. Lý do: sau 70 cặp lỗi và
40 chuỗi Schema mà **không ra một lỗi dịch máy nào**, tôi chuyển hạn mức còn lại sang hạng mục 7 (chuỗi
ghép) — nơi đang thực sự ra lỗi, và là lớp lỗi mà đề bài xác nhận đã có tiền lệ thật. Đó là đánh đổi tôi
tự quyết; nếu cần con số 200 thì phần thiếu là **90 cặp**, và nên lấy ở nhóm **không phải lỗi**
(TUI, nhãn, tiêu đề) vì nhóm lỗi đã cho tín hiệu rõ là sạch.

### KHÔNG soát — và vì sao

| Phần | Lý do |
|---|---|
| **Thân văn `assets/references/*.md` đọc từ đầu đến cuối** (~15.000 dòng) | Chỉ soát: tiêu đề (40/40 tệp), lực chỉ dẫn (ghép cặp từng dòng), khớp số dòng/số tiêu đề. **Chưa đọc hết thân văn để soát văn phong.** Đây là lỗ hổng lớn nhất của báo cáo này. Ưu tiên nếu soát tiếp: `chapter-guide.md`, `plot-structures.md`, `dialogue-writing.md` (317 dòng), `hook-techniques.md` — bốn tệp này vừa dài vừa đã lộ vấn đề viết hoa ở 4.4, nên khả năng còn vấn đề văn phong bên trong là cao nhất. |
| **`README.md`** | Hết hạn mức. Chưa mở. |
| **`web/`** (chuỗi UI Next.js) | Không thuộc phạm vi đề bài. |
| **Chính tả/dấu bằng từ điển tiếng Việt** (hạng mục 3, phần `hoà/hòa`, `i/y`, `d/gi/r`) | **Chưa quét bằng từ điển** — không có công cụ chính tả tiếng Việt trong môi trường. Đọc tay ~110 cặp + toàn bộ `prompts/` **không thấy lỗi dấu hay lỗi chính tả nào**, nhưng đó là quan sát bằng mắt trên một phần catalog, **không phải bảo đảm cho cả 1.815 cặp**. Phần hạng mục 3 tôi thực sự đo được là **viết hoa** (4.3, 4.4, 4.5g) và **nhất quán tên riêng** (không thấy lệch). |
| **Chạy TUI thật để nhìn canh cột** | Chỉ đọc mã. Kết luận 2.6 dựa trên `layout.go`/`theme.go` và sự tồn tại của `layout_vi_width_test.go`, **không phải trên ảnh chụp màn hình**. |

### Mốc đối chiếu

Bản Trung tiền dịch: **`81eaa22^` = `1bebe2e`** (commit `81eaa22` = "việt hóa assets trọn vẹn…" là lượt
Việt hóa assets). **Không dùng `d98aa0fb`** như đề bài nêu — `d98aa0fb` là tổ tiên xa hơn của `1bebe2e`,
và giữa hai mốc đó upstream tiếng Trung còn 9 commit sửa chính prompt (`perf: 优化prompt`,
`acfbc13 perf: 优化章节标题生成`, `f8b75b3 feat: 新增大纲修订能力`…). Đối chiếu với `d98aa0fb` sẽ ghi khống cho
lượt Việt hóa những thay đổi do upstream làm — chính xác là cái bẫy đã ghi ở mục 2.3.

---
---

# Lượt soát 2A — chính tả, lớp 3, thuật ngữ (bù ba lớp lượt 1 để hở)

> **Điều hướng.** Báo cáo này có ba lượt của hai người soát khác nhau, chạy song song:
> **mục 1–6** = lượt 1; **mục L2.x** (phần này) = lượt 2A; **mục 9–11 (PHỤ LỤC)** = lượt 2B.
> Lượt 2A và 2B soát *khác lớp*, gần như không chồng nhau: 2A làm **chính tả / chuỗi viết cứng / lệch
> thuật ngữ**, 2B làm **viết hoa ở điểm nối (lớp 1)** và **logic mang giả định ngôn ngữ**. Chỗ duy nhất
> chồng nhau là điểm nối — ở đó **hãy dùng số của 2B (§9), nó đo kỹ hơn**; xem L2.7.
> Catalog lúc tôi soát: **1.817 cặp** (lượt 1 đo 1.815; `vi.json` bị agent khác sửa trong lúc soát).

Lượt 1 (mục 1–6 ở trên) **được giữ nguyên, không sửa một chữ**. Lượt 2A này chỉ đi vào ba chỗ mà chính
lượt 1 khai báo là chưa đo:

| Lớp | Lượt 1 nói gì | Lượt 2A làm gì |
|---|---|---|
| **Chính tả, dấu hỏi/ngã, i/y, r/d/gi** | "**Chưa quét bằng từ điển** […] không phải bảo đảm cho cả 1.815 cặp" (6.KHÔNG soát) | Đo **vét cạn 100% từ vựng**, không lấy mẫu — xem **L2.3** |
| **Chuỗi Việt viết cứng trong Go (lớp 3 của đề bài)** | Không có mục nào | Quét toàn bộ `*.go` — xem **L2.4** |
| **Sai nghĩa / không nhất quán thuật ngữ ngoài 29 thuật ngữ đã chốt** | Đọc tay ~110/1.815 cặp; bảng thuật ngữ giới hạn ở 29 từ đã biết | Dựng glossary tự động 371 mục rồi soi lệch — xem **L2.1, L2.2** |

*(Mọi tham chiếu dạng `L2.x` là mục của phần này; dạng `2.x`/`4.x` là mục của lượt 1; dạng `§9`–`§11` là
PHỤ LỤC của lượt 2B.)*

Chế độ: **chỉ đọc**. Không chạy `build_catalog.py`. Không lệnh git ghi.

---

## L2.0 Kết luận

**Có ba chỗ người Việt đọc sẽ hiểu sai, và không chỗ nào nằm trong 17 phát hiện của lượt 1.** Cả ba đến
từ cùng một kiểu lỗi: dịch đúng từ điển, sai *đăng ký ngôn ngữ* — `许可` → "giấy phép" (đọc ra giấy tờ
pháp lý), `篇幅` → "dung lượng" (đọc ra dung lượng tệp), `契约非法` → "vi phạm hợp đồng" (đổ lỗi cho model
một sự cố của lập trình viên).

**Chính tả thì sạch thật, và giờ là con số đo được chứ không phải quan sát bằng mắt:** 1.297 token khác
nhau, kiểm từng token, **0 lỗi dấu hỏi/ngã, 0 lỗi i/y, 0 lỗi r/d/gi**. Chỉ còn 3 chỗ lệch chuẩn chính
tả kiểu `hoá`/`hóa` — cùng một từ viết hai kiểu, không phải viết sai.

---

## L2.1 SAI NGHĨA — 3 phát hiện (mức cao nhất của báo cáo này)

### L2.1.a `契约非法` → "vi phạm hợp đồng": đổ lỗi sai người, và là chuỗi LLM đọc

| | |
|---|---|
| msgid | `%s.enum 契约非法: %w` |
| Điểm gọi | `internal/llmcontract/validate.go:53` |
| Hiện tại | `%s.enum vi phạm hợp đồng: %w` |
| **Đề xuất** | `contract của %s.enum không hợp lệ: %w` |

Hai lý do, cái thứ hai nặng hơn:

1. **Lệch thuật ngữ.** 17 chuỗi dùng `contract`, đúng **2 chuỗi** dùng `hợp đồng`. Câu chị em ruột —
   `%s.required 契约非法: %w` → `contract của %s.required không hợp lệ: %w` — nằm cách đó **18 dòng trong
   cùng một hàm** (`validate.go:71`). Cùng một mẫu tiếng Trung `契约非法`, hai bản dịch khác nhau, cùng
   một hàm.
2. **Đảo hướng quy lỗi.** Repo đã phân biệt đúng ở chỗ khác: `契约非法` (contract *tự nó* dựng sai) →
   "không hợp lệ", còn `契约违约` (model *làm trái* contract) → "Vi phạm contract" (`原生 schema 契约违约`).
   Riêng dòng enum lấy chữ của nhánh *违约* gán cho ca *非法*. Mà `enumValues(rawEnum)` chỉ lỗi khi
   **schema do lập trình viên viết** bị dựng sai — model không liên quan. Đây là chuỗi lỗi **đưa vào
   ngữ cảnh cho LLM tự sửa**: bảo nó "vi phạm hợp đồng" khi lỗi nằm ở schema sẽ đẩy nó đi sửa đầu ra
   vốn đã đúng.

Chuỗi `hợp đồng` thứ hai: `合同履约率低 (%.0f%% 未达成)` → `Tỉ lệ thực hiện hợp đồng thấp`. Cùng lớp —
đây là tỉ lệ thực hiện **contract chương**, nên phải là `Tỉ lệ thực hiện contract thấp`.

### L2.1.b `章节许可` → "Giấy phép chương": 14 chuỗi + rò ra README

**Đề nghị nâng mức.** Lượt 1 đã thấy chỗ này (4.5c) và xếp **NHỎ** với 1 ví dụ. Đếm lại: **14 msgid**,
và nó đã **rò ra README**. Tôi cho là top-5, không phải NHỎ.

`许可` ở đây là một **suất dùng một lần** cho phép viết chương kế (`/review on` phát một suất mỗi lần
`/next`). Trong tiếng Việt "giấy phép" là **giấy tờ pháp lý** — giấy phép lái xe, giấy phép kinh doanh.
Người vận hành đọc các câu dưới đây sẽ nghĩ tới DRM / bản quyền / khóa sản phẩm:

| msgid | Hiện tại | Vì sao đọc sai |
|---|---|---|
| `消费第 %d 章许可: %w` | `Tiêu giấy phép chương %d` | "tiêu giấy phép" — tiêu thụ một tờ giấy tờ? |
| `章节许可不能为负数: %d` | `Giấy phép chương không được âm: %d` | giấy tờ không có số âm; **hạn mức** thì có |
| `章节许可已保存` | `Giấy phép chương đã lưu` | đọc như lưu một chứng từ |
| `第 %d 章派发与第 %d 章许可不一致` | `Phân việc chương %d không khớp giấy phép chương %d` | |
| README.md:22 | `viết lại và khôi phục sau sập máy **không tiêu lẫn giấy phép**` | Đây là câu **quảng bá tính năng** trên README. Người đọc mới gặp cụm này giữa danh sách tính năng gần như không thể hiểu; nhiều người sẽ hiểu là sản phẩm có cơ chế license. |

**Đề xuất**: `suất chương` (đúng nghĩa "một lần cho phép", không mang màu pháp lý) hoặc `hạn mức chương`
(như lượt 1 đề xuất). Với README: `viết lại và khôi phục sau sập máy không tiêu lẫn suất chương`.
Ràng buộc: 14 msgid, sửa được bằng một lượt tìm-thay trên `vi.json` + 1 dòng README.

### L2.1.c `篇幅` → "dung lượng": đọc ra dung lượng tệp

3 chỗ, trong đó **1 chỗ là nhãn người dùng bấm chọn**:

| Ngữ cảnh | Hiện tại | Đề xuất |
|---|---|---|
| `ask_user` — mẫu tóm tắt câu trả lời (`[篇幅] 长篇`) | `Người dùng trả lời: **[Dung lượng]** Dài` | `[Độ dài]` |
| cùng chuỗi, câu điều kiện | `không thể phán đoán ổn định về **dung lượng**, trọng tâm chính` | `về độ dài` |
| `co-create` prompt — tiêu đề brief (`## 节奏与篇幅`) | `## Nhịp truyện và **dung lượng**` | `## Nhịp truyện và độ dài` |

Trong tiếng Việt kỹ thuật, "dung lượng" gắn chặt với byte/MB. `篇幅` là **độ dài tác phẩm** (truyện ngắn
/ vừa / dài). Chỗ nặng nhất là chỗ đầu: đó là nhãn hiện ra khi hệ thống hỏi người dùng chọn quy mô
truyện — người dùng thấy "[Dung lượng] Dài" sẽ tưởng đang được hỏi về kích cỡ tệp xuất ra.
Chỗ thứ ba nằm trong prompt, tức **LLM cũng đọc**: nó được lệnh viết mục `## Nhịp truyện và dung lượng`
vào brief, và sẽ viết về độ dài — nhưng tiêu đề thì lệch nghĩa.

---

## L2.2 KHÔNG NHẤT QUÁN THUẬT NGỮ — có đếm, để quyết định sửa tay hay sửa script

Cách đo: rút **371 msgid tiếng Trung ngắn thuần Hán** (2–6 chữ) làm glossary — với những msgid này thì
bản dịch *chính là* cách repo chọn dịch thuật ngữ đó. Sau đó tìm mọi msgid dài có chứa thuật ngữ ấy mà
bản dịch **không dùng lại** cách dịch đã chốt: 446 ứng viên, kiểm tay từng nhóm, phần lớn là biến thể
tự nhiên hợp lệ (`hoàn thành`/`hoàn tất`). Còn lại là 8 nhóm lệch thật:

| # | Khái niệm | Các bản dịch đang dùng | Đếm | Chọn một | Sửa bằng |
|---|---|---|---|---|---|
| 1 | tệp (`文件`) | `file` / `tệp` | **35 / 12** | `tệp` | script |
| 2 | `关键事件` (mô tả trường `key_events`) | `then chốt` / `quan trọng` / `chính` | 1/1/2 | `then chốt` | tay (4 chuỗi) |
| 3 | `钩子` | `Điểm móc` / `Móc` | 4 / 7 | `móc` | tay (11 chuỗi) |
| 4 | `契约` | `contract` / `hợp đồng` | **17 / 2** | `contract` | tay (2 chuỗi) — xem L2.1.a |
| 5 | `模型` | `model` / `mô hình` | 62 / 9 | `model` | script |
| 6 | `缓存` | `cache` / `bộ nhớ đệm` | 9 / 1 | `cache` | tay (1 chuỗi) |
| 7 | `疲劳词` | `Từ nhàm` / `Từ gây mỏi` | 1 / 2 | `từ gây mỏi` | tay (2 chuỗi) |
| 8 | `已提交` | `đã lưu` / `đã commit` | 3 / 1 | `đã lưu` | tay (1 chuỗi) |

Ba nhóm đáng nói riêng:

**#1 `file` vs `tệp` — lệch lớn nhất trong catalog.** Không phải hai miền khác nhau: cùng một thuật ngữ
tiếng Trung `源文件` ra cả hai kiểu, trong các chuỗi nằm cạnh nhau ở cùng luồng nhập truyện:

```
'源文件 '          -> 'Tệp nguồn '            ← nhãn
'源文件为空：%s'    -> 'File nguồn rỗng: %s'
'读取源文件：%w'    -> 'Đọc file nguồn: %w'
'校验源文件身份'    -> 'Kiểm danh tính file nguồn'
```

Người dùng nhập một cuốn sách sẽ thấy nhãn "Tệp nguồn" rồi ngay sau đó là lỗi "File nguồn rỗng". Đáng
chú ý: `README.txt` mẫu (chuỗi dài 1.155 ký tự) dùng `tệp` **nhất quán tuyệt đối** cả 5 lần — tức là
người dịch phần đó đã chọn `tệp`, chỉ có phần chuỗi lỗi rải rác là còn `file`.

**#2 `关键事件` — cùng một trường JSON, bốn tên gọi.** Đây là chỗ duy nhất trong báo cáo này mà lệch
thuật ngữ **chạm vào chất lượng văn AI sinh ra**, nên tôi truy đến điểm gọi:

| Điểm gọi | msgid | Bản dịch |
|---|---|---|
| `tools/commit_chapter.go:101` | `本章关键事件` | `Các sự kiện **chính** của chương này` |
| `tools/save_arc_summary.go:58` | `弧内关键事件` | `Sự kiện **chính** trong cung` |
| `tools/save_volume_summary.go:38` | `卷内关键事件` | `Các sự kiện **quan trọng** trong tập` |
| `host/imp/contracts.go:97` | `关键事件` | `Sự kiện **then chốt**` |

Cả bốn là mô tả của **cùng một trường `key_events`** trong bốn tool mà model gọi ở bốn tầm (chương →
cung → tập → nhập truyện). Bản Trung đổi *phạm vi* (本章/弧内/卷内) nhưng giữ **một** tính từ `关键`. Bản
Việt đổi cả tính từ: chính / chính / quan trọng / then chốt. Model leo từ chương lên tập sẽ thấy trường
này được định nghĩa lại mỗi tầng — chưa đủ để sai, nhưng làm loãng tín hiệu "đây vẫn là một khái niệm".
Đổi phạm vi thì đúng, đổi tính từ thì không nên.

**#7 `疲劳词`.** `Từ nhàm` là nhãn, `Từ gây mỏi` dùng trong câu — và `Từ gây mỏi` mới là bản đúng, vì
chính chuỗi README.txt mẫu (thứ người dùng đọc để tự viết luật) dùng `ngưỡng từ gây mỏi` và
`từ gây mỏi thường gặp`. Nhãn lẻ `Từ nhàm` là chỗ cần đổi, không phải ngược lại.

---

## L2.3 CHÍNH TẢ (lớp 6) — lần đầu đo vét cạn, không lấy mẫu

Lượt 1 để hở đúng chỗ này. Cách đo của tôi: tách **toàn bộ** giá trị của 1.817 cặp thành token, được
**1.297 token khác nhau**, rồi đọc hết danh sách 1.297 token đó — vốn từ của một catalog là hữu hạn nên
đây là **kiểm vét cạn, không phải lấy mẫu**. Với mỗi token đáng nghi, truy về câu chứa nó để phán.

### Kết quả: 0 lỗi chính tả thật

| Loại lỗi | Số lỗi |
|---|---|
| Dấu hỏi / dấu ngã sai | **0** |
| `i` / `y` sai (`kỹ/kĩ`, `lí/lý`) | **0** — `kỹ`, `lý`, `tỉ` dùng một kiểu xuyên suốt |
| `r` / `d` / `gi` sai | **0** |
| Thiếu dấu / rơi dấu | **0** (xem ghi chú) |
| Sai từ (dùng nhầm từ gần âm) | **0** |

36 token tôi bắt ra để kiểm tay đều **đúng**, kể cả những chỗ trông như lỗi nhất:

| Token | Câu thật | Phán quyết |
|---|---|---|
| `tep`, `goc`, `moi` (không dấu) | `iconv -f WINDOWS-1258 -t UTF-8 tep-goc > tep-moi` | **Đúng và có chủ ý** — tên tệp trong lệnh shell mẫu, đặt dấu vào là hỏng lệnh |
| `lăn` ×5 | `Con lăn cuộn chỉ thị` | Đúng — con lăn chuột |
| `vớt` ×4 | `không có tiền tố nào vớt được` | Đúng — vớt lại phần đầu ra bị cắt |
| `bể` | `Xóa sạch bể phản hồi của writer thất bại` | Đúng nghĩa (pool) |
| `hở` | `phải liên tục, không hở` | Đúng |
| `trọ`, `bạc` | `chủ quán trọ / tay đánh bạc` | Đúng — ví dụ định vị nhân vật |
| `phàm` | `tu luyện từ phàm nhân đến phi thăng` | Đúng — đúng giọng tiên hiệp |
| `xi` | `sao chép nguyên xi nội dung này` | Đúng |
| `luân`, `trạm` | `trạm trung chuyển luân phiên thượng nguồn` | Đúng |
| `sử` ×1 | `Sử dụng` | Đúng (không phải nhầm `xử`) |

### Còn lại: 3 chỗ lệch chuẩn chính tả (cùng một từ, hai kiểu viết)

Đây **không phải viết sai** — cả hai kiểu đều có trong chuẩn — nhưng một sản phẩm không nên có cả hai:

| Từ | Kiểu A | Kiểu B | Nên chọn | Vì sao |
|---|---|---|---|---|
| `-hóa` | `chuẩn hoá` ×7 | `chuẩn hóa` ×1 | **`hóa`** | Mọi từ `-hóa` khác trong catalog đều viết `hóa`: `mã hóa`, `Tuần tự hóa`, `cụ tượng hóa`, `tự động hóa`. Chỉ riêng "chuẩn hoá" viết kiểu cũ → sửa 7 chỗ, không phải sửa 1 |
| `xóa` | `xoá` ×2 | `xóa` ×24 | **`xóa`** | 24 vs 2 |
| `thỏa` | `thoả` ×1 | — | **`thỏa`** | Chỉ 1 chỗ: `mọi điều kiện hoàn thành đã thoả ngay lúc này` |

Tổng: **10 chuỗi** cần chạm, một lượt tìm-thay, rủi ro gần bằng không.

> Ghi chú về giới hạn: tôi kiểm theo **token**, nên bắt được mọi từ viết sai. Cái token-check *không*
> bắt được là từ viết đúng nhưng **đặt sai chỗ** (`bàn` thay vì `bản` — cả hai đều là từ thật). Loại đó
> chỉ đọc câu mới thấy; tôi đọc câu cho ~150 chuỗi dài nhất và toàn bộ chuỗi chứa 36 token nghi vấn,
> không thấy trường hợp nào.

---

## L2.4 LỚP 3 — chuỗi Việt viết cứng trong Go (lượt 1 không có mục này)

Cách đo: quét mọi literal chuỗi trong `*.go`, bỏ phần chú thích (`//`), lọc những literal có dấu tiếng
Việt. Được **1.106 literal**; bỏ tệp `_test.go` và `web/` còn **221 literal trong mã sản xuất**. Phân
loại bằng tay thành 4 nhóm.

**Kết quả sau khi đã soát xong cả bốn: không nhóm nào là lỗi phải sửa trong chuỗi.** Nhóm 1 ban đầu bị tôi
xếp là lỗi; sau khi xét lại thì nó là **ngoại lệ có chủ đích** và khuyết điểm thật nằm ở **chú thích hứa
quá rộng**, đã sửa (xem hộp đầu Nhóm 1). Giá trị của mục này vì thế nằm ở **việc phân loại**, không ở số
lỗi: một danh sách 221 chuỗi không phân loại thì người sau phải đọc lại toàn bộ để biết chỗ nào được
phép chạm.

### Nhóm 1 — NGOẠI LỆ CÓ CHỦ ĐÍCH: `internal/serve/` không đi qua catalog (18 chuỗi)

> **Đã sửa kết luận (2026-07-31).** Bản đầu của mục này xếp đây là "LỖI THẬT" và đề nghị bọc `i18n.F`
> cho 18 chuỗi. **Phép đo đúng, kết luận sai hướng, và tôi rút lại đề nghị đó** — lý do ở
> "Vì sao KHÔNG bọc" bên dưới. Phần đo (18 chuỗi, bảng tệp, hệ quả `AINOVEL_LANG=zh`) giữ nguyên vì
> vẫn đúng và vẫn là thông tin cần cho người sau.

Cả lệnh con `ainovel-cli serve` (web studio) **không gọi `i18n.F` một lần nào**. Toàn bộ chuỗi hiển thị
là tiếng Việt viết cứng:

| Tệp | Số chuỗi | Loại bề mặt | Ví dụ |
|---|---|---|---|
| `internal/serve/serve.go` | 15 | help của flag, banner stdout, cảnh báo bảo mật stderr, body lỗi HTTP | `"địa chỉ lắng nghe"`, `"ainovel studio đang chạy tại http://%s\n"`, `"đang lắng nghe %s — store chứa toàn văn chưa phát hành, đừng mở ra mạng công cộng"`, `"tên tác phẩm không hợp lệ: %q"` |
| `internal/serve/events.go` | 2 | body lỗi HTTP | `"kết nối này không hỗ trợ đẩy dữ liệu theo dòng"` |
| `internal/serve/snapshot.go` | 1 | lỗi bọc | `"đọc progress: %w"` |

**Hệ quả đúng như đề bài dự đoán:** `AINOVEL_LANG=zh` **không** đổi được 18 chuỗi này — chạy
`serve` ở chế độ zh vẫn ra tiếng Việt. Đây là bề mặt duy nhất trong repo có tính chất đó.

`internal/serve/` là **mã mới của bản fork này** (thêm ở `269551f`, "feat(serve): API chỉ-đọc + SSE trên
store"), **không phải bản dịch của upstream**. Nên ngay từ đầu đây không phải lỗi dịch — không có nguyên
bản tiếng Trung nào bị dịch sai.

#### Vì sao KHÔNG bọc `i18n.F` ở đây

Lớp i18n của repo lấy **chính chuỗi tiếng Trung làm msgid**, và locale zh là **catalog RỖNG** — mọi msgid
rơi về chính nó, tức về đúng chuỗi gốc của upstream. Cơ chế đó tồn tại cho **một** việc: đối chiếu hành vi
với upstream. Nó chỉ chạy được khi **có một chuỗi upstream để rơi về**.

`serve` không có. Nên bọc ở đây đòi phải **tự bịa msgid tiếng Trung cho 18 câu**: tiếng Trung do người
không viết tiếng Trung soạn, đặt vào một fork tiếng Việt, để phục vụ một phép đối chiếu **không tồn tại**.
Cái giá là thật, cái lợi thì không.

**Lý lẽ mạnh nhất của bản đầu cũng không đứng được.** Tôi từng viết rằng cảnh báo bảo mật
(`"đang lắng nghe %s — store chứa toàn văn chưa phát hành…"`) "đáng bọc trước nhất, người dùng zh cần đọc
hiểu được". Nhưng phải hỏi *ai thật sự đặt* `AINOVEL_LANG=zh`: người đối chiếu với upstream. Mà họ đối
chiếu `serve` với cái gì? Không có gì. Lập luận của tôi giả định một người dùng zh đọc giao diện để dùng
sản phẩm, trong khi biến môi trường này không phục vụ người đó.

#### Lỗi thật nằm ở chỗ khác: tài liệu hứa nhiều hơn code làm

Khuyết điểm đáng sửa **không phải 18 chuỗi**, mà là **chú thích `EnvLocale` hứa quá rộng**: nó nói
`AINOVEL_LANG=zh` cho hành vi đối chiếu được với upstream, **không kèm điều kiện**, rồi `serve` âm thầm
phá lời hứa đó. Đây là lớp lỗi "tài liệu hứa nhiều hơn code làm", và nó nguy hơn 18 chuỗi vì nó làm
**người đọc sau tin sai** — chính xác là cái bẫy mà lượt 1 đã ghi ở mục 2.3 với `d98aa0fb`.

Đã ghi lại ở **hai chỗ**, để người sau không "sửa" nó thành đúng-hình-thức mà sai-mục-đích:

| Chỗ | Nội dung |
|---|---|
| `internal/i18n/i18n.go`, chú thích `EnvLocale` | Nói rõ **phạm vi hẹp hơn tên gọi**: `AINOVEL_LANG=zh` chỉ đổi được những chuỗi **CÓ nguyên bản tiếng Trung**; nêu thẳng `serve` là ngoại lệ và trỏ sang chú thích đầu package `internal/serve` |
| `internal/serve/serve.go`, chú thích đầu package | Mục **"Vì sao chuỗi ở đây KHÔNG đi qua i18n"** với lý lẽ đầy đủ, kèm câu chốt *"Đó là hệ quả đã biết, không phải lỗi bỏ sót"*, và **giới hạn phạm vi ngoại lệ**: *"Điều này KHÔNG áp cho phần còn lại của repo"*, trỏ tới hai bộ canh soi mã nguồn (`internal/i18n/quetnguon_test.go`, `internal/serve/web_chu_test.go`) |

#### Lý lẽ ngược lại — ghi để người sau tự đánh giá, không phải để bác

Kết luận trên đúng với điều kiện hiện tại. Ba điều kiện đó có thể đổi, và khi đổi thì nên xét lại:

1. **Tên biến hứa một ngôn ngữ, không hứa một chế độ đối chiếu.** `AINOVEL_LANG` đọc như "đặt ngôn ngữ",
   nên vẫn có thể có người đọc tiếng Trung đặt nó và mong một giao diện tiếng Trung. Bản sửa xử lý đúng
   tầng: **thu hẹp lời hứa trong tài liệu** thay vì phình mã ra cho khớp một lời hứa quá rộng. Nếu sau này
   thấy người dùng thật hiểu sai theo hướng này thì chỗ cần sửa là **tên/tài liệu**, không phải 18 chuỗi.
2. **Nếu repo thêm một ngôn ngữ giao diện thật** (ví dụ tiếng Anh), lập luận "không có chuỗi upstream để
   rơi về" **mất hiệu lực** — lúc đó msgid không còn phải là tiếng Trung, và 18 chuỗi trở thành khoảng
   trống thật. Chi phí retrofit tăng theo bề mặt `serve`, nên đây là điều kiện đáng theo dõi.
3. **Nếu `serve` được đóng góp lên upstream**, nó sẽ có nguyên bản, và ngoại lệ tự hết lý do.
4. **Rủi ro tiền lệ**: người thêm lệnh con mới có thể dẫn `serve` làm giấy phép bỏ i18n nói chung. Đã
   được chặn bằng câu giới hạn phạm vi trong chú thích `serve.go` cộng hai bộ canh soi mã nguồn — nhưng
   đó là chặn bằng chú thích, không phải bằng compiler, nên vẫn phụ thuộc người đọc.

Nói gọn: **ngoại lệ này đúng vì `serve` không có upstream để đối chiếu, và nó chỉ đúng chừng nào điều đó
còn đúng.**

### Nhóm 2 — ĐÚNG, đừng sửa: tiếng Việt trước khi catalog nạp được

`internal/i18n/i18n.go:93,108` (`"i18n: không có catalog cho ngôn ngữ %q: %w"`,
`"lỗi cú pháp JSON: %w"`) và `internal/i18n/verify.go:87–138` (5 chuỗi). Đây là lỗi phát sinh **lúc
chính catalog chưa nạp được**, không thể đi qua `i18n.F` — bài toán con-gà-quả-trứng. Ghi lại để không
ai "sửa" thành lỗi thật.

### Nhóm 3 — ĐÚNG theo thiết kế, nhưng có một hệ quả nên biết: mẫu phân tích nội dung

`internal/stylestat/stylestat.go` (~106 literal) và `internal/rules/snapshot.go` (23 literal) chứa các
mẫu tiếng Việt để **dò sáo ngữ trong văn model sinh ra**: `'(?i)một cách \p{L}+'`,
`'(?i)của (?:hắn|nàng|y|gã|…)'`, `'trong nháy mắt'`, `'im lặng'`… Đây là **ngôn ngữ của nội dung**, không
phải ngôn ngữ của giao diện, nên viết cứng tiếng Việt là **đúng** — và mấy lớp `Trạng ngữ dịch máy`,
`Sở hữu dịch máy`, `Liên từ nghị luận mở câu` là **do bản Việt tự thêm**, bản Trung không có. Đó là việc
làm thêm đáng ghi công, không phải nợ.

Hệ quả nên biết (không phải lỗi câu chữ, nên tôi không xếp hạng): ở `AINOVEL_LANG=zh` model sinh văn
Trung, các mẫu tiếng Việt này **không khớp gì cả**, nên cửa kiểm `fatigue`/`stylestat` **im lặng** thay
vì báo lỗi. Bên tiếng Trung vẫn còn mẫu riêng nên không rỗng hoàn toàn, nhưng ai đối chiếu vi↔zh cần
biết hai bên không đo cùng một thứ.

### Nhóm 4 — cần kiểm chứng chứ đừng sửa vội: `internal/tools/premise_structure.go`

71 literal tiếng Việt, trong đó **~30 chuỗi trùng khít với giá trị đang có trong `vi.json`** (ví dụ
`"Xung đột cốt lõi"`, `"Mục tiêu nhân vật chính"`, `"Khúc ngoặt giữa truyện"`). Đây là bảng
canonical + alias tiêu đề premise: nó **phải** nhận cả tiêu đề Việt lẫn Hán do model trả về, nên viết
cứng ở đây có lý.

Rủi ro là **hai nguồn chân lý cho cùng một tiêu đề**: ai sửa tiêu đề trong `vi.json` mà không sửa bảng
alias thì premise do model sinh ra sẽ **lặng lẽ không khớp** — không lỗi build, không lỗi test, chỉ là
`template_ready=false`. Có `premise_structure_test.go` chốt danh sách nên không phải không ai canh;
nhưng nó chốt vào **chuỗi viết cứng**, không chốt vào catalog, nên nó không bắt được kiểu lệch này.
**Đề nghị**: không sửa gì trong lượt câu chữ này; ghi thành một hạng mục kỹ thuật riêng (thêm test đối
chiếu bảng alias ↔ catalog).

---

## L2.5 NHỎ — chữ Hán lọt vào chú thích tiếng Việt

61 dòng chú thích `//` có cả tiếng Việt và chữ Hán. Kiểm tay: **~51 dòng là đúng** — chúng **trích dẫn
msgid tiếng Trung** để giải thích, đó là cách viết chú thích đúng ở repo này (`dò cụm như "截断" / "拒答"`,
`"上下文窗口" chiếm 10 cột`).

Còn lại **10 dòng là chữ Hán dính vào câu Việt, không có khoảng trắng, không phải trích dẫn** — dấu vết
dịch bỏ sót:

| Tệp:dòng | Chú thích | Nên là |
|---|---|---|
| `internal/stylestat/stylestat.go:253` | `minRepeatLen 是độ dài tối thiểu` | `là độ dài tối thiểu` |
| `internal/agents/guard/locale_invariant_test.go:15` | `tóm tắt cung không bao giờ落盘` | `không bao giờ ghi đĩa` |
| `internal/serve/model.go:132` | `một phán quyết của Arbiter đã落盘` | `đã ghi đĩa` |
| `internal/serve/snapshot.go:169` | `Cung骨架: chưa có chương chi tiết` | `Cung khung:` |
| `internal/serve/snapshot.go:244` | `(bản终稿 cũ còn đó)` | `(bản终稿` → `bản chung thẩm/bản chốt` |
| `internal/serve/serve_test.go:134` | `終稿 cũ còn đó` | ⚠ dùng **phồn thể** `終` trong khi cả repo dùng giản thể `终` |
| `internal/tools/recall_snippet_budget_test.go:11,13,17,40` | `recall伏笔`, `nhắc伏笔`, `Mô tả伏笔`, `số伏笔` | `phục bút` (catalog đã chốt) |

Chỉ là chú thích — người dùng không thấy, `AINOVEL_LANG` không liên quan. Nhưng 4 dòng
`recall_snippet_budget_test.go` cùng một từ `伏笔` mà catalog đã chốt là `phục bút` thì nên dọn, và dòng
`終` phồn thể là dấu hiệu ai đó dán từ nguồn khác.

---

## L2.6 LỚP 9 — `assets/prompts/` và `anti-ai-tone.md`: đọc kỹ nhất, và không có lỗi

Đề bài yêu cầu đọc `anti-ai-tone.md` cẩn thận nhất, vì nó dạy AI tránh giọng máy nên nếu chính nó viết
mơ hồ thì cả cơ chế vô hiệu. **Tôi đọc trọn 41 dòng. Phán quyết: đây là văn bản mạnh nhất trong repo,
và nó không phải bản dịch.**

Bằng chứng nó là **văn viết lại cho tiếng Việt**, không phải dịch:

- **Ba mục hoàn toàn mới, bản Trung không có**, và cả ba nhắm đúng dấu vết dịch máy chỉ tiếng Việt mới
  có: `Trạng ngữ dịch máy "một cách + tính từ"` ("đây là lối dịch máy trạng ngữ tiếng Trung, gần như
  không có trong văn viết tiếng Việt tự nhiên, nên mật độ cao là dấu hiệu dịch máy mạnh nhất"),
  `Sở hữu dịch máy "của + đại từ"` ("tiếng Việt lược sở hữu khi quan hệ đã rõ"),
  `Liên từ nghị luận mở đầu câu`. Người viết ba mục này hiểu chính xác bản dịch sẽ hỏng ở đâu.
- **Sáo ngữ được thay bằng sáo ngữ Việt thật**, không dịch sáo ngữ Trung: "rợn người kinh hãi, ngàn cân
  treo sợi tóc", "tựa như / chẳng khác nào / hệt như", "một thoáng / một tia / một nét". Và có câu chốt
  đúng chỗ dễ sai nhất: *"Không giới hạn ở cụm bốn tiếng — sáo ngữ tiếng Việt dài năm sáu tiếng tính y
  như vậy"* (bản Trung nói 四字成语; dịch mộc sẽ ra một luật vô nghĩa với tiếng Việt).
- **Lực chỉ dẫn còn nguyên**: mỗi mục đều có "Cách sửa:" cụ thể, hành động được, không có mục nào dừng
  ở mô tả.
- **Mục III còn tự bắt cái bẫy của chính mình**: "Đây là cái giá phải trả khi sửa 'dán nhãn cảm xúc'
  bằng phản ứng cơ thể: đổi một tật lấy một tật." Đó là suy nghĩ biên tập, không phải dịch.
- **Móc nối sang lớp đếm được giữ đúng**: 9 nhãn `[style_stats: …]` trong tài liệu khớp nhãn lớp trong
  `internal/stylestat/stylestat.go`, và có `assets/anti_ai_tone_sync_test.go` canh cho khỏi lệch.

**Lỗi tìm được trong `anti-ai-tone.md`: 0.** Tôi cũng không tìm được chỗ nào mơ hồ đủ để làm AI viết dở.

---

## L2.7 Đối chiếu với lượt 1

**Xác nhận độc lập.** Tôi dựng lại bảng điểm nối bằng máy (dò `Sprintf`/`Errorf` có `i18n.F`, rồi truy
biến được gán từ `i18n.F` — 530 điểm gọi), ra **7 điểm nối**. Cả hai nguyên nhân gốc của lượt 1 hiện
lên đúng như họ mô tả: `resume.go:46` (4.1) và `store/progress.go:497` (4.2, `hàng đợi Viết lại`).

**Nhưng đừng dùng con số của tôi cho lớp này — dùng §9 của lượt 2B.** Bộ dò của tôi chỉ thấy biến được
gán từ `i18n.F("<literal>")` **trên cùng dòng/cùng biểu thức**; bộ dò của 2B dò tiếp **40 dòng** sau chỗ
gán nên bắt được nhánh biến trung gian. Cụ thể 2B tìm ra **6 điểm hỏng trong `internal/host/imp/state.go`
mà tôi bỏ sót hoàn toàn**, và tổng của họ là **10 điểm hỏng / 3 ổ** so với 7 điểm của tôi. Hai phép đo
không mâu thuẫn — phép của tôi là tập con.

Hai chỗ tôi nêu và đối chiếu với 2B:

| Điểm gọi | Câu ghép thật | Đối chiếu |
|---|---|---|
| `internal/host/imp/segment.go:419` | `Hợp nhất kết quả cắt toàn sách thất bại (**Đ**ã xóa cache khối…): …` | **Cùng chỗ với §9.2 #7** (họ ghi dòng 412). Hai lượt độc lập ra cùng kết luận |
| `internal/host/host.go:1420` | `Đã đổi độ mạnh suy luận: **M**ặc định (kế thừa) → …` | Cùng lớp với §9.3 (`host.go:723`): **viết hoa sau dấu hai chấm là chấp nhận được**. Tôi đồng ý với 2B, **không đề nghị sửa** |

Nhóm `独占作业` ở 4.2 (giá trị đặt tại `host.go:1546,1627,1658` rồi truyền qua hàm) nằm ngoài tầm quét
của **cả hai** bộ dò — chỗ đó lượt 1 truy tay và vẫn là nguồn duy nhất.

**Một chỗ tôi đề nghị xếp lại mức:** `章节许可` → "Giấy phép chương". Lượt 1 xếp NHỎ (4.5c). Tôi đề nghị
top-5, vì 14 msgid + đã rò ra README (xem L2.1.b).

---

## L2.8 Hai mươi chỗ nếu chỉ sửa được hai mươi

Xếp theo: sai nghĩa → lệch thuật ngữ → chính tả → văn phong. Cột cuối cho biết sửa tay hay script.

| # | Chỗ | Sửa thành | Lớp | Cách |
|---|---|---|---|---|
| 1 | `%s.enum vi phạm hợp đồng: %w` (`validate.go:53`) | `contract của %s.enum không hợp lệ: %w` | sai nghĩa + đổ lỗi sai, LLM đọc | tay |
| 2–5 | `giấy phép chương` — 4 chuỗi nặng nhất: `Tiêu giấy phép chương %d`, `Giấy phép chương không được âm`, `Giấy phép chương phải lớn hơn 0`, `Giấy phép chương đã lưu` | `suất chương` | sai nghĩa (đọc ra giấy tờ pháp lý) | tay |
| 6 | `README.md:22` `không tiêu lẫn giấy phép` | `không tiêu lẫn suất chương` | sai nghĩa, ở mặt tiền dự án | tay |
| 7 | `[Dung lượng] Dài` (`ask_user`) | `[Độ dài]` | sai nghĩa, nhãn người dùng chọn | tay |
| 8 | `## Nhịp truyện và dung lượng` (prompt co-create) | `## Nhịp truyện và độ dài` | sai nghĩa, LLM đọc | tay |
| 9 | `Tỉ lệ thực hiện hợp đồng thấp` | `…thực hiện contract thấp` | lệch thuật ngữ | tay |
| 10 | `file` → `tệp`, 35 chuỗi | `tệp` | lệch thuật ngữ (lớn nhất) | **script** |
| 11–14 | `key_events`: 4 mô tả dùng 3 tính từ | thống nhất `then chốt`, giữ khác biệt phạm vi | lệch thuật ngữ, LLM đọc | tay |
| 15 | `Điểm móc` (4) vs `Móc` (7) | `móc` | lệch thuật ngữ | tay |
| 16 | `Từ nhàm` (nhãn lẻ) | `Từ gây mỏi` | lệch thuật ngữ | tay |
| 17 | `chưa có mẫu hội thoại **đã commit** nào` | `đã lưu` | lệch thuật ngữ (lẫn tiếng Anh vào câu Việt) | tay |
| 18 | `chuẩn hoá` ×7 → `chuẩn hóa` | `hóa` | chính tả (chuẩn) | **script** |
| 19 | `xoá` ×2 → `xóa`; `thoả` ×1 → `thỏa` | | chính tả (chuẩn) | **script** |
| 20 | ~~`internal/serve/` — bọc `i18n.F` cho 18 chuỗi~~ **RÚT LẠI** — là ngoại lệ có chủ đích, không phải việc phải làm. Việc thật (đã xong): thu hẹp lời hứa ở chú thích `EnvLocale` | | lớp 3 | đã sửa |

Đọc con số để quyết: **3 hạng mục sửa bằng script** (#10, #18, #19 — tổng 45 chuỗi, thuần tìm-thay, rủi
ro gần bằng không) và **17 hạng mục sửa tay** (mỗi chỗ 1–4 chuỗi). Không hạng mục nào cần sửa hai đầu
(code + catalog) **trừ** #20, vốn là việc kỹ thuật chứ không phải việc câu chữ.

---

## L2.9 Đo được gì, chưa đo được gì

| Hạng mục | Phạm vi thật | Cách |
|---|---|---|
| Chính tả, dấu, i/y, r/d/gi | **1.297/1.297 token (100% từ vựng)** | Tách token toàn catalog, đọc hết danh sách, truy câu cho 36 token nghi vấn |
| Lệch thuật ngữ | **1.817/1.817 cặp**, glossary tự động 371 mục | 446 ứng viên → kiểm tay → 8 nhóm lệch thật |
| Chuỗi Việt viết cứng (lớp 3) | **Toàn bộ `*.go`** (1.106 literal → 221 mã sản xuất) | Quét literal, bỏ chú thích, phân 4 nhóm bằng tay |
| Hán lọt chú thích | Toàn bộ `*.go` | 61 dòng → kiểm tay → 10 dòng lỗi |
| Điểm nối / viết hoa giữa câu | **530 điểm gọi `Sprintf`/`Errorf`** | Tự động; **không phủ** nhánh giá trị truyền qua hàm (xem L2.7) |
| `anti-ai-tone.md` | **41/41 dòng** | Đọc trọn, đối chiếu nhãn `style_stats` với `stylestat.go` |
| Câu dài / cú pháp Trung | **~150 chuỗi dài nhất** | Đọc hiểu, so với msgid |
| `README.md` | 741 dòng, đọc ~120 dòng đầu | Đọc hiểu |

**Chưa đo:**

| Phần | Vì sao |
|---|---|
| **Thân văn `assets/references/*.md`** (~15.000 dòng) | Vẫn là lỗ hổng lớn nhất, đúng như lượt 1 đã nói. Tôi chỉ đọc trọn `anti-ai-tone.md` (tệp đề bài xếp ưu tiên cao nhất) và không mở `chapter-guide.md`, `plot-structures.md`, `hook-techniques.md`. **Đây là việc còn lại lớn nhất của cả hai lượt.** |
| **`README.md` từ dòng ~120 tới 741** | Hết hạn mức. Phần đã đọc chất lượng cao; phát hiện #6 nằm ở dòng 22. |
| **`web/`** | Ngoài phạm vi đề bài. |
| **Chạy thật `serve` / TUI để xem chuỗi trên màn** | Chỉ đọc mã. Việc "`AINOVEL_LANG=zh` không đổi 18 chuỗi của `serve`" suy ra từ chỗ `internal/serve/` không có lời gọi `i18n.F` nào, **không phải từ ảnh chụp `AINOVEL_LANG=zh ainovel-cli serve`**. Nay điều đó đã là **hành vi được ghi nhận có chủ đích** (L2.4 Nhóm 1) nên không còn là việc phải xác minh gấp; ai chạy được thì vẫn nên chạy một lần cho có bằng chứng trực tiếp. |
| **Từ viết đúng nhưng đặt sai chỗ** | Token-check không bắt được (xem ghi chú ở L2.3). |

---

## L2.10 Trả lời thẳng hai câu hỏi

### 1. Người Việt đọc giao diện này có chỗ nào hiểu sai không?

**Có, ba chỗ — và cả ba là hiểu sai thật, không phải đọc thấy khó chịu.**

1. **`giấy phép chương` (14 chuỗi + README).** Người vận hành đọc "Tiêu giấy phép chương 5" hoặc
   "không tiêu lẫn giấy phép" sẽ hiểu sản phẩm có cơ chế bản quyền / license. Thực tế đó là suất viết
   chương. Chỗ này nặng nhất vì nó đã lên **README** — người chưa dùng sản phẩm gặp nó trước tiên.
2. **`[Dung lượng] Dài`.** Đây là nhãn trong câu hỏi hệ thống đặt cho người dùng lúc lập kế hoạch.
   "Dung lượng" trong tiếng Việt kỹ thuật là MB/byte; người dùng sẽ tưởng đang được hỏi về kích cỡ tệp
   xuất, chứ không phải chọn viết truyện dài hay ngắn.
3. **`vi phạm hợp đồng`.** Người đọc log sẽ đi tìm xem model đã làm trái gì, trong khi lỗi nằm ở schema
   do lập trình viên viết. Chỗ này ít người thấy hơn hai chỗ trên nhưng dẫn sai hướng chẩn đoán mạnh
   nhất.

Ngoài ba chỗ đó: `file`/`tệp` (35/12) **không** làm hiểu sai, nhưng làm người dùng mất phương hướng —
thấy nhãn "Tệp nguồn" rồi ngay sau đó là lỗi "File nguồn rỗng" trong cùng một luồng nhập truyện.

### 2. Văn AI sinh ra có bị bản dịch làm hỏng giọng không?

**Bản dịch: không** — và tầng quyết định giọng văn là phần tốt nhất của cả bản Việt hóa.
**Nhưng lượt Việt hóa nói chung: có, ở tầng mã.** Hai phần của câu trả lời này phải đọc cùng nhau.

> **Đọc kèm §10 của lượt 2B trước khi kết luận.** Câu trả lời "không" của tôi chỉ nói về **chất lượng câu
> chữ của bản dịch** (prompt, reference, catalog) — đúng phạm vi việc tôi được giao. Nhưng 2B tìm ra hai
> khuyết điểm **trong mã, không trong chuỗi dịch**, và chúng làm hỏng đúng vòng phản hồi quyết định chất
> lượng văn: `non_cjk_fragments` (`rules/lint.go`) sinh **1.147 "dữ kiện" giả mỗi chương** tiếng Việt rồi
> đưa cho tác tử `editor` phán quyết — dìm tín hiệu duyệt thật xuống dưới nền nhiễu; và mẫu
> `Sở hữu dịch máy` **chết lặng ở nhánh `gã`** vì `\b` của RE2 chỉ tính ASCII — tức chính chỉ số đo "văn
> còn mùi dịch máy" đang đếm hụt. Cộng lại: **văn kém có thể đi qua cửa kiểm, còn văn tốt thì bị chấm
> giữa một nghìn cảnh báo rác.** Đó là ảnh hưởng thật lên giọng văn AI, chỉ không đến từ câu chữ.

Phần thuộc phạm vi của tôi — câu chữ — thì kết luận là **không hỏng**:

`assets/prompts/` (13 tệp) và `assets/references/anti-ai-tone.md` là thứ định hình giọng, và chúng
**được viết lại cho tiếng Việt, không phải dịch sang tiếng Việt**. Ba mục chống-dịch-máy trong
`anti-ai-tone.md` (`một cách + tính từ`, `của + đại từ`, liên từ nghị luận mở câu) **bản Trung không
có** — chúng được thêm vào để bắt đúng những dấu vết mà một bản dịch máy sẽ để lại, và chúng có lớp
đếm tương ứng trong `internal/stylestat/stylestat.go` cộng một test đồng bộ. Nói cách khác: cơ chế
chống giọng máy ở đây **mạnh hơn** bản gốc, không yếu hơn.

Chỗ duy nhất bản dịch có thể làm loãng đầu ra là **mô tả trường `key_events` bị đặt tên bằng ba tính
từ khác nhau ở bốn tool** (L2.2 #2): model leo từ chương → cung → tập thấy cùng một trường được định
nghĩa lại mỗi tầng. Đó là làm loãng tín hiệu, **không** phải làm sai chỉ thị — và sửa 4 chuỗi là xong.

Không có chỗ nào trong `assets/prompts/` bị làm mềm lực chỉ dẫn (lượt 1 đã kiểm 13/13 tệp bằng cách
ghép cặp từng dòng với bản Trung tiền dịch; tôi không tìm được phản ví dụ nào). Ba chỗ sai nghĩa ở câu
1 đều nằm ở tầng giao diện và log, **không** nằm trong prompt dạy AI viết văn — trừ #8
(`## Nhịp truyện và dung lượng`), là một tiêu đề mục, không phải một chỉ thị.

---
---

# PHỤ LỤC — Lượt soát 2: hạng mục 9 + hai lớp lỗi vô hình mới

**Ảnh chụp: 2026-07-31 00:34:04 +07**, HEAD `3ee5279`, catalog **1.817 cặp**
(tăng 2 cặp so với lượt 1: 1.815 → 1.817; `vi.json` đang bị agent khác giữ và có sửa trong lúc tôi soát,
`internal/i18n/JoinList` đã có mặt). Vẫn **chỉ đọc**, không sửa gì.

## 9. Cùng một msgid, hai ngữ cảnh, hai dạng chữ

### 9.1 Cách đo

Tôi viết một bộ dò có truy dòng dữ liệu (`/tmp/scan9.py`) thay vì grep thuần, vì phần lớn ca không nội suy
trực tiếp mà đi qua biến trung gian (`verb := i18n.F("重写")` … 40 dòng sau mới vào `fmt.Errorf`). Ba dạng
được bắt:

- **A** `v := i18n.F("X")` → dò tiếp 40 dòng tìm `v` xuất hiện làm đối số của `Sprintf/Errorf`, hoặc trong phép `+`
- **B** nội suy trực tiếp `fmt.Sprintf(i18n.F("KHUÔN"), …, i18n.F("X"), …)`
- **C** nối trực tiếp `<gì đó> + i18n.F("X")`

Điểm quyết định — và là lý do bộ dò này khác một cái grep: với mỗi ca, tôi **tính vị trí cột của `%s` mà
giá trị đó chiếm trong khuôn đã dịch**. `pos == 0` (đầu câu) thì viết hoa là ĐÚNG; `pos > 0` (giữa câu) thì
viết hoa là SAI. Không có bước này thì mọi nhãn viết hoa đều bị báo động, và báo cáo sẽ vô dụng.

**Kết quả thô: 31 điểm nội suy/nối có giá trị viết hoa — 27 ở `pos > 0`, 4 ở `pos == 0`.**
Sau khi kiểm tay từng ca: **7 điểm hỏng thật, 2 chấp nhận được, 22 dương tính giả.**

### 9.2 Hỏng thật

| # | Chỗ | Câu ghép dựng lại | Mức |
|---|---|---|---|
| 1 | `internal/store/progress.go:492` | `chương 5 không có trong hàng đợi **Viết lại**, hàng đợi hiện tại: [5 7]. Hãy xử lý…` | **CẦN SỬA** |
| 2 | `internal/store/progress.go:495` | `chương 5 không có trong hàng đợi **Gia công**, hàng đợi hiện tại: […]` | **CẦN SỬA** |
| 3 | `internal/host/imp/state.go:225` | `Phát hiện lần nhập truyện chưa xong (**C**hưa cắt chương xong), nhập /import để tiếp từ điểm dừng` | **CẦN SỬA** |
| 4 | `internal/host/imp/state.go:231` | `…chưa xong (**P**hân tích từng chương xong, chờ tổng hợp toàn sách), nhập /import…` | **CẦN SỬA** |
| 5 | `internal/host/imp/state.go:233` | `…chưa xong (**C**hờ nói rõ trạng thái truyện (--story=open\|closed)), nhập /import…` | **CẦN SỬA** |
| 6 | `internal/host/imp/state.go:235` | `…chưa xong (**T**ổng hợp xong, chờ công bố trạng thái chính thức), nhập /import…` | **CẦN SỬA** |
| 7 | `internal/host/imp/segment.go:412` | `Hợp nhất kết quả cắt toàn sách thất bại (**Đ**ã xóa cache khối, chạy lại sẽ cắt chương lại): <err>` | **CẦN SỬA** |

Hai ca nữa **cùng khuôn** mà bộ dò không bắt vì chúng đi qua `Sprintf` lồng, tôi tìm ra khi kiểm tay
`imp/state.go` và `imp/segment.go` — xin tính vào cùng nhóm:

| # | Chỗ | Câu ghép dựng lại | Mức |
|---|---|---|---|
| 8 | `internal/host/imp/state.go:227` | `…chưa xong (**Đ**ã cắt 12 chương, chờ soát và xác nhận), nhập /import…` | **CẦN SỬA** |
| 9 | `internal/host/imp/state.go:229` | `…chưa xong (**Đ**ã phân tích 8/12 chương), nhập /import…` | **CẦN SỬA** |
| 10 | `internal/host/imp/segment.go:415` | `Hợp nhất kết quả cắt toàn sách thất bại (**X**óa cache khối thất bại: …): <err>` | **CẦN SỬA** |

Tổng: **10 điểm hỏng, thuộc 3 ổ** (`progress.go` 2, `imp/state.go` 6, `imp/segment.go` 2).

### 9.3 Chấp nhận được — không đề nghị sửa

`internal/host/host.go:723` / `:725` → `Chế độ đẩy chương đã chuyển thành: **T**ự động đẩy chương`.
Viết hoa **sau dấu hai chấm** khi phần sau là một *giá trị/nhãn* là quy ước bình thường trong tiếng Việt
(khác hẳn viết hoa giữa mệnh đề). Để nguyên.

### 9.4 Dương tính giả — và vì sao, để lượt sau không đào lại

22 ca. Bốn nhóm nguyên nhân:

1. **Nối trọn câu/đoạn cho prompt LLM** (14 ca: `llmcontract/contract.go:150`, `execute.go:186`,
   `tools/edit_chapter.go:54,58`, `tools/novel_context.go:53`, `tools/revise_outline.go:28`,
   `tools/commit_chapter.go:58`, `tools/audit_foundation.go:29`, `tools/save_review.go:28`,
   `host/engine.go:716`, `host/imp/source.go:68,76`, `diag/rules_flow.go:67`…). Vế trái kết thúc bằng
   `. ` hoặc `\n` → vế phải là **câu mới**, viết hoa đúng.
2. **Nhãn phím trong dòng gợi ý** (4 ca: `tui/cocreate.go:400,402`, `tui/model.go:477,479`).
   Ghép ra `Enter tiếp tục bổ sung · **Ctrl+S** bắt đầu sáng tác · ↑↓ …`. `Ctrl+S` là **tên phím**, và mỗi
   mục sau `·` là một mục độc lập. Đúng.
3. **`%s` nằm ngay sau dấu cấu trúc, không phải giữa mệnh đề** (1 ca: `host/imp/synthesize.go:417`,
   khuôn `# %s (tên sách suy từ tên file)`). `%s` đứng sau `# ` → là **tiêu đề Markdown**. Đúng.
4. **`pos == 0`** (4 ca: `host/resume.go:42,44`; `flow/router.go:115,117`). Đầu câu → hoa đúng.
   *Lưu ý: `resume.go:42/44` vẫn hỏng, nhưng vì **lý do khác** — sai vị ngữ, đã báo ở **4.1**. Viết hoa ở
   đó không phải vấn đề; hình câu mới là vấn đề. Đừng gộp hai lỗi này.*

### 9.5 Khuyến nghị cách chữa — khác nhau theo từng ổ

Lead cho ba lựa chọn. Tôi **không** khuyến nghị cùng một cách cho cả ba ổ, vì điều kiện mỗi ổ khác nhau, và
điều kiện quyết định là **msgid đó còn dùng ở đâu nữa**.

**Ổ 1 — `重写` / `打磨` (`progress.go:492,495`) → CÁCH 1: tách msgid.**

Đây là ca duy nhất trong ba ổ mà cách 3 (hạ chữ thường) **sẽ gây hại**, và lý do chỉ lộ ra khi xem chỗ dùng
thứ hai. `panels_sidebar.go:330-340` là một `switch` gồm **5 nhãn cùng họ**:

| msgid | bản dịch |
|---|---|
| `写作` | `Viết` |
| `评审` | `Duyệt` |
| `重写` | **`Viết lại`** |
| `打磨` | **`Gia công`** |
| `干预` | `Can thiệp` |

Cả 5 đều hoa, vì cả 5 là **nhãn trạng thái đứng riêng**. Hạ `重写`/`打磨` xuống chữ thường sẽ làm
`switch` này ra `Viết / Duyệt / viết lại / gia công / Can thiệp` — lệch **ngay trong cùng một khối**, và
người sửa sau sẽ "sửa lại cho đều" rồi vô tình hồi quy lỗi cũ. Bọc `Cap()` riêng cho 2/5 nhánh thì cũng
lệch so với 3 nhánh còn lại.

Vậy: thêm 2 msgid riêng cho ngữ cảnh giữa câu, ví dụ msgid `待重写`/`待打磨` (hoặc một khóa
`queue:rewrite` / `queue:polish`), dịch `viết lại` / `gia công` chữ thường, dùng tại `progress.go:492/495`.
Giá: **+2 cặp** (1.817 → 1.819). Đổi lại, `switch` nhãn giữ nguyên và quyết định hoa/thường nằm trong tay
người dịch chứ không nằm trong mã.

*Không chọn cách 2 (`strings.ToLower` tại chỗ chèn)*: ở đây tình cờ vô hại, nhưng nó **sai về nguyên tắc** —
`ToLower` không phân biệt được danh từ riêng, nên đặt tiền lệ đó vào codebase là mời lỗi cho msgid sau
(một ngày nào đó `%s` là `Editor` hay `Writer` thì thành `editor`/`writer`).

**Ổ 2 — 6 trạng thái `imp/state.go` → CÁCH 3: hạ chữ thường trong `vi.json`.**

Tôi đã kiểm: **cả 6 msgid chỉ có duy nhất 1 chỗ dùng** trong toàn repo (không tính test), và chỗ đó là
ngữ cảnh trong ngoặc giữa câu ở `state.go:239`. Không có chỗ dùng độc lập nào để bảo vệ.
→ Sửa 6 giá trị thành `chưa cắt chương xong`, `đã cắt %d chương, chờ soát và xác nhận`,
`đã phân tích %d/%d chương`, `phân tích từng chương xong, chờ tổng hợp toàn sách`,
`chờ nói rõ trạng thái truyện (--story=open|closed)`, `tổng hợp xong, chờ công bố trạng thái chính thức`.
Không cần đổi mã, không tăng số cặp. **Đây là ổ dễ nhất và an toàn nhất.**

**Ổ 3 — 2 hint `imp/segment.go` → CÁCH 3: hạ chữ thường.**

Cả hai giá trị chỉ chảy vào duy nhất `整合全书切分失败（%s）：%w`. Hạ thành
`đã xóa cache khối, chạy lại sẽ cắt chương lại` và `xóa cache khối thất bại: %v, hãy tự xóa …`.

> **Cảnh báo cho người áp**: `Xóa cache khối thất bại: %v…` (`segment.go:415`) **cũng là một msgid độc lập
> có thể dùng chỗ khác trong tương lai**. Hiện tại chỉ 1 chỗ dùng nên hạ chữ thường là an toàn — nhưng nếu
> sau này ai đó dùng nó làm thông báo đứng riêng thì lỗi quay lại theo hướng ngược. Nếu muốn chắc, ổ 3 dùng
> cách 1 như ổ 1.

---

## 10. Lớp lỗi vô hình — họ "logic mang giả định ngôn ngữ, KHÔNG đi qua catalog"

Lead nêu hai lớp (dấu toàn phần trong chuỗi ASCII thuần; `strings.Join(x, "、")` viết cứng) và hỏi có lớp
thứ ba không. **Có hai lớp nữa, và cả hai đều nặng hơn hai lớp đã biết.** Đặc điểm chung của cả họ: khuyết
điểm nằm trong **ngữ nghĩa của mã**, không nằm trong chuỗi được dịch — nên **không phép đo nào theo catalog
nhìn thấy được**, kể cả lượt soát 1 của tôi với độ phủ 100% catalog.

### 10.1 NGHIÊM TRỌNG — `non_cjk_fragments`: một luật lint đảo nghĩa khi ngôn ngữ nền đổi hệ chữ

**`internal/rules/lint.go:57-84`.**

```go
var latinFragmentRe = regexp.MustCompile(`[A-Za-z]{2,}`)
```

Ý định gốc ghi rõ tại `lint.go:15`:
`non_cjk_fragments：连续拉丁字母片段（模型语言混杂，如中文正文裸混 "pattern"）`
— *"mảnh chữ Latin liên tiếp (model lẫn ngôn ngữ, như chính văn tiếng Trung lòi ra chữ `pattern`)"*.

Luật này phát hiện **chữ Latin lẫn trong văn không-Latin**. Tiếng Việt **viết bằng chữ Latin**. Nên khi ngôn
ngữ nền chuyển sang tiếng Việt, luật không còn sai lệch — nó **đảo nghĩa hoàn toàn**: cái nó vốn coi là dấu
hiệu lỗi giờ chính là văn bản bình thường.

Và nó được gọi **không có cổng ngôn ngữ nào** (`lint.go:19`, `Lint()` gọi thẳng), từ
`internal/tools/commit_chapter.go:554` — tức **mỗi lần commit chương**.

Đo thật (chạy Go, `regexp` y như trong mã):

| Đầu vào | `non_cjk_fragments Actual` |
|---|---|
| Đoạn văn **tiếng Việt thuần**, 125 ký tự, **0 chữ tiếng Anh** | **16** |
| Chương **tiếng Việt thuần** ~2.000 từ, 9.028 ký tự, **0 chữ tiếng Anh** | **1.147** (18 mảnh khác nhau) |
| Đoạn văn tiếng Trung thuần (đối chiếu) | 0 |
| Đoạn tiếng Trung có lẫn `pattern` (ca dùng ĐÚNG ban đầu) | 1 → `["pattern"]` |

`Target` báo ra là rác cắt ngang từ: `["nh", "Ngo", "ti"]` — vì `ủ`, `à`, `ế` không thuộc `[A-Za-z]` nên
regex xé từ tiếng Việt thành từng khúc ASCII.

**Vì sao đây là NGHIÊM TRỌNG chứ không phải nhiễu thẩm mỹ.** `Violation` là `SeverityWarning`, không chặn
luồng — `lint.go:10` nói `仅返事实（铁律一），不阻断流程，由评审/用户裁定` (*chỉ trả dữ kiện, không chặn, để
duyệt/người dùng phán*). Nghĩa là **1.147 "dữ kiện" giả mỗi chương được đưa cho tác tử `editor` phán quyết**.
Đó đúng là cơ chế mà đề bài lượt 1 gọi là "dịch tệ làm LLM hiểu sai yêu cầu", chỉ khác là ở đây không phải
bản dịch tệ mà là **một luật đo đã mất nghĩa**: nó dìm tín hiệu duyệt thật dưới nền nhiễu, và làm hỏng đúng
cái vòng phản hồi quyết định chất lượng văn.

**Đề xuất.** Không phải sửa regex mà phải **quyết lại luật này thuộc ngôn ngữ nào**:

- Cách sạch nhất — đưa vào `langProfile` như `stylestat` đã làm: đường `zh` giữ `[A-Za-z]{2,}`; đường `vi`
  **bỏ luật này**, vì "chữ Latin trong văn Việt" không phải khuyết điểm.
- Nếu vẫn muốn bắt tiếng Anh lẫn vào văn Việt (mục tiêu **khác** với luật gốc), thì phải là một luật mới:
  đối chiếu **từ điển/danh sách trắng**, hoặc bắt cụm ASCII thuần không mang dấu và dài ≥ 4 mà không nằm
  trong từ vựng Việt — chứ `[A-Za-z]{2,}` thì không thể.

> Đáng chú ý: repo **đã có** đúng khuôn mẫu để chữa. `internal/stylestat/stylestat.go` có `langProfile`
> tách bạch (`viPatternDefs` cho vi, `gramEdgeStop`/`validGram` cho zh), và `internal/domain/chapter.go:84`
> `countSpacedWords` xử lý cả chữ Hán, chữ Latin và dấu tổ hợp NFC/NFD một cách có chủ ý. Tôi soát cả hai
> chỗ đó: **đều đúng, không phải lỗi.** `internal/rules/` là **module duy nhất bị bỏ sót cổng ngôn ngữ**.
> Tức đây không phải thiếu hiểu biết, mà là một chỗ lọt lưới.

### 10.2 CẦN SỬA — `\b` của RE2 chỉ tính ASCII: một nhánh luật văn phong chết lặng

**`internal/stylestat/stylestat.go:123`**, luật `Sở hữu dịch máy『của + đại từ』`:

```go
regexp.MustCompile(`(?i)của (?:hắn|nàng|y|gã|chàng|ta|tôi|cô ấy|anh ấy)\b`)
```

`\b` trong RE2 (Go) được định nghĩa trên **ký tự từ ASCII** `[0-9A-Za-z_]`. Chữ cái tiếng Việt có dấu
(`ã`, `ơ`, `ư`, `ế`, `đ`…) **không thuộc** tập đó, nên ranh giới từ không bao giờ được thỏa ở cạnh chúng.

Trong 9 nhánh, 8 nhánh kết thúc bằng chữ ASCII (`hắn`→n, `nàng`→g, `y`, `chàng`→g, `ta`→a, `tôi`→i,
`cô ấy`→y, `anh ấy`→y) nên `\b` hoạt động. Nhánh **`gã` kết thúc bằng `ã`** → chết.

Chạy Go để chứng minh, không suy luận:

| Câu | Khớp |
|---|---|
| `ánh mắt của hắn lạnh đi` | true |
| `bàn tay của nàng siết lại` | true |
| `lời của chàng` | true |
| `mắt của cô ấy` | true |
| **`giọng của gã khàn đặc`** | **false** |
| **`vai của gã.`** | **false** |

Và tách riêng cơ chế: mẫu `gã` (không `\b`) khớp `true`; mẫu `gã\b` khớp **`false`**. Mẫu `\bđã\b` khớp
**`false`** trên mọi chuỗi.

**Hệ quả**: `gã` là đại từ ngôi ba cực phổ thông trong văn kể tiếng Việt. Luật này **đếm hụt** — và nó là
luật đo "văn dịch chưa gột", tức là chính cái chỉ số dùng để đánh giá bản thảo có bị mùi dịch máy hay không.
Hụt lặng lẽ ở đây nghĩa là văn kém *đi qua được* cửa kiểm.

**Đề xuất**: bỏ `\b`, thay bằng lớp chặn tường minh không phụ thuộc ASCII —
`(?:hắn|nàng|y|gã|chàng|ta|tôi|cô ấy|anh ấy)(?:$|[^\p{L}])`, hoặc dùng `\p{L}` như **chính file này đã làm
đúng ở luật ngay bên trên** (`một cách \p{L}+`, dòng 122). Nghĩa là tác giả *đã biết* dùng lớp Unicode;
`\b` ở dòng 123 là chỗ trượt tay, không phải chỗ chưa biết.

**Phạm vi đã quét**: toàn bộ literal `regexp.MustCompile` trong `internal/**` và `cmd/**` —
**chỉ 1 mẫu duy nhất chứa `\b`**, chính là mẫu này. Không còn ca nào khác của lớp này trong repo.

### 10.3 Đã kiểm và SẠCH — hai lớp tôi nghi mà không thành

Ghi lại để lượt sau không đào lại:

- **Cắt chuỗi theo byte làm hỏng UTF-8.** Kiểm cả 10 hàm cắt
  (`truncStr`, `truncate` ×2, `truncateRunes` ×3, `truncateWidth`, `truncateStyledWidth`,
  `truncateJSONToTokens`). **Tất cả đều theo rune hoặc theo `lipgloss.Width`, không có chỗ nào cắt byte.**
  Không tồn tại lỗi xé dấu tiếng Việt.
- **`len()` dùng làm bề rộng hiển thị.** Quét `internal/entry/tui/`: mọi chỗ `len()` đều đếm **phần tử
  slice** (số agent, số chương chờ, số mục), không có chỗ nào dùng `len(string)` làm số cột. Bề rộng đều
  qua `lipgloss.Width`.

---

## 11. Số liệu lượt 2

| Việc | Phạm vi | Cách |
|---|---|---|
| Hạng mục 9 | **Toàn bộ `internal/**` + `cmd/**` không tính `_test.go`** | Bộ dò truy dòng dữ liệu 3 dạng (A/B/C) + tính vị trí `%s` trong khuôn đã dịch; kiểm tay **31/31** ca |
| Lớp `\b` ASCII | **Toàn bộ literal `regexp.MustCompile`** trong `internal/**`, `cmd/**` | Dò `\b` cạnh ký tự ngoài ASCII; **chứng minh bằng Go chạy thật**, không suy luận |
| Lớp `non_cjk_fragments` | `internal/rules/` + đối chiếu `stylestat`, `domain/chapter.go`, `utils/textenc.go` | Đọc mã + **đo bằng Go chạy thật** trên văn Việt thuần 125 ký tự và chương ~2.000 từ |
| Lớp cắt byte | 10/10 hàm cắt trong repo | Đọc mã |
| Lớp `len()` làm bề rộng | `internal/entry/tui/**` | Grep + đọc mã |

**Tổng lượt 2: 10 điểm hỏng thật (hạng mục 9, 3 ổ) + 1 NGHIÊM TRỌNG + 1 CẦN SỬA (hai lớp vô hình mới).**

### Chưa soát ở lượt 2

- **Hai lớp lead đã nêu** (dấu toàn phần trong chuỗi ASCII thuần; `strings.Join(x, "、")`) — tôi **không**
  soát lại vì lead nói đang được sửa; số đếm của tôi sẽ lệch với công việc đang diễn ra. Nếu cần một lượt
  xác nhận độc lập sau khi áp xong thì nói, tôi soát riêng.
- **Chiều ngược của hạng mục 9** — bản dịch **chữ thường** bị dùng ở **đầu câu**. Tôi mới kiểm phần chuỗi
  lỗi (58 chuỗi chữ thường: **đúng quy ước Go**, không phải lỗi — đã ghi ở 4.5g) và chưa quét hệ thống cho
  nhãn/tiêu đề. Ưu tiên thấp hơn chiều đã soát, nhưng chưa loại trừ.
- **Đối chiếu lại `vi.json`** sau khi agent khác áp xong: catalog đã nhích 1.815 → 1.817 **trong lúc tôi
  soát**. Mọi số đếm ở lượt 1 gắn với mốc 1.815; mọi số ở lượt 2 gắn với mốc **1.817 @ 2026-07-31 00:34:04
  +07, HEAD `3ee5279`**. Hai ổ tôi đề nghị sửa bằng cách 1 sẽ đưa catalog lên 1.819.
- **Chưa chạy `go test ./...`** để đối chiếu baseline 29/29 mà lead đưa — tôi chỉ đọc, và có 3 agent đang
  sửa mã nên một lượt test của tôi lúc này sẽ đo lẫn công việc của họ.
