package llmretry

import (
	"fmt"
	"testing"
	"time"
)

func TestMocTuChu(t *testing.T) {
	ca := []struct {
		ten  string
		msg  string
		muon time.Duration
	}{
		// Ca đã ĐO ĐƯỢC trên máy thật — lý do cả cụm này tồn tại.
		{"quota codex", "[codex/gpt-5.5] [429]: The usage limit has been reached (reset after 26m 54s)", 26*time.Minute + 54*time.Second},

		{"try again in", "Rate limited, please try again in 30s", 30 * time.Second},
		{"retry after phút", "429: retry after 5 minutes", 5 * time.Minute},
		{"nhiều mảnh", "quota exceeded, available again in 1h 2m 3s", time.Hour + 2*time.Minute + 3*time.Second},
		{"chữ đệm dài", "Too many requests. Please try again in about 45 seconds.", 45 * time.Second},
		{"số thập phân", "retry after 1.5s", 1500 * time.Millisecond},
		{"mili giây không bị nuốt bởi phút", "retry in 500ms", 500 * time.Millisecond},
		{"chữ hoa", "RESET AFTER 2M", 2 * time.Minute},

		// Những ca dưới đây là HÀNG RÀO, không phải ca phụ: đọc nhầm ở đây làm engine tạm dừng
		// vì một câu lỗi vô hại — đúng ngược mục đích của cả gói.
		{"không có từ khóa", "model gpt-5.5 returned 8192 tokens", 0},
		{"số ở xa từ khóa", "reset happened because the upstream provider replaced 42 shards", 0},
		{"câu rỗng", "", 0},
		{"chỉ có từ khóa", "please retry", 0},

		// "after" nói về thời gian ĐÃ TRÔI QUA, không phải thời gian phải chờ. Bản đầu có
		// `after` trong `tuKhoaCho` và ba câu này đều bị đọc thành lệnh tạm dừng.
		{"đã trôi qua, không phải phải chờ", "request failed after 10m of retries", 0},
		{"đóng kết nối sau 3 phút", "connection closed after 3 minutes", 0},
		{"không có đầu ra sau 45s", "model produced no output after 45s", 0},
		// `for` cũng không phải từ khóa chờ — đây là câu thật của `stream_watchdog.go`.
		{"stream idle của litellm", "stream idle timeout: no event received for 5m", 0},
	}

	for _, c := range ca {
		t.Run(c.ten, func(t *testing.T) {
			if got := mocTuChu(c.msg); got != c.muon {
				t.Fatalf("mocTuChu(%q) = %s, muốn %s", c.msg, got, c.muon)
			}
		})
	}
}

// Nguồn CÓ CẤU TRÚC phải thắng câu chữ, kể cả khi câu chữ nói một con số lớn hơn: header là
// hợp đồng, câu chữ là suy đoán.
func TestMocChoLai_HeaderThangCauChu(t *testing.T) {
	err := loiGia{msg: "429 reset after 30m", mocCoCau: 7 * time.Second}
	if got := MocChoLai(err); got != 7*time.Second {
		t.Fatalf("MocChoLai = %s, muốn 7s (hint có cấu trúc)", got)
	}
}

// Không có header thì rơi xuống câu chữ — đúng ca của HTTP 429 đi qua `litellm.NewHTTPError`,
// nơi trường `RetryAfter` không bao giờ được điền.
func TestMocChoLai_RoiVeCauChu(t *testing.T) {
	err := loiGia{msg: "usage limit reached (reset after 26m 54s)"}
	if got := MocChoLai(err); got != 26*time.Minute+54*time.Second {
		t.Fatalf("MocChoLai = %s, muốn 26m54s", got)
	}
}

func TestMocChoLai_NilVaLoiTron(t *testing.T) {
	if got := MocChoLai(nil); got != 0 {
		t.Fatalf("MocChoLai(nil) = %s, muốn 0", got)
	}
	if got := MocChoLai(loiTron{"hỏng gì đó"}); got != 0 {
		t.Fatalf("MocChoLai(lỗi trơn) = %s, muốn 0", got)
	}
}

func TestGonGang(t *testing.T) {
	ca := []struct {
		d    time.Duration
		muon string
	}{
		{0, "không rõ bao lâu"},
		{900 * time.Millisecond, "1 giây"},
		{30 * time.Second, "30 giây"},
		// Làm tròn LÊN: nói ngắn hơn thực tế là mời người dùng quay lại lúc cửa còn đóng.
		{26*time.Minute + 54*time.Second, "27 phút"},
		{90 * time.Minute, "1.5 giờ"},
	}
	for _, c := range ca {
		t.Run(fmt.Sprint(c.d), func(t *testing.T) {
			if got := gonGang(c.d); got != c.muon {
				t.Fatalf("gonGang(%s) = %q, muốn %q", c.d, got, c.muon)
			}
		})
	}
}
