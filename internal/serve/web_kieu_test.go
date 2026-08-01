package serve

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// TestKieuTruongSongPhaiChoNull canh lớp lỗi "kiểu nói dối về payload".
//
// ĐO ĐƯỢC ở dự án này một lần: `Timeline.volumes` được khai `LaneBlock[]` trong khi server
// trả `null` cho truyện không phân tầng. `tsc` XANH vì nó tin lời khai, nên `blocks.find(...)`
// được viết mà không ai chặn — và renderer SẬP ở bề mặt mặc định, đúng chỗ người dùng đáp
// xuống. Một kiểu sai không gây cảnh báo; nó gây một cú sập ở nơi khác.
//
// Bài kiểm ở phía Go vì `web/` cố ý không có bộ chạy test (devDependencies chỉ có TypeScript
// và các gói @types). Tiền lệ: TestNhanDlPhaiQuaTuDien trong gói này cũng quét tệp nguồn của
// web, và lý do được ghi ở đó.
//
// KHÔNG viết bài kiểm này thành "chạy tsc rồi đòi nó đỏ": `tsc` không tự khẳng định thất bại
// của chính nó, nên câu đó là một bài kiểm không chạy được.
func TestKieuTruongSongPhaiChoNull(t *testing.T) {
	duong := filepath.Join("..", "..", "web", "lib", "types.ts")
	b, err := os.ReadFile(duong)
	if err != nil {
		t.Fatalf("không đọc được %s: %v — bài kiểm này không thể kiểm gì", duong, err)
	}
	nguon := string(b)

	// Năm trường này server trả `null` khi engine đóng — xem TestTruongSongLaNullKhiMayDong.
	for _, truong := range []string{"agents", "idle_agents", "advance", "context",
		"in_progress_chapter"} {
		re := regexp.MustCompile(`(?m)^\s*` + truong + `\??:\s*([^;]+);`)
		khop := re.FindStringSubmatch(nguon)
		if khop == nil {
			t.Errorf("không thấy trường %q trong types.ts — payload có nó mà kiểu thì không",
				truong)
			continue
		}
		if !strings.Contains(khop[1], "null") {
			t.Errorf("trường %q khai `%s` — thiếu `| null`.\n"+
				"Server trả `null` cho trường này khi engine đóng, nên kiểu này đang NÓI DỐI, "+
				"và tsc sẽ xanh trong khi giao diện sập ở ca engine đóng.",
				truong, strings.TrimSpace(khop[1]))
		}
	}
}
