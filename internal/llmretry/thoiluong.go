package llmretry

import (
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/voocel/agentcore"
)

// MocChoLai đọc "bao lâu nữa mới gọi lại được" từ một lỗi của provider.
//
// # Vì sao cần, và vì sao KHÔNG chỉ dựa vào một nguồn
//
// Đây là con số quyết định phán quyết ở `Xet`: chờ vài giây thì thử lại, chờ nửa tiếng thì
// bỏ cuộc và giao lại cho người. Nhưng provider nói con số đó ở ba chỗ khác nhau tùy loại,
// nên đọc một chỗ là bỏ sót hai chỗ kia:
//
//  1. `agentcore.RetryHinter` — nguồn CÓ CẤU TRÚC, đến từ header `Retry-After`.
//     `agentcore/llm.providerError` đã implement sẵn (`litellm.GetRetryAfter`), nên nhánh này
//     chạy được ngay mà không phải sửa gì trong `third_party`.
//
//  2. Câu lỗi — nguồn DUY NHẤT ở ca đã đo được. HTTP 429 đi qua `litellm.NewHTTPError`, mà
//     hàm đó KHÔNG điền trường `RetryAfter` (chỉ `NewRateLimitError` mới điền), nên hint ở
//     (1) bằng 0. Con số thật nằm trong thân phản hồi: "The usage limit has been reached
//     (reset after 26m 54s)".
//
//  3. Không có gì — trả 0, và người gọi rơi về luật đếm số lần.
//
// Thứ tự là thứ tự ĐỘ TIN CẬY, không phải thứ tự tiện tay: header là hợp đồng, câu chữ là
// suy đoán. Nên (1) thắng (2) kể cả khi (2) đọc ra một con số lớn hơn.
func MocChoLai(err error) time.Duration {
	var hinter agentcore.RetryHinter
	if errors.As(err, &hinter) {
		if d := hinter.RetryAfter(); d > 0 {
			return d
		}
	}
	if err == nil {
		return 0
	}
	return mocTuChu(err.Error())
}

// tuKhoaCho là những chữ đứng TRƯỚC một mốc thời gian và làm nó có nghĩa "chờ chừng này".
//
// Danh sách này là hàng rào chống đọc nhầm, và nó cần thiết: một câu lỗi chứa đủ loại con số
// (`gpt-5.5`, `HTTP 429`, `8192 tokens`). Không có tiền tố ràng buộc thì "5.5" trong tên model
// đọc ra thành "5,5 giây" và cả phán quyết đi theo một con số bịa.
//
// # `after` KHÔNG có trong danh sách, và đó là một lần thử-rồi-bỏ
//
// Bản đầu có nó. Nhưng "after" trong câu lỗi hầu như luôn nói về thời gian ĐÃ TRÔI QUA, không
// phải thời gian PHẢI CHỜ, nên nó biến ba câu vô hại thành lệnh tạm dừng engine:
//
//	"request failed after 10m of retries"   → 10 phút → bỏ cuộc ngay
//	"connection closed after 3 minutes"     → 3 phút  → bỏ cuộc ngay
//	"model produced no output after 45s"    → 45 giây → chờ nhầm 45s thay vì lùi 1s
//
// Tức đúng ngược mục đích của cả gói: một lỗi mạng thoáng qua làm dây chuyền dừng hẳn.
//
// Và nó KHÔNG mất gì: ca thật là "(reset after 26m 54s)", mà `reset` đã tự khớp rồi — phần
// " after " nằm gọn trong 24 ký tự đệm của `reMocCho`. Đã đo cả hai chiều, xem
// `TestMocTuChu`: bốn câu chờ thật vẫn đọc đúng, bốn câu vô hại về 0.
var tuKhoaCho = `(?:reset(?:s|ting)?|retry|try\s+again|available\s+again|wait|resume[sd]?|back\s+in)`

// donViAlt là nhánh đơn vị, xếp DÀI TRƯỚC NGẮN — và thứ tự đó là đúng-sai, không phải gu.
//
// Go dùng alternation kiểu Perl (leftmost-first), không phải leftmost-longest. Với thứ tự
// `…|m|…|ms|…` thì "500ms" khớp `m` trước, rồi `s?` nuốt nốt chữ "s" — ra 500 PHÚT thay vì
// 500 mili-giây, sai 60.000 lần. Bài kiểm `mili giây không bị nuốt bởi phút` bắt đúng ca này.
const donViAlt = `millisecond|minute|second|hour|hr|min|sec|ms|h|m|s`

// reMocCho khớp "<từ khóa> … <thời lượng>", với nhiều nhất 24 ký tự đệm ở giữa.
//
// Đệm có trần để "reset" ở đầu câu không bắt lấy một con số ở cuối câu — hai mệnh đề rời nhau
// thì con số đó không nói về việc chờ. 24 ký tự đủ cho những chỗ nối thật đã gặp
// ("reset after ", "try again in about ", "retry in approximately ").
var reMocCho = regexp.MustCompile(
	`(?i)` + tuKhoaCho + `[^0-9]{0,24}(\d[\d\s.]*(?:` + donViAlt + `)s?` +
		`(?:[\s,]+\d[\d\s.]*(?:` + donViAlt + `)s?)*)`)

// reManh tách một cụm thành từng mảnh "<số><đơn vị>" — "26m 54s" thành hai mảnh.
var reManh = regexp.MustCompile(`(?i)(\d+(?:\.\d+)?)\s*(` + donViAlt + `)s?`)

// mocTuChu rút mốc chờ ra khỏi một câu lỗi tự do.
//
// Trả 0 khi không chắc — đó là mặc định AN TOÀN chứ không phải bỏ cuộc: 0 nghĩa là "không
// biết", và `Xet` khi đó dùng luật đếm số lần thay vì luật mốc xa. Đoán bừa một con số lớn sẽ
// làm engine tạm dừng vì một câu lỗi vô hại.
func mocTuChu(msg string) time.Duration {
	m := reMocCho.FindStringSubmatch(msg)
	if m == nil {
		return 0
	}
	var tong time.Duration
	for _, manh := range reManh.FindAllStringSubmatch(m[1], -1) {
		so, err := strconv.ParseFloat(strings.TrimSpace(manh[1]), 64)
		if err != nil || so < 0 {
			continue
		}
		tong += time.Duration(so * float64(donVi(manh[2])))
	}
	return tong
}

// donVi đổi hậu tố đơn vị (đã bỏ "s" số nhiều) thành một khoảng thời gian.
//
// `m` là PHÚT, không phải mili-giây: trong câu lỗi của provider, "26m" luôn là phút. Mili-giây
// khi được nói tới thì viết đủ "ms" — và nhánh đó nằm TRƯỚC trong `switch` để "ms" không bị
// nhánh "m" nuốt mất.
func donVi(u string) time.Duration {
	switch strings.ToLower(u) {
	case "ms", "millisecond":
		return time.Millisecond
	case "h", "hr", "hour":
		return time.Hour
	case "m", "min", "minute":
		return time.Minute
	default:
		return time.Second
	}
}
