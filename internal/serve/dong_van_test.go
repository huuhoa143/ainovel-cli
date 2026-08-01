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

// TestDongVanHaiCaiTran canh hai lớp lỗi khác nhau, đừng gộp chúng.
//
//  1. Hàng phát lại phình vô hạn → process giữ cả engine ăn hết RAM sau vài giờ chạy.
//  2. `vong` (văn lượt hiện tại) phình vô hạn nếu engine KHÔNG phát lệnh xóa nào — chuyện
//     xảy ra thật khi có gì đó sai ở tầng dưới.
//
// Hướng cắt của (2) là điều đáng canh nhất: cắt từ ĐẦU, không từ cuối. Phần cuối là phần
// đang chảy, tức phần người dùng đang đọc; cắt cuối là xóa đúng thứ họ đang nhìn.
func TestDongVanHaiCaiTran(t *testing.T) {
	t.Run("hàng bỏ mục cũ nhất", func(t *testing.T) {
		d := &dongVan{}
		for i := 0; i < soManhGiu+50; i++ {
			d.them("x")
		}
		manh, _ := d.sau(0)
		if len(manh) > soManhGiu {
			t.Errorf("hàng giữ %d mục, trần là %d", len(manh), soManhGiu)
		}
		// Mục còn lại phải là mục MỚI: seq nhỏ nhất phải lớn hơn 50.
		if manh[0].Seq <= 50 {
			t.Errorf("mục đầu có Seq %d — hàng đang bỏ mục MỚI thay vì mục cũ", manh[0].Seq)
		}
	})

	t.Run("vòng cắt từ đầu chứ không từ cuối", func(t *testing.T) {
		d := &dongVan{}
		d.them("ĐẦU-PHẢI-MẤT")
		// Đếm số lần gọi thay vì dò `vongLen() <= coVongToiDa`: `them()` tự cắt xuống đúng
		// coVongToiDa/2 NGAY trong cùng lời gọi mỗi khi vượt trần, nên độ dài đọc lại được sau
		// mỗi lời gọi luôn <= coVongToiDa — dò theo điều kiện đó sẽ không bao giờ thoát.
		soLan := coVongToiDa/4096 + 2
		for i := 0; i < soLan; i++ {
			d.them(strings.Repeat("y", 4096))
		}
		d.them("CUỐI-PHẢI-CÒN")

		vong, _ := d.vongHienTai()
		if len(vong) > coVongToiDa {
			t.Errorf("vòng dài %d byte, trần là %d", len(vong), coVongToiDa)
		}
		if !strings.HasSuffix(vong, "CUỐI-PHẢI-CÒN") {
			t.Error("mất phần CUỐI — đó là phần đang chảy, người dùng đang đọc nó")
		}
		if strings.Contains(vong, "ĐẦU-PHẢI-MẤT") {
			t.Error("còn phần ĐẦU sau khi vượt trần — trần không được thi hành")
		}
	})
}
