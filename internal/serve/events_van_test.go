package serve

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// TestSSEVanSongKhungDung canh HAI lớp lỗi trong một khung SSE.
//
//  1. KHÔNG được đặt `id:` cho sự kiện văn sống. `resumeSeq` (events.go) đọc `Last-Event-ID`
//     làm mốc HÀNG ĐỢI ui_event; trình duyệt tự gửi lại header đó khi nối lại. Một seq của
//     delta lọt vào đó làm client bỏ qua hoặc phát lại các sự kiện ui — và cả hai hướng sai
//     đều im lặng.
//  2. Chữ phải ở `data.text`, KHÔNG ở `summary`. Phía web, `congDoanTu()` trong
//     web/lib/useStudio.ts dựng nhãn "công đoạn" từ `ev.summary`; nhồi văn vào đó thì ô công
//     đoạn ở thanh transport hiện văn truyện.
func TestSSEVanSongKhungDung(t *testing.T) {
	goc := t.TempDir()
	newBook(t, goc, "sach", nil)

	may := newBoMay(goc)
	van := &dongVan{}
	may.dang["sach"] = &phienMay{id: "sach", van: van, moLuc: mocBayGio()}
	van.them("Giọt đầu tiên rơi.")

	srv := &server{root: goc, choGhi: true, may: may}
	rec := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/api/books/sach/events", nil)
	ctx, huy := contextVoiHanVan(t, 400*time.Millisecond)
	defer huy()
	srv.routes().ServeHTTP(rec, r.WithContext(ctx))

	than := rec.Body.String()
	if !strings.Contains(than, "event: stream_delta") {
		t.Fatalf("không thấy sự kiện stream_delta trong khung:\n%s", than)
	}
	if !strings.Contains(than, `"text":"Giọt đầu tiên rơi."`) {
		t.Errorf("chữ không nằm ở data.text:\n%s", than)
	}
	if strings.Contains(than, `"summary":"Giọt đầu tiên`) {
		t.Error("chữ lọt vào summary — ô công đoạn ở transport sẽ hiện văn truyện")
	}
	for _, khoi := range strings.Split(than, "\n\n") {
		if strings.Contains(khoi, "event: stream_delta") && strings.Contains(khoi, "id:") {
			t.Errorf("khối stream_delta có `id:` — nó sẽ đè mốc Last-Event-ID của ui_event:\n%s", khoi)
		}
	}
}

// TestSSEVanSongVaoGiuaLuot canh thứ tự hai sự kiện đầu tiên.
//
// Nếu gửi cả đoạn đang chảy mà KHÔNG gửi `stream_clear` trước, giao diện sẽ dán đoạn đó vào
// phần văn nó đang giữ từ trước (ví dụ sau khi mất kết nối rồi nối lại) — hai khúc của cùng
// một lượt xuất hiện hai lần liền nhau, và người đọc không có cách nào biết đâu là chỗ nối.
func TestSSEVanSongVaoGiuaLuot(t *testing.T) {
	goc := t.TempDir()
	newBook(t, goc, "sach", nil)

	may := newBoMay(goc)
	van := &dongVan{}
	may.dang["sach"] = &phienMay{id: "sach", van: van, moLuc: mocBayGio()}
	van.them("nửa đầu ")
	van.them("nửa sau")

	srv := &server{root: goc, choGhi: true, may: may}
	rec := httptest.NewRecorder()
	ctx, huy := contextVoiHanVan(t, 400*time.Millisecond)
	defer huy()
	srv.routes().ServeHTTP(rec, httptest.NewRequest("GET", "/api/books/sach/events", nil).WithContext(ctx))

	than := rec.Body.String()
	iXoa := strings.Index(than, "event: stream_clear")
	iVan := strings.Index(than, "event: stream_delta")
	if iXoa < 0 || iVan < 0 {
		t.Fatalf("thiếu sự kiện mở đầu:\n%s", than)
	}
	if iXoa > iVan {
		t.Error("stream_clear đến SAU stream_delta — giao diện sẽ xóa mất đoạn vừa nhận")
	}
	if !strings.Contains(than, `"text":"nửa đầu nửa sau"`) {
		t.Errorf("đoạn đang chảy không được gửi nguyên khối:\n%s", than)
	}
	// Và KHÔNG được gửi lại từng mẩu sau khi đã gửi cả khối.
	if strings.Count(than, "event: stream_delta") != 1 {
		t.Errorf("có %d sự kiện stream_delta, muốn 1 — đoạn văn đang bị gửi lặp",
			strings.Count(than, "event: stream_delta"))
	}
}

// TestSSEVanSongKhongCoMayVanChay canh việc "không có văn sống" KHÔNG phải lỗi.
//
// Hai ca hợp lệ: `s.may == nil` (studio chạy chế độ chỉ đọc, ngoài loopback) và engine chưa
// mở cho cuốn này. Cả hai đều phải cho `/events` chạy bình thường — dòng sự kiện đọc từ store
// nên nó không cần engine. Trả lỗi ở đây sẽ làm giao diện mất luôn dòng sự kiện của một cuốn
// đang xem, chỉ vì nó không chạy.
func TestSSEVanSongKhongCoMayVanChay(t *testing.T) {
	for _, ten := range []string{"không có bộ giám sát", "engine chưa mở"} {
		t.Run(ten, func(t *testing.T) {
			goc := t.TempDir()
			newBook(t, goc, "sach", nil)
			var may *boMay
			if ten == "engine chưa mở" {
				may = newBoMay(goc)
			}
			srv := &server{root: goc, choGhi: true, may: may}
			rec := httptest.NewRecorder()
			ctx, huy := contextVoiHanVan(t, 250*time.Millisecond)
			defer huy()
			srv.routes().ServeHTTP(rec,
				httptest.NewRequest("GET", "/api/books/sach/events", nil).WithContext(ctx))

			if rec.Code != 200 {
				t.Fatalf("mã %d, muốn 200: %s", rec.Code, rec.Body.String())
			}
			if strings.Contains(rec.Body.String(), "event: stream_delta") {
				t.Error("phát văn sống khi không có engine — không có nguồn nào để phát")
			}
		})
	}
}

// contextVoiHanVan cho handler SSE một hạn chót để nó thoát vòng chờ.
//
// Handler SSE chạy vô hạn tới khi client đi; `httptest` không tự đóng, nên bài kiểm phải là
// bên đặt hạn.
func contextVoiHanVan(t *testing.T, d time.Duration) (context.Context, context.CancelFunc) {
	t.Helper()
	return context.WithTimeout(context.Background(), d)
}
