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
// giờ落盘, gây đúng cái livelock mà comment của NewEditorStopGuard cảnh báo.
//
// Hiện tại việc phân loại chỉ còn đúng nhờ bản dịch tình cờ giữ lại tên tool
// trong ngoặc. Đó là quy ước, không phải bất biến. Test này biến nó thành bất
// biến: nếu ai đó dịch lại và bỏ "save_arc_summary" đi cho câu gọn hơn, build đỏ
// ngay thay vì để livelock xuất hiện trên máy người dùng.
//
// Hai msgid dưới đây phải khớp nguyên văn với internal/flow/router.go.
const (
	msgArcSummaryTask    = "生成第 %d 卷第 %d 弧摘要（save_arc_summary）"
	msgVolumeSummaryTask = "生成第 %d 卷卷摘要（save_volume_summary）"
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
				t.Errorf("[%s] text nhiệm vụ mất tên tool %q — NewEditorStopGuard sẽ rơi về nhánh lỏng và tóm tắt không bao giờ落盘\n  text: %s",
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

// Bản dịch của hai msgid trên phải giữ đúng trật tự (tập trước, cung sau) vì
// router truyền (Volume, Arc). Cả hai đều là %d nên bộ đối chiếu verb trong
// internal/i18n không thể phát hiện việc đảo — phải chốt bằng giá trị cụ thể.
func TestTextTomTatCungKhongDaoTapVaCung(t *testing.T) {
	t.Cleanup(func() { _ = i18n.SetLocale(i18n.DefaultLocale) })
	if err := i18n.SetLocale(i18n.Vietnamese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}
	const volume, arc = 7, 2
	task := fmt.Sprintf(i18n.F(msgArcSummaryTask), volume, arc)

	iTap := strings.Index(task, fmt.Sprintf("tập %d", volume))
	iCung := strings.Index(task, fmt.Sprintf("cung %d", arc))
	if iTap < 0 || iCung < 0 {
		t.Fatalf("bản dịch phải gán %d cho tập và %d cho cung, được: %s", volume, arc, task)
	}
}
