package assets

import (
	"strings"
	"testing"

	"github.com/voocel/ainovel-cli/internal/i18n"
	"github.com/voocel/ainovel-cli/internal/stylestat"
)

// TestAntiAIToneCoversEveryCountedPattern giữ hai lớp chống giọng AI khớp nhau.
//
// Phân vai: stylestat chỉ ĐẾM sự kiện (`episodic_memory.style_stats`), còn
// references/anti-ai-tone.md là nơi Writer đọc để tự tránh và Editor đọc để có
// tiêu chí phán. Nếu stylestat đếm một lớp mà tài liệu không có mục tương ứng
// thì con số cứ tăng mà không ai có căn cứ để ra issue: chỉ số đỏ mà không ai
// sửa, đúng kiểu lỗi không phát ra tiếng. Test này chặn chiều đó — thêm lớp vào
// viPatternDefs mà quên viết mục trong tài liệu là đỏ ngay.
//
// Ghép theo NHÃN (phần trước 『) chứ không theo cả tên: phần trong 『』 là ví dụ
// minh họa cho người đọc báo cáo, sửa ví dụ không nên làm test đỏ.
func TestAntiAIToneCoversEveryCountedPattern(t *testing.T) {
	prev := i18n.Active()
	if err := i18n.SetLocale(i18n.Vietnamese); err != nil {
		t.Fatalf("SetLocale(vi): %v", err)
	}
	t.Cleanup(func() { _ = i18n.SetLocale(prev) })

	names := stylestat.PatternNames()
	if len(names) == 0 {
		t.Fatal("stylestat không khai báo lớp mẫu nào cho tiếng Việt")
	}

	doc := mustRead(referencesFS, "references/anti-ai-tone.md")
	for _, name := range names {
		label := name
		if i := strings.Index(label, "『"); i >= 0 {
			label = strings.TrimSpace(label[:i])
		}
		if !strings.Contains(doc, label) {
			t.Errorf("anti-ai-tone.md thiếu mục cho lớp đếm %q (nhãn %q): "+
				"stylestat đếm tật này mà tài liệu không dạy tránh", name, label)
		}
	}
}

// TestAntiAIToneKeepsAgentNamesInEnglish chặn việc dịch tên agent trong tài liệu.
//
// `Writer` / `Editor` là tên agent, khớp với tên trong code và trong các prompt
// khác; dịch thành "Người viết" / "Biên tập viên" thì tài liệu và hệ thống gọi
// hai thứ khác tên nhau. `aesthetic` là giá trị enum thật mà save_review nhận
// (domain.Review.Dimension so khớp đúng từng ký tự), nên phải còn nguyên literal.
func TestAntiAIToneKeepsAgentNamesInEnglish(t *testing.T) {
	doc := mustRead(referencesFS, "references/anti-ai-tone.md")
	for _, want := range []string{"Writer", "Editor", "aesthetic"} {
		if !strings.Contains(doc, want) {
			t.Errorf("anti-ai-tone.md phải giữ nguyên định danh %q", want)
		}
	}
	for _, banned := range []string{"Người viết", "Biên tập viên"} {
		if strings.Contains(doc, banned) {
			t.Errorf("anti-ai-tone.md dịch tên agent thành %q — phải giữ tiếng Anh", banned)
		}
	}
}
