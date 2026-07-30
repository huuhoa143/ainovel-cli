package imp

import (
	"errors"
	"testing"
	"unicode/utf8"

	"golang.org/x/text/encoding/simplifiedchinese"
)

const zhSourceSample = "第三章 风起青云\n\n他不是愤怒，而是恐惧。沉默了几息，她眼中闪过慌乱，心头一紧。" +
	"夜色沉沉，远处传来钟声。少年握紧手中长剑，一步步走向山门深处。"

// viLegacySource là file tiếng Việt bảng mã 8-bit (Windows-1258/TCVN3).
func viLegacySource() []byte {
	return []byte("Ch\xf0\xf4ng 3: Gi\xf3 n\xf5i Thanh V\xe2n\r\n\r\n" +
		"H\xe1n kh\xf4ng ph\xe3i t\xf9c gi\xe2n, m\xe0 l\xe0 s\xf5 h\xe3i. " +
		"Trong nh\xe1y m\xe1t, c\xe3 gian ph\xf2ng t\xf4i s\xe2m. " +
		"\xd0\xeam \xe2y h\xe1n ng\xf2i r\xe2t l\xe2u b\xean b\xe2c c\xf5a. ")
}

// zeroFFFDSource là ca mà hàng rào U+FFFD hiện tại MÙ HOÀN TOÀN: GB18030 giải mã
// không sinh một U+FFFD nào, kết quả là UTF-8 hợp lệ, nhưng nội dung là rác
// (hanRatio = 0,023). Đây là lý do phải đổi tiêu chí từ "có U+FFFD không" sang
// "kết quả có thật sự giống tiếng Trung không".
const zeroFFFDSource = "pcyk hyr byr blcf ctx xdbf yvbf\xd3n lmcyh kbp gmmnd gbrgy"

func TestDecodeSourceAcceptsRealGB18030(t *testing.T) {
	gbk, err := simplifiedchinese.GB18030.NewEncoder().Bytes([]byte(zhSourceSample))
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	dec, err := decodeSource(gbk)
	if err != nil {
		t.Fatalf("truyện Trung GBK thật phải nhập được, lại lỗi: %v", err)
	}
	if dec.encoding != encodingGB18030 {
		t.Errorf("encoding = %q, muốn %q", dec.encoding, encodingGB18030)
	}
	if dec.text != zhSourceSample {
		t.Errorf("nội dung sai:\ncó   %q\nmuốn %q", dec.text, zhSourceSample)
	}
}

// TestDecodeSourceRejectsVietnameseLegacyEncoding chốt hành vi mới: file tiếng
// Việt sai bảng mã phải FAIL RÕ RÀNG, không được "decode thành công" ra chữ Hán
// vô nghĩa rồi đi tiếp vào pipeline phân tích/segment.
func TestDecodeSourceRejectsVietnameseLegacyEncoding(t *testing.T) {
	_, err := decodeSource(viLegacySource())
	if err == nil {
		t.Fatal("file tiếng Việt sai bảng mã phải bị từ chối, không được nhận lặng lẽ")
	}
	if !errors.Is(err, ErrEncodingUnreliable) {
		t.Errorf("lỗi phải bọc ErrEncodingUnreliable để chỗ gọi phân loại được, có %v", err)
	}
}

// TestDecodeSourceRejectsZeroFFFDGarbage là ca chứng minh hàng rào cũ không đủ:
// không có U+FFFD nào nên hàng rào cũ cho qua, còn tiêu chí "có giống tiếng Trung
// không" thì chặn được.
func TestDecodeSourceRejectsZeroFFFDGarbage(t *testing.T) {
	raw := []byte(zeroFFFDSource)

	// Chốt tiền đề của ca test: GB18030 thật sự giải mã "thành công", UTF-8 hợp lệ,
	// và KHÔNG có U+FFFD. Nếu một ngày điều này không còn đúng thì ca test mất ý
	// nghĩa và phải dựng lại, chứ không được lặng lẽ xanh.
	out, decErr := simplifiedchinese.GB18030.NewDecoder().Bytes(raw)
	if decErr != nil {
		t.Fatalf("tiền đề sai: GB18030 phải decode thành công, lại lỗi %v", decErr)
	}
	for _, r := range string(out) {
		if r == utf8.RuneError {
			t.Fatal("tiền đề sai: ca này phải KHÔNG có U+FFFD mới chứng minh được hàng rào cũ mù")
		}
	}

	if _, err := decodeSource(raw); !errors.Is(err, ErrEncodingUnreliable) {
		t.Errorf("rác không U+FFFD phải bị chặn, có err = %v", err)
	}
}

func TestDecodeSourceUTF8Paths(t *testing.T) {
	const s = "Chương 3: Gió nổi\nHắn không đáp."

	dec, err := decodeSource([]byte(s))
	if err != nil {
		t.Fatalf("UTF-8 thuần: %v", err)
	}
	if dec.text != s || dec.encoding != encodingUTF8 {
		t.Errorf("UTF-8 thuần: text=%q encoding=%q", dec.text, dec.encoding)
	}

	dec, err = decodeSource(append(append([]byte{}, utf8BOM...), []byte(s)...))
	if err != nil {
		t.Fatalf("UTF-8 BOM: %v", err)
	}
	if dec.text != s || dec.encoding != encodingUTF8BOM {
		t.Errorf("UTF-8 BOM: text=%q encoding=%q", dec.text, dec.encoding)
	}
}
