package i18n

import (
	"sort"
	"strings"
	"testing"
)

func TestJoinListTheoNgonNgu(t *testing.T) {
	truoc := Active()
	t.Cleanup(func() { _ = SetLocale(truoc) })

	items := []string{"characters", "world_rules"}

	if err := SetLocale(Vietnamese); err != nil {
		t.Fatal(err)
	}
	if got, want := JoinList(items), "characters, world_rules"; got != want {
		t.Errorf("vi: JoinList = %q, muốn %q", got, want)
	}

	// Đường zh phải giữ đúng dấu của upstream: đổi nó là đổi ngầm mọi chuỗi
	// người dùng tiếng Trung đang thấy.
	if err := SetLocale(Chinese); err != nil {
		t.Fatal(err)
	}
	if got, want := JoinList(items), "characters、world_rules"; got != want {
		t.Errorf("zh: JoinList = %q, muốn %q", got, want)
	}

	if got := JoinList(nil); got != "" {
		t.Errorf("danh sách rỗng phải cho chuỗi rỗng, được %q", got)
	}
}

func TestJoinRecordsTheoNgonNgu(t *testing.T) {
	truoc := Active()
	t.Cleanup(func() { _ = SetLocale(truoc) })

	// Bản ghi CÓ dấu phẩy bên trong — đây là lý do JoinRecords tồn tại tách khỏi
	// JoinList. Nếu nối bằng dấu phẩy thì biên bản ghi biến mất mà không báo lỗi.
	items := []string{
		"Lâm Vũ.status=đã rời kinh thành, chưa rõ đi đâu",
		"Trần Nhi.location=bến sông",
	}

	if err := SetLocale(Vietnamese); err != nil {
		t.Fatal(err)
	}
	got := JoinRecords(items)
	want := "Lâm Vũ.status=đã rời kinh thành, chưa rõ đi đâu; Trần Nhi.location=bến sông"
	if got != want {
		t.Errorf("vi: JoinRecords = %q, muốn %q", got, want)
	}
	// Bất biến thật sự cần giữ: dấu ngắt bản ghi phải KHÁC dấu bên trong bản ghi,
	// nếu không thì không tách lại được.
	if strings.Contains(recordSeparator(), listSeparator()) {
		t.Errorf("dấu ngắt bản ghi %q chứa dấu liệt kê %q — biên bản ghi không còn phân biệt được",
			recordSeparator(), listSeparator())
	}

	if err := SetLocale(Chinese); err != nil {
		t.Fatal(err)
	}
	if got, want := JoinRecords(items), items[0]+"；"+items[1]; got != want {
		t.Errorf("zh phải trùng khít upstream: JoinRecords = %q, muốn %q", got, want)
	}

	if got := JoinRecords(nil); got != "" {
		t.Errorf("danh sách rỗng phải cho chuỗi rỗng, được %q", got)
	}
}

// TestMsgidKhongLaManhVo canh lớp lỗi "hợp đồng hai đầu bị xé".
//
// Lớp này đã xuất hiện BA lần trong dự án, mỗi lần một chỗ khác, nên nó cần một
// bộ canh chứ không phải ba lần sửa:
//
//   - internal/host/events.go — bên sinh và bên phân tích mỗi bên viết cứng một
//     dấu ngoặc, rồi lệch nhau.
//   - internal/host/advance_gate.go — `i18n.F("（诉求：") + x + "）"`
//   - internal/tools/ask_user.go — `i18n.F("（补充：") + note + "）"`
//
// Hình dạng lỗi luôn giống nhau: msgid chỉ chứa MỘT đầu của cặp ngoặc, đầu kia bị
// viết cứng ngoài catalog. Hậu quả ở locale vi là một cặp ngoặc hai kiểu —
// `(bổ sung: ghi chú）` — vì đầu đi qua bản dịch thành ASCII còn đầu viết cứng vẫn
// toàn phần. Phép đo độ phủ dịch không thấy được: cả hai đầu đều "đã dịch", chỉ có
// điều một đầu không phải msgid.
//
// # Vì sao luật KHÔNG phải "mọi msgid đều cân ngoặc"
//
// Bản đầu của bài kiểm này dùng luật đó và nó báo bừa vào code ĐÚNG. Có câu được
// xé thành hai msgid mà CẢ HAI đều nằm trong catalog:
//
//	"发现未完成的导入（"          → "Phát hiện lần nhập truyện chưa xong ("
//	"），输入 /import 从断点恢复"  → "), nhập /import để tiếp từ điểm dừng"
//
// Ở đây hai nửa cùng đi qua bản dịch nên cặp ngoặc không bao giờ lệch kiểu, và
// khoảng trắng cũng nằm đúng chỗ trong bản dịch. Xé câu như vậy có cái giá riêng
// (người dịch không đảo được trật tự), nhưng nó KHÔNG phải lỗi mà bài kiểm này
// canh — và một bộ canh báo bừa là một bộ canh sẽ bị tắt.
//
// Nên luật đúng là: msgid lệch ngoặc thì nửa còn lại PHẢI cũng là một msgid. Nửa
// nào không có bạn thì hoặc đầu kia đang bị viết cứng, hoặc chính nó đã chết.
func TestMsgidKhongLaManhVo(t *testing.T) {
	truoc := Active()
	t.Cleanup(func() { _ = SetLocale(truoc) })
	if err := SetLocale(Vietnamese); err != nil {
		t.Fatal(err)
	}
	p := current.Load()
	if p == nil || len(*p) == 0 {
		t.Fatal("catalog rỗng — bài kiểm này không kiểm được gì")
	}

	// Không xét dấu `：` đứng cuối: đó là nhãn hoàn chỉnh (`已知人物：` rồi nối danh
	// sách vào sau), không phải nửa cặp ngoặc.
	cap_ := []struct{ mo, dong string }{
		{"（", "）"}, {"【", "】"}, {"「", "」"}, {"『", "』"}, {"《", "》"}, {"(", ")"},
	}

	// Lượt một: đếm lệch của từng msgid theo từng cặp dấu.
	type lech struct {
		mo, dong int
	}
	thieu := map[int]map[string]lech{} // chỉ số cặp dấu → msgid → độ lệch
	for i := range cap_ {
		thieu[i] = map[string]lech{}
	}
	for msgid := range *p {
		for i, c := range cap_ {
			mo, dong := strings.Count(msgid, c.mo), strings.Count(msgid, c.dong)
			if mo != dong {
				thieu[i][msgid] = lech{mo, dong}
			}
		}
	}

	// Lượt hai: nửa thiếu-đóng phải có một nửa thiếu-mở làm bạn, và ngược lại.
	for i, c := range cap_ {
		var thieuDong, thieuMo []string
		for msgid, l := range thieu[i] {
			if l.mo > l.dong {
				thieuDong = append(thieuDong, msgid)
			} else {
				thieuMo = append(thieuMo, msgid)
			}
		}
		sort.Strings(thieuDong)
		sort.Strings(thieuMo)
		if len(thieuDong) != len(thieuMo) {
			t.Errorf("cặp %s%s: %d msgid thiếu dấu đóng nhưng %d msgid thiếu dấu mở — "+
				"nửa không có bạn thì đầu kia đang bị viết cứng ngoài catalog, hoặc chính msgid đó đã chết\n"+
				"  thiếu đóng: %q\n  thiếu mở:   %q",
				c.mo, c.dong, len(thieuDong), len(thieuMo), thieuDong, thieuMo)
		}
	}

	// Bản dịch phải lệch ĐÚNG NHƯ msgid: dịch mà làm rơi một dấu ngoặc là cùng một
	// lỗi, chỉ ở phía khác.
	for msgid, dich := range *p {
		for _, c := range cap_ {
			lMsg := strings.Count(msgid, c.mo) - strings.Count(msgid, c.dong)
			lDich := strings.Count(dich, "(") - strings.Count(dich, ")")
			if c.mo != "（" {
				continue // chỉ đối chiếu cặp ngoặc đơn, các cặp khác bản dịch giữ nguyên dấu
			}
			if lMsg != lDich {
				t.Errorf("bản dịch lệch ngoặc khác msgid (msgid %+d, bản dịch %+d):\n  msgid: %q\n  dịch:  %q",
					lMsg, lDich, msgid, dich)
			}
		}
	}
	t.Logf("đã kiểm %d msgid", len(*p))
}
