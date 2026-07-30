package serve

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/voocel/ainovel-cli/internal/domain"
	"github.com/voocel/ainovel-cli/internal/store"
)

// buildSnapshot đọc store và dựng payload cho bề mặt studio.
//
// Chỉ dùng phương thức đọc công khai của store. Không sửa gì, không gọi engine.
// Nhờ vậy `ainovel serve` chạy song song với engine (TUI hoặc headless) mà không
// tranh chấp, và fork này không phải chạm vào core — điều quan trọng vì upstream
// vẫn đang phát triển nhanh và mỗi dòng sửa ở core là một xung đột rebase.
func buildSnapshot(st *store.Store, id string, selected int) (*Snapshot, error) {
	progress, err := st.Progress.Load()
	if err != nil {
		return nil, fmt.Errorf("đọc progress: %w", err)
	}
	if progress == nil {
		return nil, errNotInitialized
	}

	cps := st.Checkpoints.All()
	cycles := latestChapterCycles(cps)
	timeline := buildTimeline(st, progress)

	snap := &Snapshot{
		Book:     bookFrom(id, progress, cps),
		Timeline: timeline,
		Chapters: buildChapterRows(st, progress, cycles),
		Capabilities: Capabilities{
			PerChapterDuration: true,
			PerChapterCost:     false, // UsageState chỉ cộng theo agent/model
			// Suy từ DỮ LIỆU thật, không từ cờ progress.Layered. Cờ đó do engine
			// đặt ở một đường riêng và có thể còn false trong khi
			// layered_outline.json đã có nội dung — khi đó giao diện sẽ ẩn hai
			// lane trên dù có đủ dữ liệu để vẽ. Đã gặp thật lúc thử với dữ liệu
			// thật: payload có 2 tập, 2 cung, mà capability báo false.
			LayeredOutline: len(timeline.Volumes) > 0,
			Steer:          false, // cần engine hợp tác; xem ghi chú trong serve.go
		},
		Transport: buildTransport(st, progress, cps),
		Decisions: buildDecisions(st),
		Warnings:  storeWarnings(st),
	}

	if selected > 0 {
		snap.Selected = buildSelection(st, selected)
	}
	if items, err := st.Runtime.LoadQueue(); err == nil && len(items) > 0 {
		snap.QueueSeq = items[len(items)-1].Seq
	}
	return snap, nil
}

func bookFrom(id string, p *domain.Progress, cps []domain.Checkpoint) Book {
	b := Book{
		ID:       id,
		Name:     p.NovelName,
		Phase:    string(p.Phase),
		Flow:     string(p.Flow),
		Done:     len(p.CompletedChapters),
		Total:    p.TotalChapters,
		Words:    p.TotalWordCount,
		Activity: activityOf(p, cps),
	}
	if _, last, ok := runSpan(cps); ok {
		b.UpdatedAt = last.UTC().Format(time.RFC3339)
	}
	return b
}

// activityIdleAfter là ngưỡng coi một phiên là đã nguội. Không có cờ "engine
// đang chạy" trong store — engine là process khác — nên trạng thái được suy ra
// từ độ mới của checkpoint cuối. Đây là suy đoán, và ngưỡng phải đủ rộng để
// không gán "nguội" cho một bước draft dài đang chạy bình thường.
const activityIdleAfter = 10 * time.Minute

func activityOf(p *domain.Progress, cps []domain.Checkpoint) string {
	if p.Phase == domain.PhaseComplete {
		return "complete"
	}
	_, last, ok := runSpan(cps)
	if !ok || time.Since(last) > activityIdleAfter {
		return "idle"
	}
	return "running"
}

// buildTimeline dựng trục ba tầng: tập → cung của tập hiện tại → chương.
func buildTimeline(st *store.Store, p *domain.Progress) Timeline {
	tl := Timeline{Chapters: buildChapterMarks(p)}

	volumes, err := st.Outline.LoadLayeredOutline()
	if err != nil || len(volumes) == 0 {
		// Truyện ngắn/vừa: không có cấu trúc phân tầng. Trả lane chương thôi,
		// giao diện tự ẩn hai lane trên — đây là dạng hợp lệ, không phải lỗi.
		return tl
	}

	for i := range volumes {
		v := &volumes[i]
		tl.Volumes = append(tl.Volumes, volumeBlock(v, p))
	}
	for i := range volumes {
		v := &volumes[i]
		if v.Index != p.CurrentVolume {
			continue
		}
		for j := range v.Arcs {
			tl.Arcs = append(tl.Arcs, arcBlock(&v.Arcs[j], v.Index, p))
		}
	}
	return tl
}

func volumeBlock(v *domain.VolumeOutline, p *domain.Progress) LaneBlock {
	b := LaneBlock{Index: v.Index, Title: v.Title, Final: v.Final}

	if !v.IsExpanded() {
		b.State = "unplanned"
		b.Estimated = true
		return b
	}

	from, to := 0, 0
	estimated := false
	for i := range v.Arcs {
		arc := &v.Arcs[i]
		if !arc.IsExpanded() {
			b.Chapters += arc.EstimatedChapters
			estimated = true
			continue
		}
		for _, ch := range arc.Chapters {
			b.Chapters++
			if from == 0 || ch.Chapter < from {
				from = ch.Chapter
			}
			if ch.Chapter > to {
				to = ch.Chapter
			}
		}
	}
	b.From, b.To, b.Estimated = from, to, estimated

	switch {
	case v.Index == p.CurrentVolume:
		b.State = "running"
	case to > 0 && allCompleted(p, from, to):
		b.State = "done"
	case v.Index < p.CurrentVolume:
		b.State = "done"
	default:
		b.State = "planned"
	}
	return b
}

func arcBlock(a *domain.ArcOutline, volume int, p *domain.Progress) LaneBlock {
	b := LaneBlock{Index: a.Index, Title: a.Title}

	if !a.IsExpanded() {
		// Cung骨架: chưa có chương chi tiết, Architect sẽ mở khi viết tới.
		b.State = "unplanned"
		b.Chapters = a.EstimatedChapters
		b.Estimated = true
		return b
	}

	from, to := 0, 0
	for _, ch := range a.Chapters {
		b.Chapters++
		if from == 0 || ch.Chapter < from {
			from = ch.Chapter
		}
		if ch.Chapter > to {
			to = ch.Chapter
		}
	}
	b.From, b.To = from, to

	next := p.NextChapter()
	switch {
	case allCompleted(p, from, to):
		b.State = "done"
	case volume == p.CurrentVolume && a.Index == p.CurrentArc:
		b.State = "running"
	case next >= from && next <= to:
		b.State = "running"
	default:
		b.State = "planned"
	}
	return b
}

func allCompleted(p *domain.Progress, from, to int) bool {
	if from <= 0 || to < from {
		return false
	}
	done := make(map[int]bool, len(p.CompletedChapters))
	for _, c := range p.CompletedChapters {
		done[c] = true
	}
	for c := from; c <= to; c++ {
		if !done[c] {
			return false
		}
	}
	return true
}

func buildChapterMarks(p *domain.Progress) []ChapterMark {
	total := p.TotalChapters
	if total <= 0 {
		total = p.LatestCompleted()
	}
	if total <= 0 {
		return nil
	}

	done := make(map[int]bool, len(p.CompletedChapters))
	for _, c := range p.CompletedChapters {
		done[c] = true
	}
	rewrite := make(map[int]bool, len(p.PendingRewrites))
	for _, c := range p.PendingRewrites {
		rewrite[c] = true
	}

	marks := make([]ChapterMark, 0, total)
	for c := 1; c <= total; c++ {
		marks = append(marks, ChapterMark{Chapter: c, State: chapterState(c, p, done, rewrite)})
	}
	return marks
}

// chapterState quyết định trạng thái một chương. Thứ tự xét quan trọng: chương
// đang viết lại vẫn nằm trong CompletedChapters (bản终稿 cũ còn đó), nên phải
// xét hàng đợi viết lại TRƯỚC khi xét đã xong, nếu không trạng thái "trả về
// viết lại" sẽ không bao giờ hiện ra.
func chapterState(c int, p *domain.Progress, done, rewrite map[int]bool) string {
	switch {
	case rewrite[c]:
		return "rewrite"
	case c == p.InProgressChapter:
		return "running"
	case done[c]:
		return "done"
	default:
		return "pending"
	}
}

func buildChapterRows(st *store.Store, p *domain.Progress, cycles map[int]chapterCycle) []ChapterRow {
	done := make(map[int]bool, len(p.CompletedChapters))
	for _, c := range p.CompletedChapters {
		done[c] = true
	}
	rewrite := make(map[int]bool, len(p.PendingRewrites))
	for _, c := range p.PendingRewrites {
		rewrite[c] = true
	}

	// Chỉ trả các chương đã có dấu vết sản xuất, cộng chương kế tiếp. Trả cả 300
	// hàng rỗng cho một cuốn mới bắt đầu là rác, không phải dữ liệu.
	wanted := map[int]bool{}
	for c := range done {
		wanted[c] = true
	}
	for c := range rewrite {
		wanted[c] = true
	}
	for c := range cycles {
		wanted[c] = true
	}
	if p.InProgressChapter > 0 {
		wanted[p.InProgressChapter] = true
	}
	if next := p.NextChapter(); next > 0 && (p.TotalChapters == 0 || next <= p.TotalChapters) {
		wanted[next] = true
	}

	chapters := make([]int, 0, len(wanted))
	for c := range wanted {
		chapters = append(chapters, c)
	}
	sort.Ints(chapters)

	rows := make([]ChapterRow, 0, len(chapters))
	for _, c := range chapters {
		row := ChapterRow{
			Chapter: c,
			Title:   chapterTitle(st, c),
			Stage:   rowStage(c, p, done, rewrite),
			Words:   p.ChapterWordCounts[c],
		}
		if cyc, ok := cycles[c]; ok {
			if cyc.Measurable {
				ms := cyc.Duration().Milliseconds()
				row.DurationMs = &ms
			}
			row.Owner = ownersFromSteps(cyc.Steps)
		}
		rows = append(rows, row)
	}
	return rows
}

func rowStage(c int, p *domain.Progress, done, rewrite map[int]bool) string {
	switch {
	case rewrite[c]:
		return "rewrite"
	case c == p.InProgressChapter:
		return "drafting"
	case done[c]:
		return "done"
	default:
		return "pending"
	}
}

// ownersFromSteps suy ra vai nào đã tham gia chu kỳ, dựa vào bước checkpoint.
// Ánh xạ này khớp với các tool ghi checkpoint trong internal/tools.
func ownersFromSteps(steps []string) []string {
	var writer, editor bool
	for _, s := range steps {
		switch s {
		case "plan", "draft", "consistency_check", "commit", "edit":
			writer = true
		case "review", "arc_summary", "volume_summary":
			editor = true
		}
	}
	var out []string
	if writer {
		out = append(out, "writer")
	}
	if editor {
		out = append(out, "editor")
	}
	return out
}

func chapterTitle(st *store.Store, chapter int) string {
	if e, err := st.Outline.GetChapterOutline(chapter); err == nil && e != nil && e.Title != "" {
		return e.Title
	}
	if e, err := st.Outline.GetChapterFromLayered(chapter); err == nil && e != nil {
		return e.Title
	}
	return ""
}

func buildTransport(st *store.Store, p *domain.Progress, cps []domain.Checkpoint) Transport {
	tr := Transport{State: activityOf(p, cps)}

	if meta, err := st.RunMeta.Load(); err == nil && meta != nil {
		tr.Model = meta.Model
	}
	if usage, err := st.Usage.Load(); err == nil && usage != nil {
		tr.CostUSD = usage.Overall.Cost
		if n := len(p.CompletedChapters); n > 0 && usage.Overall.Cost > 0 {
			per := usage.Overall.Cost / float64(n)
			tr.CostPerChapter = &per
		}
	}

	if first, last, ok := runSpan(cps); ok {
		span := last.Sub(first)
		ms := span.Milliseconds()
		tr.ElapsedMs = &ms
		if perHour, ok := throughput(len(p.CompletedChapters), span); ok {
			tr.ChaptersPerHour = &perHour
		}
	}

	// Bước vừa HOÀN THÀNH, không phải bước đang chạy — store chỉ ghi checkpoint
	// khi một bước thành công. Xem ghi chú ở Transport.LastStep về việc tên
	// field cũ ("step") từng làm giao diện hiện sai công đoạn.
	if cp := st.Checkpoints.LatestGlobal(); cp != nil {
		tr.LastStep = cp.Step
	}
	return tr
}

func buildDecisions(st *store.Store) []Decision {
	const recent = 20
	recs, err := st.Decisions.Recent(recent)
	if err != nil {
		return nil
	}
	out := make([]Decision, 0, len(recs))
	for _, r := range recs {
		d := Decision{
			ID:         r.ID,
			At:         r.At,
			Kind:       r.Kind,
			Decider:    r.Decider,
			Reason:     r.Reason,
			Input:      r.Input,
			Model:      r.Model,
			DurationMs: r.DurationMs,
			Error:      r.Error,
		}
		if len(r.Decision) > 0 {
			d.Decision = rawJSON(r.Decision)
		}
		out = append(out, d)
	}
	// Mới nhất lên đầu: nhật ký được đọc từ trên xuống.
	sort.SliceStable(out, func(i, j int) bool { return out[i].At > out[j].At })
	return out
}

func buildSelection(st *store.Store, chapter int) *Selection {
	sel := &Selection{Chapter: chapter, Title: chapterTitle(st, chapter)}

	if e, err := st.Outline.GetChapterOutline(chapter); err == nil && e != nil {
		sel.Contract = &Contract{
			Chapter:   chapter,
			Title:     e.Title,
			CoreEvent: e.CoreEvent,
			Hook:      e.Hook,
			Scenes:    e.Scenes,
		}
	}
	if r, err := st.World.LoadReview(chapter); err == nil && r != nil {
		sel.Review = reviewFrom(r)
	} else if r, err := st.World.LoadLastReview(chapter); err == nil && r != nil {
		sel.Review = reviewFrom(r)
	}
	if text, words, err := st.Drafts.LoadChapterContent(chapter); err == nil {
		sel.Words = words
		sel.Excerpt = excerpt(text, 320)
	}
	return sel
}

func reviewFrom(r *domain.ReviewEntry) *Review {
	out := &Review{
		Chapter:        r.Chapter,
		Scope:          r.Scope,
		Verdict:        r.Verdict,
		Summary:        r.Summary,
		ContractStatus: r.ContractStatus,
		ContractMisses: r.ContractMisses,
	}
	for _, d := range r.Dimensions {
		out.Dimensions = append(out.Dimensions, Dimension{
			Name: d.Dimension, Score: d.Score, Verdict: d.Verdict, Comment: d.Comment,
		})
	}
	for _, i := range r.Issues {
		out.Issues = append(out.Issues, Issue{
			Type: i.Type, Severity: i.Severity, Description: i.Description,
			Evidence: i.Evidence, Suggestion: i.Suggestion,
			Chapters: i.Chapters, NeedsChange: i.RequiresChange,
		})
	}
	return out
}

// excerpt cắt theo RANH GIỚI TỪ, không theo số rune. Cắt giữa từ tiếng Việt tạo
// ra chữ vô nghĩa ("chuô…"), và cắt giữa một cụm ký tự tổ hợp có thể làm rơi
// dấu. Cắt ở khoảng trắng gần nhất trước hạn mức là đủ và luôn đọc được.
func excerpt(text string, maxRunes int) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	runes := []rune(text)
	if len(runes) <= maxRunes {
		return text
	}
	cut := string(runes[:maxRunes])
	if i := strings.LastIndexAny(cut, " \n\t"); i > maxRunes/2 {
		cut = cut[:i]
	}
	return strings.TrimRight(cut, " \n\t,.;:—-") + "…"
}

func storeWarnings(st *store.Store) []string { return st.CheckConsistency() }
