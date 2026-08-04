package serve

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

/*
Cache của bản dựng web — hai luật, và bỏ luật nào cũng hỏng theo một kiểu riêng.

# Vì sao bài kiểm này tồn tại

`http.FileServer` trần không gửi `Cache-Control` nào cả. Thiếu header đó, trình duyệt tự
quyết bằng *heuristic caching* và phục vụ bản cũ trong hàng chục phút mà không hỏi lại
server. ĐO ĐƯỢC trên máy thật: sau khi dựng lại giao diện, người dùng vẫn thấy nút phiên
bản cũ, và cách duy nhất thoát ra là `Cmd+Shift+R`.

Đó là lỗi im lặng: không mã lỗi, không cảnh báo, chỉ có một người dùng tưởng bản sửa không
có tác dụng. Không bài kiểm nào bắt được nó trước bài này, vì mọi bài khác đọc THÂN phản hồi
chứ không đọc header.
*/

func webTam(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "_next", "static", "chunks"), 0o755); err != nil {
		t.Fatal(err)
	}
	ghi := func(p, noiDung string) {
		if err := os.WriteFile(filepath.Join(dir, filepath.FromSlash(p)), []byte(noiDung), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	ghi("index.html", "<html><body>studio</body></html>")
	// Tệp KHÔNG băm tên: favicon đổi nội dung mà giữ nguyên đường dẫn.
	ghi("icon.svg", "<svg/>")
	ghi("_next/static/chunks/abc123.js", "console.log(1)")
	return dir
}

func headerCache(t *testing.T, dir, duong string) string {
	t.Helper()
	rec := httptest.NewRecorder()
	webTinh(dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, duong, nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET %s = %d, phải 200", duong, rec.Code)
	}
	return rec.Header().Get("Cache-Control")
}

// TestWebCache_TrangChuPhaiHoiLaiServer là bài chính.
//
// `index.html` chứa TÊN BĂM của các chunk. Nó mới thì mọi thứ khác tự mới theo; nó cũ thì
// trình duyệt còn đi lấy chunk cũ dù chunk mới đã nằm sẵn trên đĩa. Nên nó là mắt xích duy
// nhất bắt buộc phải hỏi lại server.
func TestWebCache_TrangChuPhaiHoiLaiServer(t *testing.T) {
	dir := webTam(t)
	// `/index.html` cố tình KHÔNG có trong danh sách: `http.FileServer` chuyển hướng nó về
	// `/` (chuẩn hoá đường dẫn) nên nó trả 301, không phải 200. `icon.svg` thay chỗ đó —
	// nó là tệp không băm tên, tức đúng nhóm phải hỏi lại server.
	for _, duong := range []string{"/", "/icon.svg"} {
		got := headerCache(t, dir, duong)
		if got != "no-cache" {
			t.Errorf("%s: Cache-Control = %q, phải %q — thiếu nó là trình duyệt tự quyết "+
				"và phục vụ giao diện cũ mà không hỏi lại", duong, got, "no-cache")
		}
	}
}

// TestWebCache_ChunkBamDuocGiuLau: tên có băm nội dung nên bản cũ không bao giờ bị nhầm là
// bản mới. Không đặt immutable ở đây thì mọi lần mở trang là một loạt lượt hỏi 304 vô ích.
func TestWebCache_ChunkBamDuocGiuLau(t *testing.T) {
	got := headerCache(t, webTam(t), "/_next/static/chunks/abc123.js")
	if got != "public, max-age=31536000, immutable" {
		t.Errorf("chunk băm: Cache-Control = %q, phải immutable một năm", got)
	}
}

// TestWebCache_HaiLuatKhongDuocDoiCho canh đúng cái sai NGUY HIỂM nhất.
//
// Đặt nhầm `immutable` lên `index.html` thì người dùng bị khoá vào bản cũ MỘT NĂM, và tải
// lại cứng cũng không chắc gỡ được. Hư hại nặng hơn hẳn chiều ngược lại, nên nó có bài riêng
// thay vì tin vào hai bài trên.
func TestWebCache_HaiLuatKhongDuocDoiCho(t *testing.T) {
	dir := webTam(t)
	if trang := headerCache(t, dir, "/"); trang == headerCache(t, dir, "/_next/static/chunks/abc123.js") {
		t.Fatal("trang chủ và chunk băm đang dùng CÙNG một luật cache — hai loại tệp này " +
			"có vòng đời khác nhau, gộp luật là hoặc khoá người dùng vào bản cũ, hoặc bỏ hết " +
			"lợi ích của việc băm tên")
	}
}
