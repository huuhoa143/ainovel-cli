package serve

import (
	"strings"
	"testing"

	"github.com/voocel/ainovel-cli/internal/host"
)

// TestDongVanRanhGioiLuotDungThuTu canh lớp lỗi "xử lý lệnh xóa NGOÀI hàng".
//
// Engine phát `host.StreamClearSentinel` trên CÙNG channel với chữ để giữ thứ tự
// (host.go:1085 — chú thích ở đó nói rõ sentinel đi cùng kênh để đảm bảo có thứ tự).
// Nếu bộ đệm bắt sentinel ra xử lý riêng — ví dụ gọi thẳng một hàm xóa — thì một mẩu chữ
// của lượt MỚI có thể vượt lên trước lệnh xóa của lượt CŨ, và giao diện xóa mất đúng phần
// vừa nhận. Bài kiểm này chốt rằng lệnh xóa là MỘT MỤC trong hàng, nằm đúng chỗ.
func TestDongVanRanhGioiLuotDungThuTu(t *testing.T) {
	d := &dongVan{}
	d.them("một ")
	d.them("hai")
	d.them(host.StreamClearSentinel)
	d.them("ba")

	manh, _ := d.sau(0)
	if len(manh) != 4 {
		t.Fatalf("hàng có %d mục, muốn 4: %+v", len(manh), manh)
	}
	muon := []struct {
		chu string
		xoa bool
	}{{"một ", false}, {"hai", false}, {"", true}, {"ba", false}}
	for i, m := range muon {
		if manh[i].Chu != m.chu || manh[i].Xoa != m.xoa {
			t.Errorf("mục %d = %+v, muốn chu=%q xoa=%v", i, manh[i], m.chu, m.xoa)
		}
		if i > 0 && manh[i].Seq <= manh[i-1].Seq {
			t.Errorf("mục %d có Seq %d không lớn hơn mục trước (%d) — hàng mất thứ tự",
				i, manh[i].Seq, manh[i-1].Seq)
		}
	}

	// Lượt hiện tại chỉ được chứa chữ SAU lệnh xóa. Nếu nó còn "mộthai" thì người vào
	// muộn sẽ nhận cả văn của lượt trước, dán liền vào lượt này.
	if vong, _ := d.vongHienTai(); vong != "ba" {
		t.Errorf("vòng hiện tại = %q, muốn %q", vong, "ba")
	}
	// Sentinel KHÔNG được lọt vào văn dưới dạng chuỗi thô.
	if strings.Contains(func() string { v, _ := d.vongHienTai(); return v }(), "CLEAR") {
		t.Error("sentinel lọt vào văn — người dùng sẽ thấy ký tự điều khiển trên trang")
	}
}
