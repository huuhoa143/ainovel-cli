package serve

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Bộ canh cho từ vựng nhãn của web studio.
//
// # Vì sao bài kiểm này viết bằng Go mà không phải bằng JS
//
// `web/` cố ý không có bộ chạy test: devDependencies chỉ có TypeScript và các
// gói @types, vì nó là static export do chính binary Go này phục vụ. Kéo cả
// vitest vào chỉ để canh một luật là đổi một tệp test lấy vài trăm gói.
//
// Gói `serve` là phía Go sở hữu `web/`, nên ai đi tìm "chỗ nào kiểm chuỗi của
// web" sẽ tìm ở đây. Repo cũng đã có tiền lệ cho kiểu kiểm-tệp-nguồn-từ-Go:
// assets/anti_ai_tone_sync_test.go đối chiếu PatternNames() với một tệp
// markdown, và internal/i18n/joinlist_test.go quét nguồn Go tìm dấu nối sai.

// dtCungChu tìm phần tử <dt> mở đầu bằng chữ thay vì bằng {biểu thức} hoặc thẻ
// con. Trong JSX, `<dt>Hiện trạng</dt>` là chữ viết cứng còn `<dt>{CHU.x}</dt>`
// là chữ lấy từ từ điển.
var dtCungChu = regexp.MustCompile(`<dt[^>]*>[^{<\s]`)

// TestNhanDlPhaiQuaTuDien canh lớp lỗi "chữ hiển thị không đi qua từ điển".
//
// Vì sao <dt> mà không phải mọi chữ trong JSX: <dt> là nhãn của một danh sách
// khóa-giá trị, tức đúng loại từ vựng mà từ điển CHU tồn tại để giữ nhất quán.
// Còn văn trong <p> thì có chỗ hợp lý là chữ tại chỗ. Quét rộng hơn sẽ báo bừa,
// và một bộ canh báo bừa là bộ canh bị tắt.
//
// Lớp lỗi này gây HAI thiệt hại, và cái thứ hai mới là cái đáng sợ:
//
//  1. Thấy được: nhãn viết cứng trôi lệch cách viết so với nhãn cùng nhóm. Chỗ
//     đầu tiên bắt được là `<dt>hiện trạng</dt>` chữ thường đứng ngay cạnh
//     `{CHU.dongLuc}` = "Động lực" và `{CHU.nangLuc}` = "Năng lực".
//  2. Không thấy được: chữ viết cứng KHÔNG nằm trong từ điển nên mọi phép đo
//     "bao nhiêu phần trăm đã dịch" đều bỏ qua nó. Đây cùng một lớp với dấu nối
//     `、` viết cứng ở phía Go (xem i18n.JoinList): thứ sai không phải một mục
//     trong từ điển, nên bộ đếm dựa trên từ điển mù với nó. Chỉ có quét nguồn
//     mới thấy.
func TestNhanDlPhaiQuaTuDien(t *testing.T) {
	goc := thuMucWeb(t)

	var viPham []string
	soTep, soDt := 0, 0

	for _, thuMuc := range []string{"components", "app", "lib"} {
		duong := filepath.Join(goc, thuMuc)
		err := filepath.WalkDir(duong, func(p string, d os.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() || !strings.HasSuffix(p, ".tsx") {
				return nil
			}
			b, err := os.ReadFile(p)
			if err != nil {
				return err
			}
			soTep++
			rel, _ := filepath.Rel(goc, p)
			for i, dong := range strings.Split(string(b), "\n") {
				if laComment(dong) {
					continue
				}
				soDt += strings.Count(dong, "<dt")
				if dtCungChu.MatchString(dong) {
					viPham = append(viPham, rel+":"+itoa(i+1)+"  "+strings.TrimSpace(dong))
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("quét %s: %v", thuMuc, err)
		}
	}

	// Chống bài kiểm rỗng: một bài kiểm quét 0 tệp thì luôn xanh và luôn vô
	// nghĩa. Lỗi đó đã xảy ra thật trong dự án này — một bài kiểm so chuỗi
	// xuống dòng kiểu nguồn với kiểu lúc chạy nên cả hai bên đều sai, kết quả là
	// nó kiểm đúng 0 mục và xanh suốt. Từ đó mọi bài kiểm quét-nguồn ở đây đều
	// phải tự chứng minh là có quét được gì.
	if soTep == 0 {
		t.Fatalf("không quét được tệp .tsx nào trong %s — bài kiểm này đang rỗng", goc)
	}
	if soDt == 0 {
		t.Fatalf("quét %d tệp mà không thấy <dt> nào — bộ chọn đã lạc, bài kiểm này đang rỗng", soTep)
	}

	if len(viPham) > 0 {
		t.Errorf("nhãn <dt> viết cứng chữ, phải lấy từ CHU trong web/lib/nhan.ts (%d chỗ):\n  %s",
			len(viPham), strings.Join(viPham, "\n  "))
	}
	t.Logf("đã quét %d tệp .tsx, %d nhãn <dt>", soTep, soDt)
}

// laComment cho biết dòng này là một dòng comment.
//
// Cần thiết, không phải cho gọn: chính bài kiểm này đã báo bừa một lần vào đúng
// comment giải thích lỗi mà nó canh — câu ``nhãn `<dt>` viết cứng`` trong
// BanDuyet.tsx. Đó là lớp báo bừa đã gặp ở phía Go với dấu nối `、`: bộ canh quét
// theo dòng nên nó không phân biệt được chữ trong mã và chữ trong lời giải thích
// VỀ mã.
//
// Đây là phép xấp xỉ theo dòng, không phải bộ phân tích JSX: nó không nhận ra
// comment `{/* ... */}` nhiều dòng có phần thân không mở đầu bằng `*`. Chấp nhận
// được vì hướng sai của nó là báo BỪA (thấy ngay, sửa được), không phải bỏ SÓT.
// Dựng bộ phân tích JSX đầy đủ cho một luật là cái giá không tương xứng.
func laComment(dong string) bool {
	t := strings.TrimSpace(dong)
	return strings.HasPrefix(t, "*") ||
		strings.HasPrefix(t, "//") ||
		strings.HasPrefix(t, "/*") ||
		strings.HasPrefix(t, "{/*")
}

// thuMucWeb trả về đường dẫn tới web/ tính từ vị trí gói này (internal/serve).
//
// Không dùng đường dẫn tuyệt đối hay biến môi trường: `go test` chạy với thư mục
// làm việc là thư mục của gói, nên ../../web là quan hệ ổn định. Thiếu thư mục
// thì DỪNG chứ không bỏ qua — bỏ qua là biến bài kiểm thành luôn-xanh đúng vào
// lúc nó cần lên tiếng nhất.
func thuMucWeb(t *testing.T) string {
	t.Helper()
	duong := filepath.Join("..", "..", "web")
	if _, err := os.Stat(filepath.Join(duong, "lib", "nhan.ts")); err != nil {
		t.Fatalf("không thấy web/lib/nhan.ts từ internal/serve (%v) — bài kiểm không thể kiểm gì", err)
	}
	return duong
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
