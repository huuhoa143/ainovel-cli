# Luồng — đối chiếu vi / zh

Đo ngày 2026-07-31 trên `main` @ `881a917`. Câu hỏi: **có quyết định điều khiển nào
phụ thuộc vào chữ ĐÃ DỊCH không?**

## Cách đo

Không đọc tệp rồi suy. Đo bằng cách chạy `flow.Route` thật và `guard.NewEditorStopGuard`
thật ở locale thật, rồi in giá trị lúc chạy.

Nhánh của guard được đo bằng **hành vi quan sát được**, không đọc code: dựng ba store,
mỗi store chỉ có MỘT checkpoint step (`review` / `arc_summary` / `volume_summary`), rồi
xem guard cho `end_turn` hay không. Ba kết quả cho phép chỉ danh nhánh:

| bộ ba (review, arc, vol) | nhánh đã chọn |
|---|---|
| allow, allow, allow | `default` (lỏng) |
| block, allow, block | `arc_summary` (nghiêm) |
| block, block, allow | `volume_summary` (nghiêm) |

Cỗ đo là tệp test dùng-một-lần, đặt trong một **bản sao repo ở `/tmp`** (không sửa gì
trong repo, không lệnh git ghi nào). Mọi lần chạy đều có `-count=1`.

## Kết luận ngắn

**Luồng lõi an toàn. Cả 13 nhánh của bảng quyết định đều rẽ theo trường CÓ KIỂU.**
`flow/router.go`, `host/engine.go`, `host/advance_gate.go`, `store/progress.go`: **0**
chỗ rẽ nhánh theo chuỗi. `advance_gate.go` chỉ so `AdvanceMode`, số nguyên và
`slices.Contains` trên `[]int`.

Mong manh tập trung ở **một** hàm: `guard/subagent_guards.go:168-182`. Nó sống được hôm
nay, nhưng sống bằng may.

Ba phát hiện có bằng chứng, không có phát hiện nào ở mức chặn phát hành:

| # | Chỗ | Mức | Trạng thái |
|---|---|---|---|
| L1 | `guard/subagent_guards.go:170,173` — 2/4 điều kiện con CHẾT ở vi | Trung bình | sống nhờ tên tool; **đã có test canh** |
| L2 | `diag/runtime.go:254` — khế ước hai đầu thứ tư, **không test nào canh** | Thấp | đúng hôm nay, không có lưới |
| L3 | `store/session.go:157` — bóc số chương lệch giữa hai ngôn ngữ | Thấp | tên tệp log sai, không ảnh hưởng sáng tác |

Và **một cảnh báo ngược**: bản sửa "bọc `i18n.F`" mà một agent trước đã đúng khi từ chối
— tôi đo được nó còn **tệ hơn** dự đoán. Xem L1-c.

---

## L1 — `NewEditorStopGuard`: 2 trong 4 điều kiện con chết ở locale vi

`internal/agents/guard/subagent_guards.go:170,173`

```go
case strings.Contains(task, "save_volume_summary") || strings.Contains(task, "卷摘要"):
case strings.Contains(task, "save_arc_summary")    || strings.Contains(task, "弧摘要"):
```

### Chữ thật thu được lúc chạy

`internal/flow/router.go:156` và `:162` sinh ra:

| locale | task text thật | chứa `卷摘要`/`弧摘要`? | chứa tên tool? |
|---|---|---|---|
| vi | `Tạo tóm tắt tập 7 cung 2 (save_arc_summary)` | **false** | true |
| vi | `Tạo tóm tắt tập 7 (save_volume_summary)` | **false** | true |
| zh | `生成第 7 卷第 2 弧摘要（save_arc_summary）` | true | true |
| zh | `生成第 7 卷卷摘要（save_volume_summary）` | true | true |

### Nhánh nào nổ, nhánh nào không

Ba **nhánh** đều nổ được ở vi — đo bằng bộ ba checkpoint:

| task (locale vi) | nhánh đo được | thông báo guard tiêm vào |
|---|---|---|
| `Tạo tóm tắt tập 7 cung 2 (save_arc_summary)` | `ARC_SUMMARY(nghiêm)` | `Nhiệm vụ lần này là tạo tóm tắt cung: bạn phải gọi save_arc_summary để ghi đĩa trước khi kết thúc, save_review phục thẩm không tính hoàn thành.` |
| `Tạo tóm tắt tập 7 (save_volume_summary)` | `VOLUME_SUMMARY(nghiêm)` | `Nhiệm vụ lần này là tạo tóm tắt tập: bạn phải gọi save_volume_summary…` |
| `Duyệt cấp cung cho tập 7 cung 2 (chương 31-40)…` | `DEFAULT(lỏng)` | — (cho qua) |
| `Duyệt toàn cục 5 chương đầu (save_review scope=global, chapter=5)` | `DEFAULT(lỏng)` | — (cho qua) |

Nhưng ở tầng **điều kiện con** thì 2 trong 4 là nhánh chết:

| điều kiện con | vi | zh |
|---|---|---|
| `Contains(task,"save_volume_summary")` | **NỔ** | NỔ |
| `Contains(task,"卷摘要")` | **CHẾT** | NỔ |
| `Contains(task,"save_arc_summary")` | **NỔ** | NỔ |
| `Contains(task,"弧摘要")` | **CHẾT** | NỔ |

Tức phép phân loại ở locale người dùng thật đang đứng trên **một chân**: tên tool trong
ngoặc. Hai vế Hán là code chết ở vi — không lỗi, không log, chỉ là chúng không bao giờ
được hỏi tới.

### Hậu quả cụ thể nếu chân đó mất

Nếu ai đó dịch lại `生成第 %d 卷第 %d 弧摘要（save_arc_summary）` cho gọn — ví dụ
`Tạo tóm tắt cung 2 của tập 7` — thì:

1. `Contains(task,"save_arc_summary")` false, `Contains(task,"弧摘要")` false → rơi
   nhánh `default`.
2. `default` chấp nhận `[]string{"review","arc_summary","volume_summary"}` — bất kỳ cái nào.
3. Editor được phái tạo tóm tắt cung, nó gọi `save_review` trước (hành vi đã quan sát
   được của model yếu, xem chú thích `outline-exhaustion-livelock` ở chính hàm này),
   guard thấy có `review` → **cho end_turn**.
4. **Tóm tắt cung không bao giờ ghi đĩa.** `Route` lần sau thấy `!s.HasArcSummary` →
   phái lại đúng task đó → editor lại `save_review` → cho qua. Vòng lặp không tiến.

### L1-a. Đã có lưới canh — và nó đúng chỗ

`internal/agents/guard/locale_invariant_test.go:42` (`TestTextNhiemVuEditorLuonChuaTenToolOMoiNgonNgu`)
chốt đúng bất biến này: task text phải chứa tên tool ở **cả hai** ngôn ngữ. Ai dịch lại
mà bỏ `save_arc_summary` đi thì build đỏ, không phải livelock trên máy người dùng.

Đây là lý do tôi xếp L1 ở mức **Trung bình chứ không Cao**: mong manh là thật, nhưng nó
đã được ràng buộc.

### L1-b. Lỗ chưa được canh: task do LLM viết

`internal/agents/build.go:301` — `StopGuardFactory: func(_, task string)` nhận **bất kỳ**
chuỗi task nào đi vào `workers.Run`. Đo được 16 điểm sinh `Task:`, trong đó **3 điểm
đưa chữ do LLM viết tới guard của editor**:

- `host/engine.go:445` — Arbiter phán quyết bế tắc, `decision.Dispatch.Task`
- `host/engine.go:511` — Arbiter phán quyết thất bại, `decision.Dispatch.Task`
- `host/engine.go:696` — phán quyết can thiệp của người dùng

Với hai đường Arbiter dispatch (`dispatch: editor` trong `assets/prompts/arbiter-intervention.md:20`)
thì `default` là **đúng** — chúng phái editor đi duyệt/đưa vào hàng đợi viết lại, và
`save_review` chính là sản phẩm mong đợi. Không phải phát hiện.

Đường có rủi ro thật là `arbiter-failure.md:21`: *"Bản thân văn bản nhiệm vụ có thể tối
nghĩa → `reroute` cùng agent nhưng **viết lại task** rõ ràng hơn"*. Nếu task gốc là
task tóm tắt cung và Arbiter viết lại mà bỏ `save_arc_summary`, lần reroute đó rơi
`default`. Giới hạn thiệt hại: chỉ **một** lượt chạy editor bị lỏng, vì lượt sau `Route`
sinh lại đúng chuỗi có tên tool. **Tôi KHÔNG dựng lại được ca này** — nó cần một LLM
thật viết lại task; `internal/e2e/` dùng LLM giả với script cố định.

### L1-c. ⚠ Bản sửa "bọc `i18n.F`" phá đúng nhánh đang chạy được

Agent trước đã đúng khi không bọc, nhưng lý do còn nặng hơn họ nói. Đo được:

```
[vi] i18n.F("卷摘要") = "tóm tắt tập"     i18n.F("弧摘要") = "tóm tắt cung"
[vi] arcTask khớp F(卷摘要)? TRUE  | khớp F(弧摘要)? false
```

`"tóm tắt tập"` **nằm trong** task tóm tắt CUNG — vì task cung là
`Tạo tóm tắt tập 7 cung 2 (…)`. Và `case` tập đứng **trước** `case` cung trong switch.
Nên mô phỏng đúng switch đó cho ra:

| giả định | arcTask → | volTask → |
|---|---|---|
| hôm nay (chỉ tên tool + chữ Hán) | `ARC_SUMMARY` ✓ | `VOLUME_SUMMARY` ✓ |
| bọc `i18n.F`, **giữ** tên tool | **`VOLUME_SUMMARY`** ✗ | `VOLUME_SUMMARY` ✓ |
| bọc `i18n.F`, bỏ tên tool | **`VOLUME_SUMMARY`** ✗ | `VOLUME_SUMMARY` ✓ |

Giữ tên tool **không cứu được**: `||` làm `case` tập khớp qua `F(卷摘要)` trước khi
`case` cung được hỏi tới.

Hậu quả cụ thể của bản sửa đó: editor được phái `Tạo tóm tắt tập 7 cung 2 (save_arc_summary)`
nhưng guard đòi checkpoint `volume_summary`. Editor gọi `save_arc_summary` → checkpoint
`arc_summary` → guard **từ chối** end_turn. Đủ 3 lần chặn thì `escalate` (`subagentMaxConsecutiveBlocks = 3`),
Engine chạy lại editor. Tóm tắt cung **vẫn ghi được đĩa** (tool chạy trước khi guard chặn),
nên sách vẫn tiến — giá phải trả là **3 lượt LLM bị chặn + 1 escalate + 1 lượt phái lại
cho MỖI cuối cung**. Ở cuối cung không phải cuối tập thì `volume_summary` không bao giờ
xuất hiện, nên mỗi cuối cung đều trả đủ giá đó.

Nói cách khác: bản sửa "trông có vẻ locale-aware" biến một phép phân loại **đang đúng**
thành một phép phân loại **luôn sai một nửa**. Nếu sau này có ai muốn bỏ hai vế Hán, cách
đúng là truyền một **trường có kiểu** từ Router xuống (ví dụ `Instruction.EditorGoal`),
không phải dịch chuỗi.

---

## L2 — Khế ước hai đầu thứ tư: `diag` đếm lần chặn bằng cách dò chữ trong log

Lead đã có ba ca: `host/stream_extract.go` (tiền tố `✻ `),
`host/advance_gate.go`, `tools/ask_user.go`. Ca thứ tư:

- **Bên sinh**: `guard/subagent_guards.go:110` — `slog.Warn(i18n.F("subagent stop_guard 拦截 end_turn"), …)`
- **Bên đọc**: `diag/runtime.go:254` — `strings.Contains(line, "stop_guard")`

Hai đầu viết cứng riêng, đầu sinh đi qua i18n. Đo cả hai đầu thật, qua đúng handler mà
app dùng (`logger.SetupFile(dir,"tui.log",false)`):

```
[vi] time=… level=WARN msg="subagent stop_guard chặn end_turn" module=agent.guard agent=writer turn=1 consecutive=1
[vi] diag.CaptureRuntime → StopGuard=4 LogWarns=3 LogErrors=1
[zh] msg="subagent stop_guard 拦截 end_turn"
[zh] diag.CaptureRuntime → StopGuard=4 LogWarns=3 LogErrors=1
```

**Đúng hôm nay ở cả hai ngôn ngữ.** Ba bản dịch đều tình cờ giữ nguyên định danh
`stop_guard`:

| msgid | bản vi |
|---|---|
| `subagent stop_guard 拦截 end_turn` | `subagent stop_guard chặn end_turn` |
| `subagent stop_guard 检测到不可恢复停机，立即升级` | `subagent stop_guard phát hiện dừng không thể khôi phục, escalate ngay` |
| `subagent stop_guard 连续阻拦超限，升级为终止` | `subagent stop_guard chặn liên tiếp vượt giới hạn, nâng cấp thành terminate` |

Nhưng **không có test nào canh** (grep `stop_guard` trong mọi `*_test.go`: chỉ một dòng
chú thích ở `agents/agentcore_contract_test.go:17`). Ai dịch `stop_guard` thành
`chốt canh dừng` cho thuần Việt là `RuntimeCapture.StopGuard` về 0 mãi mãi.

**Hậu quả cụ thể**: `/diag` mất tín hiệu "hệ thống đang tự chặn". Người dùng thấy đúng
cái triệu chứng mà chú thích `BlockHook` ở `subagent_guards.go:19` mô tả —
*"kẹt + token chạy nhanh"* — và `/diag` báo mọi thứ bình thường, nên không phân biệt
được hệ thống đang tự chữa hay đang chạy không tải.

Hai phép dò cạnh nó là **an toàn thật**, không phải may: `level=ERROR`/`level=WARN` do
`slog.TextHandler` viết (không qua i18n), và `kindRe = kind=(\S+)` đọc **khóa** thuộc
tính slog. Khóa thuộc tính là định danh tiếng Anh, không nằm trong catalog.

---

## L3 — Bóc số chương từ chữ hiển thị: một chỗ lệch giữa hai ngôn ngữ

`internal/store/session.go:152-170`. `extractChapter` thử `chapterRe` (`第\s*(\d+)\s*章`)
rồi `chapterViRe` (`(?i)chương\s*(\d+)`), kết quả quyết định tên tệp
`meta/sessions/agents/{agent}-{suffix}.jsonl`.

Đo trên **cả 12 chuỗi task thật** mà Router sinh, ở cả hai locale:

| điểm sinh trong router.go | bóc ở vi | bóc ở zh | |
|---|---|---|---|
| `:99` bù thiếu nền | `""` | `""` | |
| `:101` foundation_audit | `""` | `""` | |
| `:121` viết lại | `ch03` | `ch03` | |
| `:121` gia công | `ch03` | `ch03` | |
| **`:148` duyệt cấp cung** | **`ch31`** | **`""`** | **LỆCH** |
| `:156` tóm tắt cung | `""` | `""` | |
| `:162` tóm tắt tập | `""` | `""` | |
| `:168` expand_arc | `""` | `""` | |
| `:174` append_volume | `""` | `""` | |
| `:187` duyệt toàn cục | `""` | `""` | |
| `:203` dàn ý cạn | `ch04` | `ch04` | |
| `:213` viết chương tiếp | `ch03` | `ch03` | |

Chữ thật gây lệch: `Duyệt cấp cung cho tập 7 cung 2 (chương 31-40): … chapter=40 …`.
`chapterViRe` khớp `chương 31` → `ch31`. Bản zh `（第 31-40 章）` không khớp
`第\s*(\d+)\s*章` (sau `31` là `-`, không phải `章`) → rỗng.

Chạy `SessionStore.SubAgentLogger` thật với đúng 12 task đó cho ra tên tệp:

```
[vi] … editor-001  editor-002  editor-003  editor-ch31   writer-ch03 …
[zh] … editor-001  editor-002  editor-003  editor-004    writer-ch03 …
```

**Hậu quả cụ thể**: phiên duyệt cấp cung của cung 31-40 (mà **chương đích là 40**, xuất
hiện hai lần trong task dưới dạng `chapter=40`) được ghi vào `editor-ch31.jsonl`. Đi
truy lỗi bản duyệt của cung đó, mở `editor-ch40.jsonl` — không có tệp. Ở zh cùng phiên
đó nằm ở `editor-004.jsonl`. Tức tên tệp **nói sai** chương nào, và nói sai khác nhau
tuỳ ngôn ngữ.

Không phải lỗi sáng tác: không có va chạm tệp (mỗi cung có `StartChapter` riêng), và
`usage_replay.go:142` `parseAgentNameFromFile` chỉ lấy phần **trước dấu `-` đầu tiên** →
tên agent bóc đúng ở cả hai locale (tên agent không có dấu `-`; `architect_long` dùng
gạch dưới). Đây là khế ước hai đầu **an toàn thật**, đã đo.

Về đầu mối `hợp đồng` → `khế ước chương`: **đo được là KHÔNG liên quan.** Cả 12 chuỗi
task của Router không chuỗi nào chứa `hợp đồng` hay `khế ước`. Bảy msgid có thuật ngữ đó
đều nằm ở prompt/diag (`Writer có thể chưa đọc khế ước chương…`,
`Tỉ lệ thực hiện khế ước thấp…`), không có phép bóc dữ liệu nào đọc chúng.

---

## Những chỗ đo ra SẠCH (nói kèm số, không nói suông)

**`flow/router.go` — 13/13 nhánh đã kiểm ở cả hai locale.** 10 nhánh sinh `Task`
(12 chuỗi phân biệt, tính cả biến thể `foundation_audit` và cặp viết lại/gia công);
3 nhánh (1 `Phase=Complete`, 4 `Flow=Reviewing`, 5 `Flow=Steering`) trả `nil` — đo được
đúng `nil` ở cả vi và zh. Mọi điều kiện rẽ là trường có kiểu: `Phase`, `Flow`, `Layered`,
`IsArcEnd`, `IsVolumeEnd`, `NeedsExpansion`, `NeedsNewVolume`, `PlanningTier`, và số
nguyên. **0 chỗ `strings.Contains`/`HasPrefix`.** Không chuỗi nào có `%!` (lệch tham số
format) ở cả hai locale.

**`host/advance_gate.go` — 0 chỗ rẽ theo chuỗi.** `HandleBoundary` và `Allow` so
`AdvanceMode` (kiểu riêng, có `Valid()`), `AdvancePermitChapter` (int),
`slices.Contains(progress.CompletedChapters, permit)` (`[]int`), và
`flow.ResolveAdvanceHold` trả enum. i18n chỉ xuất hiện trong thông báo lỗi.

**`host/engine.go` — 0 chỗ rẽ theo chuỗi.** Task text được dùng làm **khóa map** cho bộ
đếm bế tắc (`:418 key := in.Agent + "\x00" + in.Task`) và bộ đếm lặp lỗi (`:490`) — đó là
định danh, không phải phân loại, nên bản dịch chỉ đổi khóa chứ không đổi hành vi.
Giả thuyết "đổi ngôn ngữ giữa lượt làm mất bộ đếm" **đã kiểm và bị loại**: grep
`SetLocale` cho thấy **0 điểm gọi ngoài test** — locale chốt ở `i18n.init()` theo
`AINOVEL_LANG`, không có lệnh `/lang` lúc chạy dù chú thích `i18n.go:66` có nhắc.

**`store/progress.go` — 0 chỗ rẽ theo chuỗi.** 27 hàm, mọi `i18n.F` nằm trong thông báo
lỗi. Chỗ duy nhất **chọn giữa hai msgid** (`:510-512`, hàng đợi viết lại vs gia công)
chọn bằng điều kiện có kiểu, và chú thích tại chỗ ghi rõ bản trước ghép chuỗi từ
`i18n.F("重写")` đã bị sửa — tức lớp lỗi này từng có và đã được đóng.

**`domain/chapter.go` — 2 chỗ đọc `i18n.Active()`** (`WordCount:59`,
`RuneBudgetForWords:149`). Cả hai rẽ theo **giá trị Locale có kiểu**, không theo chữ đã
dịch. Đúng theo thiết kế: chúng đổi **đơn vị đo**, không đổi luồng. Mọi điểm dùng
`WordCount` đã kiểm (13 điểm) đều là số báo cáo hoặc ngưỡng lọc mẫu văn, không có điểm
nào đưa hàng đợi viết lại.

**`internal/e2e/` — 13/13 test xanh ở locale vi** (`go test ./internal/e2e/ -count=1`,
6.670s, exit 0). Nhưng phải nói rõ giới hạn: grep `Layered|arc_summary|volume_summary`
trong `internal/e2e/*.go` cho **0 kết quả**. `TestVongDoiSachTiengViet` chạy trọn vòng
đời một sách **6 chương, không phân tầng** (`ĐO ĐƯỢC: 6 chương, total_word_count=2347`).
Nghĩa là **ba nhánh của `NewEditorStopGuard` chưa từng được chạy trong một vòng đời
sách thật** — chúng chỉ có test đơn vị (`guard_test.go:193`) và cỗ đo của báo cáo này.

**Quét lớp 2 toàn repo.** Grep mọi `Contains/HasPrefix/HasSuffix/EqualFold/TrimPrefix/
Index/Split/Count/Replace` có tham số chứa chữ Hán, trên `internal/` + `cmd/`, bỏ test:
đúng **2 dòng** — `subagent_guards.go:170` và `:173`. Không còn nhánh chết theo chữ Hán
nào khác trong mã sản xuất. Grep rune literal Hán trong `case`/`if`: **0**.
`stylestat.go` (`sentenceEnders`, `gramEdgeStop`) đã có biến thể vi ở `:164` và `:419` —
đã locale-aware, không phải nhánh chết.

---

## Ngoài phạm vi nhưng đo được — chuyển cho lượt văn phong

`internal/store/drafts.go` có **hai phép kiểm dấu thoại mâu thuẫn nhau trong cùng một
tệp**:

- `:121` `dialogueRe = regexp.MustCompile("\"[^\"]*\"")` — ngoặc kép ASCII
- `:209` `strings.Count(para, "“") > 2` — ngoặc kép toàn phần `“`

`assets/references/dialogue-writing.md:71` chốt lối ASCII làm **mặc định của bản tiếng
Việt**. Đo hai phép kiểm trên văn thoại dày viết theo hai lối:

| văn theo lối | `dialogueRe` khớp | `Count(“)` | bộ lọc "thoại dày" (>2) |
|---|---|---|---|
| ASCII (mặc định bản vi) | **3** lời thoại | 0 | **KHÔNG NỔ** |
| `“ ”` (lối upstream zh) | **0** | 3 | NỔ |

Đúng một trong hai sống, tuỳ ngôn ngữ. Ở vi: `ExtractCharacterVoiceSamples` chạy được
(tốt — ở zh nó **chết**, và đó là lỗi upstream có từ `568ef0b`, không do việt hóa),
nhưng bộ lọc "bỏ đoạn thoại dày" của `ExtractStyleAnchors` **không bao giờ nổ** → style
anchor gửi cho writer có thể là đoạn toàn thoại thay vì đoạn kể.

Đây là ảnh hưởng **văn phong**, không phải luồng, nên tôi chỉ đo và chuyển tiếp. Giới
hạn phép đo phải nói rõ: tôi đo trên văn mẫu tự dựng, **không** đo trên văn LLM thật —
`output/` chỉ có 2.806 ký tự văn LLM giả, quá ít để kết luận về phân bố dấu thoại thật.

---

## Đã kiểm bao nhiêu, và cái gì không kiểm được

**Đã kiểm 22 nhánh quyết định:**

- 13 nhánh `flow.Route` (10 sinh Task / 3 trả nil) × 2 locale
- 3 nhánh `NewEditorStopGuard` × 2 locale, chỉ danh bằng hành vi quan sát
- 4 điều kiện con chuỗi bên trong 2 nhánh đó (2 chết ở vi)
- 2 nhánh `i18n.Active()` trong `domain/chapter.go`

Thêm: 12 chuỗi task × 2 locale qua `extractChapter`; 1 khế ước hai đầu chạy thật
đầu-tới-đầu (`diag` ↔ `slog`); 1 khế ước hai đầu đọc-mã (`parseAgentNameFromFile`);
16 điểm sinh `Task:` được truy tới điểm vào duy nhất `workers.Run` (`engine.go:473`).

**Không kiểm được:**

1. **Task do Arbiter viết lại (`engine.go:445`, `:511`, `:696`).** Cần LLM thật; e2e dùng
   LLM giả có script cố định. L1-b là suy luận từ prompt + cơ chế guard, **không phải
   ca đã dựng lại**.
2. **Ba nhánh `writerBlockMsg` (`subagent_guards.go:138-145`) chỉ kiểm qua test có sẵn**,
   không qua cỗ đo của tôi. Chúng rẽ theo tập `seen` (khóa checkpoint step, tiếng Anh),
   nên không thuộc lớp mong manh đang xét; `guard_test.go:111` đã canh, và đã neo vào
   msgid nguyên văn thay vì một từ lẻ.
3. **Vòng đời sách phân tầng thật.** Không có cỗ e2e nào chạy tới cuối cung/cuối tập, nên
   tôi không quan sát được `Route → editor → guard → checkpoint → Route` khép vòng trên
   một sách phân tầng. Ba nhánh guard đã chỉ danh riêng lẻ; **chuỗi khép vòng thì chưa.**
4. **`store/session.go` `taskKey` dùng lại tệp trong cùng run** — tôi chỉ đo một lượt ghi
   mỗi task, không đo hành vi ghi lặp cùng task trong một run dài.

## Dựng lại phép đo

Cỗ đo không nằm trong repo (bản sao ở `/tmp/luong-probe/ainovel-cli`, kèm
`internal/probeluong/probe*_test.go` và một shim xuất `extractChapter`). Nếu cần biến nó
thành test thường trú thì hai thứ đáng giữ nhất, theo thứ tự:

1. **Canh khế ước `stop_guard`** (L2) — hiện không có lưới nào, và đó là lưới của chính
   người đi truy lỗi.
2. **Canh nhánh guard bằng hành vi**, không bằng chuỗi: chốt rằng task tóm tắt cung mà
   Router sinh phải cho ra nhánh đòi `arc_summary` — chốt như vậy còn bắt được cả
   bẫy L1-c, thứ mà `locale_invariant_test.go` (chỉ kiểm "có tên tool") không thấy.
