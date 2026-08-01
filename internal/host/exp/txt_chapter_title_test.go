package exp

import "testing"

// Nhóm 3 — nhận dạng tiêu đề chương khi bản thảo là tiếng Việt.
//
// Vì sao quan trọng: renderTXT tự sinh dòng tiêu đề cho mỗi chương, rồi
// stripChapterTitleHeader bóc dòng tiêu đề mà writer đã viết trong thân bài để
// không bị lặp hai lần. Với "第N章" thì nhận được; writer tiếng Việt viết
// "# Chương 5: Bến cũ" thì không nhận ra → bản xuất lặp tiêu đề ở mọi chương.
func TestIsChapterTitleLineVietnamese(t *testing.T) {
	cases := []struct {
		line  string
		title string
		want  bool
		why   string
	}{
		// Dạng tiếng Việt phải nhận được.
		{"# Chương 5", "Bến cũ", true, "dạng cơ bản"},
		{"## Chương 12: Bến cũ", "Bến cũ", true, "có dấu hai chấm"},
		{"# CHƯƠNG 5", "Bến cũ", true, "viết hoa toàn bộ"},
		{"### Chương 47 Sinh tử", "Sinh tử", true, "tên chương liền sau số"},
		{"# Chương 5 - Bến cũ", "Bến cũ", true, "gạch nối"},
		{"# chương 5", "Bến cũ", true, "viết thường"},
		{"# Chương bốn mươi bảy", "Sinh tử", true, "số viết bằng chữ"},
		{"# Chương ba: Sinh tử", "Sinh tử", true, "số viết bằng chữ + hai chấm"},

		// Dạng tiếng Trung của upstream vẫn phải nhận được.
		{"# 第5章", "风起", true, "zh không dấu cách"},
		{"## 第 12 章 风起", "风起", true, "zh có dấu cách"},

		// Ranh giới: KHÔNG được nhận, vì hàm gọi sẽ XÓA dòng khớp.
		{"# Chương trình đào tạo", "Bến cũ", false, "«Chương trình» là từ thường, không phải số chương"},
		{"# Chương Ba Đào", "Bến cũ", false, "«Ba Đào» là tên chương, không phải số ba"},
		{"# Mở đầu", "Bến cũ", false, "tiêu đề khác không được xóa"},
		{"# Chương", "Bến cũ", false, "thiếu phần số"},
		{"Chương 5", "Bến cũ", false, "không phải tiêu đề markdown thì là văn xuôi"},
		{"# Sinh tử", "Bến cũ", false, "h1 không trùng tiêu đề chương thì giữ lại"},

		// Nhánh thứ hai vẫn phải chạy: h1 trùng đúng tên chương.
		{"# Bến cũ", "Bến cũ", true, "tiêu đề trùng tên chương"},
	}
	for _, c := range cases {
		if got := isChapterTitleLine(c.line, c.title); got != c.want {
			t.Errorf("isChapterTitleLine(%q, %q) = %v, muốn %v — %s", c.line, c.title, got, c.want, c.why)
		}
	}
}

func TestStripChapterTitleHeaderVietnamese(t *testing.T) {
	cases := []struct {
		name    string
		content string
		title   string
		want    string
	}{
		{
			name:    "bóc tiêu đề chương tiếng Việt",
			content: "# Chương 5: Bến cũ\n\nHắn đứng lặng bên bờ nước.\n",
			title:   "Bến cũ",
			want:    "Hắn đứng lặng bên bờ nước.\n",
		},
		{
			name:    "bóc tiêu đề viết hoa không có tên",
			content: "## CHƯƠNG 12\nSương xuống rất nhanh.",
			title:   "Bến cũ",
			want:    "Sương xuống rất nhanh.",
		},
		{
			name:    "giữ nguyên đoạn mở đầu không phải tiêu đề chương",
			content: "# Chương trình của hắn đã đổ vỡ.\n\nHắn ngồi xuống.",
			title:   "Bến cũ",
			want:    "# Chương trình của hắn đã đổ vỡ.\n\nHắn ngồi xuống.",
		},
		{
			name:    "văn xuôi mở đầu bằng chữ Chương vẫn giữ",
			content: "Chương Ba Đào là nơi hắn sinh ra.\n\nHắn nhớ lại.",
			title:   "Bến cũ",
			want:    "Chương Ba Đào là nơi hắn sinh ra.\n\nHắn nhớ lại.",
		},
	}
	for _, c := range cases {
		if got := stripChapterTitleHeader(c.content, c.title); got != c.want {
			t.Errorf("%s:\n có   %q\n muốn %q", c.name, got, c.want)
		}
	}
}

// TestExportedHeaderIsNotStrippedFromBody chốt một bất biến dễ hiểu sai: dòng
// tiêu đề mà renderTXT tự sinh KHÔNG có tiền tố "#", nên nó không phải thứ mà
// stripChapterTitleHeader nhắm tới. Hàm strip chỉ bóc tiêu đề markdown do writer
// viết trong thân bài. Nếu ai đó sau này đổi renderTXT sang xuất tiêu đề dạng
// markdown thì test này đỏ, buộc phải xem lại cả hai đầu cùng lúc.
func TestExportedHeaderIsNotMarkdown(t *testing.T) {
	out := renderTXT("Sách", []int{1}, chapterTitleIndex{1: "Bến cũ"}, nil,
		map[int]string{1: "Hắn đứng lặng bên bờ nước."})
	if len(out) == 0 {
		t.Fatal("renderTXT trả rỗng")
	}
	if got := stripChapterTitleHeader(out, "Bến cũ"); got != out {
		t.Errorf("bản xuất bị chính hàm strip cắt đầu — hai đầu không còn đối xứng:\n%q", got)
	}
}
