// Công cụ chỉ dùng khi phát triển: dựng một tác phẩm mẫu trong store để thử
// `ainovel-cli serve` và giao diện web mà không phải chạy engine thật (tốn tiền
// gọi mô hình và mất hàng giờ).
//
// Dùng: go run ./cmd/seed-demo /duong/dan/thu-muc-tac-pham
//
// Dữ liệu mẫu cố ý phủ MỌI bề mặt của web studio (xem web/components/Rail.tsx +
// web/lib/khu.ts để biết danh sách bề mặt thật), không chỉ dòng sản xuất:
//   - nhân vật kèm ảnh trạng thái cuối cung gần nhất (dàn ý → nhân vật)
//   - luật thế giới, đủ nhóm chuẩn cộng một nhóm lạ (luật thế giới)
//   - phục bút ở cả ba trạng thái planted/advanced/resolved (phục bút)
//   - bản duyệt Editor nhiều chiều, kèm dẫn chứng + đề xuất, và MỘT chiều
//     chấm đúng 0/100 — ca bẫy điểm 0 bị nuốt bởi omitempty (kiểm định)
//   - hàng chờ viết lại kèm lý do cụ thể (hàng chờ viết lại)
//   - hợp đồng chương đầy đủ core_event/hook/scenes, và một tiêu đề CỐ Ý dễ
//     gây lẫn với số thứ tự chương ("Chương Ba Đào", không phải "chương 3")
//   - đủ bốn trạng thái chương: đã nghiệm thu / đang soạn / chờ viết lại / chưa tới
//   - đủ bốn trạng thái khối trên trục sản xuất: done/running/planned/unplanned
//
// Toàn bộ văn bản mẫu là tiếng Việt có dấu thật (không lorem ipsum), và có chủ
// đích ít nhất một chuỗi dài ở mỗi loại trường (tên, tiêu đề, mô tả) vì nhãn
// tiếng Việt thường dài hơn tiếng Anh 20-30% và lỗi tràn chữ chỉ lộ ra ở ca dài.
//
// Dữ liệu literal (nhân vật, luật thế giới, phục bút, dàn ý, nội dung chương,
// bản duyệt) nằm ở fixtures.go trong cùng thư mục, tách khỏi phần điều phối ở
// đây để thứ tự gọi store — vốn có vài bất biến bắt buộc, xem chú giải bên
// dưới — không bị chôn giữa hàng trăm dòng văn bản.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/voocel/ainovel-cli/internal/domain"
	"github.com/voocel/ainovel-cli/internal/store"
)

// checkpointGap là khoảng nghỉ giữa hai checkpoint liên tiếp của cùng một
// chương. Cần > 0 để OccurredAt tăng dần có ý nghĩa (thời lượng chu kỳ chương
// và năng suất chương/giờ ở Transport đều suy từ khoảng cách này).
const checkpointGap = 120 * time.Millisecond

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "seed-demo: thiếu tham số thư mục tác phẩm")
		fmt.Fprintln(os.Stderr, "dùng: go run ./cmd/seed-demo /duong/dan/thu-muc-tac-pham")
		os.Exit(1)
	}
	dir := os.Args[1]

	st := store.NewStore(dir)
	must(st.Init())
	must(st.Progress.Init("Trấn Yêu Ký", 300))
	must(st.Progress.SetLayered(true))
	must(st.RunMeta.Init("tien_hiep", "google", "gemini-2.5-pro"))

	// ── dàn ý phân tầng + tiền đề ──
	volumes := demoLayeredOutline()
	must(st.Outline.SaveLayeredOutline(volumes))
	// save_foundation.go (engine thật) luôn giữ một bản outline.json phẳng
	// song song với layered_outline.json cho truyện phân tầng
	// (domain.FlattenOutline) — seed phải mô phỏng đúng bất biến đó, nếu không
	// "dàn ý phẳng" trên bề mặt Dàn Ý sẽ trống trơn dù layered đã đầy, một
	// dạng "chưa dựng" giả.
	must(st.Outline.SaveOutline(domain.FlattenOutline(volumes)))
	must(st.Outline.SavePremise(demoPremise))

	// ── nhân vật + ảnh chụp trạng thái ──
	must(st.Characters.Save(demoCharacters()))
	must(st.Characters.SaveSnapshots(1, 1, demoCharacterSnapshots()))

	// ── luật thế giới + phục bút + quan hệ ──
	must(st.World.SaveWorldRules(demoWorldRules()))
	must(st.World.SaveForeshadowLedger(demoForeshadow()))
	must(st.World.SaveRelationships(demoRelationships()))

	// ── 5 chương đã chốt (1, 2, 3, 5 = "đã nghiệm thu"; 4 sẽ chuyển "chờ viết
	// lại" ngay sau vòng lặp, dù vẫn nằm trong CompletedChapters) ──
	for _, ch := range demoCompletedChapters() {
		seedCompletedChapter(st, ch)
	}

	// Chương 4 đã hoàn thành nhưng Editor trả về — đưa vào hàng chờ viết lại.
	// SetPendingRewrites CHỈ nhận chương đã có trong CompletedChapters
	// (internal/store/progress.go:normalizePendingRewrites), nên phải gọi SAU
	// vòng lặp MarkChapterComplete ở trên.
	must(st.Progress.SetPendingRewrites([]int{4}, pendingRewriteReason))

	// ── chương 6: đang soạn dở (InProgressChapter), có bản thảo thật để bề mặt
	// đọc/inspector không hiện trống khi chọn một chương "đang soạn" ──
	seedDraftingChapter(st, demoDraftingChapter())

	// ── chương 7: chỉ có hợp đồng (plan), chưa viết chữ nào — "chưa tới" ──
	seedPendingChapter(st, demoPendingChapter())

	must(st.Progress.UpdateVolumeArc(2, 1))

	// ── bản duyệt của Editor (kiểm định + hàng chờ viết lại + khu lề đọc) ──
	for _, r := range demoReviews() {
		must(st.World.SaveReview(r))
	}

	// ── nhật ký phán quyết Arbiter ──
	seedDecisions(st)

	// ── dòng sự kiện runtime (tổ sản xuất / dòng sản xuất) ──
	seedRuntimeQueue(st)

	fmt.Println("đã dựng:", dir)
	fmt.Println("  volumes:", len(volumes), "· chương có hợp đồng:", len(domain.FlattenOutline(volumes)))
	fmt.Println("  nhân vật: 5 (đủ 4 hạng) · luật thế giới: 5 (đủ 4 nhóm + 1 nhóm lạ) · phục bút: 3 (đủ 3 trạng thái)")
	fmt.Println("  chương: 1,2,3,5 đã nghiệm thu · 4 chờ viết lại · 6 đang soạn · 7 chưa tới")
}

// seedCompletedChapter đẩy một chương qua chu kỳ plan→draft→consistency_check→
// commit đầy đủ, và ghi CẢ bản nháp (drafts/{ch}.draft.md) LẪN bản chốt
// (chapters/{ch}.md) với cùng nội dung.
//
// Bắt buộc phải ghi cả hai: DraftStore.LoadChapterContent — nguồn duy nhất của
// GET /api/books/{book}/chapters/{n} và của Selected.Excerpt — đọc từ
// drafts/{ch}.draft.md, KHÔNG đọc chapters/{ch}.md (xem internal/store/drafts.go).
// Bản gốc của seed-demo chỉ gọi SaveFinalChapter nên bề mặt "Bản thảo" luôn hiện
// trống cho mọi chương đã nghiệm thu — đúng dạng lỗi "tưởng chưa dựng" mà việc
// mở rộng này phải xoá bỏ. commit_chapter thật (internal/tools/commit_chapter.go)
// cũng lấy content từ draft rồi mới ghi final, nên hai tệp luôn đồng nhất ở đời
// thật; seed phải giữ đúng bất biến đó.
func seedCompletedChapter(st *store.Store, c productionChapter) {
	must(st.Drafts.SaveChapterPlan(domain.ChapterPlan{
		Chapter: c.Chapter, Title: c.PlanTitle, Goal: c.Goal, Conflict: c.Conflict,
		Hook: c.Hook, Notes: c.Notes,
	}))
	must(st.Drafts.SaveDraft(c.Chapter, c.Content))
	must(st.Drafts.SaveFinalChapter(c.Chapter, c.Content))
	must(st.Progress.MarkChapterComplete(c.Chapter, domain.WordCount(c.Content), c.HookType, c.Strand))

	scope := domain.ChapterScope(c.Chapter)
	planArtifact := fmt.Sprintf("drafts/%02d.plan.json", c.Chapter)
	draftArtifact := fmt.Sprintf("drafts/%02d.draft.md", c.Chapter)
	finalArtifact := fmt.Sprintf("chapters/%02d.md", c.Chapter)
	for _, step := range []struct{ name, artifact string }{
		{"plan", planArtifact},
		{"draft", draftArtifact},
		{"consistency_check", draftArtifact},
		{"commit", finalArtifact},
	} {
		_, err := st.Checkpoints.AppendArtifact(scope, step.name, step.artifact)
		must(err)
		time.Sleep(checkpointGap)
	}
}

// seedDraftingChapter dựng chương đang soạn: có plan + bản nháp THẬT (chưa
// hoàn tất), nhưng KHÔNG SaveFinalChapter / MarkChapterComplete — chương này
// còn ở stage "drafting", không phải "done".
func seedDraftingChapter(st *store.Store, c productionChapter) {
	must(st.Drafts.SaveChapterPlan(domain.ChapterPlan{
		Chapter: c.Chapter, Title: c.PlanTitle, Goal: c.Goal, Conflict: c.Conflict,
		Hook: c.Hook, Notes: c.Notes,
	}))
	must(st.Drafts.SaveDraft(c.Chapter, c.Content))
	must(st.Progress.StartChapter(c.Chapter))

	scope := domain.ChapterScope(c.Chapter)
	planArtifact := fmt.Sprintf("drafts/%02d.plan.json", c.Chapter)
	draftArtifact := fmt.Sprintf("drafts/%02d.draft.md", c.Chapter)
	_, err := st.Checkpoints.AppendArtifact(scope, "plan", planArtifact)
	must(err)
	time.Sleep(checkpointGap)
	_, err = st.Checkpoints.AppendArtifact(scope, "draft", draftArtifact)
	must(err)
}

// seedPendingChapter dựng chương "chưa tới": chỉ có hợp đồng (plan), không có
// một chữ bản thảo nào — stage "pending". Chương này chỉ xuất hiện trong bảng
// chương vì nó có MỘT checkpoint (bước "plan"): buildChapterRows gộp mọi
// chương có checkpoint vào tập "wanted", bất kể đã hoàn thành hay chưa (xem
// internal/serve/snapshot.go). Không có checkpoint nào thì chương 7 sẽ không
// hiện trong bảng, và bề mặt "chưa tới" sẽ thiếu ví dụ.
func seedPendingChapter(st *store.Store, c productionChapter) {
	must(st.Drafts.SaveChapterPlan(domain.ChapterPlan{
		Chapter: c.Chapter, Title: c.PlanTitle, Goal: c.Goal, Conflict: c.Conflict,
		Hook: c.Hook, Notes: c.Notes,
	}))
	planArtifact := fmt.Sprintf("drafts/%02d.plan.json", c.Chapter)
	_, err := st.Checkpoints.AppendArtifact(domain.ChapterScope(c.Chapter), "plan", planArtifact)
	must(err)
}

// seedDecisions gieo nhật ký phán quyết Arbiter: một khởi động quy hoạch bình
// thường, một can thiệp đẩy chương vào hàng chờ viết lại (đúng lý do ở
// pendingRewriteReason), và một phán quyết THẤT BẠI — Decision.Error phải có
// dữ liệu thật để bảng "Tổ sản xuất" (cột "thất bại") không luôn luôn hiện 0.
func seedDecisions(st *store.Store) {
	_, err := st.Decisions.Append(store.DecisionRecord{
		Kind: "plan_start", Decider: "arbiter",
		Reason: "Mở rộng cung 'Cửu Tuyền Đường Mở Cổng' bằng architect_long — còn khoảng 289 " +
			"chương chưa quy hoạch, cần bộ khung nhiều tập trước khi viết tới",
		Model: "gemini-2.5-pro", DurationMs: 1840,
	})
	must(err)
	time.Sleep(checkpointGap)

	_, err = st.Decisions.Append(store.DecisionRecord{
		Kind: "intervention", Decider: "arbiter",
		Reason: "Bản duyệt chương 4 phát hiện mâu thuẫn mốc thời gian nghiêm trọng với chương 2; " +
			"đưa chương 4 vào hàng chờ viết lại thay vì để Writer tự sửa trong lượt polish kế tiếp",
		Model: "gemini-2.5-pro", DurationMs: 2310,
		Decision: json.RawMessage(`{"action":"queue_rewrite","chapters":[4],"verdict":"rewrite"}`),
	})
	must(err)
	time.Sleep(checkpointGap)

	_, err = st.Decisions.Append(store.DecisionRecord{
		Kind: "volume_end", Decider: "arbiter",
		Reason:     "Thử tổng hợp tóm tắt Tập 1 trước khi khoá tập, phục vụ ngữ cảnh cho Architect mở Tập 2",
		Model:      "gemini-2.5-pro",
		DurationMs: 45000,
		Error:      "context deadline exceeded sau 45s gọi model tổng hợp — thử lại ở lượt kế tiếp",
	})
	must(err)
}

// seedRuntimeQueue gieo vài sự kiện dòng runtime, đủ vai (architect/writer/
// editor/arbiter) và đủ mức ưu tiên (control/background) để bề mặt "Tổ sản
// xuất" liệt kê được nhiều hơn một vai.
func seedRuntimeQueue(st *store.Store) {
	items := []domain.RuntimeQueueItem{
		{Kind: domain.RuntimeQueueUIEvent, Priority: domain.RuntimePriorityBackground,
			Category: "TOOL", Agent: "architect", Summary: "expand_arc mở cung 'Cửu Tuyền Đường Mở Cổng' — 2 chương"},
		{Kind: domain.RuntimeQueueUIEvent, Priority: domain.RuntimePriorityBackground,
			Category: "TOOL", Agent: "writer", Summary: "draft_chapter ghi 3208 từ cho chương 5"},
		{Kind: domain.RuntimeQueueUIEvent, Priority: domain.RuntimePriorityBackground,
			Category: "TOOL", Agent: "editor", Summary: "review_chapter chấm chương 4 — kết luận rewrite"},
		{Kind: domain.RuntimeQueueUIEvent, Priority: domain.RuntimePriorityControl,
			Category: "TOOL", Agent: "arbiter", Summary: "queue_rewrite đưa chương 4 vào hàng chờ viết lại"},
		{Kind: domain.RuntimeQueueUIEvent, Priority: domain.RuntimePriorityBackground,
			Category: "TOOL", Agent: "writer", Summary: "draft_chapter đang soạn dở chương 6"},
	}
	for _, item := range items {
		item.Time = time.Now()
		_, err := st.Runtime.AppendQueue(item)
		must(err)
	}
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
