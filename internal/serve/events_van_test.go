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

// contextVoiHanVan cho handler SSE một hạn chót để nó thoát vòng chờ.
//
// Handler SSE chạy vô hạn tới khi client đi; `httptest` không tự đóng, nên bài kiểm phải là
// bên đặt hạn.
func contextVoiHanVan(t *testing.T, d time.Duration) (context.Context, context.CancelFunc) {
	t.Helper()
	return context.WithTimeout(context.Background(), d)
}
