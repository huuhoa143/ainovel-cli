# Kiểm thử toàn tuyến (E2E) — bản việt hóa ainovel-cli

Phạm vi: `internal/e2e/` (LLM giả, chạy được ngay, không cần khóa) + danh sách việc phải làm tay khi có
khóa API thật.

Cách chạy phần tự động:

```bash
go test ./internal/e2e/ -count=1 -v
```

`-count=1` là **bắt buộc**. Không có nó Go trả kết quả từ cache và bạn sẽ đọc lại một lần chạy cũ — lỗi
này đã xảy ra thật trong dự án này.

---

## 0. Kết luận một dòng

Phần **đường ống** đã có bằng chứng tự động khá chắc: engine thật viết trọn một truyện 6 chương ở locale
tiếng Việt, mọi giai đoạn đúng thứ tự, store đọc lại được, bản xuất sạch chữ Hán, và bộ chống giọng-AI
phân biệt được văn-nhồi-tật với văn-sạch. Phần **chất lượng văn thì chưa có một dòng bằng chứng nào** —
không ai trong toàn bộ lượt việt hóa này đã đọc một chương do mô hình thật sinh ra. Với một công cụ viết
truyện thì đó là thứ duy nhất đáng đo, nên **phần B là phần quan trọng hơn phần A**, và nó chưa được làm.

Ngoài ra lượt kiểm này tìm ra **2 lỗi thật trong `internal/rules/`** — cả hai làm bộ chống giọng-AI báo bừa
hoặc chết lặng trên đúng văn tiếng Việt. **Cả hai đã được sửa**, và hai test vạch ra chúng giờ là chốt chống
hồi quy (mục A.4). Đừng nới chúng.

Báo cáo này có ba phần: **A** (đã kiểm tự động được gì), **B** (còn phải kiểm tay bằng gì — phần cần nhất),
và **C** (lượt soát thứ hai, do một lượt khác bổ sung, có thêm lỗi mới P1/P2).

---

# PHẦN A — Đã kiểm tự động được gì

## A.1 Trạng thái hiện tại của bộ test

| Test | Tệp | Kết quả |
|---|---|---|
| `TestVongDoiSachTiengViet` | `book_vi_test.go` | ✅ |
| `TestHeadlessBaoLoiKhoaSaiBangTiengViet` | `headless_vi_test.go` | ✅ |
| `TestHeadlessThieuCauHinhBaoRoRang` | `headless_vi_test.go` | ✅ |
| `TestLoiDaBiet_ToolRoTiengTrungVaoNguCanhModel` | `loi_da_biet_test.go` | ✅ |
| `TestToneKiemCoHocPhanBietVanSachVoiVanNhoiTat` | `antitone_vi_test.go` | ✅ |
| `TestToneThongKeToanSachVaoNguCanh` | `antitone_vi_test.go` | ✅ |
| `TestToneHeSoChuHanSangTuViet` | `antitone_vi_test.go` | ✅ |
| `TestToneXuatBanKhongAnMatDongMoDau` | `antitone_vi_test.go` | ✅ |
| `TestToneLintKhongBaoBuaTrenVanTiengViet` | `antitone_vi_test.go` | ✅ (đỏ khi viết → đã sửa, xem A.4.1) |
| `TestToneTuGayMoiBatCaKhiVietHoaDauCau` | `antitone_vi_test.go` | ✅ (đỏ khi viết → đã sửa, xem A.4.2) |

Cả gói chạy hết trong ~3,3 giây, **10/10 xanh**.

Chạy toàn repo (`go test ./... -count=1`): **29 gói xanh, 1 gói đỏ** — `internal/i18n`
(`TestNguonKhongVietCungDauTiengTrung`, về dấu câu toàn phần `（）；『』` trong mã nguồn). Gói đỏ đó **không
liên quan** đến lượt này: nó là test mới của một lượt việt hóa khác đang chạy song song, và không một tệp
nào của phần E2E dính vào nó.

## A.2 Kiến trúc: LLM giả đặt ở ranh giới HTTP, không stub ChatModel

Server giả (`fakellm_test.go`) là một endpoint OpenAI-compatible thật, cắm vào `base_url`. Nhờ vậy
`host.New → bootstrap.NewModelSet → litellm → agents.BuildWorkers → engine → worker → tool → store →
export` **đều là mã sản xuất**; đúng một thứ là giả: chữ mà mô hình trả về.

Điều này quan trọng vì nó kiểm được hai thứ không test nào khác trong repo kiểm:

- **System prompt THẬT đến tay mô hình** có phải tiếng Việt không (lấy từ `assets/` đã việt hóa) — prompt
  còn tiếng Trung thì mô hình sẽ viết tiếng Trung dù mọi chuỗi giao diện đã dịch xong;
- **Kết quả tool tiêm vào ngữ cảnh** (`novel_context`: `user_rules`, `style_stats`, tóm tắt) có sạch không.

## A.3 Đã kiểm được, theo từng mục đề bài

### A.3.1 Luồng không vỡ — ✅

`TestVongDoiSachTiengViet`: engine thật viết 6 chương. Chuỗi giai đoạn **do `flow.Route` quyết định, không
do test dàn xếp**:

```
writer ×5 (mỗi chương: novel_context → plan_chapter → draft_chapter → check_consistency → commit_chapter)
→ editor (duyệt toàn cục, cửa mở ở chương thứ ReviewInterval=5)
→ writer ×1 (chương 6)
→ commit_chapter tự chốt hoàn thành → engine tự dừng
```

Khẳng định kèm theo: `Phase=Complete`, đủ 6 chương, editor được phái **đúng 1 lần** (0 = cơ chế chết;
>1 = `HasGlobalReview` không được ghi nhận), architect **0 lần** (sách không phân tầng phải tự chốt),
Arbiter **0 lần** (gọi Arbiter nghĩa là có worker thất bại hoặc bế tắc), `chapters/NN.md` đọc lại được và
đúng nội dung đã gửi.

### A.3.2 Bộ chống giọng-AI trên văn tiếng Việt — ✅ (có đối chứng hai chiều)

Đây là mục tôi tập trung, vì "bắt được tật" mà không có ca đối chứng thì vô nghĩa: **một bộ bắt mọi thứ
cũng bắt hết văn hay.**

Máy chống giọng-AI có hai nửa, và cả hai đều được kiểm qua tool thật:

| Cơ chế | Chạy ở đâu | Đường tới mô hình | Test |
|---|---|---|---|
| `rules.Check` + `rules.Lint` | `commit_chapter → checkRules` | `meta/rule_violations.jsonl` → editor đọc qua `novel_context` | `TestToneKiemCoHocPhanBietVanSachVoiVanNhoiTat` |
| `stylestat.Compute` | `novel_context → buildStyleStats` | `episodic_memory.style_stats` trong prompt | `TestToneThongKeToanSachVaoNguCanh` |

**Ca bắt được tật.** Văn nhồi tật (`vanNhoiTat` trong `corpus_test.go`, tiếng Việt, cố tình nhồi đủ 5 lớp:
so sánh sáo, mẫu thần thái, phản ứng cơ thể, đánh dấu suy nghĩ, liên từ nghị luận) đi qua
`draft_chapter → commit_chapter` thật:

- `rules.Check` bắt `fatigue_words{"im lặng" limit=2 actual=3}`;
- phán quyết **xuống được ổ đĩa** (`meta/rule_violations.jsonl`) — đây mới là đường editor đọc, chứ không
  phải giá trị trả về của `commit_chapter`: writer hard-stop ngay sau commit nên giá trị trả về không ai đọc;
- `stylestat` gọi tên đúng các mẫu tiếng Việt: `So sánh sáo`, `Mẫu thần thái`, `Đánh dấu suy nghĩ`.

**Ca không báo bừa.** Sáu chương văn kể sạch (`chuongSach`): `rules.Check` ra **0** `fatigue_words`, **0**
`forbidden_phrases`; `stylestat` **không dựng cờ** `Mẫu thần thái` / `Phản ứng cơ thể` / `Sáo trừu tượng` /
`So sánh sáo`.

**Ca im lặng đúng lúc.** 4 chương (< `stylestat.minChapters=5`) thì `style_stats` **không** được tiêm.
Không có ca này thì con số 5 chỉ là tình cờ.

> **Một cái bẫy đo lường đáng ghi lại.** Lượt viết đầu tôi khẳng định bằng `strings.Contains` trên cả tài
> liệu `novel_context` và hai ca đối chứng đỏ oan. Nguyên nhân: `novel_context` tiêm nguyên văn
> `assets/references/anti-ai-tone.md`, mà bản hướng dẫn ấy **gọi tên đủ mọi mẫu tật** để dạy mô hình
> tránh — nên tìm chuỗi trên cả tài liệu thì mẫu nào cũng "có mặt". Bản hiện tại bóc JSON và khẳng định
> trên `episodic_memory.style_stats.patterns`. Ai viết thêm test ở đây đừng lặp lại lỗi đó.

### A.3.3 Đếm từ đúng đơn vị — ✅

Hệ số chữ Hán → từ tiếng Việt **đo được ~1,0**, nên ngưỡng số của upstream (từ gây mỏi, `shortEndingLen`,
`minRepeatLen`) giữ nguyên là đúng. Không nhân thêm hệ số nào.

`TestToneHeSoChuHanSangTuViet` phát biểu điều đó thành khẳng định chạy được:

- `他站在桥头望着河水` = 9 chữ Hán ↔ `Hắn đứng ở đầu cầu nhìn dòng nước` = 8 từ → **hệ số 0,89**, chặn trong
  khoảng 0,7–1,4 (nói "cùng bậc độ lớn", không giả vờ chính xác hơn thực tế);
- `domain.WordCount` ở locale vi phải đếm chữ Hán **rời từng chữ**, để văn lẫn hai thứ tiếng vẫn cùng đơn vị;
- tỉ lệ rune/từ của 6 chương corpus phải nằm trong 3,0–6,0 — chặn dưới bắt đúng lỗi "WordCount lại đếm rune".

`TestVongDoiSachTiengViet` kiểm cùng chuyện ở tầng progress: `ChapterWordCounts[ch]` phải khớp với đếm lại
trên chính terminal, và `TotalWordCount` phải bằng tổng từng chương (đo được: 6 chương / 2.347 từ).

Vì sao cần test này chứ không chỉ một dòng chú thích: hệ số ~1,0 là **giả định nền** cho mọi ngưỡng. Nếu
`domain.WordCount` đổi cách đếm, hệ số trượt và mọi ngưỡng lệch theo mà **không một test nào đỏ** — sai
lặng lẽ, đúng kiểu tệ nhất.

### A.3.4 Bóc số chương tiếng Việt — ✅ (kể cả ca bẫy)

| Ca | Ở đâu | Trạng thái |
|---|---|---|
| `extractChapter("Viết chương 3")` → `writer-ch03.jsonl` | `internal/store/session_chapter_test.go` | ✅ đã có sẵn (unit) |
| `"# Chương Ba Đào"` **không** được đọc thành chương 3 | `internal/host/exp/txt_chapter_title_test.go:34` | ✅ đã có sẵn (unit) |
| Cùng ca bẫy đó, qua **đường xuất bản thật** | `TestToneXuatBanKhongAnMatDongMoDau` | ✅ **mới** |

Ca mới chạy `exp.Run` — đúng hàm mà `host.Export` gọi — trên một store có 3 chương:

1. chương 1 mở đầu bằng `# Chương Ba Đào` (chữ của tác giả, "Ba Đào" là tên đất): dòng này **phải còn
   nguyên** trong bản xuất;
2. chương 2 mở đầu bằng `# Chương 2` (tiêu đề thật): **phải bị bóc**, vì bộ xuất bản tự lắp dòng tiêu đề —
   giữ lại là lặp hai lần. Ca đối chứng này bắt buộc, không có nó thì ca (1) chỉ chứng minh regex
   khớp-không-gì, tức đã tắt hẳn cơ chế;
3. thân bài chương 2 **không được bị ăn** theo dòng tiêu đề.

Vì sao đáng kiểm lại ở tầng E2E dù unit đã xanh: lỗi loại này **không báo gì cả**. Nó chỉ lặng lẽ làm mất
một dòng trong bản thảo, và chỉ lộ ra khi có người đọc bản xuất.

## A.4 Hai lỗi thật tìm được — **đã sửa**, test giờ là chốt chống hồi quy

Cả hai là lỗi **riêng của bản việt hóa**: upstream tiếng Trung không thể gặp. Cả hai được tìm ra bằng cách
viết test khẳng định hành vi ĐÚNG rồi để nó đỏ; sau đó `internal/rules/` được sửa và hai test chuyển xanh.
Từ giờ chúng là chốt chống hồi quy — **đừng nới chúng thành khẳng định hành vi hiện tại**.

Hai lỗi này đáng đọc kỹ vì chúng cùng một họ, và họ đó sẽ còn tái diễn ở bản việt hóa: **một luật cơ học
được viết với giả định ngầm về hệ chữ của thân bài, rồi bản dịch đổi hệ chữ mà luật không đổi theo.** Cùng
họ với lỗi đã sửa ở commit `fa56ca8` ("một nửa cơ chế sống, một nửa chết").

### A.4.1 `non_cjk_fragments` báo trên 100% chương tiếng Việt

`internal/rules/lint.go:57`

```go
var latinFragmentRe = regexp.MustCompile(`[A-Za-z]{2,}`)
```

Quy tắc này sinh ra để bắt mô hình lẫn tiếng Anh vào văn tiếng **Trung**. Ở locale vi thì **cả thân bài là
chữ Latin**, nên nó báo trên mọi chương. Đo thật trên 6 chương văn mẫu sạch:

| Chương | `Actual` | Ví dụ `Target` |
|---|---|---|
| 1 | 204 | `kh, ng, xanh` |
| 2 | 231 | `Tr, sau, ng` |
| 3 | 213 | `Khang, ng, trong` |
| 4 | 210 | `gi, ng, xu` |
| 5 | 216 | `Ch, ch, trong` |
| 6 | 202 | `ng, ph, qua` |

Hệ quả không phải chỉ là tiếng ồn: `commit_chapter → checkRules` gắn violation này cho **mỗi** chương, rồi
`SaveRuleViolations` ghi nó xuống `meta/rule_violations.jsonl`, rồi editor đọc lại qua `novel_context`. Nó
không chặn luồng (đúng như chú thích của hàm), nhưng nó **dạy editor rằng chương nào cũng có tật cơ học** —
và làm chìm những violation thật nằm cùng danh sách.

**Đã sửa** bằng cách chọn bộ nhận theo `i18n.Active()`, cùng khuôn `domain.WordCount` và
`rules.fatigueWords`:

- `zh`: giữ `latinFragmentRe = [A-Za-z]{2,}`;
- `vi`: đảo chiều thành `hanFragmentRe = \p{Han}+` — bắt **chữ Hán còn sót**.

Hai chi tiết của bản sửa đáng biết:

- **Không có `{2,}` ở nhánh vi.** Ngưỡng 2 ở nhánh zh là để tha chữ Latin lẻ hợp lệ. Ở nhánh vi thì **một**
  chữ Hán đã là lỗi — đặt ngưỡng 2 sẽ tha đúng ca hay gặp nhất (một chữ `的` sót giữa câu).
- **Tên luật giữ nguyên `non_cjk_fragments`** dù ở nhánh vi nó bắt đúng chiều ngược lại. Đó là giá trị đã
  ghi xuống `meta/rule_violations.jsonl` (append-only) và `LoadRuleViolations` đọc lại cho editor; đổi tên
  là bỏ mồ côi mọi bản ghi cũ, im lặng, không lỗi. Đọc đúng nghĩa của tên là *"mảnh chữ không thuộc hệ chữ
  của thân bài"*.

### A.4.2 Bảng từ gây mỏi chết lặng với mọi từ mở câu

`internal/rules/checker.go:77` — `appendFatigueWords` dùng `strings.Count`, **phân biệt hoa thường**:

```go
n := strings.Count(text, word)
```

Bảng ở `internal/rules/snapshot.go:220` toàn chữ thường. Nhưng bốn mục trong bảng — `ngoài ra` (ngưỡng 1),
`tuy nhiên` (2), `thế nhưng` (2), `bên cạnh đó` (1) — **bản chất là liên từ mở câu**, nên trong văn thật
chúng gần như luôn viết hoa. Bốn ngưỡng ấy chết lặng.

Đo: `«Tuy nhiên,»` mở câu **4 lần** (gấp đôi ngưỡng 2) → `rules.Check` trả **0 violation**.

Đây là lỗi riêng của bản việt hóa vì **tiếng Trung không có chữ hoa**, nên `strings.Count` với bảng tiếng
Trung không bao giờ gặp vấn đề này.

Đáng chú ý: chú thích ngay tại `snapshot.go:221` **tự đặt ra yêu cầu** *"Phải khớp với bộ mẫu của stylestat
để một bên dạy và một bên đo cùng một thứ"* — mà `stylestat` dùng `(?i)` ở cả 11 mẫu
(`internal/stylestat/stylestat.go:114-124`), `checker` thì không. Hai lớp nói là đo cùng một thứ nhưng một
bên phân biệt hoa thường, một bên không.

**Đã sửa:** `Check` hạ chữ toàn văn **một lần** rồi truyền xuống cả `appendForbiddenPhrases` và
`appendFatigueWords` (hạ trong vòng lặp là 16 lần cấp phát trên toàn văn mỗi chương); cụm/từ trong bảng cũng
được hạ tại chỗ so khớp, để chịu được bảng do người dùng tự khai. `Target` vẫn trả **nguyên văn** người dùng
khai nên bản ghi và hiển thị không đổi.

Ba điểm của bản sửa đáng biết:

- **`forbidden_phrases` cũng được sửa, và nó nặng hơn `fatigue_words`** — nó là `SeverityError`, còn từ gây
  mỏi chỉ là `warning`. Cụm bị cấm tiếng Việt cũng thường mở câu ("Đáng chú ý là…").
- **`forbidden_chars` CỐ Ý không hạ chữ.** Đó là ký tự do người dùng tự khai, và hoa/thường ở đó có thể là
  chủ ý (cấm đúng một biến thể). Hạ chữ giúp bắt rộng hơn nhưng là quyết định thay người dùng.
- **Nhánh zh không có rủi ro hồi quy:** `strings.ToLower` không đổi chữ Hán, nên đường gốc giữ nguyên hành
  vi từng byte.

**Việc còn lại cho lần chạy tay (B.3):** bốn ngưỡng `ngoài ra`=1, `tuy nhiên`=2, `thế nhưng`=2,
`bên cạnh đó`=1 **được đặt khi cơ chế đang chết**, nên chưa ai biết chúng có hợp lý trên văn thật không. Sau
khi sửa, chúng bắt đầu bắt thật — hãy xem chúng có báo bừa trên văn tốt không rồi mới quyết nới hay giữ.

## A.5 Điều LLM giả KHÔNG kiểm được — đọc kỹ mục này

Đừng đọc phần A thành bảo chứng chất lượng. Cụ thể những gì phần A **không** nói gì về:

1. **Chất lượng văn.** Mọi đoạn văn trong `internal/e2e/` do người viết. Phần A chứng minh **đường ống**
   đúng và bộ kiểm **phân biệt được hai mẫu đã biết trước đáp án**. Nó không nói mô hình thật viết ra loại nào.
2. **Mô hình có TUÂN prompt tiếng Việt không.** Server giả luôn trả tiếng Việt vì ta bảo nó thế. Phần A
   chứng minh prompt gửi đi là tiếng Việt; **chỉ khóa thật trả lời được** là mô hình có viết tiếng Việt.
   Và lưu ý: phần A chứng minh *system prompt* là tiếng Việt, **không** chứng minh mọi chữ gửi cho mô hình
   là tiếng Việt — mục C.1 tìm ra `next_step` của hai tool vẫn còn tiếng Trung.
3. **Bộ kiểm có phán quyết hợp lý trên văn THẬT không.** Ca đối chứng của phần A dùng hai mẫu ở hai đầu
   cực (nhồi đặc tật / sạch hẳn). Văn mô hình thật nằm ở giữa, và đó là chỗ báo bừa/bỏ sót thật sự xảy ra.
4. **Đường phi-happy-path của provider:** rate limit, cắt giữa stream, mô hình từ chối, JSON hỏng, tool
   call sai schema, ngữ cảnh tràn. (Ca khóa sai 401 **đã có**.)
5. **Chi phí và thời gian thật.**
6. **Sách dài / phân tầng.** Phần A chỉ chạy sách 6 chương không phân tầng. Toàn bộ đường `layered_outline`
   → `expand_arc` → `append_volume` → tóm tắt vòng/tập → `complete_book` **chưa có E2E nào**.

---

# PHẦN B — Còn phải kiểm bằng tay bằng gì

Đây là phần giao lại cho người có khóa API. Mỗi bước có tiêu chí **đạt / không đạt** cụ thể, để không ai
phải phán "xem có ổn không".

## B.0 Chuẩn bị

Cấu hình: `~/.ainovel/config.json` (hoặc `./.ainovel/config.json` cho từng dự án — lớp dự án ghi đè lớp
toàn cục). Mẫu: `config.example.jsonc`.

Chạy không giao diện, dễ chép log nhất:

```bash
go run ./cmd/ainovel-cli --headless --prompt "…yêu cầu sáng tác…"
```

Thư mục ra mặc định `output/novel/`. Sau mỗi lượt chạy headless, hệ thống **tự** ghi một báo cáo đã bôi đen
tại `output/novel/meta/diag-export.md` (đã bỏ chính văn / prompt / suy nghĩ — dán vào issue được).

Bố cục store cần biết để soi:

| Đường dẫn | Nội dung |
|---|---|
| `chapters/NN.md` | chính văn terminal |
| `summaries/NN.json` | tóm tắt + tên chương |
| `premise.md`, `outline.json`, `characters.json`, `world_rules.json` | phần kiến trúc |
| `layered_outline.json` | dàn ý phân tầng (chỉ sách dài) |
| `timeline.json` / `.md`, `foreshadow_ledger.json` / `.md` | dòng thời gian, sổ manh mối |
| `reviews/*.json` | phán quyết của editor |
| `meta/progress.json` | giai đoạn, số chương, `ChapterWordCounts` |
| `meta/rule_violations.jsonl` | phán quyết cơ học từng chương |
| `meta/decisions.jsonl` | sổ phán quyết (`plan_start`, `volume_end`, thất bại) |
| `meta/cast_ledger.json` | sổ nhân vật phụ tích lũy |
| `meta/compass.json` | hướng kết thúc |
| `meta/pending_commit.json` | commit chưa xong (chỉ có khi bị ngắt) |
| `meta/diag-export.md` | báo cáo chẩn đoán đã bôi đen |
| `meta/sessions/agents/*.jsonl` | log từng lượt gọi mô hình theo vai |

Đọc bằng giao diện web: `go run ./cmd/ainovel-cli serve` → `http://127.0.0.1:8420`.

> **Cảnh báo trước khi bắt đầu:** đừng chạy thẳng một cuốn dài. B1 là cuốn ngắn để bắt lỗi rẻ; chỉ sang B7
> khi B1–B6 đã đạt.

## B.1 Cuốn ngắn 5–6 chương — cửa đầu tiên

```bash
go run ./cmd/ainovel-cli --headless --prompt "Truyện ngắn 5 chương, bối cảnh làng quê Bắc Bộ những năm 1940, một người gác cầu đá và một người lạ mang giấy tờ đi tìm nhà cũ."
```

| Tiêu chí | Đạt | Không đạt → nghĩa là gì |
|---|---|---|
| Chạy đến `Phase=Complete` | `meta/progress.json` có `"phase":"complete"` | treo / dừng giữa: đọc `meta/diag-export.md` mục cuối |
| Đủ số chương | `chapters/01.md`…`05.md` đều tồn tại và không rỗng | thiếu file = `commit_chapter` không ghi terminal |
| Không gọi Arbiter vì thất bại | `meta/decisions.jsonl` chỉ có 1 bản ghi `"kind":"plan_start"` | có `"kind":"worker_failure"` = một worker thất bại (đọc `facts.error` / `facts.error_kind`); có `"kind":"deadlock"` = Route phái cùng một lệnh 3 lần liền mà không tiến |
| editor được phái đúng 1 lần | có `meta/sessions/agents/editor-*.jsonl` | 0 tệp = cửa duyệt toàn cục chết |

## B.2 AI có thật sự viết tiếng Việt không — cửa quan trọng nhất

Đây là chỗ kiểm xem việc việt hóa toàn bộ `assets/` (13 prompt + 15 reference + 4 style) **có tác dụng**
hay không. Phần A chỉ chứng minh prompt gửi đi là tiếng Việt.

```bash
python3 - <<'EOF'
import glob, re
han = re.compile(r'[㐀-䶿一-鿿豈-﫿]')
latin = re.compile(r'\b[A-Za-z]{3,}\b')
for f in sorted(glob.glob('output/novel/chapters/*.md')):
    s = open(f, encoding='utf-8').read()
    h, l = han.findall(s), set(latin.findall(s))
    print(f'{f}: han={len(h)} {h[:8]} | latin_words={len(l)} {sorted(l)[:10]}')
EOF
```

| Tiêu chí | Đạt | Không đạt → nghĩa là gì |
|---|---|---|
| **Chữ Hán trong chính văn** | `han=0` ở **mọi** chương | `han>0` = mô hình không tuân prompt, HOẶC có prompt/reference còn sót tiếng Trung — tìm tệp sót bằng đoạn python ở B.2.1 (BSD grep của macOS không có `-P`, đừng dùng `grep -P`) |
| **Từ tiếng Anh lạc** | `latin_words` chỉ chứa tên riêng cố ý (nếu có) | thấy `pattern`, `chapter`, `however`… = mô hình rơi về tiếng Anh giữa văn |
| **Tên chương** | `summaries/NN.json` → `title` là tiếng Việt | tiêu đề tiếng Trung/Anh = prompt architect chưa ăn |
| **Giao diện + bản xuất** | 0 chữ Hán trong `meta/diag-export.md` và bản `.txt` | (phần A đã chặn ca này với LLM giả — nếu vẫn rò thì là chữ do mô hình sinh, không phải chuỗi hệ thống) |

Nếu bước này không đạt thì **dừng lại**, đừng đo tiếp: mọi tiêu chí sau đều vô nghĩa trên văn sai ngôn ngữ.

> **Nghi phạm số 1 nếu B.2 không đạt — đọc mục C.1 trước khi đi tìm chỗ khác.**
> Lượt soát thứ hai tìm ra `next_step` trong kết quả `plan_chapter` / `draft_chapter` là **chuỗi tiếng
> Trung chưa bọc `i18n.F`** (`internal/tools/plan_chapter.go:97`, `internal/tools/draft_chapter.go:119`
> và `:136`). Đó không phải chuỗi giao diện — đó là **chỉ dẫn mà mô hình đọc và làm theo**, xuất hiện sau
> mỗi lần lập kế hoạch và mỗi lần viết nháp, ngay giữa một phiên tiếng Việt. Một mô hình yếu bị nhắc bằng
> tiếng Trung hai lần mỗi chương rất dễ trả lời bằng tiếng Trung.
>
> Trạng thái: **đã biết, chưa sửa**, đang chốt bằng `TestLoiDaBiet_ToolRoTiengTrungVaoNguCanhModel`. Nếu
> B.2 không đạt, hãy sửa C.1 trước rồi chạy lại — đừng kết luận "mô hình không nghe prompt" khi chỉ dẫn
> gửi cho nó vẫn còn tiếng Trung.

### B.2.1 Tìm tệp assets còn sót tiếng Trung

```bash
python3 - <<'EOF'
import glob, re
han = re.compile(r'[㐀-䶿一-鿿豈-﫿]')
for f in sorted(glob.glob('assets/**/*.md', recursive=True)):
    s = open(f, encoding='utf-8').read()
    h = han.findall(s)
    if h:
        print(f'{f}: {len(h)} chữ Hán — {"".join(dict.fromkeys(h))[:30]}')
EOF
```

Đạt: **không in ra dòng nào**.

Đo lúc viết báo cáo này: đoạn trên chạy trên toàn bộ `assets/**/*.md` (13 prompt + 15 reference + 4 style +
`voice.md` + `README.md`) và in ra **0 dòng** — assets hiện sạch tuyệt đối chữ Hán. Nên nếu bạn chạy lại mà
có dòng nào in ra thì đó là **hồi quy mới**, không phải ngoại lệ hợp lệ nào của thiết kế.

(Các cặp `『』` chứa mẫu câu tiếng Trung hợp lệ nằm ở `internal/i18n/locales/vi.json`, không ở `assets/` —
xem `docs/audit/proof-vietnamese.md` mục 2.1. Đừng lẫn hai chỗ.)

## B.3 Văn đọc như người Việt viết, hay như văn dịch

Đây là tiêu chí phải **đọc bằng mắt** — không có máy nào thay được. Nhưng đọc có hướng dẫn thì kết luận
mới lặp lại được. Đọc **trọn chương 1 và chương cuối**, rồi điền bảng:

| Dấu hiệu văn dịch | Cách đếm | Không đạt khi |
|---|---|---|
| `một cách + tính từ` ("cười một cách gượng gạo") | `grep -o 'một cách [a-zà-ỹ]*' chapters/*.md \| sort \| uniq -c` | > 2 lần/chương |
| `của + đại từ` thừa ("ánh mắt của hắn") | `grep -c 'của hắn\|của nàng\|của y' chapters/*.md` | > 5 lần/chương |
| Liên từ nghị luận mở câu ("Tuy nhiên,", "Bên cạnh đó,") | `grep -c '^Tuy nhiên,\|^Bên cạnh đó,\|^Mặt khác,' chapters/*.md` | > 1 lần/chương — văn kể không phải văn nghị luận |
| Câu bị động kiểu Anh ("được làm bởi") | đọc | xuất hiện ở văn kể |
| Đại từ nhân xưng đổi giữa chương | đọc | "hắn" đổi thành "anh ta"/"y" cho **cùng một người** trong cùng chương |
| Thoại không có gạch đầu dòng | `grep -c '^—' chapters/*.md` | 0 mà chương có đối thoại → mô hình dùng dấu ngoặc kép kiểu Anh/Trung |

**Đối chiếu với máy:** mở `meta/rule_violations.jsonl` và so. Nếu bạn đọc thấy văn dịch rõ ràng mà file này
rỗng → bộ kiểm bỏ sót (xem A.4.2, có thể đã trúng lỗi hoa/thường). Nếu file đầy mà bạn đọc thấy văn ổn →
báo bừa (xem A.4.1).

## B.4 Nhất quán giữa các chương

Chỉ lộ ra khi có ≥5 chương thật, vì đây là chỗ ngữ cảnh bị nén và mô hình bắt đầu quên.

| Hạng mục | Cách kiểm | Không đạt khi |
|---|---|---|
| **Tên riêng** | lấy danh sách tên trong `characters.json`, grep từng tên qua mọi chương | cùng một người có 2 cách viết (`Lư Đình` / `Lữ Đình`), hoặc tên mới xuất hiện mà không có trong `characters.json` lẫn `meta/cast_ledger.json` |
| **Cách gọi ngôi** | đọc `characters.json.role` rồi soi thoại | nhân vật gọi nhau "anh/tôi" ở chương 2 rồi "ông/con" ở chương 4 mà không có biến cố nào giải thích |
| **Đơn vị thời gian** | `grep -o 'năm [0-9]*\|tháng [0-9]*\|[0-9]* giờ' chapters/*.md` | mốc năm lệch nhau (cháy "năm bốn mươi hai" ở ch1, "năm bốn mươi ba" ở ch5) |
| **Dòng thời gian máy đã ghi** | `timeline.md` (bản dễ đọc) + `meta/diag-export.md` mục `TimelineGaps` | tỉ lệ thiếu > 0,3 (`ThresholdTimelineGapRate`) |
| **Manh mối / cài cắm** | `foreshadow_ledger.md` + `diag-export.md` mục `StaleForeshadow` | có manh mối `planted` quá `max(8, …)` chương chưa động tới (`ThresholdForeshadowMin=8`) |

## B.5 Bộ kiểm định (editor) có ra kết luận hợp lý không

Đọc `reviews/*.json` (ở gốc thư mục sách, không phải trong `meta/`) cho lần duyệt toàn cục:

| Tiêu chí | Đạt | Không đạt → nghĩa là gì |
|---|---|---|
| Có đủ các chiều điểm | `dimensions` có ≥5 mục, mỗi mục có `comment` **dẫn chứng cụ thể** (số chương, đoạn văn) | comment chung chung ("mạch truyện ổn") = editor không đọc, chỉ đoán |
| `verdict` khớp với điểm | điểm trung bình ≥80 → `accept`; có `issues.severity=critical` → `rewrite`/`polish` | `verdict=accept` mà có issue critical = cửa chất lượng hình thức |
| `issues[].chapters` trỏ đúng | mở chương được dẫn, thấy đúng vấn đề đã mô tả | dẫn sai chương = editor bịa dẫn chứng |
| Không báo bừa | với văn bạn tự đọc thấy tốt, `issues` rỗng hoặc chỉ `warning` | đầy `critical` trên văn tốt = ngưỡng sai |
| Có tiếp nhận số liệu máy | `comment` chiều thẩm mỹ có nhắc số của `style_stats` | không nhắc = số liệu vào prompt mà editor không dùng |

## B.6 Độ dài chương — **lưu ý: tiêu chí phải là tương đối, không phải tuyệt đối**

Đề bài đưa ví dụ *"chương 1 phải dài 1800–2500 từ; nếu dưới 1500 thì ngưỡng đếm từ đang sai hệ số"*. Tôi
phải nói rõ một điều trước khi bạn dùng con số đó: **trong repo này không có ngưỡng số từ tuyệt đối nào cho
một chương**, và đó là **quyết định có chủ ý**, ghi ở `internal/rules/types.go:37` — *"章节字数刻意不在此列：
多长算一章是叙事完整性问题，属语义裁量"*. Không có config nào đặt 1800–2500.

Cái repo thật sự có là ngưỡng **tương đối** trong `internal/diag/diag.go:17-18`:

- `ThresholdWordShortRatio = 0.4` — chương ngắn hơn 0,4× **trung vị** là bất thường;
- `ThresholdWordLongRatio = 2.5` — dài hơn 2,5× trung vị là bất thường.

Nên tiêu chí đúng là:

| Tiêu chí | Đạt | Không đạt → nghĩa là gì |
|---|---|---|
| Không chương nào lệch trung vị | `diag-export.md` **không** có mục `Số từ chương bất thường (trung vị N từ)` | có = mô hình viết chương dài ngắn thất thường, hoặc `WordCount` sai đơn vị |
| Đơn vị đếm đúng | lấy 1 chương, đếm tay số từ (đếm dấu cách + 1), so với `ChapterWordCounts` trong `meta/progress.json` — lệch < 5% | `ChapterWordCounts` ra số **gấp ~4,6 lần** số bạn đếm tay = `WordCount` đang đếm **rune**, hệ số sai (xem A.3.3) |
| Độ dài khớp ý người dùng | nếu bạn yêu cầu "mỗi chương khoảng N từ" trong prompt thì trung vị nằm trong ±30% N | lệch xa = yêu cầu độ dài không tới được writer; đây là **vấn đề prompt/ngữ nghĩa, không phải ngưỡng cơ học** |

Nếu bạn **muốn** một chặn tuyệt đối, đó là một thay đổi tính năng (thêm ngưỡng vào `rules`), không phải một
lỗi để sửa — và nó đi ngược quyết định đã ghi ở `types.go:37`. Cần quyết định của chủ dự án.

## B.7 Sách dài / phân tầng — vùng chưa có bằng chứng nào

Toàn bộ đường này **chưa có E2E** (A.5 mục 6). Chạy một cuốn `scale=long` để mô hình chọn
`layered_outline`:

| Tiêu chí | Đạt | Không đạt → nghĩa là gì |
|---|---|---|
| Dàn ý phân tầng ra đời | `layered_outline.json` tồn tại, `meta/progress.json` có `"layered":true` | mô hình chọn `outline` phẳng cho sách dài = `arbiter-plan-start` chọn sai người lập kế hoạch |
| Vòng được mở dần | `meta/sessions/agents/architect-*.jsonl` có lượt `expand_arc` | 0 lượt = vòng khung không bao giờ mở, writer sẽ viết vượt dàn ý |
| Cuối vòng có đủ 3 việc | mỗi vòng có duyệt + tóm tắt vòng; cuối tập có tóm tắt tập | thiếu = `flow.Route` mục 6-8 không chạy |
| `compass` được cập nhật | `meta/compass.json`, `last_updated` cách chương mới nhất < 15 | `diag-export.md` mục `CompassDrift` báo = hướng kết thúc bị trôi |
| Không rơi vào vòng lặp vượt dàn ý | không có chuỗi dài `writer` bị chặn liên tiếp trong log | có = đúng lỗi `layeredComplete` sinh ra để chặn, cần đọc `meta/decisions.jsonl` mục `volume_end` |

## B.8 Xuất bản

Trong TUI: `/export [path] [from=N] [to=M] [--overwrite]`. Định dạng suy từ đuôi tệp (`.txt` / `.epub`).

| Tiêu chí | Đạt | Không đạt → nghĩa là gì |
|---|---|---|
| Số chương đúng | `Result.Chapters` = số chương đã hoàn thành | thiếu = có chương chưa terminal |
| Không ăn mất dòng mở đầu | với chương nào mở đầu bằng `# …`, đối chiếu `chapters/NN.md` với bản xuất | mất dòng = `chapterHeaderViRe` nhận bừa (A.3.4 đã chặn ca đã biết; văn mô hình thật có thể sinh dạng lạ hơn, ví dụ `Chương thứ năm:` hoặc `CHUONG 5` không dấu — hai dạng này **được biết là bỏ sót**, hậu quả chỉ là tiêu đề lặp một lần, không mất chữ) |
| Không lặp tiêu đề | mỗi chương chỉ có một dòng tiêu đề | lặp = dạng tiêu đề mô hình dùng nằm ngoài regex |
| `.epub` mở được | mở bằng máy đọc sách thật | — |

## B.9 Đường hỏng

| Ca | Cách gây | Đạt |
|---|---|---|
| Khóa sai/hết hạn | đổi `api_key` thành rác | báo lỗi tiếng Việt rõ ràng, **không** treo (phần A đã có test cho ca này) |
| Hết hạn mức / 429 | chạy nhiều lượt song song | tự lùi và thử lại (`subagentMaxRetries=7`), không mất chương đã commit |
| Ngắt giữa lúc viết | `Ctrl+C` giữa lúc đang commit | chạy lại → `meta/pending_commit.json` được diễn lại, chương không bị ghi đôi, `chapters/NN.md` không hỏng |
| Ngân sách | đặt `budget.book_usd` rất nhỏ | dừng đúng lúc, có cảnh báo; **nếu mô hình không trả `usage` thì cảnh báo "预算盲区" phải hiện** — đây là cầu chì chưa nối |

## B.10 Việc phải làm sau khi chạy tay

1. Nếu B.2 không đạt: tìm prompt/reference còn sót tiếng Trung, sửa `assets/`, chạy lại.
2. Nếu B.3 và `meta/rule_violations.jsonl` lệch nhau: rất có thể đã trúng A.4.1 hoặc A.4.2 — sửa
   `internal/rules/` rồi chạy lại `go test ./internal/e2e/ -count=1`; hai test đang đỏ phải chuyển xanh.
3. Dán `meta/diag-export.md` vào báo cáo lượt chạy — nó đã bôi đen, an toàn để chia sẻ.
4. Ghi lại chi phí và thời gian thật cho một cuốn: chưa ai biết con số đó.

---

## Phụ lục — nguyên tắc khi viết thêm test trong `internal/e2e/`

1. **`-count=1`, luôn luôn.**
2. **Đừng khẳng định `len(rule_violations) == 0`.** Lọc theo tên rule. `non_cjk_fragments` hiện báo trên mọi
   chương (A.4.1) nên khẳng định "rỗng" sẽ đỏ vì lỗi của `rules`, không phải vì lỗi bạn muốn bắt.
3. **Đừng `strings.Contains` trên cả tài liệu `novel_context`.** Nó chứa nguyên văn bản hướng dẫn
   `anti-ai-tone.md`, mà bản đó gọi tên đủ mọi mẫu tật. Bóc JSON ra rồi khẳng định.
4. **Nhận vai từ bộ tool, không từ chữ trong prompt.** Bộ tool là khế ước mã; prompt là chuỗi đã dịch, biên
   tập viên có quyền sửa. Dựng regex từ `i18n.F(msgid)` thay vì viết cứng chuỗi tiếng Việt.
5. **Mọi ca "bắt được lỗi" phải có ca đối chứng "không báo bừa"** đi kèm, trong cùng một test.
6. **Đừng dùng ít hơn 5 chương** khi kiểm thống kê: `stylestat.minChapters` và `domain.ReviewInterval` đều
   bằng 5, dưới đó hai cơ chế im lặng và test sẽ xanh trong khi chưa chạy gì.

---
---

# PHẦN C — Lượt soát thứ hai (bổ sung, không trùng phần A/B)

Phần này do một lượt soát chạy song song viết, cùng thời điểm với phần A/B ở trên, và
dùng chung corpus `internal/e2e/corpus_test.go`. Nó **chỉ ghi những gì phần A/B chưa
có**: VIỆC 4 (đường headless), và bốn lỗi khác lớp với A.4.1/A.4.2.

Hai lượt độc lập tìm ra **cùng** hai lỗi ở A.4.1 và A.4.2 bằng hai đường khác nhau
(lượt này qua engine thật, lượt kia qua tool). Trùng nhau ở đây là tin tốt: nó nghĩa
là hai lỗi ấy không phải hiện tượng của một cách kiểm.

## C.0 Trạng thái test của lượt này

```
$ go test ./internal/e2e/ -count=1 -run 'TestVongDoi|TestLoiDaBiet|TestHeadless' -v
--- PASS: TestVongDoiSachTiengViet (1.23s)
--- PASS: TestHeadlessBaoLoiKhoaSaiBangTiengViet (0.04s)
--- PASS: TestHeadlessThieuCauHinhBaoRoRang (0.01s)
--- PASS: TestLoiDaBiet_ToolRoTiengTrungVaoNguCanhModel (0.08s)
ok  github.com/voocel/ainovel-cli/internal/e2e
```

Tệp thuộc lượt này: `book_vi_test.go`, `fakellm_test.go`, `corpus_test.go`,
`headless_vi_test.go`, `loi_da_biet_test.go`. Tệp `antitone_vi_test.go` thuộc lượt
A/B.

Toàn suite `go test ./...` (đo lần cuối): **29 ok, 1 FAIL** — `internal/e2e` là
package thứ 30 (mới), và cả 10 test trong nó đều XANH:

```
$ go test ./internal/e2e/ -count=1 -v | grep '^---'
--- PASS: TestToneKiemCoHocPhanBietVanSachVoiVanNhoiTat (0.56s)
--- PASS: TestToneThongKeToanSachVaoNguCanh (0.97s)
--- PASS: TestToneHeSoChuHanSangTuViet (0.00s)
--- PASS: TestToneXuatBanKhongAnMatDongMoDau (0.19s)
--- PASS: TestToneLintKhongBaoBuaTrenVanTiengViet (0.00s)
--- PASS: TestToneTuGayMoiBatCaKhiVietHoaDauCau (0.00s)
--- PASS: TestVongDoiSachTiengViet (1.05s)
--- PASS: TestHeadlessBaoLoiKhoaSaiBangTiengViet (0.04s)
--- PASS: TestHeadlessThieuCauHinhBaoRoRang (0.01s)
--- PASS: TestLoiDaBiet_ToolRoTiengTrungVaoNguCanhModel (0.05s)
```

Package đỏ duy nhất — **không thuộc lượt này**:

| Package | Test đỏ | Nguyên nhân |
|---|---|---|
| `internal/i18n` | `TestNguonKhongVietCungDauTiengTrung` | Bộ quét mới của lượt khác: 64 chỗ dấu toàn phần (`（）；：，《》`) chưa qua catalog. Trong đó có `《》` ở mục C.2. |

**Cả A.4.1 và A.4.2 đã được sửa trong lúc soát** (`internal/rules/lint.go` +42/-3,
`internal/rules/checker.go` +36/-6), nên hai test cố ý đỏ ấy đã chuyển xanh. Hai bản
sửa đó **chưa được lượt này soát lại** — xem C.7. Lỗi C.1 (rò tiếng Trung vào ngữ
cảnh mô hình) thì **vẫn còn**.

### Bằng chứng không vacuous

Bẻ thử: cho stub trả văn tiếng Trung cho chương 1, chạy lại `TestVongDoiSachTiengViet`:

```
--- FAIL: TestVongDoiSachTiengViet (1.05s)
    book_vi_test.go:441: chapters/01.md không chứa nhân vật nào — nội dung không phải văn đã gửi
    book_vi_test.go:444: chapters/01.md rò chữ Hán: "第一章正文。夜色深沉，他独自站在石桥上，听着水声从桥下传来。他不是愤怒，而是恐惧"
    book_vi_test.go:468: chương 1: word_count=47 quá thấp, dấu hiệu đếm bị cắt vụn
    book_vi_test.go:473: chương 1: tỉ lệ rune/chữ = 1.17 ngoài khoảng 3,5-5,5 (runes=55 words=47)
    book_vi_test.go:511: bản xuất còn tiêu đề chương tiếng Trung
    book_vi_test.go:516: bản xuất tiếng Việt còn chữ Hán quanh: "ác cầu đá》\n\nChương 1  Người gác cầu đá\n\n第一章正文…"
```

Sáu khẳng định độc lập bắt được, ở cả bốn tầng (store, đếm chữ, tỉ lệ, bản xuất).
Đã phục hồi; test xanh lại.

---

## C.1 Lỗi mới: `plan_chapter` / `draft_chapter` tiêm tiếng Trung vào ngữ cảnh mô hình · **P1**

- `internal/tools/plan_chapter.go:97`
- `internal/tools/draft_chapter.go:119` và `:136`

Trường `next_step` trong kết quả tool là chuỗi tiếng Trung **chưa bọc `i18n.F`**:

```
plan_chapter  → "立即调用 draft_chapter(chapter=本章节号, content=完整正文字符串) 写入正文，不要重复规划同一章"
draft_chapter → "先 read_chapter(source=draft) 回读草稿，再调用 check_consistency，最后 commit_chapter"
```

Đây **không phải chuỗi giao diện**. Nó là chỉ dẫn mà mô hình đọc và làm theo, xuất
hiện sau mỗi lần lập kế hoạch và mỗi lần viết nháp, ngay giữa một phiên tiếng Việt.
Tìm ra bằng đường thật: `TestVongDoiSachTiengViet` chụp lại kết quả tool gửi cho
writer.

**Bản dịch tiếng Việt của cả hai chuỗi ĐÃ CÓ trong `internal/i18n/locales/vi.json`:**

```
"Ngay lập tức gọi draft_chapter(chapter=số_chương_này, content=chuỗi_nội_dung_đầy_đủ) để viết nội dung, không lập kế hoạch lại cùng một chương"
"Trước tiên read_chapter(source=draft) để đọc lại bản nháp, rồi gọi check_consistency, cuối cùng commit_chapter"
```

Nên đây là lỗi "điểm gọi không tra catalog", không phải "chưa dịch" — sửa là bọc
`i18n.F(...)`, không phải dịch thêm gì. Vì sao lọt: `next_step` của
`edit_chapter.go:146` **đã** được bọc, hai chỗ này thì không; mọi phép đo độ phủ bản
dịch đều tính trên catalog nên chuỗi chưa bọc là chuỗi vô hình với chúng.

Chốt bằng `TestLoiDaBiet_ToolRoTiengTrungVaoNguCanhModel` — gọi tool thật, đọc
`next_step`. Test **ĐỎ khi bug được sửa**; khi ấy xóa mục tương ứng khỏi `roDaBiet`
để `TestVongDoiSachTiengViet` siết lại phép kiểm ngữ cảnh.

### Cùng lớp, model-facing, mới quét mã chứ chưa xác nhận bằng đường thật

| Chỗ | Ghi chú |
|---|---|
| `internal/tools/save_foundation.go:40` | Mô tả tham số trong **schema tool** — gửi trong mảng `tools` mỗi lượt gọi |
| `internal/tools/reopen_book.go:97` | `next_step` |
| `internal/tools/read_chapter.go:161` | Thông báo lỗi trả cho mô hình |
| `internal/tools/premise_structure.go:16-21` | Tiêu đề mục của premise mà architect viết ra |
| `internal/host/cocreate.go:27,35` | Tiêu đề mục trong prompt cộng tác |
| `internal/agents/ctxpack/restore.go:87-88` | Tiêu đề mục của writer restore pack |
| `internal/domain/runtime.go:106` | `"书名"/"实际书名"/"示例书名"` |

### Cùng lớp, user-facing

`internal/entry/tui/theme.go:61-66` (nhãn trạng thái 就绪/运行中/审阅/返工/完成/暂停),
`internal/entry/tui/panels_sidebar.go:135`, `internal/entry/tui/model.go:91`,
`internal/host/stream_extract.go:24-29` (nhãn `✻ 规划`/`✻ 打磨`/…),
`internal/host/events.go:104`, `internal/host/imp/runner.go:353`,
`internal/diag/snapshot.go:32`, `internal/diag/runtime.go:28`.

Tổng quét: **110 chuỗi chứa chữ Hán chưa bọc `i18n.F`, ở 24 tệp**. Một phần trong đó
là **dữ liệu, không phải lỗi**, và không nên bọc: bảng `fatigueWords` nhánh zh
(`rules/snapshot.go:213`) và `zhPatternDefs` (`stylestat/stylestat.go:84+`) đều đã có
quyết định thiết kế ghi rõ tại chỗ.

---

## C.2 Lỗi mới: bản xuất bọc tên sách bằng ngoặc CJK `《》` · **P2**

`internal/host/exp/txt.go:129,131` — `renderTXT` viết cứng `《` và `》`. Đây là chữ
mà **người đọc cuối** thấy ở dòng đầu bản thảo:

```
《Người gác cầu đá》

Chương 1  Người gác cầu đá
```

`《》` là dấu câu CJK, **không thuộc khối Han**, nên mọi phép kiểm "có chữ Hán không"
bỏ qua nó — kể cả `TestBanXuatTiengVietKhongConDauVetTiengTrung` ở
`exp/txt_export_locale_test.go`. Tiếng Việt dùng `"…"` hoặc không dấu.

Cùng chỗ: `internal/host/host.go:946` cũng bọc tên sách bằng `《》` trong thông báo
hoàn thành. Bộ quét `internal/i18n/quetnguon_test.go` báo tổng **64 chỗ dấu toàn
phần** (`（）；：，《》`) chưa qua catalog, ở `entry/tui`, `eval`, `host`, `host/imp`.

`TestVongDoiSachTiengViet` tha riêng đúng cặp `《》` (đã có bộ quét khác chốt nó thành
lỗi cứng) và vẫn bắt mọi dấu CJK khác trong bản xuất, để không tha cả lớp.

---

## C.3 VIỆC 4 — Đường headless không cần LLM

Chạy tay với binary thật, config có khóa **giả**, `HOME` trỏ vào sân thử.

### C.3.1 Không có cấu hình nào

```
$ HOME=/tmp/e2etest-nocfg /tmp/ainovel-e2e --headless --prompt "Viết truyện ngắn 3 chương về người gác cầu đá"
lỗi: chế độ không giao diện không hỗ trợ khởi động lần đầu, vui lòng chạy TUI một lần để hoàn tất cấu hình
(chi tiết lỗi đã được ghi vào /tmp/e2etest-nocfg/.ainovel/last-error.log)
```

**ĐẠT.** Tiếng Việt, nói rõ nguyên nhân, nói rõ việc phải làm ("chạy TUI một lần"),
và chỉ ra chỗ có chi tiết. Exit code 1.

### C.3.2 Có cấu hình, khóa sai (401) — khởi động lần đầu

```
$ HOME=/tmp/e2etest /tmp/ainovel-e2e --headless --prompt "…"
INFO Khởi động module=boot provider=openrouter model=x output=output/novel
INFO Mô hình sẵn sàng module=boot summary="default=openrouter/x"
INFO Cửa sổ ngữ cảnh module=context role=writer model=x window=163840 source=registry
headless khởi động: output/novel
error: Phán quyết khởi động thất bại: arbiter: arbiter_plan_start: Missing Authentication header [auth, HTTP 401, openrouter]
(chi tiết lỗi đã được ghi vào /tmp/e2etest/.ainovel/last-error.log)
EXIT=1
```

**MỘT NỬA ĐẠT.** Log khởi động tiếng Việt; thông báo lỗi nêu được nguyên nhân
(`401`/`auth` — đủ để biết là lỗi xác thực, không phải lỗi mạng hay ổ đĩa); exit
code đúng.

**Không đạt: không nói phải làm gì.** Người dùng nhận một lỗi provider dán nguyên
văn. Lỗi ở `internal/host/host.go:356` — `fmt.Errorf(i18n.F("启动裁定失败: %w"), derr)`.

Đáng chú ý là **câu gợi ý đã có sẵn**: cùng nguyên nhân ấy đi đường **khôi phục** thì
engine phát ra (`internal/host/engine.go:336`):

> Phán quyết khởi động thất bại, đã tạm dừng (hãy kiểm cấu hình model/mạng rồi tiếp tục): …

Chỉ đường khởi động lần đầu không dùng nó. → **P2, `internal/host/host.go:356`.**

Phụ: tiền tố thông báo không nhất quán. `cmd/ainovel-cli/main.go:61,111,129` bọc
tiền tố **vào trong msgid** nên nó thành `lỗi:`; còn `main.go:121,124,132` dùng
`die("error: %v", err)` nên giữ nguyên `error:`. Cùng một lớp lỗi, hai tiền tố, một
tiếng Anh. → **P3.**

### C.3.3 Chạy lại không có `--prompt` (đường khôi phục) — **exit code sai**

```
$ HOME=/tmp/e2etest2 /tmp/ainovel-e2e --headless
[00:54:23] [DECISION] Phán quyết khởi động
headless khôi phục: output/novel (Đã khôi phục)
[00:54:23] [SYSTEM] Khôi phục sáng tác: Đã khôi phục
[00:54:23] [DECISION] Phán quyết bù khi khởi động
[00:54:24] [SYSTEM] Phán quyết khởi động thất bại, đã tạm dừng (hãy kiểm cấu hình model/mạng rồi tiếp tục): arbiter: arbiter_plan_start: Missing Authentication header [auth, HTTP 401, openrouter]
EXIT=0
```

**HỎNG · P2.** Thông báo ở đây **có** gợi ý hành động (tốt hơn C.3.2), nhưng
**exit code là 0** trong khi engine đã tạm dừng và không viết được chữ nào.
`headless.Run` trả `nil` cho nhánh này vì `Resume()` thành công về mặt "đã khởi
động"; phần tạm dừng chỉ đi ra qua sự kiện.

Hệ quả cụ thể: script/cron/CI gọi `ainovel-cli --headless` để chạy tiếp một cuốn
không cách nào biết là đã thất bại — nó sẽ báo thành công mãi. **Khi chạy tay, đừng
tin exit code; luôn kiểm `phase` trong `progress.json`.**

### C.3.4 Thiếu `--prompt` và cũng không có phiên nào để khôi phục

```
chế độ headless yêu cầu --prompt, hoặc thư mục đầu ra "…" phải có phiên có thể khôi phục
```

**ĐẠT.** Nêu cả hai đường ra.

Chốt bằng test: `TestHeadlessBaoLoiKhoaSaiBangTiengViet`,
`TestHeadlessThieuCauHinhBaoRoRang` (gọi thẳng `headless.Run` với server giả trả 401,
nên bắt được `error` nguyên dạng thay vì phải dò chuỗi trên stderr).

---

## C.4 Lỗi mới: chú thích `endingShape` giải thích sai chiều · **P3 (tài liệu)**

`internal/stylestat/stylestat.go:552-556` viết: "giữ ngưỡng 30 theo rune cho tiếng
Việt thì gần như mọi dòng kết đều 'ngắn' (30 rune ≈ 7 chữ), `ShortRatio` kẹt ở 1,0".

Suy luận ngược chiều. Ngưỡng 30 **rune** ≈ 7 chữ nghĩa là chỉ dòng dưới 7 chữ mới
được xếp là ngắn → **ít** dòng bị xếp ngắn hơn, `ShortRatio` tụt về 0, không kẹt ở
1,0. Đo trên corpus: dòng kết chương 1 dài 12 chữ / 50 rune → đếm theo chữ thì "ngắn"
(12 ≤ 30), đếm theo rune thì "không ngắn" (50 > 30). `ShortRatio` đo được với cách
đếm hiện tại = 1,0; với cách đếm rune sẽ là 0,0.

Bản **sửa vẫn đúng** (đo bằng chữ để ngưỡng 30 mang nghĩa "30 âm tiết"); chỉ lời giải
thích sai chiều. Đáng sửa vì đây là loại chú thích mà người đọc sau sẽ tin thay vì
đo lại.

---

## C.5 Bổ sung cho mục B — cách ly khi chạy tay

Mục B.0 dùng `go run ./cmd/ainovel-cli` trong repo. Bổ sung một điểm dễ đốt cháy
cấu hình thật của người dùng:

`ainovel-cli` **không có** flag `--output` hay `--config`. Thư mục sách luôn là
`<cwd>/output/novel`, và `bootstrap.LoadConfig` **hợp nhất** `~/.ainovel/config.json`
(nền) với `./.ainovel/config.json` (ghi đè theo dự án) — tạo config theo dự án
**không** cách ly được, vì config thật vẫn được nạp làm nền. Cách chắc chắn là đổi cả
`HOME` và `cwd`:

```bash
go build -o /tmp/ainovel-thu ./cmd/ainovel-cli    # đừng ghi binary vào repo

export SAN=/tmp/ainovel-thu-$(date +%s)
mkdir -p "$SAN/.ainovel"
cat > "$SAN/.ainovel/config.json" <<'EOF'
{
  "provider": "openrouter",
  "model": "DAT_TEN_MODEL",
  "providers": { "openrouter": { "api_key": "DAT_KHOA_THAT", "base_url": "https://openrouter.ai/api/v1" } },
  "budget": { "book_usd": 2.0, "warn_ratio": 0.5 }
}
EOF
cd "$SAN"

# Kiểm cách ly TRƯỚC khi tốn token:
HOME="$SAN" /tmp/ainovel-thu --version
ls -la "$SAN/.ainovel"   # chỉ có config.json — nếu thấy tệp của bạn ở đây thì HOME chưa ăn
```

`budget.book_usd` là chốt an toàn: một cuốn chạy lỗi có thể đốt tiền không giới hạn.
Đặt 2 USD cho lần đầu; engine tự dừng khi vượt. Nếu thấy
`[SYSTEM] Vùng mù ngân sách` thì mô hình không trả `usage` và chốt này **không** hoạt
động — dừng lại, kiểm giá model trước khi chạy tiếp.

Dọn: `rm -rf "$SAN" /tmp/ainovel-thu`.

### Hai bẫy khi đọc số chữ, nói rõ để không phán sai chiều

Chỉ tiêu ở `assets/references/quality-checklist.md:15` là **1500-3000 chữ/chương**
(chương dài 3000-6000; `chapter-template.md:12` yêu cầu tối thiểu 2500).

- **`word_count` ~7000-14000 cho một chương trông vừa phải = lỗi đếm rune quay lại**,
  không phải mô hình viết dài. Phân biệt bằng tỉ lệ rune/chữ: ≈ 1 nghĩa là đang đếm
  rune, 4-5 nghĩa là đếm chữ đúng.
- **`word_count` 300-700 mà tỉ lệ rune/chữ vẫn 4-5 = mô hình viết ngắn thật.** Đây
  mới là ca đáng lo (chỉ tiêu trong prompt không ăn), và nó **không** phải lỗi đếm.

Lệnh in cả hai cột cùng lúc:

```bash
cd "$SAN/output/novel"
python3 - <<'PY'
import json
p=json.load(open('progress.json'))
print("phase:",p.get('phase'),"| tổng chữ:",p.get('total_word_count'))
for ch,wc in sorted((p.get('chapter_word_counts') or {}).items(), key=lambda x:int(x[0])):
    txt=open('chapters/%02d.md'%int(ch),encoding='utf-8').read()
    print(f"chương {ch}: word_count={wc}  rune={len(txt)}  tỉ lệ={len(txt)/max(wc,1):.2f}")
PY
```

### Dấu hiệu "mô hình viết tiếng Việt nhưng siêu dữ liệu tiếng Trung"

Mục B.2 kiểm chữ Hán trong `chapters/`. Bổ sung một ca dễ bỏ sót và đúng là ca mà
lỗi C.1 mở đường cho: mô hình viết **thân bài** tiếng Việt nhưng điền **siêu dữ liệu**
tiếng Trung, vì siêu dữ liệu là chỗ nó bắt chước ngôn ngữ của schema/chỉ dẫn.

```bash
cd "$SAN/output/novel"
grep -nP '[\x{4E00}-\x{9FFF}]' chapters/*.md summaries/*.json meta/*.json | head -20
grep -nP '[\x{3000}-\x{303F}\x{FF00}-\x{FFEF}]' chapters/*.md | head -20   # dấu CJK
```

Dòng thứ hai bắt lớp mà "có chữ Hán không" bỏ qua — xem C.2.

---

## C.6 Điều lượt này KHÔNG kiểm được vì không có khóa — ngoài mục A.5

Mục A.5 đã liệt kê phần lớn. Bổ sung ba khoảng trống mà lượt này chạm tới rồi phải dừng:

- **Chuỗi tương tác dài.** 6 chương, mỗi lượt writer ~750 token, ngữ cảnh chạm **0%**
  cửa sổ. Nghĩa là `ctxpack` nén ngữ cảnh, `FullSummaryConfig` tóm tắt bằng tiếng
  Việt, `WriterRestorePack` phục hồi sau nén, và prompt cache — **không lệnh nào
  trong số đó được chạy**. Đó là toàn bộ phần chỉ hiện ra sau vài chục chương.
- **Đường can thiệp của người dùng.** Arbiter **0 lượt gọi** trong lượt chạy (đúng
  cho happy path), nên `arbiter.Decide` với prompt tiếng Việt, `handleIntervention`,
  `AdvanceHold`, chế độ duyệt từng chương đều chưa chạy lần nào với mô hình thật.
- **Chi phí và `BudgetSentinel`.** Server giả trả `usage` cố định 20 token, nên ngưỡng
  ngân sách, cảnh báo vùng mù, và hành vi dừng khi vượt đều chưa được kiểm.

---

## C.7 Việc còn nợ (bổ sung mục B.10)

1. **Sửa C.1** — bọc `i18n.F` ở 3 điểm gọi, bản dịch đã có sẵn. Rẻ nhất, tác động
   lớn nhất. Sửa xong thì xóa `roDaBiet` trong `internal/e2e/loi_da_biet_test.go` để
   phép kiểm ngữ cảnh siết lại.
2. **Chạy F/B trước khi làm gì khác thì phải sửa C.1 trước.** Nếu không, kết quả về
   "mô hình có tuân prompt tiếng Việt không" bị nhiễu bởi đúng những chỉ dẫn tiếng
   Trung mà ta đã biết là đang rò.
3. Xác nhận 7 điểm model-facing còn lại ở C.1 bằng đường thật, không chỉ bằng quét mã.
4. Bản sửa A.4.2 (`internal/rules/checker.go`, +36/-6) **đã đọc và thấy lành**: hạ
   chữ toàn văn một lần trong `Check` rồi truyền xuống, hạ cả cụm cần tìm (chịu được
   bảng do người dùng khai), vẫn dùng `strings.Count` nên không có rủi ro ký tự
   regex, và `Target` giữ nguyên văn nên bản ghi không đổi hình. Nhánh zh không đổi
   hành vi vì `ToLower` không đụng chữ Hán. `forbidden_chars` cố ý **không** hạ chữ,
   có ghi lý do. Bản sửa A.4.1 (`internal/rules/lint.go`, +42/-3) **chưa đọc diff.**
5. Sửa C.3.3 (exit code 0 khi tạm dừng) trước khi ai đó đưa headless vào cron.
