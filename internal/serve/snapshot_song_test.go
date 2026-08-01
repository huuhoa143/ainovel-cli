package serve

import (
	"testing"

	"github.com/voocel/ainovel-cli/internal/host"
)

// TestAnhXaVaiKhopTUI canh lớp lỗi tệ nhất của việc ánh xạ: web và TUI nói KHÁC NHAU về
// "ai đang chạy".
//
// Cả hai bề mặt đều trông đáng tin, nên khi chúng lệch thì không ai biết bên nào sai.
//
// # Kế hoạch ban đầu nói SAI luật
//
// Bản đầu của kế hoạch giả định luật là "State == working thì đang chạy, còn lại thì chờ".
// Đọc thẳng `sidebarIdleAgents`/`sidebarAgents` (internal/entry/tui/panels_sidebar.go:239,260)
// thì luật thật NGƯỢC LẠI: "State == idle thì chờ", còn lại — kể cả một giá trị chưa từng
// gặp — đều được TUI coi là đang chạy. Engine hôm nay chỉ từng gán "working" hoặc "idle"
// (internal/host/observer.go:124,144,170,228), nên hai cách so trùng kết quả VỚI DỮ LIỆU HÔM
// NAY. Nhưng nếu mai engine thêm một trạng thái mới mà không ai sửa web, so "== working" sẽ
// âm thầm đẩy trạng thái đó sang "chờ" trong khi TUI vẫn vẽ nó là "đang chạy" — đúng lớp lỗi
// bài kiểm này phải canh. Vai "arbiter" dưới đây dùng State rỗng để phân biệt hai luật: rỗng
// không phải "working", nhưng cũng không phải "idle".
//
// (Bài kiểm KHÔNG lặp lại nhánh "không ai đang chạy thì gộp hết vào danh sách đang chạy" của
// `sidebarAgents`: đó là mẹo trình bày để sidebar TUI không hiện một khối rỗng, không phải
// một sự thật về ai đang chạy — bề mặt JSON không cần né một khối rỗng theo cách đó.)
//
// Bài kiểm chốt CẢ HAI kết quả trên cùng một đầu vào, để lần sau ai đổi một bên là đỏ.
func TestAnhXaVaiKhopTUI(t *testing.T) {
	vao := []host.AgentSnapshot{
		{Name: "writer", State: "working", Tool: "draft_chapter", Turn: 7, Summary: "viết chương 2"},
		{Name: "editor", State: "idle"},
		{Name: "arbiter", State: ""}, // không idle, dù không phải "working" — vẫn phải đang chạy
	}

	dang, cho := anhXaVai(vao)

	if len(dang) != 2 {
		t.Fatalf("vai đang chạy: %d, muốn 2 (writer + arbiter, vì \"\" != \"idle\") — %+v", len(dang), dang)
	}
	var writerVai, arbiterVai *Vai
	for i := range dang {
		switch dang[i].Role {
		case "writer":
			writerVai = &dang[i]
		case "arbiter":
			arbiterVai = &dang[i]
		}
	}
	if writerVai == nil {
		t.Fatalf("thiếu writer trong vai đang chạy: %+v", dang)
	}
	if writerVai.Tool != "draft_chapter" || writerVai.Turn != 7 {
		t.Errorf("vai writer = %+v, muốn tool draft_chapter / turn 7", writerVai)
	}
	if writerVai.Task != "viết chương 2" {
		t.Errorf("Task = %q, muốn lấy từ Summary", writerVai.Task)
	}
	if arbiterVai == nil {
		t.Fatalf("thiếu arbiter trong vai đang chạy — chứng tỏ luật đang so \"== working\" thay vì \"!= idle\": %+v", dang)
	}

	muonCho := []string{"editor"}
	if len(cho) != len(muonCho) {
		t.Fatalf("vai chờ = %v, muốn %v", cho, muonCho)
	}
	for i, v := range muonCho {
		if cho[i] != v {
			t.Errorf("vai chờ[%d] = %q, muốn %q", i, cho[i], v)
		}
	}
}
