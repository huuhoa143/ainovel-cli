# Soát chất lượng translation memory kentjuno

**Kết luận:** TM của kentjuno **dùng được, nhưng phải sửa chọn lọc** — chất lượng nền tốt (≈86% mẫu soát sạch, 0/1.159 cặp làm mất tên tool, 0 cặp mất ký tự marker), song nó có **một lớp lỗi hệ thống là đảo tham số cùng kiểu**: 3 ca đã tìm ra, 1 ca **vẫn còn sống trong catalog và không test nào bắt được**.

Không cần soát lại toàn bộ. Cần: sửa 1 lỗi đảo tham số còn sống, dọn 6 chỗ rò tiếng Trung trong schema gửi LLM, chốt bảng thuật ngữ (5 khái niệm đang có 2 biến thể song song), và sửa 1 lỗi trong **công cụ của chính chúng ta** đang chặn đúng cách chữa lỗi đảo tham số.

- Người soát: agent `audit-tm`, chỉ đọc, không sửa file nào ngoài báo cáo này.
- Thời điểm: 2026-07-30 ~21:00–21:30. Catalog đang bị agent khác sửa song song (xem [Ghi chú về đua ghi](#ghi-chú-về-đua-ghi)).

---

## 1. Phạm vi và xuất xứ dữ liệu

`scripts/i18n/tm.json` có **1.159 cặp** rút từ `kentjuno/ainovel-cli@68eb92d`. Catalog `internal/i18n/locales/vi.json` lúc soát có **1.334 cặp**. Đối chiếu:

| Nhóm | Số cặp | Ghi chú |
|---|---:|---|
| Catalog dùng nguyên bản kentjuno | **837** | quần thể soát chính của báo cáo này |
| Catalog có nhưng đã bị sửa khác TM | 1 | `save_arc_summary` — chính là lỗi đã biết, đã sửa |
| Catalog tự dịch (không có trong TM) | 496 | **ngoài phạm vi** báo cáo này |
| TM có nhưng catalog chưa dùng | 319 | msgid upstream đã đổi hoặc chưa bọc i18n |

Nói cách khác: **63% catalog hiện tại là bản dịch của kentjuno**. Đó là quần thể tôi soát.

---

## 2. Bảng phát hiện

### NGHIÊM TRỌNG

| # | msgid (rút gọn) | Bản vi hiện tại | Vấn đề | Bản vi đề xuất | Nơi dùng |
|---|---|---|---|---|---|
| **N1** | `预算告警: 已花费 $%.2f，达到预算 $%.2f 的 %.0f%%` | `Cảnh báo ngân sách: đã chi $%.2f, đạt %.0f%% ngân sách $%.2f` | **ĐẢO THAM SỐ, CÒN SỐNG.** Code truyền `(total, limit, warnRatio*100)`. Bản vi đưa `limit` vào ô `%.0f%%` và `ratio` vào ô `$%.2f`. Với limit=$50, ratio=80%, chi $40 → in ra **“đã chi $40.00, đạt 50% ngân sách $80.00”**. Cả hạn mức lẫn phần trăm đều sai. `verify.go` không bắt vì cả 3 verb đều là `f`. Không test nào phủ. | `Cảnh báo ngân sách: đã chi $%.2f, ngân sách $%.2f, đã đạt %.0f%%` (giữ đúng trật tự nguồn — **không** dùng chỉ số tường minh, xem [§6](#6-lỗi-trong-công-cụ-của-chúng-ta)) | `internal/host/budget.go:83` |
| **N2** | `展开第 %d 卷第 %d 弧（save_foundation type=expand_arc）` | TM: `Mở rộng cung %d tập %d …` | **ĐẢO THAM SỐ.** Router truyền `(NextVolume, NextArc)`; bản kentjuno gán Volume cho “cung”. Đây là **text nhiệm vụ gửi cho `architect_long`** → LLM được lệnh mở rộng sai cung. Cùng lớp lỗi và cùng file với ca đã biết, chỉ khác là ca này **chưa từng được nhắc tới**. | `Mở rộng tập %d cung %d (save_foundation type=expand_arc)` | `internal/flow/router.go:169` |
| **N3** | `生成第 %d 卷第 %d 弧摘要（save_arc_summary）` | TM: `Tạo tóm tắt cung %d tập %d …` | ĐẢO THAM SỐ — ca đã biết trong đề bài. | `Tạo tóm tắt tập %d cung %d (save_arc_summary)` | `internal/flow/router.go:157` |

**Trạng thái N2, N3:** cả hai **đã được sửa trong catalog** (N2 vừa sửa lúc 21:08, trong lúc tôi đang soát) và đã có `TestKhongDaoTapVaCungTrongTextNhiemVu` chốt. Tôi vẫn liệt kê vì chúng là **bằng chứng định lượng rằng đây là lỗi hệ thống của TM, không phải tai nạn lẻ** — trong 18 chuỗi chứa cả `卷` và `弧`, kentjuno đảo trật tự 3 chuỗi, 2 trong đó mang `%d` (tức đảo cả dữ liệu). **N1 là ca thứ tư, ở một lớp khác (`%.2f`/`%.0f`), nên bộ test kia không phủ.**

### CẦN SỬA

| # | msgid (rút gọn) | Bản vi hiện tại | Vấn đề | Bản vi đề xuất | Nơi dùng |
|---|---|---|---|---|---|
| **C1** | `保存审阅结果并更新流程状态。verdict 为 accept/polish/rewrite 之一。` | `Lưu kết quả审阅 và cập nhật…` | **RÒ TIẾNG TRUNG giữa mô tả tool gửi LLM.** `审阅` còn nguyên. | `Lưu kết quả duyệt và cập nhật trạng thái luồng. verdict là một trong accept/polish/rewrite.` | `internal/tools/save_review.go:27` |
| **C2** | `审阅的章节号（全局审阅填最新章节号）` | `Số chương được審阅 (審阅toàn cục thì điền số chương mới nhất)` | Rò tiếng Trung **2 lần**, còn dùng dạng lai `審阅` (phồn thể + giản thể). Thiếu cả dấu cách sau `審阅`. Đây là **mô tả tham số trong JSON Schema gửi LLM**. | `Số chương được duyệt (duyệt toàn cục thì điền số chương mới nhất)` | `internal/tools/save_review.go:54` |
| **C3** | `审阅结论` / `审阅范围` / `审阅总结` / `保存审阅` | `Kết luận審阅` / `Phạm vi審阅` / `Tóm tắt審阅` / `Lưu审阅` | Cùng lỗi rò như trên. 4 chuỗi, 3 trong số đó là mô tả schema. | `Kết luận duyệt` / `Phạm vi duyệt` / `Tóm tắt duyệt` / `Lưu duyệt` | `save_review.go:61,55,62,31` |
| **C4** | `2-3 条语言特征规则（每条 ≤30 字）`<br>`3-5 条叙述风格规则（每条 ≤50 字，要具体可执行）` | `… ≤30 ký tự`<br>`… ≤50 ký tự` | **Đổi đơn vị làm hỏng dữ liệu sinh ra.** `字` = chữ Hán ≈ một từ; `ký tự` = character. `≤30 ký tự` buộc LLM viết quy tắc dài ~5 từ → StyleRules lưu vào store thành mảnh vụn vô dụng, rồi được nạp vào prompt writer mọi chương. (Hai chuỗi `字符` khác thì dịch `ký tự` là **đúng** — xem C5.) | `… ≤30 từ` / `… ≤50 từ` | `internal/tools/save_arc_summary.go:45,48` |
| **C5** | `每条不超过 25 字` (trong prompt cocreate) | `không quá 25 ký tự` | Cùng lỗi C4. Gợi ý cho người dùng bị nén còn ~4 từ. | `không quá 25 từ` | prompt `cocreate` (chuỗi dài, `internal/host/cocreate*.go`) |
| **C6** | `状态机异常修复` | `Sửa lỗi trạng thái máy` | **ĐẢO NGHĨA.** `状态机` = *máy trạng thái* (state machine). `trạng thái máy` = machine state — ngược nghĩa. Cùng file, chuỗi `状态机异常：` lại dịch **đúng** là `Máy trạng thái bất thường:`. | `Sửa lỗi máy trạng thái` | `internal/diag/planner.go:32` |
| **C7** | `爽点/情节点兑现率偏低 (%.0f%% 未达成)` | `Tỉ lệ thực hiện nhịp truyện/cao trào thấp (…)` | Dịch sai cả hai khái niệm **và đảo chúng**: `爽点` (điểm sảng/cao trào) → “nhịp truyện”, `情节点` (điểm cốt truyện) → “cao trào”. Còn giành mất từ “nhịp” của `节拍` trong bảng thuật ngữ. | `Tỉ lệ thực hiện điểm cao trào/điểm cốt truyện thấp (%.0f%% không đạt)` | `internal/diag/rules_quality.go:165` |
| **C8** | `✻ 设定` | `✻ Cài đặt` | Sai nghĩa. `设定` ở đây là **thiết lập truyện** (worldbuilding của `save_foundation`), không phải “Cài đặt” ứng dụng. Cùng catalog, `设定类型` lại dịch đúng là `loại thiết lập`. | `✻ Thiết lập` | `internal/host/stream_extract.go:30` |
| **C9** | `✻ 打磨` | `✻ Chỉnh sửa` | Trùng nghĩa với `编辑`/`edit`, làm người dùng không phân biệt được hai bước. Bảng thuật ngữ chốt `打磨` = **gia công**. | `✻ Gia công` | `internal/host/stream_extract.go:25` |
| **C10** | `checkpoint 停滞在同一 step` | `Điểm khôi phục bị kẹt tại cùng một step` | Bảng thuật ngữ chốt `检查点` = **checkpoint (giữ nguyên)**. Bản zh vốn đã dùng chữ Latin `checkpoint`, bản dịch lại đổi thành “Điểm khôi phục” — vừa lệch thuật ngữ, vừa lẫn với `恢复` = khôi phục. | `checkpoint bị kẹt tại cùng một step` | `internal/diag/runtime_rules.go:102` |
| **C11** | `，约 %d 字，下一章为第 %d 章\n` | `，khoảng %d chữ，chương tiếp theo là chương %d\n` | Giữ **dấu phẩy toàn phần `，`** giữa câu tiếng Việt (2 chỗ). Sai chính tả và lệch bề rộng cột trong TUI. | `, khoảng %d từ, chương tiếp theo là chương %d\n` | `internal/host/cocreate_stage.go:35` |
| **C12** | `弧号` | `Số cung truyện` | Dùng biến thể `cung truyện` trong **mô tả schema** của tham số `arc`. Nên theo thuật ngữ chốt. | `Số cung` | `internal/tools/save_arc_summary.go:54` |

### NHỎ

| # | msgid | Bản vi hiện tại | Vấn đề | Đề xuất |
|---|---|---|---|---|
| n1 | `伏笔%s(%s)埋设章`, `伏笔:%d` | `phục-bút` | Gạch nối không nhất quán (23 chỗ khác dùng `phục bút`). Riêng `伏笔:%d` là nhãn ctxpack nên gạch nối là **có ý**; chỗ còn lại thì không. | `Chương đặt phục bút %s (%s)` |
| n2 | `下一弧骨架待展开` | `Skeleton cung truyện tiếp theo cần được mở rộng` | Bỏ sót chữ `Skeleton` chưa dịch. | `Khung cung tiếp theo chờ mở rộng` |
| n3 | `%s 上下文 %.0f%% (%d/%d) 策略: %s` | `… cửa sổ ngữ cảnh …` | Thêm “cửa sổ” mà nguồn không có. | `… ngữ cảnh …` |
| n4 | `- 未收伏笔：%s\n`, `- **%s ↔ %s**：%s（第 %d 章）\n`, `- **[%s]** … 状态：%s\n` | giữ `：` và `（）` toàn phần | Dấu câu tiếng Trung sót lại trong text tiếng Việt. ~8 chuỗi. | đổi sang `: ` và `( )` |
| n5 | `ch%d(%d项 payoff)` | `ch%d(%d payoff)` | Mất lượng từ `项` (mục). | `ch%d(%d mục payoff)` |
| n6 | `一句话直接开始写` | `Một câu là bắt đầu viết ngay` | Câu tối nghĩa. | `Chỉ một câu là viết ngay` |
| n7 | `运行态` | `Trạng thái` | Mất nghĩa “đang chạy”. | `Trạng thái chạy` |
| n8 | `（补充：` | `(ghi chú: ` | `补充` = bổ sung, không phải ghi chú. | `(bổ sung: ` |
| n9 | 41 cặp | thêm/bớt khoảng trắng lề | Xem [§5](#5-khoảng-trắng-lề-và-xuống-dòng) — **phần lớn là đúng, không phải lỗi**. | — |

---

## 3. Thuật ngữ không nhất quán (đếm thực tế trên catalog)

Đếm theo số msgid. Cột “chuẩn de-facto” cho biết biến thể nào đang thắng — dùng để quyết định nên sửa bảng thuật ngữ hay sửa bản dịch.

| Khái niệm | Chốt | Phân bố thực tế | Chuẩn de-facto | Nhận định |
|---|---|---|---|---|
| `打磨` | **gia công** | `chỉnh sửa` 3 · `đánh bóng` 3 · `trau chuốt` 1 · **`gia công` 0** | *không có* | **Nặng nhất.** Thuật ngữ đã chốt chưa từng được dùng, và 3 biến thể chia đều. Phải quyết một lần rồi sửa cả 7 chỗ. |
| `审阅` | **duyệt** | `đánh giá` 7 · rò CJK 6 · `xem xét` 1 · `duyệt` 1 | `đánh giá` | Lộn xộn nhất, lại là chuỗi schema. Sửa cùng C1–C3. |
| `大纲` | **dàn ý** | **`đề cương` 15** · `dàn ý` 9 | `đề cương` | De-facto **ngược** với bảng chốt. Đề nghị: đổi bảng chốt sang `đề cương` (sửa 9 chỗ) thay vì sửa 15 chỗ — trừ khi Web UI đã dùng “dàn ý”. |
| `评审` | **duyệt** | **`đánh giá` 12** · `duyệt` 4 | `đánh giá` | De-facto ngược với bảng chốt. Cùng quyết với `审阅`. |
| `返工` | **viết lại** | `viết lại` 13 · `làm lại` 10 | `viết lại` (mảnh) | Chia gần đều. `làm lại` còn dễ lẫn `重做`. |
| `弧` | **cung** | `cung` 34 · **`cung truyện` 22** | `cung` | Chia nặng. Đây **đúng chỗ đã sinh ra lỗi N2/N3** — nên siết chặt nhất. |
| `恢复` | **khôi phục** | `khôi phục` 39 · `tiếp tục` 6 | `khôi phục` | 6 chỗ `待恢复` → `Chờ tiếp tục` làm lẫn với `继续`. |
| `角色` | **nhân vật** | `nhân vật` 25 · `vai trò` 4 | `nhân vật` | ⚠️ **Không phải lỗi thuần.** `角色` là từ đồng âm: 4 chỗ `vai trò` đều nói về **vai của agent** (architect/writer/editor), nghĩa “vai trò” là **đúng**. Cần tách thành 2 khái niệm trong bảng thuật ngữ, đừng sửa hàng loạt. |
| `字` (đơn vị) | `số từ` cho `字数` | `chữ` 3 · `từ` 3 · `ký tự` 3 | *không có* | `字数`→`Số từ` thì nhất quán, nhưng `字` trần thì tam phân. 3 ca `ký tự` là **lỗi thật** (C4, C5). 3 ca `chữ` (“500 chữ”) thì **chấp nhận được** vì tiếng Việt vẫn nói “bài 500 chữ”. |
| `卷` | **tập** | `tập` 60 · `cuốn` 2 | `tập` | 2 chỗ `cuốn` (kể cả text guard `本次任务是生成卷摘要`). |
| `伏笔` | **phục bút** | `phục bút` 23 · `phục-bút` 2 | `phục bút` | n1. |
| `世界规则` | **luật thế giới** | 1 · 1 (`quy tắc thế giới`) | *hòa* | Chỉ 2 msgid, sửa 1 là xong. |
| `裁定` | **phán quyết** | 37 · 1 (`quyết định`) | `phán quyết` | 1 chỗ. |
| `检查点` | **checkpoint** | vi phạm 1 (C10) | `checkpoint` | C10. |
| `摘要`·`章`·`干预`·`前提`·`文风`·`一致性`·`钩子`·`节拍`·`导入`·`导出`·`预算`·`字数` | — | **nhất quán** | ✅ | Không có việc phải làm. |

---

## 4. Bỏ sót tên tool → làm chết cơ chế phân loại

**Kết quả: sạch. Không có ca nào.**

Tôi quét **toàn bộ catalog** (1.334 cặp) tìm mọi định danh dạng `snake_case` hoặc `a.b.c` trong msgid rồi kiểm bản vi có giữ lại không: **0/1.334 msgid làm mất định danh**. Cơ chế phân loại của `NewEditorStopGuard` an toàn.

Nhưng có ba điều đáng lo mà việc “sạch” này che đi:

**4.1 — Nhánh dò tiếng Trung đã chết, chỉ còn tên tool đỡ.**
`internal/agents/guard/subagent_guards.go:169,172` dò **hai** dấu hiệu:
```go
case strings.Contains(task, "save_arc_summary") || strings.Contains(task, "弧摘要"):
```
Ở locale `vi`, `弧摘要` **không bao giờ** xuất hiện (nó thành “tóm tắt cung”). Nên **toàn bộ độ dư thừa đã mất** — chỉ còn tên tool giữ nhánh này sống. Không phải lỗi, nhưng nghĩa là điều kiện thứ hai không còn là lưới an toàn; nó chỉ còn phục vụ locale `zh`.

**4.2 — Test bất biến hiện có đang IM LẶNG BỎ QUA một ca.**
`internal/agents/guard/locale_invariant_test.go` khai báo:
```go
msgArcReviewTask = "对第 %d 卷第 %d 弧做弧级评审（scope=arc）"
```
Chuỗi này **không còn tồn tại trong `router.go`**. Chuỗi thật ở `router.go:149` là:
```
对第 %d 卷第 %d 弧（第 %d-%d 章）做弧级评审：调用 novel_context(chapter=%d)，save_review 使用 scope=arc、chapter=%d；issues[].chapters 只能落在该区间
```
Hệ quả: subtest đó rơi vào `t.Skipf("chưa có bản dịch…")` và **PASS màu xanh** dù không kiểm gì:
```
--- SKIP: TestKhongDaoTapVaCungTrongTextNhiemVu/对第_%d_卷第_%d_弧做弧级评审（scope=arc）
```
Comment của chính test nói *“Các msgid dưới đây phải khớp nguyên văn với internal/flow/router.go”* — điều kiện đó đã vỡ. Đây là **niềm tin sai**: chuỗi arc-review thật có **6 tham số** trong đó 4 cái `%d` liền nhau (Volume, Arc, StartChapter, EndChapter) — rủi ro đảo cao nhất toàn repo — và hiện **chưa dịch, chưa test**.

**4.3 — `stream_extract.go` là quả bom hẹn giờ chưa nổ.**
`internal/host/stream_extract.go:24-34` có 11 header dạng `"✻ 规划"` **chưa bọc i18n**. Tiền tố `"✻ "` là **hợp đồng ngầm** với `panels_activity.go:379` (`strings.HasPrefix(text, "✻")`). Khi ai đó việt hóa chúng mà bỏ `✻`, cả panel rơi khỏi nhánh `renderAgentBlock`. Hiện tại kentjuno **có giữ `✻`** ở các chuỗi đã vào catalog (tôi kiểm 0/1.334 mất ký tự marker), nhưng không có test nào chốt.

**4.4 — Không phải rủi ro (đã kiểm, để khỏi soát lại):**
`premise_structure.go` dùng **bảng alias cứng**, không qua i18n, giữ cả alias tiếng Trung cho sách cũ; tôi đối chiếu từng heading với `assets/prompts/architect-{short,long}.md` — **khớp đủ, không có livelock**. `CompactTag = "[session_compact:"` thuần ASCII, không bao giờ dịch. `" · err: "`, `"(args invalid)"`, `"stop_guard"`, `"level=ERROR"` đều là literal Go/slog không qua i18n. Các `strings.Contains` trong `novel_context.go`, `stylestat.go`, `drafts.go` dò **dữ liệu truyện** (tên nhân vật, n-gram), không phải text đã dịch. `command_palette.go` dò query của người dùng trên `desc` đã dịch — đó là **hành vi đúng**.

---

## 5. Khoảng trắng lề và xuống dòng

- **`\n` đầu/cuối:** `TestCatalogViGiuXuongDong` **PASS** (đã chạy: `go test ./internal/i18n/ -run TestCatalogViGiuXuongDong` → ok). Không có việc phải làm.
- **Ký tự marker** (`✻ ▸ ✓ ● ○ · → ↔ ⚠ ×`…): quét toàn catalog, **0 cặp làm mất marker**.
- **Khoảng trắng lề** (không có test): lệch ở **41/1.334 cặp**. Nhưng **~35 trong số đó là ĐÚNG, không phải lỗi**: bản zh kết thúc bằng `：` toàn phần (đã mang khoảng trắng thị giác), bản vi đổi thành `: ` nên buộc phải thêm dấu cách — ví dụ `'导出失败：'` → `'Xuất truyện thất bại: '`. Số thật sự đáng xem:

| msgid | Lệch | Nhận định |
|---|---|---|
| `' 省'` → `' tiết kiệm '` | thêm space cuối | Là mảnh ghép nối chuỗi → có thể sinh space đôi. Nên kiểm chỗ nối. |
| `'章节推进模式已切换为'` → `'…đã chuyển thành: '` | thêm `: ` | Nguồn nối trực tiếp tên chế độ. Thêm `: ` là **cải thiện**, chấp nhận được. |
| `'如需人工打断…'` → `' Nếu cần…'` | thêm space đầu | Cố ý nối câu trước; xác nhận lại chỗ nối. |
| `'对话'` → `' hội thoại'` | thêm space đầu | Nhãn ghép; rủi ro space đôi. |
| `'（%d 章存疑）'`, `'（新增）'`, `'（共 %d 处）'`, `'（未做任何修改）'`, `'（跳过 %d 章…）'` | thêm space đầu | Đúng quy ước tiếng Việt (`（` toàn phần → ` (`). **Không phải lỗi.** |

**Đề nghị:** thêm một test khoảng trắng lề nhưng **cho phép ngoại lệ** “zh kết thúc bằng `：`/`）` → vi được thêm 1 space”, nếu không test sẽ đỏ với 35 cặp đúng.

---

## 6. Lỗi trong công cụ của chúng ta

Đây **không phải lỗi kentjuno**, nhưng nó **chặn đúng cách chữa** mà `review_ambiguous.py` khuyên dùng cho lỗi đảo tham số, nên phải sửa trước N1.

`internal/i18n/verify.go` (`ExtractVerbs`, dòng 39-47) phân tích chỉ số tường minh `[n]` **TRƯỚC** width/precision. Go làm **ngược lại** — `[n]` phải nằm **ngay trước verb**, tức sau cả precision. Tôi đã chạy Go để xác nhận:

| Chuỗi | Go thật | `ExtractVerbs` |
|---|---|---|
| `%[2]d` | `2` ✅ | verb `d` ✅ | 
| `%.2[2]f` | `2.00` ✅ | verb **`[`** ❌ |
| `%[2].2f` | `%!f(BADINDEX)` ❌ | verb `f` ✅ |
| `%-8[2]s` | `b       ` ✅ | verb `[` ❌ |

Hệ quả cụ thể:
1. Với verb **không có** width/precision (`%[2]d`, `%[2]s`) hai bên trùng nhau → cách chữa bằng chỉ số vẫn dùng được.
2. Với verb **có** precision — tức **chính xác trường hợp N1 (`%.2f`, `%.0f`)** — hai bên loại trừ nhau: viết đúng Go (`%.0[3]f`) thì `verify.go` báo lệch verb (build đỏ oan); viết theo `verify.go` (`%[3].0f`) thì runtime in `%!f(BADINDEX)`. **Không có lối nào an toàn.**
   → Vì vậy bản vi đề xuất cho N1 **giữ trật tự của nguồn**, không dùng chỉ số.
3. `review_ambiguous.py` bỏ qua chuỗi khi `"%[" in target`. Với cú pháp Go đúng (`%.0[3]f`) điều kiện này **không bao giờ đúng** → script vẫn báo động chuỗi đã được chữa tử tế.
4. Dương tính giả: `ExtractVerbs("đạt 80% của")` trả về verb **`c`** (nó đọc `% c` — space là flag, `c` là verb). Bất kỳ bản dịch nào có một dấu `%` đơn lẻ rồi space rồi chữ cái sẽ sinh verb ma. Hiện chưa cặp nào trong catalog trúng (bản dịch đều dùng `%%`), nhưng đây là bẫy chờ.

**Đề nghị:** sửa `ExtractVerbs` chuyển khối `[n]` xuống sau precision, cập nhật docstring `review_ambiguous.py` (đang khuyên `%[n]d` — chỉ đúng khi không có width/precision), và đổi điều kiện bỏ qua thành regex bắt được cả `%.0[3]f`.

---

## 7. Chuỗi kentjuno bỏ sót (còn nguyên tiếng Trung)

**Xác nhận con số 83.** Đo lại độc lập trên 144 file `.go` prod căn được giữa `d98aa0fb` và `kj/main`: **83 lượt, 48 chuỗi khác nhau**. Phân bố cũng khớp đề bài.

Phân loại theo yêu cầu:

| File | Lượt | Loại | Kết luận |
|---|---:|---|---|
| `internal/tools/premise_structure.go` | 53 | **Nhãn cấu trúc** | ✅ Đã xử lý xong bởi agent khác qua bảng alias cứng (giữ alias tiếng Trung cho sách cũ + thêm canonical tiếng Việt). **Không cần làm gì.** |
| `internal/host/imp/splitter.go` | 7 | **DỮ LIỆU** | ✅ Bỏ sót là **ĐÚNG**. Là regex/tập ký tự nhận tiêu đề chương tiếng Trung (`零〇○Ｏ０一二三…`, `(?:章\|回\|话\|卷\|节\|幕)`, `序章\|楔子\|尾声…`). Dịch = phá bộ nhận diện. Chỉ 1 chuỗi `第%d章` là hiển thị và **đã có trong catalog**. |
| `internal/stylestat/stylestat.go` | 7 | **DỮ LIỆU** | ✅ Bỏ sót là **ĐÚNG** về mặt i18n (regex bắt văn phong tiếng Trung: `像一\|仿佛\|如同\|宛如`, `沉默了\|没有说话…`). ⚠️ Nhưng chúng **vô dụng khi phân tích văn Việt** — đó là việc của tầng logic, không phải TM. |
| `internal/store/session.go` | 8 | **Lơ là** (6) + dữ liệu (2) | ⚠️ `[session_compact: %s %d字 \| 见 %s]` v.v. là **marker người dùng thấy**, nên dịch — nhưng **buộc phải giữ nguyên tiền tố `[session_compact:`** vì `session.go:311` và `redact.go:115` dò bằng `HasPrefix(CompactTag)`. `第\s*(\d+)\s*章` là regex → giữ nguyên. |
| `internal/agents/ctxpack/restore.go` | 4 | **Lơ là — nặng** | ❌ 4 **prompt lớn gửi LLM** (prompt nén ngữ cảnh, khung `## 当前进度 / ## 角色即时状态 / ## 活跃伏笔与线索`…). Chưa dịch dòng nào. Đây là khoảng trống lớn nhất còn lại và ảnh hưởng trực tiếp chất lượng khôi phục sau nén. |
| `internal/host/exp/txt.go` | 4 | **Lơ là** (3) + dữ liệu (1) | ⚠️ `'第 %d 卷  %s\n'`, `'第 %d 章  %s\n\n'` là **header trong file truyện xuất ra cho người đọc** → phải dịch. `^#+\s+第.+?章` là regex → giữ. |

**Tổng kết mục 6:** trong 83 lượt bỏ sót, **~22 lượt (5 file) là DỮ LIỆU và bỏ sót là đúng**; **~61 lượt là lơ là**, nhưng 53 trong đó (`premise_structure.go`) đã được xử lý. Còn lại thực sự cần làm: **`ctxpack/restore.go` (4 prompt LLM)**, `exp/txt.go` (3 header xuất bản), `session.go` (6 marker nén).

---

## 8. Đánh giá riêng: `internal/llmcontract` và phần `Schema()`

### 8.1 `internal/llmcontract` — TM không đóng góp gì, và đó **không phải lỗi kentjuno**

| Chỉ số | Giá trị |
|---|---|
| Chuỗi CJK trong `internal/llmcontract` | **38** |
| Đã dịch | **0 (0%)** |
| Đến từ TM kentjuno | **0** |

Lý do: `internal/llmcontract` **không tồn tại** ở base mà kentjuno fork (`git ls-tree d98aa0fb \| grep llmcontract` → 0 file; `kj/main` cũng 0). Đây là code upstream mới hơn, **TM về mặt cấu trúc không thể phủ**. Vậy nên không có gì để soát về chất lượng — chỉ có khoảng trống về độ phủ.

Trong 38 chuỗi đó, **4 chuỗi gửi thẳng cho LLM** ở mọi lần gọi có cấu trúc và nên được ưu tiên:
- `contract.go`: `## 输出契约\n\n`, `只输出一个符合下列 JSON Schema 的 JSON 对象，不要输出解释、Markdown 围栏或标签本身。\n\n`
- `execute.go` (prompt sửa lỗi khi LLM trả sai): `上面的输出不符合 JSON Schema。请根据错误修正，并只输出完整 JSON 对象，不要解释或 Markdown 围栏。` và bản cho lỗi nghiệp vụ.

34 chuỗi còn lại (`validate.go`) là **thông báo lỗi cho người vận hành** (`%s 必须是 %s，实际为 %s`, `%s.%s 是必填字段`…) — chưa dịch nên người vận hành Việt đọc tiếng Trung khi chẩn đoán. Ưu tiên sau nhóm 4 chuỗi trên.

### 8.2 `internal/tools` — phần `Schema()`: độ phủ hoàn hảo, chất lượng có 2 vết thật

| Chỉ số | Giá trị |
|---|---|
| Chuỗi CJK trong `internal/tools` | **314** |
| Đã dịch | **314 (100%)** |
| Nguyên bản kentjuno | **211 (67%)** |

Độ phủ đầy đủ. Về chất lượng, đây là lớp **quan trọng hơn chuỗi UI** (dịch tệ → LLM hiểu sai yêu cầu → chất lượng sinh văn tụt), và tôi tìm thấy đúng hai lớp lỗi thật, cả hai đều của kentjuno:

1. **Rò tiếng Trung trong `save_review.go` (C1–C3, 6 chuỗi).** Nghiêm trọng nhất về mặt “gửi cho LLM”: mô tả tool và 3 mô tả tham số schema đều chứa `审阅`/`審阅` chưa dịch, trong đó `審阅` là dạng **lai phồn thể + giản thể** — không phải chữ hợp lệ ở bất kỳ biến thể tiếng Trung nào, dấu hiệu rõ của một lượt find/replace hỏng. Riêng `Số chương được審阅 (審阅toàn cục…)` còn dính chữ do thiếu dấu cách. Đây là **toàn bộ bề mặt schema của `save_review`** — tool then chốt của vòng duyệt.

2. **Đổi đơn vị độ dài `字` → `ký tự` (C4).** Đây là lỗi **âm thầm mà tốn kém nhất** trong nhóm schema, vì nó không hỏng cú pháp, không rò chữ, không sai ngữ pháp — LLM **tuân thủ đúng** cái ràng buộc đã bị dịch sai. `≤30 字` (≈30 từ) thành `≤30 ký tự` (≈5 từ) làm `StyleRules.Rules` và `.Prose` của mọi cung truyện thành mảnh vụn, rồi mảnh vụn đó được nạp vào prompt writer ở **mọi chương**. Không test nào và không bộ kiểm nào bắt được lớp lỗi này.

Ngoài hai lỗi trên, 211 chuỗi kentjuno trong `internal/tools` mà tôi đọc qua đều **truyền đạt đúng ý** — kể cả các mô tả dài và khó như `传 chapter=N：额外返回该章的前情摘要、伏笔、角色状态、风格规则等写作上下文`, `找到 old_string 并替换为 new_string，要求精确匹配且唯一（多处匹配需 replace_all=true）`, `常见原因：字符串值中的双引号未转义为 \"…`. Các định danh (`next_chapter`, `progress_status`, `replace_all`, `stop_reason=length`…) được giữ nguyên **100%**. Đây là mặt mạnh rõ rệt của TM.

---

## 9. Số liệu và phạm vi KHÔNG soát

### Đã soát

| Hạng mục | Đã soát / Tổng | Cách soát | Lỗi tìm ra | Tỉ lệ |
|---|---|---|---|---|
| 1. Đảo tham số | **68/68** cặp kentjuno có ≥2 verb cùng kiểu | thủ công, đọc chỗ dùng trong code | **3 SAI** (N1,N2,N3) + 65 ĐÚNG, 0 KHÔNG CHẮC | **4,4%** |
| 2. Bỏ sót tên tool | **1.334/1.334** msgid (toàn catalog) | tự động (regex định danh + đối chiếu) | **0** | **0%** |
| 2b. Ký tự marker | 1.334/1.334 | tự động | **0** | **0%** |
| 3. Thuật ngữ | **26/26** khái niệm trong bảng chốt | tự động đếm biến thể + đọc ví dụ | **13 khái niệm** có ≥2 biến thể | **50% khái niệm** |
| 4. Dịch sai nghĩa | **150/837** cặp kentjuno (mẫu, seed `20260730`) | thủ công từng cặp | 10 CẦN SỬA + 11 NHỎ | **6,7% / 7,3%** |
| 5. `\n` lề | 1.334/1.334 | test có sẵn — **PASS** | 0 | 0% |
| 5b. Khoảng trắng lề | 1.334/1.334 | tự động | 41 lệch, **~6 đáng xem** | **0,45%** |
| 6. Bỏ sót CJK | **83/83** lượt (48 chuỗi) | đo lại độc lập, phân loại từng file | 22 lượt “đúng khi bỏ sót”, 61 lơ là (53 đã xử lý) | — |
| CJK rò trong bản vi | 1.334/1.334 | tự động | **6 lỗi thật** + 4 là dữ liệu hợp lệ | **0,45%** |
| Độ phủ `llmcontract` | 38/38 | tự động | 0% dịch (ngoài tầm TM) | — |
| Độ phủ `internal/tools` | 314/314 | tự động | 100% dịch | — |

**Cách chọn mẫu 150 (mục 4):** quần thể = 837 cặp kentjuno **nguyên bản đang thực sự dùng trong catalog** (loại 319 cặp TM không dùng và 496 cặp tự dịch). `random.seed(20260730)` + `random.sample(pop, 150)` với `pop` đã `sorted()` → **lặp lại được y nguyên**.

### KHÔNG soát — nói rõ

1. **687/837 cặp kentjuno chưa đọc từng chữ (82%).** Mục 4 là **lấy mẫu, không phải soát toàn bộ**. Suy ra từ mẫu: còn khoảng **~46 cặp CẦN SỬA và ~50 cặp NHỎ chưa được tìm ra**. Các mục 1, 2, 3, 5, 6 thì soát **toàn bộ** (đều tự động hoá được).
2. **496 cặp tự dịch** (không thuộc TM) — ngoài phạm vi. ⚠️ Nhưng lưu ý: trong 115 chuỗi có nguy cơ đảo tham số thì **47 chuỗi là tự dịch** và **chưa ai soát**. Cùng lớp lỗi với N1. Nên giao cho một lượt soát riêng.
3. **319 cặp TM chưa vào catalog** — chưa soát, vì chưa dùng.
4. **Assets** (`assets/prompts/`, `references/`, `styles/`) — không soát; thuộc agent `assets`. Tôi chỉ đối chiếu heading của `architect-{short,long}.md` với `premise_structure.go` (§4.4).
5. **Web UI** (`web/`) — không soát.
6. **Không chạy thật.** Toàn bộ báo cáo dựa trên đọc code + phân tích tĩnh + 2 lệnh `go test` + 1 chương trình Go nhỏ kiểm cú pháp `fmt`. Tôi **không** chạy `ainovel-cli` để xác nhận N1 hiện trên màn hình — kết luận N1 dựa trên `budget.go:83` truyền `(total, s.limit, s.warnRatio*100)` cộng với `fmt.Sprintf` chạy thật cho ra `“đã chi $40.00, đạt 50% ngân sách $80.00”`.
7. **Full-suite `go test ./...`** — không chạy, nên không có baseline delta. Chỉ chạy `./internal/i18n/` và `./internal/agents/guard/` (**cả hai xanh**).

---

## 10. Danh sách chuỗi cần thêm test

Xếp theo mức đáng làm.

**T1 — Chốt trật tự tham số cho chuỗi tiền tệ/phần trăm (bắt N1).**
Không tự động suy ra được; phải chốt bằng giá trị cụ thể như `TestKhongDaoTapVaCungTrongTextNhiemVu` đã làm. Dùng 3 số phân biệt được (vd `total=41`, `limit=57`, `ratio=72`) rồi khẳng định `"$41"` xuất hiện trước `"$57"` và `"72%"` đúng vị trí:
- `预算告警: 已花费 $%.2f，达到预算 $%.2f 的 %.0f%%` ← **đang SAI, test này phải đỏ ngay**
- `预算用尽: 已花费 $%.2f，超出预算 $%.2f，立即停机`
- `预算用尽: 已花费 $%.2f，超出预算 $%.2f，将在当前子代理任务结束后停机`
- `预算停机: 已花费 $%.2f，超出预算 $%.2f；上调 budget.book_usd 后可恢复续跑`
- `本书已花费 $%.2f，达到预算上限 $%.2f；请上调配置 budget.book_usd 后重试`
- `改写率过高 (%d/%d = %.0f%%)`

**T2 — Sửa const đã mục trong `locale_invariant_test.go` (bắt 4.2).**
Đổi `msgArcReviewTask` sang chuỗi thật ở `router.go:149`, **và** đổi `t.Skipf` thành `t.Errorf` khi chuỗi chưa có bản dịch — hoặc thêm một test khẳng định mọi msgid hằng trong file test đều **tồn tại trong `router.go`**. Hiện tại skip im lặng chính là thứ đã che ca này.

**T3 — Chốt tiền tố `✻ ` cho mọi header của `stream_extract.go` (bắt 4.3).**
11 chuỗi ở `stream_extract.go:24-34`. Test: với mọi locale, `i18n.F(header)` phải `HasPrefix("✻ ")`. Làm ngay **trước khi** ai đó việt hóa chúng.

**T4 — Chốt tiền tố `[session_compact:` (bắt §7 `session.go`).**
4 chuỗi `[session_compact: …]`. Khi dịch, `HasPrefix(CompactTag)` ở `session.go:311` và `redact.go:115` phải còn đúng ở mọi locale.

**T5 — Không rò CJK trong bản vi (bắt C1–C3).**
Quét catalog: không msgid nào được có ký tự CJK trong bản vi. Ngoại lệ **không cần liệt kê tay** — chúng đều theo một khuôn duy nhất: msgid dạng `<nhãn>『<mẫu tiếng Trung>』`, trong đó phần giữa `『』` là **dữ liệu** (mẫu văn phong mà `stylestat` dò) nên phải giữ nguyên, còn nhãn bên ngoài thì phải dịch. Vậy luật test gọn là: *CJK chỉ được phép nằm trong `『』`*. Lúc soát có 4 chuỗi như vậy; đến cuối phiên đã thành **8** (agent khác thêm `思维标记『…』`, `抽象套话『…』`, `神态模板『…』`, `躯体反应『…』` — **tất cả đều đúng**), nên luật theo khuôn sẽ bền hơn danh sách cứng. Cần thêm ngoại lệ riêng cho `未识别到任何章节：…` (liệt kê dạng tiêu đề được hỗ trợ, dùng `「」`).

**T6 — Nhất quán thuật ngữ (bắt §3).**
Sau khi chốt bảng: test quét catalog, mỗi khái niệm chỉ được dùng 1 biến thể. Cần cơ chế ngoại lệ cho `角色` (nhân vật ↔ vai trò của agent) — nếu không sẽ có dương tính giả.

**T7 — Trật tự `卷`/`弧` mở rộng ra ngoài text nhiệm vụ.**
`TestKhongDaoTapVaCungTrongTextNhiemVu` hiện chỉ phủ 3 msgid của `router.go`. Có **18 msgid** chứa cả `卷` và `弧`; nên quét toàn catalog theo cùng nguyên tắc, đặc biệt `卷[%d]弧[%d] 起点 %d 应为 %d`, `卷[%d]弧[%d] 范围倒置 %d..%d` (4 `%d`, `synthesize.go:313,316`) và `- 当前位置：第 %d 卷 第 %d 弧\n`.

**T8 — Khoảng trắng lề, có ngoại lệ.**
Xem §5: phải cho phép “zh kết thúc bằng `：`/`）` → vi thêm 1 space”, nếu không test đỏ với 35 cặp đúng.

**T9 — Đơn vị độ dài trong chuỗi schema (bắt C4/C5).**
Msgid chứa `N字` (không phải `N字符`) thì bản vi **không được** dùng `ký tự`. 3 chuỗi đang vi phạm. Ngược lại msgid chứa `N字符` thì **phải** dùng `ký tự` (2 chuỗi, hiện đúng).

**T10 — Sửa `ExtractVerbs` rồi chốt bằng test (bắt §6).**
Test bảng: `%.2[2]f` phải cho verb `f` idx 2; `%[2].2f` phải bị **từ chối**; `"đạt 80% của"` không được sinh verb nào.

---

## 11. Việc nên làm, theo thứ tự

1. **N1** — sửa `预算告警`. Lỗi duy nhất còn sống làm hiển thị sai dữ liệu. Sửa bằng cách giữ trật tự nguồn, **không** dùng chỉ số tường minh (§6).
2. **§6** — sửa `ExtractVerbs` + docstring `review_ambiguous.py`. Làm trước khi ai đó cần dùng chỉ số tường minh.
3. **T2** — sửa const mục trong test guard. Đang cho niềm tin sai.
4. **C1–C3** — dọn 6 chỗ rò `审阅`/`審阅` trong `save_review.go`. Bề mặt schema của tool then chốt.
5. **C4, C5** — sửa `ký tự` → `từ` ở 3 ràng buộc độ dài. Đang âm thầm làm hỏng StyleRules mọi cung.
6. **T1, T3, T5** — ba test rào lại ba lớp lỗi vừa vá.
7. **§3** — chốt `打磨`, `审阅`/`评审`, `大纲`, `弧`, `返工`; tách `角色` thành 2 khái niệm.
8. **§7** — dịch `ctxpack/restore.go` (4 prompt LLM), `exp/txt.go` (3 header xuất bản), `session.go` (6 marker).
9. **§8.1** — dịch 4 chuỗi hợp đồng LLM trong `llmcontract`, rồi 34 thông báo lỗi vận hành.
10. **Soát 47 chuỗi tự dịch có nguy cơ đảo tham số** (§9, mục KHÔNG soát #2) — cùng lớp lỗi với N1, chưa ai xem.

---

## Ghi chú về đua ghi

Catalog bị sửa **trong lúc tôi soát**: lần đọc đầu (`review_ambiguous.py`) thấy N2 còn sai (`Mở rộng cung %d tập %d`); ~20 phút sau file đã đổi (`mtime 21:08:15`, tôi đọc lúc 21:08:34) thành `Mở rộng tập %d cung %d`. Nên:

- Mọi **số đếm** trong báo cáo này là ảnh chụp catalog **1.334 cặp** ở khoảng 21:00–21:30 ngày 2026-07-30. Đến cuối phiên catalog đã lên **1.794 cặp**.
- Số liệu `tm.json` (1.159 cặp) thì ổn định — file này không bị sửa.

**Đã chạy lại 3 quét tự động quan trọng nhất trên catalog 1.794 cặp để xác nhận kết luận không bị ảnh hưởng:**

| Quét | Trên 1.334 cặp | Trên 1.794 cặp | Kết luận |
|---|---|---|---|
| msgid mất định danh (tên tool) | 0 | **0** | §4 giữ nguyên |
| Cặp kentjuno nguyên bản | 837 | 835 | §1 giữ nguyên (2 cặp vừa bị sửa) |
| Rò CJK — của kentjuno | 6 lỗi + 4 dữ liệu | **6 lỗi + 4 dữ liệu** | C1–C3 **vẫn còn sống** |
| Rò CJK — của agent khác | — | 4, **tất cả đều đúng** (mẫu `『』`) | không phải lỗi mới |
| **N1 `预算告警`** | sai | **VẪN SAI** (kiểm 21:2x) | ưu tiên #1 vẫn đứng |

Nghĩa là: 460 cặp mới thêm vào **không** làm phát sinh lỗi thuộc các lớp tôi soát tự động, và **không** ca nào trong bảng phát hiện bị vá ngoài N2/N3.
