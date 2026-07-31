package i18n

import (
	"testing"
	"unicode"
)

// TestKhongGhepTuDaDichVaoGiuaCau canh lớp lỗi "viết hoa giữa câu do nội suy".
//
// # Lớp lỗi
//
// msgid `重写` dịch là "Viết lại" — hoa đầu, và ĐÚNG phải hoa đầu vì nó cũng được
// dùng làm nhãn đứng riêng (entry/tui/panels_sidebar.go) và ở đầu câu
// (host/resume.go). Nhưng có chỗ chèn nó vào GIỮA một câu đã dịch khác, ra
// "hàng đợi Viết lại" — sai chính tả tiếng Việt.
//
// Một msgid là một khóa, một khóa một giá trị, nên không thể cho nó hai bản dịch.
// Chỗ sai là chỗ GHÉP, không phải bản dịch. Cách đúng là dịch cả câu cho từng
// biến thể.
//
// # Vì sao tiếng Trung không gặp
//
// Chữ Hán không có hoa/thường, nên `待%s队列` với `%s`=`重写` luôn đúng ở zh. Lớp
// lỗi này do chính việc việt hóa sinh ra — và không phép đo nào trên catalog thấy
// được, vì cả hai mảnh đều "đã dịch", chỉ câu ghép ra là sai.
//
// # Bài kiểm này canh gì
//
// Không quét mã nguồn tìm chỗ ghép — quá nhiều mẫu ghép hợp lệ. Nó khẳng định
// điều đo được: các msgid CẢ CÂU đã thay chỗ ghép phải tồn tại, và bản dịch của
// chúng không được mang chữ hoa ở giữa câu.
func TestKhongGhepTuDaDichVaoGiuaCau(t *testing.T) {
	truoc := Active()
	t.Cleanup(func() { _ = SetLocale(truoc) })
	if err := SetLocale(Vietnamese); err != nil {
		t.Fatal(err)
	}

	// Bốn msgid cả-câu đã thay hai template có %s. Nếu ai gộp chúng lại thành
	// template rồi chèn `i18n.F("重写")` thì bài kiểm này đỏ.
	caCau := []string{
		"第 %d 章不在待重写队列中，当前队列：%v。请先处理队列内章节，再动新章节: %w",
		"第 %d 章不在待打磨队列中，当前队列：%v。请先处理队列内章节，再动新章节: %w",
		"第 %d 章正文和标题均未发生变化，未检测到重写改动: %w",
		"第 %d 章正文和标题均未发生变化，未检测到打磨改动: %w",
	}
	for _, msgid := range caCau {
		dich := F(msgid)
		if dich == msgid {
			t.Errorf("msgid cả-câu KHÔNG có bản dịch: %q\n"+
				"Nếu chỗ gọi đã quay về ghép `i18n.F(\"重写\")` vào template có %%s thì đó là hồi quy.", msgid)
			continue
		}
		if chuHoaGiuaCau(dich) {
			t.Errorf("bản dịch có chữ hoa giữa câu: %q", dich)
		}
	}

	// Mặt còn lại: hai chỗ dùng cùng từ đó mà ĐÚNG phải hoa đầu. Nếu ai "sửa" bản
	// dịch của msgid `重写` thành chữ thường để né lỗi trên thì nhãn đứng riêng và
	// câu mở đầu bằng nó sẽ sai theo — bài kiểm này chặn cách sửa đó.
	for _, msgid := range []string{"重写", "打磨"} {
		dich := F(msgid)
		if dich == "" {
			t.Fatalf("msgid %q mất bản dịch", msgid)
		}
		if r := []rune(dich)[0]; !unicode.IsUpper(r) {
			t.Errorf("%q → %q: phải HOA đầu vì nó là nhãn đứng riêng "+
				"(entry/tui/panels_sidebar.go) và mở đầu câu (host/resume.go). "+
				"Hạ chữ ở đây là né lỗi ghép giữa câu bằng cách làm sai hai chỗ khác.",
				msgid, dich)
		}
	}
}

// chuHoaGiuaCau tìm chữ hoa không ở đầu câu và không sau dấu kết câu.
//
// Xấp xỉ có chủ đích: nó KHÔNG biết tên riêng, nên chỉ dùng được trên chuỗi biết
// trước là không có tên riêng — đúng bốn msgid ở trên. Đừng đem hàm này quét cả
// catalog, nó sẽ báo bừa vào mọi câu có "Editor", "Enter", "Ctrl".
func chuHoaGiuaCau(s string) bool {
	rs := []rune(s)
	dauCau := true
	for i, r := range rs {
		switch {
		case r == '.' || r == '!' || r == '?' || r == '\n' || r == ':' || r == '—':
			dauCau = true
		case r == ' ' || r == '\t' || r == '"' || r == '\'' || r == '(':
			// giữ nguyên trạng thái
		case unicode.IsUpper(r):
			if !dauCau {
				// Bỏ qua chữ hoa nằm giữa một từ viết hoa toàn bộ hoặc sau '%'
				// (verb định dạng như %V không tồn tại nhưng cứ phòng).
				if i > 0 && rs[i-1] == '%' {
					continue
				}
				return true
			}
			dauCau = false
		default:
			dauCau = false
		}
	}
	return false
}
