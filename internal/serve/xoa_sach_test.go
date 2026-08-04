package serve

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// xoa gọi thẳng handler, đặt sẵn path value như mux sẽ làm.
func xoa(t *testing.T, s *server, id, than string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodDelete, "/api/books/"+id, strings.NewReader(than))
	req.SetPathValue("book", id)
	rec := httptest.NewRecorder()
	s.handleXoaSach(rec, req)
	return rec
}

// TestXoaSach_DoiGoLaiDungTen là bài kiểm chính, và nó canh một quyết định về AN TOÀN chứ
// không phải về hình thức.
//
// Xóa không hoàn tác được và không có thùng rác. Nếu handler xóa chỉ vì nhận được đúng
// phương thức và đúng đường dẫn thì một lần giao diện dựng URL sai — hoặc một lần người dùng
// bấm nhầm hàng — là mất trắng một cuốn. Thân yêu cầu phải chứa ĐÚNG tên cuốn.
func TestXoaSach_DoiGoLaiDungTen(t *testing.T) {
	root := t.TempDir()
	newBook(t, root, "cuon-a", nil)
	dir := filepath.Join(root, "cuon-a")
	s := &server{root: root}

	for _, ca := range []struct {
		ten  string
		than string
	}{
		{"thân rỗng", `{}`},
		{"xác nhận sai tên", `{"xac_nhan":"cuon-b"}`},
	} {
		rec := xoa(t, s, "cuon-a", ca.than)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: mã = %d, phải 400", ca.ten, rec.Code)
		}
		if _, err := os.Stat(dir); err != nil {
			t.Fatalf("%s: thư mục đã bị xóa dù xác nhận không khớp", ca.ten)
		}
	}
}

// TestXoaSach_ThuaKhoangTrangVanTinh: lời xác nhận CẮT khoảng trắng hai đầu, có chủ ý.
//
// Nó tồn tại để chứng minh CHỦ Ý, không phải để chấm bài gõ. Một cái tên dán từ chỗ khác vào
// hay dính dấu cách cuối, và từ chối nó chỉ dạy người dùng rằng hộp xác nhận hay dở chứng —
// đúng phản xạ khiến lần sau họ bấm cho xong. Chữ khác nhau thì vẫn từ chối.
func TestXoaSach_ThuaKhoangTrangVanTinh(t *testing.T) {
	root := t.TempDir()
	newBook(t, root, "cuon-a", nil)
	rec := xoa(t, &server{root: root}, "cuon-a", `{"xac_nhan":"  cuon-a  "}`)
	if rec.Code != http.StatusOK {
		t.Errorf("mã = %d, phải 200: %s", rec.Code, rec.Body.String())
	}
	if _, err := os.Stat(filepath.Join(root, "cuon-a")); !os.IsNotExist(err) {
		t.Error("thư mục vẫn còn")
	}
}

func TestXoaSach_XacNhanDungThiXoaHan(t *testing.T) {
	root := t.TempDir()
	sa := newBook(t, root, "cuon-a", nil)
	ghiTho(t, sa, "chapters/0001.md", "# chương một\n")
	newBook(t, root, "cuon-b", nil)
	dir := filepath.Join(root, "cuon-a")
	giuLai := filepath.Join(root, "cuon-b")

	rec := xoa(t, &server{root: root}, "cuon-a", `{"xac_nhan":"cuon-a"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("mã = %d, phải 200: %s", rec.Code, rec.Body.String())
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Error("thư mục vẫn còn sau khi xóa")
	}
	// Cuốn bên cạnh KHÔNG được suy suyển. Một `RemoveAll` nhắm sai một bậc thư mục sẽ
	// quét sạch cả gốc, và bài kiểm chỉ nhìn cuốn vừa xóa thì không thấy.
	if _, err := os.Stat(giuLai); err != nil {
		t.Errorf("cuốn khác bị xóa lây: %v", err)
	}
}

func TestXoaSach_CuonKhongCoThiBaoKhongCo(t *testing.T) {
	rec := xoa(t, &server{root: t.TempDir()}, "khong-co", `{"xac_nhan":"khong-co"}`)
	if rec.Code != http.StatusNotFound {
		t.Errorf("mã = %d, phải 404", rec.Code)
	}
}

// TestXoaSach_KhongThoatDuocGocXuong canh lớp chống thoát thư mục.
//
// Đây là bài kiểm đắt nhất trong tệp: mọi lỗi khác trả về một mã HTTP, còn lỗi này chạy
// `os.RemoveAll` ở ngoài gốc. Tên gửi lên đi thẳng vào đường dẫn nên nó là dữ liệu KHÔNG tin
// được, kể cả khi hôm nay chỉ giao diện của chính ta gọi tới.
func TestXoaSach_KhongThoatDuocGocXuong(t *testing.T) {
	root := t.TempDir()
	ngoai := filepath.Join(root, "..", "khong-duoc-dung-toi")
	if err := os.MkdirAll(ngoai, 0o755); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(ngoai) })

	s := &server{root: root}
	for _, id := range []string{"..", "../khong-duoc-dung-toi", "/etc", `..\..\x`} {
		rec := xoa(t, s, id, `{"xac_nhan":"`+id+`"}`)
		if rec.Code == http.StatusOK {
			t.Errorf("id %q được chấp nhận — phải bị từ chối", id)
		}
	}
	if _, err := os.Stat(ngoai); err != nil {
		t.Fatalf("thư mục NGOÀI gốc đã bị đụng tới: %v", err)
	}
}

// TestXoaSach_ChiPhucVuMotCuonThiKhongXoaCuonKhac: phiên `--only` chỉ phục vụ một cuốn, nên
// nó cũng chỉ được xóa đúng cuốn ấy. `bookDir` đã canh, bài này khóa việc đó lại cho đường xóa.
func TestXoaSach_ChiPhucVuMotCuonThiKhongXoaCuonKhac(t *testing.T) {
	root := t.TempDir()
	newBook(t, root, "cuon-a", nil)
	newBook(t, root, "cuon-b", nil)
	khac := filepath.Join(root, "cuon-b")

	rec := xoa(t, &server{root: root, onlyBook: "cuon-a"}, "cuon-b", `{"xac_nhan":"cuon-b"}`)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("mã = %d, phải 400", rec.Code)
	}
	if _, err := os.Stat(khac); err != nil {
		t.Error("cuốn ngoài phạm vi phiên đã bị xóa")
	}
}
