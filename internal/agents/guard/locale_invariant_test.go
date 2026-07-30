package guard

import (
	"fmt"
	"strings"
	"testing"

	"github.com/voocel/ainovel-cli/internal/i18n"
)

// NewEditorStopGuard phân loại nhiệm vụ của editor bằng cách dò chuỗi trong text
// nhiệm vụ do flow.Route sinh ra. Route sinh text đó qua i18n, nên mỗi bản dịch
// đều có thể làm lệch phân loại — và hậu quả không hề nhẹ: rơi về nhánh default
// (lỏng) thì editor chỉ cần save_review là được kết thúc, tóm tắt cung không bao
// giờ ghi đĩa, gây đúng cái livelock mà comment của NewEditorStopGuard cảnh báo.
//
// Hiện tại việc phân loại chỉ còn đúng nhờ bản dịch tình cờ giữ lại tên tool
// trong ngoặc. Đó là quy ước, không phải bất biến. Test này biến nó thành bất
// biến: nếu ai đó dịch lại và bỏ "save_arc_summary" đi cho câu gọn hơn, build đỏ
// ngay thay vì để livelock xuất hiện trên máy người dùng.
//
// Các msgid dưới đây phải khớp nguyên văn với internal/flow/router.go.
const (
	msgArcSummaryTask    = "生成第 %d 卷第 %d 弧摘要（save_arc_summary）"
	msgVolumeSummaryTask = "生成第 %d 卷卷摘要（save_volume_summary）"
	msgExpandArcTask     = "展开第 %d 卷第 %d 弧（save_foundation type=expand_arc）"
	msgArcReviewTask     = "对第 %d 卷第 %d 弧做弧级评审（scope=arc）"
)

func TestTextNhiemVuEditorLuonChuaTenToolOMoiNgonNgu(t *testing.T) {
	t.Cleanup(func() { _ = i18n.SetLocale(i18n.DefaultLocale) })

	cases := []struct {
		msgid string
		args  []any
		tool  string
	}{
		{msgArcSummaryTask, []any{3, 2}, "save_arc_summary"},
		{msgVolumeSummaryTask, []any{3}, "save_volume_summary"},
	}

	for _, loc := range []i18n.Locale{i18n.Vietnamese, i18n.Chinese} {
		if err := i18n.SetLocale(loc); err != nil {
			t.Fatalf("SetLocale(%s): %v", loc, err)
		}
		for _, c := range cases {
			task := fmt.Sprintf(i18n.F(c.msgid), c.args...)

			if !strings.Contains(task, c.tool) {
				t.Errorf("[%s] text nhiệm vụ mất tên tool %q — NewEditorStopGuard sẽ rơi về nhánh lỏng và tóm tắt không bao giờ ghi đĩa\n  text: %s",
					loc, c.tool, task)
			}
			// fmt để lại dấu vết rõ ràng khi số tham số lệch; chặn luôn ở đây để
			// lỗi hiện ra ở test thay vì giữa giao diện người dùng.
			if strings.Contains(task, "%!") {
				t.Errorf("[%s] format lỗi trong text nhiệm vụ: %s", loc, task)
			}
		}
	}
}

// Mọi msgid dạng "第 %d 卷第 %d 弧" phải giữ đúng trật tự (tập trước, cung sau) vì
// router truyền (Volume, Arc). Cả hai tham số đều là %d nên bộ đối chiếu verb
// trong internal/i18n KHÔNG thể phát hiện việc đảo — phải chốt bằng giá trị cụ
// thể như dưới đây.
//
// Đây là lớp lỗi CÓ HỆ THỐNG trong bản dịch nhận từ fork ngoài, không phải tai
// nạn lẻ: trong 18 chuỗi chứa cả 卷 và 弧, có 3 chuỗi lệch trật tự và 2 trong số
// đó mang %d (tức đảo cả dữ liệu). Cả hai đều đã phải sửa tay. Test này quét mọi
// chuỗi cùng dạng để chuỗi thứ ba không lọt.
func TestKhongDaoTapVaCungTrongTextNhiemVu(t *testing.T) {
	t.Cleanup(func() { _ = i18n.SetLocale(i18n.DefaultLocale) })
	if err := i18n.SetLocale(i18n.Vietnamese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}

	// Hai số khác nhau và không phải chữ số của nhau, để không thể khớp nhầm.
	const volume, arc = 7, 2

	for _, msgid := range []string{msgArcSummaryTask, msgExpandArcTask, msgArcReviewTask} {
		t.Run(msgid, func(t *testing.T) {
			translated := i18n.F(msgid)
			if translated == msgid {
				t.Skipf("chưa có bản dịch, đang rơi về tiếng Trung — không có gì để kiểm")
			}
			task := fmt.Sprintf(translated, volume, arc)

			if strings.Contains(task, "%!") {
				t.Fatalf("bản dịch lệch số tham số: %s", task)
			}

			iTap := strings.Index(task, fmt.Sprintf("tập %d", volume))
			iCung := strings.Index(task, fmt.Sprintf("cung %d", arc))
			if iTap < 0 || iCung < 0 {
				t.Fatalf("bản dịch phải gán %d cho TẬP và %d cho CUNG.\n  msgid: %s\n  dịch : %s",
					volume, arc, msgid, task)
			}
			if iTap > iCung {
				t.Errorf("trật tự bị đảo — router truyền (Volume, Arc) nên 'tập' phải đứng trước 'cung'.\n  msgid: %s\n  dịch : %s",
					msgid, task)
			}
		})
	}
}
