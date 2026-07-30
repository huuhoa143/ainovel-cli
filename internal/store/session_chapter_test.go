package store

import "testing"

// Nhóm 3 — bóc số chương từ mô tả task của agent.
//
// extractChapter quyết định tên file log phiên: bóc được thì
// meta/sessions/agents/writer-ch03.jsonl, không bóc được thì rơi về số thứ tự
// writer-001.jsonl. Với task tiếng Việt ("Viết chương 3") regex tiếng Trung
// không khớp, nên MỌI chương đổ vào chuỗi số thứ tự — mất hẳn khả năng mở đúng
// log của một chương khi đi truy lỗi, mà không có triệu chứng nào báo.
func TestExtractChapter(t *testing.T) {
	cases := []struct {
		task string
		want string
	}{
		// Tiếng Trung của upstream phải giữ nguyên hành vi.
		{"写第 3 章", "ch03"},
		{"写第3章", "ch03"},
		{"重写第 12 章正文", "ch12"},

		// Tiếng Việt phải bóc được.
		{"Viết chương 3", "ch03"},
		{"Viết Chương 3", "ch03"},
		{"viết chương 12 theo dàn ý", "ch12"},
		{"Đánh giá CHƯƠNG 7", "ch07"},
		{"Viết chương3", "ch03"},
		{"Rà soát chương 105", "ch105"},

		// Không có số chương → rơi về chuỗi số thứ tự.
		{"审阅全书", ""},
		{"Rà soát toàn bộ dàn ý", ""},
		{"Chương trình đào tạo", ""},
		{"第零章", ""},
		{"Viết chương 0", ""},
	}
	for _, c := range cases {
		if got := extractChapter(c.task); got != c.want {
			t.Errorf("extractChapter(%q) = %q, muốn %q", c.task, got, c.want)
		}
	}
}
