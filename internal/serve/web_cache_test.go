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

// TestWebCache_KhongThoatDuocSangLuatImmutable canh mục 1 của bản review.
//
// Đặt `immutable` lên `index.html` là hư hại NẶNG nhất mà tệp này có thể gây ra: người dùng
// bị khoá vào bản cũ một năm, và tải lại cứng cũng không chắc gỡ được. Bản trước so tiền tố
// trên path THÔ, nên một đường dẫn có `..` lách qua được — đo thật, không phải giả định.
func TestWebCache_KhongThoatDuocSangLuatImmutable(t *testing.T) {
	dir := webTam(t)
	for _, duong := range []string{
		"/_next/static/../index.html",
		"/_next/static/../../index.html",
		"/_next/static/chunks/../../../index.html",
	} {
		rec := httptest.NewRecorder()
		webTinh(dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, duong, nil))
		if got := rec.Header().Get("Cache-Control"); got != "no-cache" {
			t.Errorf("%s: Cache-Control = %q, phải %q — đường dẫn thoát ra khỏi "+
				"/_next/static/ thì không còn là tệp băm tên", duong, got, "no-cache")
		}
	}
}

// TestWebCache_DauDayQuaRoutes canh việc ĐẤU DÂY, không phải hành vi của handler.
//
// Ba bài trên gọi thẳng `webTinh`, nên chúng vẫn xanh nếu ai đó trả `http.FileServer` trần về
// chỗ cũ trong `routes()` — đúng lớp hư hại mà cả tệp này sinh ra để chặn.
func TestWebCache_DauDayQuaRoutes(t *testing.T) {
	s := &server{webDir: webTam(t)}
	rec := httptest.NewRecorder()
	s.routes().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if got := rec.Header().Get("Cache-Control"); got != "no-cache" {
		t.Fatalf("qua routes(): Cache-Control = %q, phải %q — bản dựng web chưa đi qua webTinh",
			got, "no-cache")
	}
}

// TestWebCache_HoiLaiTraVe304: `no-cache` chỉ rẻ khi lượt hỏi lại trả 304 rỗng.
//
// Mất 304 thì mỗi lần mở trang là một lượt tải lại đầy đủ, và không có gì báo — chỉ có một
// bề mặt chậm dần mà không ai biết vì sao.
func TestWebCache_HoiLaiTraVe304(t *testing.T) {
	dir := webTam(t)
	dau := httptest.NewRecorder()
	webTinh(dir).ServeHTTP(dau, httptest.NewRequest(http.MethodGet, "/", nil))
	lm := dau.Header().Get("Last-Modified")
	if lm == "" {
		t.Fatal("thiếu Last-Modified — không có nó thì `no-cache` thành tải lại toàn bộ mỗi lần")
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("If-Modified-Since", lm)
	lai := httptest.NewRecorder()
	webTinh(dir).ServeHTTP(lai, req)
	if lai.Code != http.StatusNotModified {
		t.Errorf("hỏi lại = %d, phải 304", lai.Code)
	}
	if lai.Body.Len() != 0 {
		t.Errorf("304 phải rỗng, nhận %d byte", lai.Body.Len())
	}
}
