// Công cụ chỉ dùng khi phát triển: dựng một tác phẩm mẫu trong store để thử
// `ainovel-cli serve` và giao diện web mà không phải chạy engine thật (tốn tiền
// gọi mô hình và mất hàng giờ).
//
// Dùng: go run ./cmd/seed-demo /duong/dan/thu-muc-tac-pham
//
// Dữ liệu mẫu cố ý gồm cả các ca khó: tập đã mở lẫn tập còn là bộ khung, cung
// có chương chi tiết lẫn cung chỉ có số dự kiến, chương đang viết dở, và một
// phán quyết Arbiter — vì đó là những chỗ giao diện dễ vẽ sai nhất.
package main

import (
	"fmt"
	"os"
	"time"

	"github.com/voocel/ainovel-cli/internal/domain"
	"github.com/voocel/ainovel-cli/internal/store"
)

func main() {
	dir := os.Args[1]
	st := store.NewStore(dir)
	must(st.Init())
	must(st.Progress.Init("Trấn Yêu Ký", 300))

	must(st.Outline.SaveLayeredOutline([]domain.VolumeOutline{
		{Index: 1, Title: "Sương phủ Hàn Sơn", Theme: "báo thù", Arcs: []domain.ArcOutline{
			{Index: 1, Title: "Ba tiếng chuông", Goal: "hé lộ", Chapters: []domain.OutlineEntry{
				{Chapter: 1, Title: "Người gác cầu đá", CoreEvent: "gặp người lạ", Hook: "bỏ lửng"},
				{Chapter: 2, Title: "Thư không người nhận", CoreEvent: "nhận thư", Hook: "câu hỏi"},
				{Chapter: 3, Title: "Tiếng chuông thứ ba", CoreEvent: "chuông đổ", Hook: "bỏ lửng hành động"},
			}},
			{Index: 2, Title: "Vết dao cũ", Goal: "đối đầu", EstimatedChapters: 6},
		}},
		{Index: 2, Title: "Chờ Architect mở", Theme: "chưa rõ"},
	}))

	for _, ch := range []int{1, 2} {
		must(st.Drafts.SaveFinalChapter(ch, fmt.Sprintf("Nội dung chương %d. Đêm ấy mưa không dừng, Lâm Thanh ngồi dựa cột đá ở chân bậc thứ hai trăm, nghe tiếng chuông từ Hàn Sơn vọng xuống qua màn nước.", ch)))
		must(st.Progress.MarkChapterComplete(ch, 2900+ch, "cliffhanger", "main"))
		// AppendArtifact băm nội dung file thật, nên artifact phải tồn tại.
		art := fmt.Sprintf("chapters/%02d.md", ch)
		for _, step := range []string{"plan", "draft", "consistency_check", "commit"} {
			_, err := st.Checkpoints.AppendArtifact(domain.ChapterScope(ch), step, art)
			must(err)
			time.Sleep(400 * time.Millisecond)
		}
	}
	must(st.Progress.StartChapter(3))
	must(st.Progress.UpdateVolumeArc(1, 1))

	_, err := st.Decisions.Append(store.DecisionRecord{
		Kind: "plan_start", Decider: "arbiter",
		Reason: "Mở rộng cung 3 bằng architect_long — tồn 253 chương, cần bộ khung nhiều tập",
		Model:  "gemini-2.5-pro", DurationMs: 1840,
	})
	must(err)

	for i := 1; i <= 3; i++ {
		_, err := st.Runtime.AppendQueue(domain.RuntimeQueueItem{
			Time: time.Now(), Kind: domain.RuntimeQueueUIEvent,
			Priority: domain.RuntimePriorityBackground,
			Category: "TOOL", Agent: "writer",
			Summary: fmt.Sprintf("draft_chapter ghi %d từ", 2900+i),
		})
		must(err)
	}
	fmt.Println("đã dựng:", dir)
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
