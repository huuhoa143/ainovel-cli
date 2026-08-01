package utils

import (
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/text/encoding/simplifiedchinese"
)

// minHanRatio là tỉ lệ chữ Hán tối thiểu để tin rằng một chuỗi giải mã GB18030
// thật sự là tiếng Trung.
//
// Đo thực tế trên chính bộ test kèm file này:
//   - truyện tiếng Trung mã GBK/GB18030 thật: tỉ lệ 1,000
//   - file tiếng Việt mã 8-bit đọc sai: 0,303
//   - file UTF-8 tiếng Việt bị cắt giữa rune: 0,363
//   - byte nhị phân: 0,000
//
// 0,5 nằm giữa 0,363 và 1,000 với khoảng an toàn rộng về cả hai phía. Văn bản
// tiếng Trung lẫn nhiều chữ Latin lý thuyết có thể tụt dưới mốc này, nhưng loại
// file đó trong thực tế là UTF-8; còn file GBK thì bản chất đã là văn tiếng Trung.
const minHanRatio = 0.5

// minLettersToJudge là số chữ tối thiểu để tỉ lệ có ý nghĩa. Dưới mức này thì
// một hai chữ lệch đã đảo ngược kết luận, nên chuyển sang chấp nhận: file quá
// ngắn không đủ dữ kiện để buộc tội, và cái giá của nhận sai một file 5 chữ là
// gần bằng không.
const minLettersToJudge = 8

// HanRatio trả tỉ lệ chữ Hán trên tổng số chữ (dấu câu, chữ số, khoảng trắng
// không tính). Trả 0 khi không có chữ nào.
func HanRatio(s string) float64 {
	han, letters := 0, 0
	for _, r := range s {
		switch {
		case unicode.Is(unicode.Han, r):
			han++
			letters++
		case unicode.IsLetter(r):
			letters++
		}
	}
	if letters == 0 {
		return 0
	}
	return float64(han) / float64(letters)
}

// LooksLikeChinese cho biết chuỗi có thật sự là văn tiếng Trung hay không.
//
// Đây là hàng rào thay cho việc tin vào "GB18030 giải mã có lỗi hay không": bộ
// giải mã GB18030 gần như LUÔN thành công trên byte bất kỳ (bảng mã có nhánh 4
// byte phủ hết không gian), nên "không lỗi" không nói gì về việc dữ liệu có đúng
// hay không. Kiểm U+FFFD cũng không đủ: đã dựng được ca byte 8-bit giải mã ra 0
// U+FFFD, UTF-8 hợp lệ, mà nội dung hoàn toàn là rác (xem test kèm theo).
func LooksLikeChinese(s string) bool {
	han, letters := 0, 0
	for _, r := range s {
		switch {
		case unicode.Is(unicode.Han, r):
			han++
			letters++
		case unicode.IsLetter(r):
			letters++
		}
	}
	if letters < minLettersToJudge {
		return han > 0 || letters == 0
	}
	return float64(han)/float64(letters) >= minHanRatio
}

// DecodeText giải mã byte của file văn bản do người dùng cung cấp sang UTF-8.
//
// Thứ tự: UTF-8 hợp lệ thì dùng luôn; không thì THỬ GB18030 (GBK là siêu tập) —
// truyện Trung trên mạng phần lớn mã GBK, đọc thẳng như UTF-8 sẽ ra toàn rác.
// Nhưng chỉ NHẬN kết quả GB18030 khi nó thật sự trông như tiếng Trung.
//
// Vì sao cần điều kiện đó: GB18030 giải mã "thành công" trên hầu hết mọi dãy
// byte, chỉ là ra rác. Một file tiếng Việt sai bảng mã (Windows-1258, TCVN3, hay
// UTF-8 bị cắt giữa rune) vì thế được "giải mã thành công" thành chữ Hán vô
// nghĩa rồi đi tiếp vào pipeline như dữ liệu thật — không lỗi, không cảnh báo,
// chỉ là mô hình được cho ăn rác và mọi thứ phía sau đều sai một cách khó truy.
//
// Khi không tin được, hàm trả về chính byte gốc với các đoạn không hợp lệ thay
// bằng U+FFFD: hỏng thì phải NHÌN THẤY LÀ HỎNG. Phần ASCII còn nguyên nên người
// dùng vẫn nhận ra file của mình, và hàng rào "không khớp gì cả" ở chỗ gọi vẫn
// kích hoạt như trước. Chỗ nào trả lỗi được thì nên dùng [LooksLikeChinese] để
// báo lỗi tường minh thay vì nhận chuỗi có U+FFFD.
//
// Cuối cùng bóc BOM UTF-8 (nếu còn) vì nó làm lệch mọi phép khớp đầu dòng.
func DecodeText(data []byte) string {
	if utf8.Valid(data) {
		return strings.TrimPrefix(string(data), "\uFEFF")
	}
	if decoded, err := simplifiedchinese.GB18030.NewDecoder().Bytes(data); err == nil {
		if text := string(decoded); LooksLikeChinese(text) {
			return strings.TrimPrefix(text, "\uFEFF")
		}
	}
	return strings.TrimPrefix(strings.ToValidUTF8(string(data), "\uFFFD"), "\uFEFF")
}
