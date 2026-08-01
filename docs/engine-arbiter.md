# Tiến hóa mặt điều khiển: Engine + Arbiter (bỏ vòng lặp dài Coordinator)

> Trạng thái (2026-07-14 v6): **phần hiện thực code đã xong** — Engine/Arbiter đã thi hành, Coordinator và toàn bộ phần đi kèm đã xóa (danh mục §10); đã kiểm chứng đầu-cuối việc viết trọn sách, phán quyết thất bại, phán quyết bế tắc, nghiệm thu việc viết lại (trình tự hold+editor), boundary hold dừng ngay, bảo toàn can thiệp khi tranh chấp lúc thoát và một giấy phép một chương. Toàn bộ các mục chặn của ba vòng duyệt bên ngoài đã xử lý (gồm vòng kín sự thật của feedback, bảo vệ PendingSteer khi sập, tranh chấp lifecycle).
> **Việc di trú tài liệu đã xong (2026-07-12)**: phần chính của architecture.md đã viết lại toàn bộ theo kiến trúc Engine+Arbiter hiện hành (gồm chiến lược kiểm chứng/thư mục/kỷ luật mới); phần tự sự về kiến trúc cũ trong README, context-management, evaluation-system, observability, user-rules-runtime đã dọn (chỉ giữ những đoạn đối chiếu lịch sử có ghi chú). Cấu hình Coordinator và các đường tương thích phiên đều đã xóa; Arbiter hiện cố ý dùng thống nhất model Default, không mở cấu hình vai riêng.
> **Làm rõ ngữ nghĩa thiết kế (vòng duyệt thứ tư/thứ năm)**: ① điểm tiêu thụ feedback của writer **chính là** lần tác vụ kết cấu kế tiếp (expand_arc/append_volume/update_compass tham khảo qua novel_context rồi xóa rỗng) — nó là "đề xuất cho dàn ý về sau" (nguyên văn commit schema), không phải tín hiệu điều phối tức thời; những độ lệch nghiêm trọng giữa cung thì đi qua kênh duyệt của editor và can thiệp của người dùng. Sách không phân tầng thì không có tác vụ kết cấu, **commit không ghi feedback của nó xuống đĩa** (tránh sự thật rác mãi mãi không có bên tiêu thụ; bản gương trong giá trị trả về vẫn giữ để chẩn đoán). ② rule_violations đã thành vòng kín: commit ghi xuống đĩa theo cả hai đường (**siêu dữ liệu chất lượng best-effort**, không nhất quán mạnh ngang hàng với việc nộp chương — sập đúng ngay sau khi xóa pending_commit thì sẽ thiếu một bản ghi, chấp nhận được) → tiêm vào novel_context(chapter=N) → editor tiêu thụ theo phần ánh xạ ở mục kiểm tra máy móc. ③ Bảo vệ PendingSteer khi sập là **lưu bền best-effort với đúng một khe đang bay**: lần lưu bền đầu tiên thất bại thì dừng phán quyết một cách tường minh; kỳ phán quyết, việc áp động tác thất bại, thoát bình thường/Abort đều được bảo vệ; hai cửa sổ nói rõ là không bảo đảm — (a) sau khi phái việc chuyển vào hàng đợi thi hành trong bộ nhớ (e.next) mà trước khi worker khởi động thì bị kill cứng process (cửa sổ cỡ mili giây, defer không chạy); (b) can thiệp đồng thời trong lúc đang đợi interMu (chưa ghi vào khe). Người dùng có mặt thì cảm nhận được, chi phí gửi lại chỉ vài giây, không vì việc này mà dựng intent/FIFO lưu bền. ④ Phán quyết khởi động thất bại không phải cửa tử (bù bài từ sự cố thật 2026-07-12: tài khoản provider hết hiệu lực làm plan_start thất bại, mọi đường khôi phục đều không đi được): StartPrompt (sự thật đầu vào) đổi sang xuống đĩa **trước** phán quyết; khi plan_start chưa từng hoàn tất, planStartFallback của engine dựa vào nó để phán bù ngay tại chỗ — việc thử lại của phán quyết lần đầu không vi phạm nguyên tắc "khôi phục thì không làm lại phán quyết đã có"; phán bù thất bại thì tạm dừng và hồi đáp tường minh, bản ghi kiểm toán của phán quyết thất bại có trường error (DecisionRecord.Error).
> Tài liệu này được giữ làm biên bản quyết định thiết kế; kiến trúc hiện hành xem mục Kiến trúc của README và docs/engine-rfc.md. Liên quan: docs/voice-layer.md (đã thi hành).

## 1. Động cơ: một giả định lỗi thời bị bản vá bao quanh

Giả định lập nền của dự án — "một Prompt, một vòng lặp dài LLM thường trú lái trọn cuốn sách" — đã lỗi thời. Sau lần tái cấu trúc Hybrid tháng 4, quyền quyết định thực chất nằm trong tay `flow.Route`, còn Coordinator ở vòng lặp chính thì 90% lời gọi chỉ làm việc **chuyển tiếp nguyên trạng**. Hệ sinh thái bản vá phải trả giá để "duy trì một phiên LLM không được phép dừng":

1. Kỹ thuật văn bản động StopGuard + blockMessage
2. Giao thức chỉ thị lặp của Dispatcher ("ra lệnh lần thứ N")
3. Phần dạy hành vi trong coordinator.md (ngoại lệ khi khôi phục / loại truy vấn buộc phải phái việc trong cùng lượt / không được dùng việc dừng máy để tỏ thái độ)
4. completePhaseGate / writerExpandedChapterGate
5. MaxTurns=100_000
6. FlowBoundaryHook
7. Ngoại lệ khi có phân kỳ về việc hoàn kết

**Các hệ con mới trong dự án (import/simulation/cocreate/userrules) đều không đi qua Coordinator, đã dùng mẫu "Host điều phối trực tiếp + LLM làm hàm"** — phương án này thống nhất luồng chính về đúng cái mẫu mà chính dự án đã kiểm chứng.

## 2. Hình thái mục tiêu

```
Entry
  ↓
Host (giữ tên package; bên trong thêm EngineLoop, không đổi tên thuần máy móc)
  ├─ đọc Store → flow.Route → chạy Worker trực tiếp
  ├─ tình huống ngữ nghĩa rõ ràng → gọi hàm Arbiter
  └─ phép chiếu sự kiện / ngân sách / điểm dừng / thông báo (trách nhiệm hiện tại được giữ)
  ↓
Workers (architect / writer / editor, bên trong tự chủ, giữ lan can checkpoint-delta)
  ↓
Tools → Store (nguồn sự thật duy nhất)
```

Trách nhiệm: **Route quản mọi bước sau tra bảng được; Arbiter quản phán đoán ngữ nghĩa có biên rõ ràng; Worker quản sáng tác mở; Engine thi hành quyết định, không tham gia phán đoán văn học; Observer/Diag chỉ quan sát.**

Một câu tóm lại trạng thái cuối: **một Engine tất định chạy tuần tự, ba Worker tự chủ, vài hàm Arbiter gọi khi cần, một tầng sự thật nằm trên hệ tệp.**

### Sự đối xứng giữa hai mặt (dự định viết vào architecture.md làm luật sắt mới)

```
Mặt tất định:  flow.LoadState   → flow.Route      → Instruction   (kiểm thử đặc tả vét cạn)
Mặt ngữ nghĩa: arbiter.Collect* → arbiter.Decide* → XxxDecision   (quyết định xuống đĩa + hồi quy eval)
               └── thu sự thật (IO) ──┘└── nhân quyết định (phát lại offline) ──┘└── Engine thi hành ──┘
```

## 3. Các tình huống Arbiter (tập cuối, giữ ở mức tối thiểu)

| Tình huống | Kích hoạt | Ghi chú |
|------|------|------|
| `plan_start` | Sách mới khởi động | Chọn kiến trúc sư short/long + bồi thêm cho yêu cầu quá ngắn |
| `intervention` | Người dùng can thiệp | Truy vấn / luật lâu dài / điều chỉnh kết cấu tình tiết / viết lại phần đã viết / viết lại hay từ chối sau khi hoàn sách |
| `worker_failure` | Worker báo lỗi **và phân loại tất định không có đường ra** | Mạng/tham số/thiếu hiện vật tiền đề v.v. thì code tất định phân loại trước, không gửi cho Arbiter |
| `deadlock` | Sau lượt trước vẫn sinh ra cùng một chỉ thị định tuyến | Ngữ nghĩa đếm và kết thúc xem §8 câu 5 |
| `completion_dispute` | **Dự bị, có bằng chứng rồi mới thêm** | Việc xét hoàn kết ở cuối tập đã do Route phái architect gánh (nhánh 10); chỉ những phân kỳ giữa đường kiểu "kết cấu chưa tới biên mà truyện thì nên thu" mới cần, tỉ lệ xảy ra thật chưa rõ, không dựng trước |

Bản tổng kết hoàn sách không phải phán quyết mà là một tác vụ sinh nội dung — do Engine phái editor trực tiếp hoặc một lời gọi LLM thường là xong, không chiếm một tình huống của Arbiter.

## 4. Thiết kế Arbiter

### 4.1 Kiểu Decision theo từng tình huống (bản sửa v3: từ bỏ cấu trúc đa năng)

```go
// Kiểu con dùng chung, chống trôi lệch giữa các tình huống
type DispatchDecision struct {
    Instruction flow.Instruction
    Expect      DispatchExpect // xem §5
}

type PlanStartDecision struct {
    Planner string // architect_long | architect_short
    Task    string // chứa yêu cầu đã bồi thêm
    Reason  string
}

type InterventionDecision struct {
    Answer   string
    Rules    string
    Hold     *AdvanceHoldOp
    Reopen   *ReopenOp
    Dispatch *DispatchDecision
    Reason   string
}

type FailureDecision struct {
    Action   string // retry | reroute | abort
    Dispatch *DispatchDecision
    Reason   string
}
```

Biên bản tiến hóa: danh sách động tác (kiểm thứ tự thì dư, mảng đa hình thì dễ sai) → cấu trúc phẳng đa năng (thứ tự bất hợp pháp thì không biểu đạt nổi, nhưng tổ hợp bất hợp pháp thì phải nhờ ma trận tình huống × động tác để kiểm) → **kiểu theo từng tình huống (động tác không khớp tình huống thì không biểu đạt nổi, ma trận kiểm biến mất, schema của từng tình huống nhỏ hơn, đầu ra LLM ổn hơn, eval chấm được theo tình huống)**. Validate thu về thành phép kiểm sự thật theo từng kiểu (ràng buộc phase v.v.).

### 4.2 API: mỗi tình huống một cặp hàm tường minh

```go
func CollectInterventionFacts(st *store.Store) InterventionFacts        // biên IO, cùng kỷ luật với flow.LoadState
func DecideIntervention(ctx, model, facts, text) (InterventionDecision, error) // không IO ngoài request model do bộ thi hành thống nhất quản lý, phát lại offline được
// Các tình huống còn lại cũng một cặp cùng hình dạng; Collect/Decide hình dạng thống nhất, không dựng framework Question/Decision tổng quát
```

- **Đường thất bại**: bộ thi hành có cấu trúc thống nhất chọn JSON Schema nguyên bản hay hợp đồng bằng prompt tùy theo năng lực model; lỗi định dạng/Schema ở chế độ prompt và lỗi kiểm nghiệp vụ ở cả hai chế độ đều mang nguyên nhân chính xác giao cho model sửa, vòng đời chỉ do `context` điều khiển. Vi phạm hợp đồng nguyên bản, từ chối trả lời, bị cắt, kết thúc lỗi và các lỗi request không thử lại được thì trả về tường minh ngay; can thiệp thì không sinh ghi, khởi động thì báo lỗi tường minh, failure/deadlock thì tạm dừng theo lối bảo toàn
- **Ký ức can thiệp**: decisions.jsonl kiêm luôn lịch sử can thiệp, `CollectInterventionFacts` thu vào N bản tóm tắt phán quyết gần nhất
- **Model**: Arbiter dùng thống nhất Default, không phơi role riêng; chỉ mở rộng hợp đồng cấu hình khi xuất hiện nhu cầu rõ ràng về năng lực hoặc chi phí

### 4.3 Kiểm toán (nhỏ và ổn định; kiểm toán ≠ nguồn khôi phục)

```json
{"schema_version":1,"id":"...","kind":"intervention","checkpoint_seq":123,
 "input":"...","facts":{...},"decision":{...},"reason":"...","duration_ms":1200}
```

(token/chi phí không nằm trong bản ghi — model phán quyết được bọc qua usageTrackedModel, lượng dùng vào thống nhất UsageTracker/ngân sách, cùng một bộ sổ với các Worker.)

- facts chỉ lưu sự thật có cấu trúc + tóm tắt + tham chiếu artifact/checkpoint, **không copy chính văn, không lưu trọn gói ngữ cảnh**; có giới hạn kích thước mỗi bản, vượt thì cắt và gắn cờ
- **input được giữ trong bản ghi** (bắt buộc để phát lại offline `Decide*(facts, input)` — kiểm toán không có input thì không hồi quy được); việc tẩy thông tin riêng xảy ra ở **biên diag export**, không xảy ra lúc ghi xuống đĩa
- Nhật ký kiểm toán không phải event sourcing, cũng không phải nguồn dữ liệu để khôi phục

## 5. Giao thức nộp trạng thái (vòng lặp Engine tuần tự)

```
đọc sự thật → Route / Arbiter cho ra quyết định → soát tiền điều kiện → thi hành động tác
            → Worker chạy → tính lại hậu điều kiện của Route → lượt sau
```

- **Bất biến: trạng thái điều khiển chỉ đổi tuần tự ở biên của Engine.** Can thiệp có thể hỏi song song trong lúc Worker đang chạy (chỉ đọc nên an toàn, người dùng thấy hồi đáp Answer/Reason trong vài giây), nhưng **những động tác đổi trạng thái điều khiển (hold/reopen/dispatch) thì vào hàng đợi của Engine, soát ở biên rồi mới nộp**; answer (không trạng thái) và rules (mặt nội dung; luật cũ ở chương này, chương sau có hiệu lực, đúng theo ngữ nghĩa) thì thi hành ngay
- Mỗi Dispatch mang theo ảnh chụp ở thời điểm Collect, đối chiếu ở biên, không khớp → bỏ, ghi `decision_stale`, hỏi lại bằng sự thật mới:

```go
type DispatchExpect struct {
    CheckpointSeq int64
    Phase         domain.Phase
    Flow          domain.FlowState
    QueueHead     int
}
```

- Tiền điều kiện tường minh tốt hơn băm toàn cục của Store (đọc được, chẩn đoán được); không làm digest toàn cục

## 6. Mô hình khôi phục (chỉ khôi phục sự thật, không khôi phục phiên)

```
khởi động → đọc Progress → đọc Checkpoint mới nhất → tra PendingSteer/AdvanceHold/giấy phép chương → Gate đối chiếu → Route → tiếp tục chạy Worker
```

Việc khôi phục của plan_start dựa vào một sự thật lưu bền duy nhất (trong RunMeta), **phán quyết xuống sự thật trước, rồi mới khởi thi hành**:

```go
type PlanStartRecord struct {
    RawPrompt   string
    Planner     string
    PlannerTask string
    DecisionID  string // liên kết bản ghi kiểm toán
    Status      string // decided | dispatched | done — tường minh hóa trạng thái trung gian của giao dịch khởi động
}
```

Sập ở bất kỳ điểm nào: Record còn thì đi tiếp theo Status, không hỏi lại; Record mất thì coi như sách mới và hỏi lại (hỏi lại là chấp nhận được, kiểm toán để lại hai bản ghi).

## 7. Lộ trình di trú (v3 xếp lại: Engine đi trước, Arbiter đấu dây sau)

Căn cứ để đổi thứ tự: bản "Arbiter đi trước" cần một đường ống chuyển tiếp (phán quyết giả dạng thành chỉ thị của Host qua steering rồi mớm cho Coordinator); **cho Engine đáp đất trước thì cả đường ống đó không phải dựng**, Arbiter đấu dây thẳng vào bộ thi hành của Engine. Mỗi bước đều là đang xóa đồ, không dựng cầu tạm; nỗi lo "quyền chọn hai não" bị chính thứ tự này hóa giải về mặt cấu trúc.

| # | Bước | Trạng thái |
|---|------|------|
| 0 | Các mục vô điều kiện: đưa việc bồi đủ quy hoạch vào Router (đặc tả vét cạn đi trước); kiểm toán decisions.jsonl. Cải thiện lúc hiện thực: danh tính kiến trúc sư suy từ `RunMeta.PlanningTier` đã có, không cần thêm cơ chế ghi mới | ✅ 2026-07-12 |
| 1 | Giao tầng văn phong (docs/voice-layer.md) | ✅ 2026-07-12 |
| 2 | Chốt RFC Step 2 (docs/engine-rfc.md, bảy câu buộc phải trả lời) | ✅ 2026-07-12 |
| 3 | WorkerRunner: gọi trực tiếp bằng lập trình qua subagent.Runner, sự kiện trung kế qua ctx ToolProgress | ✅ 2026-07-22 |
| 4-5 | Engine tiếp quản toàn bộ việc phái việc + đấu dây bốn tình huống Arbiter (plan_start/intervention/failure/deadlock), nối thẳng bộ thi hành của Engine (khi thi hành mới phát hiện Engine đi trước làm cả đường ống chuyển tiếp steering không phải dựng, nên 4/5 gộp lại đáp đất cùng lúc) | ✅ 2026-07-12 |
| 6 | Xóa Coordinator và toàn bộ phần đi kèm (thi hành hết danh mục §10); kiểm thử tích hợp đầu-cuối (tool thật viết trọn sách/phán quyết thất bại/phán quyết bế tắc) | ✅ 2026-07-12 |

## 8. Các câu buộc phải trả lời của RFC Step 2 (chưa chốt thì không vào bước 3)

1. **Mặt trích xuất Worker**: API của WorkerRunner; quyền sở hữu và vòng đời của toàn bộ các thành phần lắp ghép trong build.go — model theo vai/failover, prompt cache key, ThinkingLevel, UsageRecorder, SessionLogger, ContextManagerFactory của Writer, RestorePack, StopGuardFactory, StopAfterTools, phép chiếu sự kiện lồng của Observer
2. **Vòng đời của Engine**: khởi động/tạm dừng/hủy/khôi phục; bảo đảm một Worker chạy tuần tự; chuyển /model và thinking lúc đang chạy
3. **Hoàn chỉnh hóa giao thức nộp trạng thái**: đưa phép đối chiếu Expect ở §5 ra mọi tình huống; danh mục tiền điều kiện của Engine sau khi tháo Gate
4. **Phân loại lỗi**: phân loại tất định (retry/reroute/terminal) đi trước, chỉ cái nào không có đường ra thì gửi `worker_failure`; sự phân tầng với việc thử lại ở tầng agentcore
5. **Giao thức bế tắc**: cùng một `Agent+Task` tái hiện liên tiếp là chứng tỏ hậu điều kiện của định tuyến chưa thỏa; checkpoint trung gian bên trong Worker không về không; Arbiter quyết retry thì không về không; 3 lần hỏi, 5 lần ngắt cứng.
6. **Ngữ nghĩa khi sập**: làm sao xác định Worker trước đã sinh ra sự thật hợp lệ hay chưa
7. **Nghiệm thu bản mẫu**: đối chiếu từng điểm năm mục Observer/Usage/Context/chuyển model/khôi phục với hiện trạng

## 9. Sổ giá trị

| Chiều | Hiện trạng | Trạng thái cuối |
|------|------|------|
| Chi phí LLM mỗi chương | Mỗi biên một lời gọi chuyển tiếp | Bỏ được; cả lớp vấn đề chuyển tiếp thất bại biến mất |
| Khả năng kiểm thử phán quyết | ~không (trộn trong phiên dài) | Phát lại offline theo từng tình huống + hồi quy eval |
| Độ đáp ứng của can thiệp | Đợi biên chương (cỡ phút) | Hỏi là có ngay, trạng thái điều khiển nộp ở biên |
| Độ phức tạp | Hệ sinh thái bảy bản vá | Giảm thuần 1500+ dòng, ba lớp vấn đề nghỉ |
| Khôi phục khi sập | Phát lại phiên + giao thức khôi phục | Đọc store rồi chạy tiếp |
| Rủi ro kỳ chuyển tiếp | — | Tập trung ở bước 3/4 (trích xuất Worker), kiểm soát bằng RFC + cửa ải bản mẫu; bước 0/1 thành lập vô điều kiện |

## 10. Danh mục xóa ở trạng thái cuối

Coordinator và logic khôi phục phiên của nó, StopGuard của Coordinator, giao thức steering của Dispatcher và giao thức văn bản `[Host ra chỉ thị]`, FlowBoundaryHook, completePhaseGate / writerExpandedChapterGate (phần kiểm dịch ngang thành tiền điều kiện của Engine), MaxTurns=100_000, toàn bộ phần dạy hành vi trong coordinator.md.

## 11. Ý kiến phản đối và biên bản duyệt

1. *"Độ chính xác của phán quyết sẽ không tăng"* — thành lập; khác biệt thật là tiêu điểm/tuyển chọn/tiền kiểm so với ký ức phiên, giá trị thuần hơi nhích lên và lần đầu tiên đo được
2. *"Hiện trạng chạy được rồi, động vào mặt điều khiển là mạo hiểm"* — thừa nhận; nền móng được dựng chính vì thế, chia bước nên dừng được và lùi được
3. *"Kiến trúc không phải điểm nghẽn, chất lượng nội dung mới là"* — thành lập một phần, tầng văn phong đi trước
4. **Vòng duyệt một (2026-07-12)**: thiếu giao thức nộp trạng thái → §5; Step 2 mỏng → §8 các câu buộc phải trả lời + cửa ải bản mẫu; trình tự khởi động → §6; "trạng thái bất hợp pháp không biểu đạt nổi" tuyên bố quá mức → biên bản tiến hóa 4.1; danh sách trắng vai của arbiter sai sự thật → 4.2; vệ sinh kiểm toán → 4.3
5. **Vòng duyệt hai (2026-07-12)**: kiểu Decision theo từng tình huống (chấp nhận, 4.1); xếp lại thứ tự di trú cho Engine đi trước (chấp nhận, §7); nộp thống nhất ở biên (chấp nhận, §5); PlanStartRecord (chấp nhận, §6); không đổi tên host (chấp nhận); đề xuất về số từ để lại tệp giao thức (chấp nhận, xem voice-layer). **Ý kiến bảo lưu**: kiểm toán buộc phải giữ input, không thì không phát lại được (4.3); completion_dispute hạ xuống thành tình huống dự bị (§3)

## 12. Kỷ luật và những việc không làm

**Kỷ luật**: ① điểm quyết định mới phải qua phép tam phân ở §2 trước, cấm mặc định "thêm luật vào prompt"; ② mỗi điểm quyết định LLM buộc phải có danh mục sự thật/đầu ra có cấu trúc/đường hạ cấp/kiểm toán xuống đĩa; ③ chỉ viết lan can sự thật, không viết lan can hành vi; ④ bất biến khai báo tốt hơn script thủ tục; ⑤ sửa mặt điều khiển thì sửa đặc tả vét cạn trước rồi mới sửa phần hiện thực.

**Không làm**: viết lại theo event sourcing; trừu tượng hóa Store cho multi-tenant tưởng tượng; DSL workflow tổng quát; State Digest toàn cục; đổi tên package host; dựng trước completion_dispute.
