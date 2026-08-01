package serve

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestDiemKhongVanXuongJSON chốt: điểm 0 phải xuống được tới client.
//
// 0/100 là điểm Editor THẬT SỰ chấm — điểm tệ nhất có thể — nên nó là thông tin
// người vận hành cần nhất, không phải thông tin bỏ được.
//
// Lỗi cũ: `Score int` cộng `omitempty` gộp "chấm 0" với "không chấm", vì 0 là
// zero-value nên omitempty bỏ luôn khóa. Đo được trên bản mẫu: chiều chấm 0 ra
// JSON không có khóa "score", các chiều cùng bản duyệt vẫn có "score": 88.
//
// Đáng có bài kiểm riêng vì phía web ĐÃ phòng đúng ca này (`d.score != null`) mà
// phòng vô ích — tầng dưới đã làm rụng dữ liệu trước khi tới nó. Một lớp phòng
// đúng chỗ không cứu được khi tầng dưới mất thông tin, nên chỗ canh phải ở đây.
func TestDiemKhongVanXuongJSON(t *testing.T) {
	raw, err := json.Marshal(Dimension{Name: "foreshadow", Score: 0, Verdict: "rewrite"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), `"score":0`) {
		t.Errorf("điểm 0 bị rụng khỏi JSON: %s\nomitempty trên int gộp \"chấm 0\" với \"không chấm\"", raw)
	}

	// Kiểm cả chiều còn lại để bài kiểm không xanh nhờ một bản "sửa" ghi cứng số 0.
	raw88, err := json.Marshal(Dimension{Name: "pacing", Score: 88})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw88), `"score":88`) {
		t.Errorf("điểm khác 0 cũng sai: %s", raw88)
	}
}
