package utils

import (
	"strings"
	"testing"
	"unicode/utf8"

	"golang.org/x/text/encoding/simplifiedchinese"
)

const zhSample = "第三章 风起青云\n\n他不是愤怒，而是恐惧。沉默了几息，她眼中闪过慌乱，心头一紧。" +
	"夜色沉沉，远处传来钟声。少年握紧手中长剑，一步步走向山门深处。"

// viLegacyBytes là một file tiếng Việt bảng mã 8-bit (kiểu Windows-1258/TCVN3):
// chữ ASCII giữ nguyên, nguyên âm có dấu là byte đơn 0xC0-0xFF.
func viLegacyBytes() []byte {
	return []byte("Ch\xf0\xf4ng 3: Gi\xf3 n\xf5i Thanh V\xe2n\r\n\r\n" +
		"H\xe1n kh\xf4ng ph\xe3i t\xf9c gi\xe2n, m\xe0 l\xe0 s\xf5 h\xe3i. " +
		"Trong nh\xe1y m\xe1t, c\xe3 gian ph\xf2ng t\xf4i s\xe2m. " +
		"\xd0\xeam \xe2y h\xe1n ng\xf2i r\xe2t l\xe2u b\xean b\xe2c c\xf5a. ")
}

// zeroFFFDGarbage là ca nguy hiểm nhất: byte 8-bit mà GB18030 giải mã "thành
// công" KHÔNG sinh một U+FFFD nào. Hàng rào U+FFFD của host/imp/source.go mù hoàn
// toàn với ca này (tìm được bằng cách dò không gian byte, hanRatio = 0,023).
const zeroFFFDGarbage = "pcyk hyr byr blcf ctx xdbf yvbf\xd3n lmcyh kbp gmmnd gbrgy"

func TestHanRatioSeparatesChineseFromGarbage(t *testing.T) {
	gbk, err := simplifiedchinese.GB18030.NewEncoder().Bytes([]byte(zhSample))
	if err != nil {
		t.Fatalf("encode GB18030: %v", err)
	}
	decoded, err := simplifiedchinese.GB18030.NewDecoder().Bytes(gbk)
	if err != nil {
		t.Fatalf("decode GB18030: %v", err)
	}
	if r := HanRatio(string(decoded)); r < 0.9 {
		t.Errorf("truyện Trung thật: HanRatio = %.3f, muốn ≥0.9", r)
	}

	garbage, err := simplifiedchinese.GB18030.NewDecoder().Bytes(viLegacyBytes())
	if err != nil {
		t.Fatalf("decode GB18030: %v", err)
	}
	if r := HanRatio(string(garbage)); r > 0.5 {
		t.Errorf("rác từ file Việt: HanRatio = %.3f, muốn ≤0.5", r)
	}
}

// TestDecodeTextKeepsRealGBKChinese giữ đúng công dụng gốc: truyện Trung bảng mã
// GBK vẫn phải đọc ra tiếng Trung. Bỏ mất đường này là chặn luôn người dùng nhập
// truyện Trung, thứ mà repo vẫn hỗ trợ.
func TestDecodeTextKeepsRealGBKChinese(t *testing.T) {
	gbk, err := simplifiedchinese.GB18030.NewEncoder().Bytes([]byte(zhSample))
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	if got := DecodeText(gbk); got != zhSample {
		t.Errorf("DecodeText(GBK) không khôi phục đúng bản gốc:\ncó   %q\nmuốn %q", got, zhSample)
	}
}

// TestDecodeTextRefusesToFabricateHan là test hồi quy cho chính con bug: GB18030
// giải mã "thành công" trên hầu hết mọi byte, nên file tiếng Việt sai bảng mã
// được biến thành chữ Hán vô nghĩa rồi đi vào pipeline như dữ liệu thật.
func TestDecodeTextRefusesToFabricateHan(t *testing.T) {
	got := DecodeText(viLegacyBytes())

	if HanRatio(got) > 0.1 {
		t.Errorf("vẫn bịa ra chữ Hán (HanRatio=%.3f): %q", HanRatio(got), got)
	}
	if !strings.ContainsRune(got, utf8.RuneError) {
		t.Error("hỏng mà không để lại dấu vết: kết quả phải chứa U+FFFD để hàng rào " +
			"phía sau và chính người dùng nhìn ra là file sai bảng mã")
	}
	if !utf8.ValidString(got) {
		t.Error("kết quả phải là UTF-8 hợp lệ")
	}
	// Phần ASCII đọc được phải còn nguyên — đó là thứ giúp người dùng nhận ra file của mình.
	if !strings.Contains(got, "Thanh V") {
		t.Errorf("phần ASCII bị mất, người dùng không nhận ra file: %q", got)
	}
}

func TestDecodeTextPlainUTF8AndBOM(t *testing.T) {
	const s = "Chương 3: Gió nổi\nHắn không đáp."
	if got := DecodeText([]byte(s)); got != s {
		t.Errorf("UTF-8 thuần: có %q, muốn %q", got, s)
	}
	if got := DecodeText([]byte("\uFEFF" + s)); got != s {
		t.Errorf("UTF-8 BOM: có %q, muốn %q (phải bóc BOM)", got, s)
	}
}

func TestLooksLikeChineseShortInputIsNotJudged(t *testing.T) {
	// Quá ít chữ thì tỉ lệ không có ý nghĩa thống kê; không được kết luận bừa.
	if LooksLikeChinese("ab") {
		t.Error("chuỗi 2 chữ Latin không được coi là tiếng Trung")
	}
	if !LooksLikeChinese("第三章") {
		t.Error("chuỗi ngắn toàn chữ Hán vẫn phải được coi là tiếng Trung")
	}
}
