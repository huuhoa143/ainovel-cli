# Đề án tái cấu trúc: Hybrid Coordinator — Host định tuyến × LLM phán quyết

> **Tài liệu lịch sử, đã bỏ.** Hybrid Coordinator bị kiến trúc Engine + Arbiter thay thế vào 2026-07-12; thiết kế hiện hành xem `docs/architecture.md`, `docs/engine-rfc.md`. Bài này chỉ giữ lại biên bản tiến hóa quyết định, không được dùng làm căn cứ hiện thực.
>
> Trạng thái gốc: **đã chấp nhận và đáp đất** (2026-04-20)
> Thời gian khảo sát: 2026-04-20
> Tài liệu hiện hành tương ứng: `docs/architecture.md` §2 / §3 / §7 / §8 / §13 đã cập nhật đồng bộ
>
> **Tài liệu này là bản thảo thứ hai.** Vấn đề của phương án cấp tiến ở bản thảo thứ nhất (xóa hoàn toàn Coordinator) xem chi tiết ở phụ lục A, giữ mục đó để không đi lại đường vòng.
>
> Kết quả đáp đất:
> - `internal/host/flow/` được tạo mới (router.go / state.go / dispatcher.go / router_test.go, 15 kiểm thử đơn vị theo nhánh đều qua)
> - `internal/host/reminder/` xóa `flow.go` / `queue_guard.go` / `book_complete.go`; giữ StopGuard và Guard của tác tử con
> - `assets/prompts/coordinator.md` nén từ 88 dòng xuống ~45 dòng (trách nhiệm thu về việc thi hành chỉ thị của Host + phán quyết + chọn loại lúc khởi động)
> - `internal/host/resume.go` đơn giản hóa mạnh, chỉ sinh label và prompt ngắn, còn bước sau cụ thể do Router phái sau lần TurnEnd đầu tiên
> - `internal/store/` thêm các phương thức hỗ trợ `HasArcReview` / `HasArcSummary` / `HasVolumeSummary` / `CheckConsistency`
> - Bug agent state của `observer.go` không còn dừng ở working cũng được khắc phục cùng lúc

---

## 1. Bối cảnh

### 1.1 Định vị dự án

```
agentcore       — framework agent tổng quát
litellm         — cổng LLM tổng quát
ainovel-cli     — agent dọc cho việc sáng tác tiểu thuyết (dự án này)
```

Không gian quyết định của agent dọc là **đóng**: sơ đồ luồng cố định, nhánh có hạn, sự thật lái. Triết lý thiết kế của agent tổng quát ("đặt cược vào năng lực model") mà áp vào tình huống dọc thì có phần thuần khiết quá mức.

### 1.2 Mục tiêu của người dùng (theo ưu tiên)

1. **Tính ổn định** — viết tiếp liên tục, không bị ngắt vì định tuyến sai
2. **Ăn phần lợi từ việc nâng cấp LLM** — kiến trúc không đối kháng với năng lực model
3. **Dùng đủ năng lực nhiều agent** — phân công chức năng rõ ràng

Đề án này làm một **cải thiện Pareto** giữa ba mục tiêu đó (không hy sinh mục tiêu nào để đổi lấy mục tiêu khác).

---

## 2. Khảo sát hiện trạng

### 2.1 Phân loại các điểm quyết định của Coordinator

Trích từng điểm quyết định trong `coordinator.md`:

| # | Điểm quyết định | Bản chất | Tần suất |
|---|---|---|---|
| 1 | Chọn architect_long / short lúc khởi động | Phán quyết (hiểu ngữ nghĩa) | 1 lần một cuốn sách |
| 2 | Mở rộng đầu vào (<20 từ thì tự bồi thêm) | Phán quyết (mang tính sáng tác) | 0-1 lần một cuốn sách |
| 3 | Vòng bồi đủ quy hoạch | Định tuyến (sự thật lái) | 1-3 lần |
| 4 | Bước sau mỗi lần commit chương | **Định tuyến** | **1-2 lần mỗi chương** |
| 5 | Thi hành theo bước việc duyệt cuối cung | Định tuyến | 3-5 lần mỗi cung |
| 6 | Phân nhánh theo verdict của việc duyệt | Định tuyến (đã code hóa, xem §2.3) | 1 lần mỗi cung |
| 7 | Xử lý can thiệp của người dùng | Phán quyết (buộc phải LLM) | tùy ý |
| 8 | Tác tử con báo lỗi thì phái lại | Định tuyến | thỉnh thoảng |
| 9 | Cả sách xong thì xuất tổng kết | Định tuyến | 1 lần |

**Kết luận**: trong 9 điểm quyết định thì 6 cái là định tuyến thuần (tra bảng), 3 cái là phán quyết thật sự cần LLM. **Tần suất xảy ra của định tuyến cao hơn phán quyết rất nhiều** (1-2 lần mỗi chương so với vài lần một cuốn sách).

### 2.2 Kênh Reminder vốn đã là một bán thành phẩm của việc code hóa luồng

Các bộ sinh dưới `internal/host/reminder/` mỗi lượt dựa trên sự thật để sinh ra **chỉ thị cụ thể tới từng động tác**:

- `flow.go` → `"flow hiện tại=writing, next_chapter=37. Hãy gọi thẳng subagent(writer, \"viết chương 37\")..."`
- `queue_guard.go` → `"flow hiện tại=rewriting, hàng đợi chờ xử lý: [3,5]. Hãy gọi writer ngay để viết lại từng chương..."`
- `book_complete.go` → `"Cả sách đã xong. Hãy xuất bản tổng kết cả sách..."`

**Kiến trúc hiện tại có double dispatch**:
```
Tầng luật: coordinator.md định nghĩa "nếu A thì B"
  ↓
Tầng Reminder: mỗi lượt dựa trên sự thật để cụ thể hóa luật → sinh ra "giờ hãy làm B"
  ↓
Tầng LLM: đọc reminder rồi sinh tool_call (về cơ bản là thuật lại reminder)
  ↓
SubAgent thi hành
```

**LLM thực chất chỉ đang "thi hành" cái chỉ thị mà Reminder đưa cho nó**. Khâu trung gian này vừa tốn token, vừa đưa vào tính bất định (LLM có thể không tuân thủ hoàn toàn reminder, ví dụ lỗi định tuyến của mid đã quan sát được).

### 2.3 Tầng tool từng gánh quá nhiều phán đoán ngữ nghĩa

- Bản hiện thực cũ của `save_review` từng ghi đè verdict của Editor theo ngưỡng điểm cố định và trạng thái contract; nay đã xóa, phán quyết văn học thuộc về Editor, tool chỉ kiểm giao thức và ánh xạ trạng thái nguyên tử
- `commit_chapter.CheckArcBoundary()`: tính ngay `arc_end / needs_expansion / needs_new_volume`
- `commit_chapter.applyCompletion()`: phán ngay `book_complete`
- `CommitResult` trả về 17 trường sự thật

**Kết luận**: phần lưu trữ tất định và các bất biến về giai đoạn thì để lại tầng tool, còn phán đoán văn học và ngữ nghĩa thì giao cho model.

### 2.4 Chi phí thực tế của hiện trạng

Số lượt LLM của Coordinator mỗi chương:
- **1-2 turn mỗi chương** (đọc system prompt ~3000 token + reminder ~200 token + lịch sử + CommitResult ~500 token → sinh tool_call ~50 token)
- Truyện dài 200 chương thì khoảng **200-400 turn** lời gọi LLM của Coordinator
- Trong đó **~90% là định tuyến thuần** (LLM thuật lại reminder), **~10% là phán quyết**

**Mỗi chương tốn ~3500-7000 token cho việc quyết định của Coordinator, 95% là dư thừa** (Reminder đã tính ra đáp án rồi).

---

## 3. Phương án thiết kế: Hybrid Coordinator

### 3.1 Ý tưởng cốt lõi

**Chuyển việc quyết định luồng từ LLM sang Host, nhưng giữ Coordinator làm nút phán quyết và kênh thi hành chỉ thị**.

```
┌──────────────────────────────────────────────────────────┐
│                   Entry (TUI / headless)                   │
└────────────────────────────────┬─────────────────────────┘
                                 │ Start / Resume / Steer
┌────────────────────────────────▼─────────────────────────┐
│                            Host                            │
│                                                             │
│   ┌──────────────────────────────────────────────────┐     │
│   │  Flow Router (nhân mới thêm)                      │     │
│   │  ───────────                                      │     │
│   │  Đăng ký sự kiện Coordinator: kích hoạt khi tool   │     │
│   │  subagent trả về                                   │     │
│   │  Hàm thuần: route(Progress, Checkpoint, Boundary)  │     │
│   │      → NextInstruction                             │     │
│   │  Có chỉ thị → coordinator.FollowUp(chỉ thị)         │     │
│   │  Không chỉ thị (tình huống phán quyết) → không can  │     │
│   │  thiệp, để LLM tự chủ                              │     │
│   └──────────────────────────────────────────────────┘     │
│                                                             │
│   Giữ: API vòng đời / Observer / Usage Tracker              │
│   Giữ: resume.go (đơn giản hóa, không đổi logic nhân)        │
└────────────────────────────────┬─────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────┐
│                    Coordinator Agent (LLM)                  │
│                                                             │
│   Trách nhiệm thu về hai loại:                               │
│   1. Nhận chỉ thị FollowUp của Host → sinh tool_call tương ứng│
│   2. Khi Steer của người dùng tới thì tự chủ phán quyết       │
│      (truy vấn/lượng định việc sửa)                          │
│                                                             │
│   coordinator.md: 88 dòng → ~25 dòng                         │
│   MaxTurns: giữ 1000 (đáp ứng steer của người dùng + thi hành │
│   chỉ thị của Host)                                          │
└────────────────────────────────┬─────────────────────────┘
                                 │
                                 ▼
         ┌──────────────────────┼───────────────────────┐
         ▼                      ▼                       ▼
    ┌────────┐             ┌────────┐             ┌────────┐
    │Architect│             │ Writer │             │ Editor │
    └────────┘             └────────┘             └────────┘
```

### 3.2 Phân định lại trách nhiệm

| Tầng | Làm gì | Không làm gì |
|---|---|---|
| **Host / Flow Router** | Đọc sự thật → định tuyến bằng hàm thuần → chỉ thị FollowUp | Tự gọi SubAgent (vẫn qua Coordinator) |
| **Coordinator** | Thi hành chỉ thị của Host + phán quyết can thiệp của người dùng + chọn kiến trúc sư lúc khởi động | Tự chủ quyết "bước sau làm gì" |
| **SubAgent (A/W/E)** | Việc bổn phận của mỗi bên | Không đổi |
| **Tầng tool** | Ghi xuống đĩa nguyên tử + trả sự thật | Không đổi |

**Các bất biến then chốt**:
- ✅ Coordinator vẫn là một agent run liên tục, giữ được "sự cảm nhận liên tục" cả sách
- ✅ Steer của người dùng vẫn qua `coordinator.Inject()`, năng lực ngắt ngay được giữ
- ✅ SubAgentTool vẫn do LLM gọi (đi qua đường nguyên bản của agentcore), dòng sự kiện / ContextManager / việc đổi model đều không đổi
- ✅ agentcore không phải sửa gì

### 3.3 Logic cụ thể của Flow Router

```go
// internal/host/flow/router.go

type NextInstruction struct {
    Agent  string   // architect_long / architect_short / writer / editor
    Task   string   // mô tả tác vụ đưa cho tác tử con
    Reason string   // lý do cho Coordinator xem (tùy chọn, tiện debug)
}

type RouterState struct {
    Progress        *domain.Progress
    LatestCheckpoint *domain.Checkpoint
    // Biên cung của chế độ phân tầng (tính khi chương trước đã hoàn thành)
    LastCompleted   int
    ArcBoundary     *store.ArcBoundary
    HasArcReview    bool
    HasArcSummary   bool
    // Các mục thiết định nền còn khuyết
    FoundationMissing []string
}

// Route trả về chỉ thị bước sau. Trả nil nghĩa là để Coordinator tự chủ phán quyết (tình huống phán quyết).
func Route(s RouterState) *NextInstruction {
    p := s.Progress

    // 0. Trạng thái cuối: để LLM xuất bản tổng kết, không định tuyến
    if p.Phase == domain.PhaseComplete {
        return nil
    }

    // 1. Giai đoạn quy hoạch: phán quyết (chọn kiến trúc sư) do LLM làm, không định tuyến
    if p.Phase != domain.PhaseWriting {
        return nil
    }

    // 2. Giai đoạn viết
    // 2a. Hàng đợi viết lại/gia công ưu tiên
    if len(p.PendingRewrites) > 0 {
        ch := p.PendingRewrites[0]
        verb := "viết lại"
        if p.Flow == domain.FlowPolishing {
            verb = "gia công"
        }
        return &NextInstruction{
            Agent:  "writer",
            Task:   fmt.Sprintf("%s chương %d", verb, ch),
            Reason: fmt.Sprintf("hàng đợi PendingRewrites còn %d chương", len(p.PendingRewrites)),
        }
    }

    // 2b. Đang duyệt: không định tuyến, để Coordinator phân nhánh verdict theo kết quả save_review
    if p.Flow == domain.FlowReviewing {
        return nil
    }

    // 2c. Hậu xử lý cuối cung của chế độ phân tầng
    if p.Layered && s.ArcBoundary != nil && s.ArcBoundary.IsArcEnd {
        b := s.ArcBoundary
        if !s.HasArcReview {
            return &NextInstruction{
                Agent:  "editor",
                Task:   fmt.Sprintf("duyệt cấp cung cho cung %d của tập %d", b.Arc, b.Volume),
                Reason: "việc duyệt cuối cung chưa hoàn thành",
            }
        }
        if !s.HasArcSummary {
            return &NextInstruction{
                Agent:  "editor",
                Task:   fmt.Sprintf("sinh tóm tắt cho cung %d của tập %d", b.Arc, b.Volume),
                Reason: "tóm tắt cung chưa hoàn thành",
            }
        }
        if b.NeedsExpansion {
            return &NextInstruction{
                Agent:  "architect_long",
                Task:   fmt.Sprintf("mở rộng cung %d của tập %d (save_foundation type=expand_arc)", b.NextArc, b.NextVolume),
                Reason: "khung của cung sau chờ mở rộng",
            }
        }
        if b.NeedsNewVolume {
            return &NextInstruction{
                Agent:  "architect_long",
                Task:   "lượng định rồi thi hành save_foundation(type=append_volume) hoặc mark_final",
                Reason: "tập kết thúc nên cần quyết việc nối thêm tập mới",
            }
        }
    }

    // 2d. Viết tiếp bình thường
    next := p.NextChapter()
    return &NextInstruction{
        Agent:  "writer",
        Task:   fmt.Sprintf("viết chương %d", next),
        Reason: "viết tiếp",
    }
}
```

**Đặc tính của hàm**:
- Hàm thuần (vào RouterState, ra NextInstruction)
- Kiểm thử đơn vị được (cho một trạng thái, khẳng định kết quả định tuyến)
- **Trả nil là hợp pháp** — nghĩa là "đây là tình huống phán quyết, hãy để LLM tự chủ"

### 3.4 Thời điểm kích hoạt

Host đăng ký sự kiện `agentcore.EventToolExecEnd`:

```go
coordinator.Subscribe(func(ev agentcore.Event) {
    if ev.Type == agentcore.EventToolExecEnd && ev.Tool == "subagent" && !ev.IsError {
        // SubAgent vừa trả về → đọc trạng thái mới nhất → định tuyến
        h.flowRouter.Dispatch()
    }
})
```

```go
func (r *FlowRouter) Dispatch() {
    state := r.loadState()
    instruction := Route(state)
    if instruction == nil {
        return // tình huống phán quyết, để LLM tự chủ
    }
    msg := formatInstruction(instruction)
    _ = r.coordinator.FollowUp(agentcore.UserMsg(msg))
}

func formatInstruction(i *NextInstruction) string {
    return fmt.Sprintf(
        "[Host ra chỉ thị] Bước sau: gọi subagent(%s, %q)\n"+
        "Lý do: %s\n"+
        "Đây là chỉ thị rõ ràng của tầng luồng, hãy thi hành ngay, đừng gọi novel_context trước, đừng xuất phần suy luận trước.",
        i.Agent, i.Task, i.Reason,
    )
}
```

### 3.5 Tính đáp ứng và đồng thời

**Đường Steer của người dùng** (không đổi):
```
Steer → coordinator.Inject(UserMsg("[người dùng can thiệp] xxx"))
```

- Đang chạy: tin nhắn chèn vào hàng đợi của run hiện tại
- Idle: resume run
- Paused: xếp hàng

**Việc đồng thời của chỉ thị định tuyến + Steer**:
- Cả hai đều vào hàng đợi tin nhắn của Coordinator, xử lý theo thứ tự nguyên bản của agentcore
- Nếu Host vừa gửi `FollowUp("[Host chỉ thị] viết chương 37")`, ngay sau đó người dùng Steer `"dừng chút, chỉnh văn phong"`
  - Coordinator xử lý chỉ thị của Host trước? Hay xử lý Steer trước?
  - **Ngữ nghĩa của `Inject` là chèn lên đầu hàng đợi hiện tại**, nên Steer được xử lý trước
  - Đây là hành vi mong đợi: can thiệp của người dùng có ưu tiên cao hơn việc điều phối thường lệ của Host

**Tránh xung đột giữa chỉ thị Host và Steer**:
- Flow Router sau khi nhận tín hiệu "Steer đã được tiêm" thì **tạm dừng ngắn** vài turn (để Coordinator xử lý xong Steer rồi mới định tuyến)
- Nhận biết kết quả xử lý Steer bằng cách đăng ký `agentcore.EventMessageEnd` + kiểm biến động trạng thái Progress

### 3.6 Ví dụ đơn giản hóa coordinator.md

Từ 88 dòng chặt xuống khoảng 25 dòng:

```markdown
Bạn là tổng điều phối việc sáng tác tiểu thuyết.

## Cách làm việc của bạn

**Trục chính**: Host sẽ ra tin nhắn `[Host ra chỉ thị]` sau mỗi lần tác tử con trả về, nói cho bạn biết bước sau gọi tác tử con nào làm gì. Nhận chỉ thị thì sinh tool_call tương ứng ngay, đừng gọi novel_context để suy luận trước, đừng thuật lại.

**Phán quyết**: gặp các trường hợp sau thì bạn cần tự phán đoán (Host sẽ không ra chỉ thị, bạn buộc phải chủ động hành động):

### Lúc khởi động: chọn kiến trúc sư

- Mặc định → `architect_long`
- Chỉ khi người dùng yêu cầu tường minh truyện ngắn/một tập/tiểu phẩm và độ dài giới hạn trong 25 chương → `architect_short`

Nếu đầu vào của người dùng < 20 từ, hãy bồi thêm hướng khác biệt, đối tượng đọc, và ít nhất một móc truyện phi thường quy vào phần mô tả task trước, rồi mới phái.

### Steer của người dùng

Định dạng: `[người dùng can thiệp] xxx`

- **Loại truy vấn** (hỏi trạng thái/thiết định): xuất câu trả lời bằng chữ luôn, không cần gọi tool nữa; Host sẽ tiếp tục phái việc.
- **Loại sửa** (yêu cầu sửa thiết định/viết lại/chỉnh văn phong): lượng định phạm vi ảnh hưởng:
  - Liên quan việc đổi thiết định → gọi architect_* làm `save_foundation(type=...)`
  - Liên quan chương đã viết → để tool tự ghi chương mục tiêu vào `PendingRewrites` (có thể nói rõ ý định viết lại khi gọi writer lần nữa)
  - Chỉ ảnh hưởng văn phong về sau → mô tả ngắn gọn yêu cầu rồi lần sau nhận chỉ thị của Host thì gắn kèm vào phần mô tả task của writer.

## Tool

- `subagent(agent, task)`: gọi tác tử con
- `novel_context`: chỉ dùng khi truy vấn của người dùng cần, đừng gọi trước khi chỉ thị của Host tới

## Tác tử con

- `architect_long` / `architect_short` / `writer` / `editor`

## Cấm

- Gọi novel_context trước rồi mới hành động khi chỉ thị của Host tới
- Tự quyết bước sau khi không có Steer của người dùng và cũng không có chỉ thị của Host
```

### 3.7 Kênh Reminder gầy đi mạnh

**Xóa**:
- `flow.go` (FollowUp của Host đã ra chỉ thị cụ thể, phần nhắc định tuyến của Reminder mất giá trị)
- `queue_guard.go` (hàng đợi do Host Router bảo đảm)
- `book_complete.go` (Host FollowUp chỉ thị xuất tổng kết khi Phase=Complete)

**Giữ**:
- `subagent_guards.go` (StopGuard của Writer/Architect/Editor, bảo đảm tác tử con không kết thúc tay không)
- Thêm mới một `foundation_reminder.go` nhẹ: giai đoạn quy hoạch thì báo cho Coordinator các mục còn khuyết (đây là **thông tin mà việc phán quyết cần** chứ không phải chỉ thị định tuyến)

**StopGuard được giữ**:
- StopGuard của Coordinator được giữ (khi `Phase != Complete` thì chặn end_turn để đỡ lưng)
- Thêm mới phần tiêm nhắc khi "đã nhận chỉ thị của Host mà lượt này không gọi subagent tương ứng"

### 3.8 resume.go đơn giản hóa chút ít

`buildResumePrompt` hiện tại sinh chỉ thị bằng ngôn ngữ tự nhiên chính xác tới từng step theo checkpoint (121 dòng).

Kiến trúc mới:
- Khi Resume thì đọc Progress trước, Flow Router tính ra `NextInstruction`
- Coordinator nhận một resume prompt **rất ngắn**, rồi đợi chỉ thị FollowUp của Host

```
[Khôi phục] Sách «xxx» đã hoàn thành N chương, đang ở giai đoạn XX.
Hãy đợi chỉ thị bước sau của Host, hoặc xử lý phần can thiệp của người dùng có thể còn sót lại trong lúc dừng máy.
```

Gần như toàn bộ logic phân nhánh chìm xuống Flow Router (Router vốn đã phải định tuyến theo trạng thái, Resume không cần một đường riêng).

---

## 4. Đánh giá mức đạt mục tiêu

### 4.1 Tính ổn định

| Rủi ro | Hiện tại | Kiến trúc mới |
|---|---|---|
| Coordinator chọn sai architect | Đã xảy ra (lỗi định tuyến của mid) | Lúc khởi động vẫn là phán quyết, nhưng prompt từ ba bậc xuống nhị phân (đã làm), mặt lỗi thu nhỏ mạnh |
| Coordinator không tuân "chỉ nói viết chương N" | Đã xảy ra | Host ra chỉ thị theo định dạng cố định, không cần LLM sinh mô tả task nữa |
| Coordinator bỏ sót phép kiểm queue_drained | Đã xảy ra | Host Router cưỡng chế đi theo thứ tự |
| Sau commit cuối cung Coordinator quên gọi editor | Có thể | Host Router phát hiện IsArcEnd && !HasArcReview là phái luôn |
| Nhánh khôi phục sau sập bị bỏ sót | Chỗ hụt đã biết | Máy trạng thái của Flow Router bao phủ mọi nhánh một cách tự nhiên |
| StopGuard chặn liên tiếp 5 lần thì leo thang fatal | Tồn tại | Chỉ thị của Host đã rõ thì LLM rất khó bị chặn liên tiếp (trừ khi prompt hỏng nặng) |

### 4.2 Phần lợi từ việc nâng cấp LLM

| Chiều | Mức giữ lại |
|---|---|
| Nâng model Writer → chất lượng viết | 100% |
| Nâng model Editor → duyệt chính xác | 100% |
| Nâng model Architect → quy hoạch tinh tế | 100% |
| **Nâng model Coordinator → phán quyết chính xác hơn** | **100%** (tình huống phán quyết được giữ) |
| ~~Nâng model Coordinator → định tuyến chính xác hơn~~ | Bỏ (tỉ lệ lỗi định tuyến vốn đã phải bằng 0, không cần LLM thông minh lên) |

**Phần giữ lại quan trọng**: các tình huống phán quyết như lượng định can thiệp của người dùng, chọn loại kiến trúc sư, phán đoán biên của verdict thì vẫn do LLM xử lý, việc nâng model hưởng lợi trực tiếp.

### 4.3 Năng lực nhiều agent

- Số lượng, chức năng, cách lắp ghép của SubAgent **hoàn toàn không đổi**
- Model không đồng nhất (coordinator/architect/writer/editor cấu hình độc lập) **hoàn toàn không đổi**
- Coordinator vẫn là một run liên tục, giữ được "góc nhìn cả sách"
- Môi giới phối hợp (các sản phẩm trong Store) không đổi

### 4.4 Tính đáp ứng

- Năng lực dùng `coordinator.Inject` để ngắt bằng Steer của người dùng **được giữ hoàn toàn**
- Host Router phái chỉ thị khi SubAgent trả về, và đi cùng một kênh tin nhắn với Steer của người dùng
- Ưu tiên của Inject cao hơn FollowUp (ngữ nghĩa của `Inject` là chèn hàng), nên Steer không bị chỉ thị của Host đè mất

### 4.5 Chi phí token

Hiện tại mỗi chương: Coordinator ~3500-7000 token × 1-2 turn = 3500-14000 token

Kiến trúc mới mỗi chương:
- prompt của Coordinator nén từ ~3000 token xuống ~800 token
- Mỗi chương vẫn cần 1 turn (Coordinator đọc chỉ thị FollowUp + sinh tool_call)
- Tổng cộng ~1000-1500 token

**Tiết kiệm 60-80%**. Truyện dài 200 chương tiết kiệm khoảng 400k-1M token (không bằng 100% của phương án cấp tiến, nhưng không hy sinh tính đáp ứng và góc nhìn cả sách).

---

## 5. Ảnh hưởng tới docs/architecture.md

### 5.1 Điều chỉnh các nguyên tắc cốt lõi ở §2

**Nguyên tắc một** (LLM lái vòng lặp chính) → điều chỉnh thành:
```
LLM lái việc sáng tác và phán quyết, Host lái việc định tuyến luồng.

- Sáng tác và phán quyết (những quyết định cần hiểu ngữ nghĩa, phán chất lượng, nhận biết ý định) vẫn để cho LLM
- Định tuyến luồng (đọc sự thật → tra bảng → ra chỉ thị) do code của Host gánh
- Host không lách Coordinator để gọi SubAgent trực tiếp, mà ra chỉ thị rõ ràng qua FollowUp,
  giữ Coordinator làm kênh thi hành chỉ thị và nút phán quyết
```

**Nguyên tắc hai** (đặt cược vào năng lực model, không cược vào code cứng) → điều chỉnh thành:
```
Ở chiều sáng tác và phán quyết thì cược vào model (năng lực phán quyết của Writer/Editor/Architect/Coordinator),
ở chiều định tuyến luồng thì diễn đạt bằng code (không gian quyết định của agent dọc là đóng, tác vụ tra bảng thì LLM không có phần lợi).
```

### 5.2 Điều chỉnh danh sách cấm ở §13

- §13.13 "Không làm mặt điều khiển tất định kiểu Host đọc tệp tín hiệu → tiêm chỉ thị bước sau" →
  **sửa cách diễn đạt**: "Không dùng tệp tín hiệu để làm IPC (đọc thẳng Progress + Checkpoint là đủ); Host đọc sự thật rồi ra chỉ thị gọi tác tử con rõ ràng qua `coordinator.FollowUp` là việc định tuyến dọc hợp lý"
- §13.14 "Không làm việc chuyển Flow bằng máy trạng thái đóng cứng" →
  **sửa cách diễn đạt**: "Nhãn Flow vẫn chỉ do tool cập nhật (không viết máy trạng thái kiểu 'nếu A thì SetFlow(B)' trong Host), nhưng Flow Router được phép quyết bước sau gọi ai dựa trên Flow và các sự thật khác"

### 5.3 Điều chỉnh phần lắp ghép Agent ở §7

- Giữ phần lắp ghép Coordinator
- `coordinator.md` chặt từ 88 dòng xuống ~25 dòng
- Kênh Reminder co lại (xóa flow/queue_guard/book_complete, giữ foundation/subagent_guards)
- Thêm mới package `internal/host/flow/`

---

## 6. Các điểm yếu đã biết (liệt kê trung thực)

### 6.1 Sự tiến hóa lâu dài của Flow Router

- Khi có tình huống mới thêm vào (trạng thái flow mới, hậu xử lý cuối cung mới), phần switch-case của Router sẽ dài ra
- Cần ràng buộc nghiêm: **chỉ xử lý định tuyến, không xử lý logic nghiệp vụ**; luật quyết định thì viết kiểm thử đơn vị
- Lời cảnh báo tương tự `handleSubAgentDone` của v0.0.1 luôn còn hiệu lực; nhưng phương án này tránh trượt thành đối tượng thần thánh bằng "hàm thuần + kiểm thử đơn vị + chỉ gọi sự thật thuần"

### 6.2 Độ phức tạp của can thiệp người dùng

- Thiết kế hiện tại giao hoàn toàn Steer cho LLM của Coordinator phán quyết
- Nhưng một số Steer trải nhiều loại (như "sửa nhân vật A ở mấy chương đầu cho rõ + về sau thêm cho anh ta một tuyến phụ")
- Cần dựa vào năng lực của LLM để tách ra, prompt cần cho chỉ dẫn rõ ràng
- **Phần này hưởng lợi trực tiếp từ việc nâng model** (so với việc đóng cứng phân loại bằng enum của InterventionAgent, việc LLM phán quyết linh hoạt khớp hơn với tình huống thật)

### 6.3 Phụ thuộc tiền đề về tính nhất quán của tầng sự thật

- Router quyết định dựa trên Progress + Checkpoint, nên tầng sự thật buộc phải đáng tin
- Một tệp đơn lẻ thì `withWriteLock` + tmp/rename bảo đảm thay thế nguyên tử; các bước xuyên tệp của `commit_chapter` thì khôi phục bằng payload đầy đủ của PendingCommit, ảnh chụp chính văn và phát lại bất biến theo pha, còn tác vụ kết cấu thì sửa các view phái sinh theo cùng tham số; cả hai đều không tuyên bố là giao dịch nguyên tử kiểu cơ sở dữ liệu
- Nhưng nếu tầng sự thật xuất hiện bất nhất (như Progress nói chương 3 đã xong mà dưới chapters/ thì không có), Router sẽ quyết định sai
- Đề xuất: lúc khởi động thêm một lần **kiểm tính nhất quán của tầng sự thật** (nếu thấy Progress.CompletedChapters không khớp thư mục chapters/ thì báo warning)

### 6.4 Coordinator vẫn còn khả năng định tuyến bằng LLM

- Dù chỉ thị đã rõ, LLM vẫn có thể "sáng tạo" mà không thi hành (ví dụ sinh một đoạn văn suy nghĩ rồi mới gọi tool)
- StopGuard đỡ lưng: đã nhận chỉ thị của Host mà lượt này không gọi subagent thì tiêm nhắc
- Đây là phần đỡ lưng, không phải phép cấm — model mạnh mà thỉnh thoảng "nghĩ thêm một bước" cũng không phải chuyện tệ

### 6.5 Yêu cầu về độ bao phủ kiểm thử tăng lên

- Flow Router là hàm thuần, buộc phải có kiểm thử đơn vị đầy đủ (bao phủ mọi tổ hợp Phase × Flow × Boundary)
- Kiểm thử tích hợp: mô phỏng trọn chuỗi "commit → router → FollowUp → coordinator đáp ứng → subagent"
- Kiểm thử khôi phục sau sập: kill process rồi resume, khẳng định Router suy ra đúng bước sau

---

## 7. Lộ trình thi hành

### Giai đoạn 1: gia cố tầng sự thật (khoảng 0,5 ngày)

- Bồi đủ phép kiểm nhất quán ở §6.3: lúc khởi động/Resume thì quét một lần, sinh warning
- Bảo đảm API `store.HasArcReview(vol, arc)` và `HasArcSummary(vol, arc)` dùng được (không có thì thêm)

### Giai đoạn 2: đưa vào bộ khung Flow Router (khoảng 1 ngày)

- Tạo mới package `internal/host/flow/`:
  - `route.go` — hàm thuần `Route(state) → *NextInstruction`
  - `dispatcher.go` — đăng ký sự kiện + ra chỉ thị FollowUp
  - `route_test.go` — kiểm thử đơn vị bao phủ mọi nhánh
- Điều khiển việc kích hoạt bằng công tắc config `flow_driven: true/false`
- Mặc định tắt (false), làm phần chạy đối chứng trước

### Giai đoạn 3: kích hoạt và kiểm chứng (khoảng 1 ngày)

- Bật `flow_driven: true`
- Chạy một cuốn tiểu thuyết 30-50 chương, đối chiếu chỉ số:
  - Số lần gọi LLM của Coordinator
  - Số lỗi định tuyến (phải bằng 0)
  - Tính đáp ứng (việc steer ngắt có bình thường không)
- Vá bug, chỉnh luật của Router

### Giai đoạn 4: đơn giản hóa coordinator.md + làm gầy Reminder (khoảng 0,5 ngày)

- Sửa coordinator.md theo §3.6
- Xóa `reminder/flow.go / queue_guard.go / book_complete.go`
- Giữ phần foundation reminder cần thiết
- Cập nhật StopGuard của subagent nếu cần (thường thì không cần)

### Giai đoạn 5: đơn giản hóa resume.go (khoảng 0,5 ngày)

- Xóa phần lớn các nhánh của `buildResumePrompt`
- Thay bằng tin nhắn ngắn gọn dùng chung "[Khôi phục] hãy đợi chỉ thị của Host"
- Sau Resume thì Router tự nhiên suy ra động tác tiếp tục

### Giai đoạn 6: cập nhật tài liệu kiến trúc (khoảng 0,5 ngày)

- Sửa `docs/architecture.md` §2 / §13 / §7 theo §5
- Đổi trạng thái tài liệu đề án này thành "đã chấp nhận", lưu vào `docs/history/`

### Giai đoạn 7: kỳ quan sát (2-4 tuần)

- Chạy liên tục 2-3 truyện dài (mỗi cuốn 100+ chương)
- Ghi lại mọi lỗi định tuyến (nếu có), vấn đề về tính đáp ứng, hành vi ngoài dự kiến của Coordinator
- Tinh chỉnh luật của Router và coordinator.md theo phần quan sát

**Tổng cộng khoảng 4 ngày thi hành + kỳ quan sát.**

---

## 8. Bảng đối chiếu

| Chiều | Kiến trúc hiện tại | Hybrid (phương án này) | Phương án cấp tiến (phụ lục A) |
|---|---|---|---|
| Tính ổn định | Trung (LLM thỉnh thoảng định tuyến sai) | **Cao** | Cao |
| Tính đáp ứng | Cao | **Cao** | **Thấp** (Host gọi SubAgent trực tiếp thì không ngắt được) |
| Phần lợi từ LLM | 100% | **100%** | 85% (bỏ chiều định tuyến) |
| Tiết kiệm token | 0 | ~70% | ~95% |
| Góc nhìn cả sách | Có | **Có** | Không (mỗi lần SubAgent độc lập) |
| Chi phí thi hành | - | Trung (khoảng 4 ngày) | Cao (khoảng 1 tuần + sửa agentcore) |
| Cập nhật tài liệu | - | Nhỏ (tinh chỉnh §2/§13) | Lớn (viết lại nguyên tắc §2) |
| Có phải sửa agentcore | - | Không | Có thể (gọi SubAgent trực tiếp) |
| Độ khó rollback | - | Thấp (công tắc config) | Cao |

---

## 9. Các điểm cần quyết

1. **Có chấp nhận đề án này (Hybrid Coordinator) không?** [ ] Chấp nhận · [ ] Sửa rồi chấp nhận · [ ] Không chấp nhận
2. Giai đoạn 3 có làm một PR độc lập để đáp đất kiểm chứng trước không? [ ]
3. Việc điều chỉnh §2 / §13 của `docs/architecture.md` có xử luôn trong lần này không? [ ]
4. Độ dài kỳ quan sát: [ ] 2 tuần · [ ] 4 tuần · [ ] dài hơn

---

## Phụ lục A: phương án cấp tiến đã lượng định (xóa hoàn toàn Coordinator)

> Phương án của bản thảo thứ nhất. Do tính đáp ứng thoái bộ, tính khả thi kỹ thuật còn ngờ, mất góc nhìn cả sách của Coordinator v.v. nên bị hạ xuống thành tài liệu tham khảo.

Cốt lõi của phương án cấp tiến: Host gọi trực tiếp `SubAgentTool.Execute`, không qua LLM của Coordinator.

**Các vấn đề đã nhận diện**:

1. **Tính đáp ứng thoái bộ**: `SubAgentTool.Execute` là lời gọi đồng bộ có chặn, Steer của người dùng buộc phải đợi SubAgent hiện tại trả về mới xử lý được. `Inject` của kiến trúc hiện tại thì ngắt được ngay.
2. **Tính khả thi kỹ thuật còn ngờ**:
   - Host gọi SubAgentTool trực tiếp là trái quy ước dùng agentcore
   - Dòng sự kiện (Event của `Subscribe`) có thể không nổi lên đúng cho observer
   - Đường callback `ContextManagerFactory` / `OnMessage` của SubAgent thì chưa rõ
   - Phải sửa agentcore hoặc sửa lớn observer
3. **Mất góc nhìn cả sách của Coordinator**: mỗi lần SubAgent là một run độc lập, không có "người canh LLM liên tục". Trong lúc chạy dài thì các vấn đề như văn phong trôi, nhân vật bị cắt rời sẽ mất một lớp bảo vệ vô hình.
4. **InterventionAgent đơn giản hóa quá mức**: phương án cấp tiến dùng enum (query/modify_setting/rewrite_chapters/adjust_style/noop) để phân loại ý định người dùng, mà Steer thật có thể trải nhiều loại, cưỡng chế schema sẽ phân loại sai.
5. **Khối lượng viết lại tài liệu kiến trúc lớn**: các nguyên tắc cốt lõi ở §2 bị phủ định, 30% phần luận trong tài liệu bị ảnh hưởng.
6. **FlowDriver sẽ phình thành đối tượng thần thánh**: một vòng lặp nhét hết logic định tuyến, thêm tình huống nào cũng phải sửa, đồng dạng với `handleSubAgentDone` của v0.0.1.

Phương án Hybrid né được 4 vấn đề đầu, vấn đề thứ 5 hạ xuống thành tinh chỉnh, vấn đề thứ 6 được quản bằng "hàm thuần + kiểm thử đơn vị".

---

## Phụ lục B: chi tiết chỗ đặt của các điểm quyết định

| Điểm quyết định | Vị trí hiện tại | Vị trí ở kiến trúc mới | Loại |
|---|---|---|---|
| Chọn kiến trúc sư | coordinator.md L26-29 | LLM Coordinator phán quyết (lúc khởi động) | Phán quyết |
| Mở rộng đầu vào | coordinator.md L31 | LLM Coordinator phán quyết (lúc khởi động) | Phán quyết |
| Vòng bồi đủ quy hoạch | coordinator.md L36-38 | Nhánh Phase=Premise/Outline của Host Router (trả nil để LLM tự chủ, hoặc FollowUp architect tường minh) | Lai |
| Bước sau mỗi chương | coordinator.md L46-51 + reminder/flow | **Nhánh 2d của Host Router** (FollowUp writer) | Định tuyến |
| Duyệt cuối cung | coordinator.md L78-82 | **Nhánh 2c của Host Router** (FollowUp editor/architect) | Định tuyến |
| Phân nhánh verdict | coordinator.md L59-61 + tool save_review | Tầng tool đã code hóa, Router chỉ đọc Flow | Định tuyến (đã xong) |
| Can thiệp người dùng | coordinator.md L67-70 | LLM Coordinator phán quyết (khi nhận tin nhắn Inject) | Phán quyết |
| Kiến trúc sư báo lỗi thì phái lại | coordinator.md L40 | Host Router phát hiện FoundationMissing không đổi, rồi đếm số lần thử lại | Định tuyến |
| Tổng kết khi cả sách xong | coordinator.md L63-65 + reminder/book_complete | Host Router phát hiện Phase=Complete → FollowUp "xuất tổng kết" | Định tuyến |

---

## Phụ lục C: các vị trí mã nguồn tham chiếu

- `assets/prompts/coordinator.md` — chờ đơn giản hóa
- `internal/host/reminder/flow.go` / `queue_guard.go` / `book_complete.go` — chờ xóa
- `internal/host/reminder/subagent_guards.go` — giữ
- `internal/host/reminder/stop_guard.go` — giữ + thêm phép kiểm "đã nhận chỉ thị của Host thì buộc phải thi hành"
- `internal/host/resume.go` — đơn giản hóa mạnh
- `internal/host/observer.go` — đăng ký mới EventToolExecEnd để kích hoạt Router
- `internal/host/flow/` — package thêm mới
- `internal/tools/commit_chapter.go` L220-280 — 17 trường của CommitResult đã đủ
- `internal/tools/save_review.go` — ánh xạ nguyên tử từ verdict của Editor sang Flow/hàng đợi viết lại
- `internal/store/outline.go` `CheckArcBoundary` — API sự thật về biên cung
