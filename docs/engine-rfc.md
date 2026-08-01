# RFC Step 2: Engine chạy Worker trực tiếp (đáp án bảy câu buộc phải trả lời)

> Trạng thái: đã chốt (2026-07-12). Dựa trên việc trinh sát code của host/observer/subagent/usage/cocreate.
> Kết luận: cả bảy câu đều có đáp án rủi ro thấp, vào thi hành. Liên quan: docs/engine-arbiter.md.

## 1. Mặt thi hành Worker: gọi subagent.Runner bằng lập trình

> Ghi thêm (2026-07-22): agentcore đã tách phần thi hành có kiểu ra khỏi giao thức tool của model. `Runner.Run` là cửa vào cho host;
> `Runner.AsTool()` chỉ dành cho những host cần để LLM tự chủ phái subagent. AINovel chỉ phụ thuộc Runner.

`Runner.Run(agent, task)` mỗi lần khởi một `agentcore.AgentLoop` trọn vẹn. Engine gọi nó trực tiếp,
**toàn bộ phần lắp ghép của build.go có hiệu lực nguyên trạng**: model theo vai + failover, prompt cache key (#seq tự tăng mỗi lần), ThinkingLevel,
UsageRecorder/SessionLogger (OnMessage), ContextManagerFactory của Writer, RestorePack, StopGuardFactory,
StopAfterTools. Kết quả có kiểu và chuỗi lỗi trả về trực tiếp, không qua mã hóa/giải mã JSON hay việc dò kết quả tool.

**Phép chiếu sự kiện**: phần trung kế tiến độ của tác tử con đọc **callback ToolProgress trong ctx** (`agentcore.ReportToolProgress(ctx,...)`).
Engine gọi `Runner.Run` bằng `agentcore.WithToolProgress(ctx, relay)`, phần trung kế vẫn làm việc như thường; relay hợp ProgressPayload thành
`EventToolExecUpdate` rồi đưa cho `observer.handleToolUpdate` hiện có — phần xử lý phía worker của observer (dòng TOOL/chính văn dạng stream/
thinking/retry/context) **dùng lại được ~95%**. Dòng DISPATCH đổi sang do Engine tự phát/tự thu (thêm hai cửa vào cho observer).
Dòng tự sự ở cột trái của Coordinator biến mất, được thay bằng sự kiện tự sự của Engine.

**/model và cường độ suy luận**: việc chuyển model đi qua ModelSet swap (configs giữ wrapper failover, cơ chế cũ); cường độ suy luận đi qua
`runner.SetThinkingLevel` (giữ applyThinking, xóa nhánh coordinator).

## 2. Vòng đời của Engine

Một goroutine chạy vòng lặp tuần tự; `ctx` cancel = tạm dừng/hủy (lan vào worker loop, checkpoint bảo đảm không mất gì);
Resume/Continue = khởi một vòng lặp mới. Việc một Worker chạy tuần tự được bảo đảm tự nhiên bởi cấu trúc vòng lặp. Sentinel ngân sách/điểm dừng ở biên mỗi lượt do
Engine gọi trực tiếp (thay cho việc đăng ký sự kiện và FlowBoundaryHook).

## 3. Giao thức nộp trạng thái → chạy tuần tự làm nó gần như biến mất

Mỗi lượt, Engine chỉ `LoadState+Route` ngay trước khi spawn, nên chỉ thị luôn dựa trên sự thật mới nhất — chỉ thị của Route không có TOCTOU, không cần đối chiếu Expect.
Ảnh chụp Expect chỉ dùng cho **dispatch của quyết định Arbiter** (giữa lúc hỏi và lúc thi hành có một lần chạy worker chen vào): trước khi thi hành ở biên thì đối chiếu
{Phase, QueueHead}, không khớp → bỏ + hỏi lại bằng sự thật mới. Phần tiền kiểm (trách nhiệm của Gate cũ) trở thành code thường của Engine:
phase=complete thì không phái việc; chương mục tiêu của writer chưa mở rộng → đổi phái architect_long expand (tất định, không cần văn bản dạy bảo).
Các động tác trạng thái điều khiển của can thiệp (hold/reopen/dispatch) vào hàng đợi của Engine để nộp ở biên; answer/rules thì ngay lập tức.

## 4. Phân loại lỗi (tất định đi trước)

- retryable (mạng/giới hạn tần suất/stream-idle): MaxRetries=7 bên trong subagent đã tiêu hóa tại chỗ, không ra khỏi vòng lặp
- worker trả về error (escalate/hard_stop/lỗi cứng của tool): Engine thử lại cùng chỉ thị đó 1 lần → vẫn bại → hỏi Arbiter
  `worker_failure` (retry/reroute/abort) → abort hoặc bản thân Arbiter thất bại → tạm dừng + notify
- Lỗi tất định như sai tham số/agent không rõ: tạm dừng luôn + notify (bug code, thử lại vô nghĩa)

## 5. Giao thức bế tắc

Mỗi lượt ghi lại khóa chỉ thị `Agent+Task`. Sau khi lượt trước thi hành mà Route vẫn sinh ra cùng khóa, tức hậu điều kiện của tác vụ chưa thỏa, `repeat++`; chỉ thị đổi thì về không. Các checkpoint trung gian bên trong Worker như `plan/draft/edit` không tính là tiến triển ở cấp Engine.
repeat==3 → hỏi Arbiter `deadlock`; Arbiter khuyên retry thì **không về không**; repeat==5 → ngắt cứng: tạm dừng + notify.
(Thời Coordinator "không đặt ngưỡng" là dựa vào tính tự chủ của nó; Engine tất định buộc phải có biên.)

## 6. Ngữ nghĩa khi sập → miễn phí

Không cần phán đoán "Worker trước có sinh ra sự thật hợp lệ không": checkpoint+digest ở tầng tool là bất biến, Route tính lại từ store,
việc phái lại là an toàn. Việc thử lại luồng model của agentcore không vượt qua biên thi hành của tool. Khôi phục = vào vòng lặp luôn. PendingSteer, trước khi vòng lặp khởi động, được coi là
can thiệp và đi qua Arbiter.

## 7. Nghiệm thu bản mẫu

Kiểm thử tích hợp đầu-cuối (fake ChatModel): quy hoạch→bồi đủ→viết chương→duyệt/tóm tắt cuối cung→mở rộng→hoàn sách, trọn chuỗi;
phân loại can thiệp xuống store; tạm dừng/khôi phục; ngắt mạch khi bế tắc; ghi usage; hình dạng sự kiện của observer (dòng DISPATCH/TOOL, delta dạng stream). Cộng thêm phần đã có là
đặc tả Route 60k, hợp đồng agentcore, kiểm thử luồng editor để làm lưới hồi quy.

## Tổng kết kỳ hoàn thành (quyết định thiết kế)

Bản tổng kết hoàn sách đổi sang **sinh tất định**: store đã có toàn bộ sự thật (tóm tắt chương/nhân vật/sổ phục bút/số từ), Engine kết xuất báo cáo trực tiếp,
không tốn một lời gọi LLM nữa để cho ra văn bản mang tính nghi thức. Bản tổng kết bằng LLM của coordinator cũ bị hủy (engine-arbiter.md §3: tổng kết không phải phán quyết).
