package serve

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestTachTieuDeH1 canh phép tách ở mức hàm.
//
// Ca quan trọng nhất không phải ca thường mà là ba ca CUỐI: `#` không phải tiêu đề
// (thẻ băm giữa văn, dòng phân cách), và văn mở đầu không có H1 nào. Một phép tách
// tham lam sẽ ăn mất dòng đầu của những chương đó.
func TestTachTieuDeH1(t *testing.T) {
	for _, c := range []struct {
		ten    string
		vao    string
		tieuDe string
		than   string
	}{
		{
			"tệp chương bình thường",
			"# Hòm gỗ ở bến bắc\n\nBến bắc hiện ra trước tiếng bánh xe.\n",
			"Hòm gỗ ở bến bắc",
			"Bến bắc hiện ra trước tiếng bánh xe.\n",
		},
		{
			"có dòng trống trước H1",
			"\n\n# Kho đá sau màn mưa\n\nMưa đổ.\n",
			"Kho đá sau màn mưa",
			"Mưa đổ.\n",
		},
		{
			"tiêu đề bọc ngoặc sách",
			"# 《Lệnh bài qua cầu đá》\n\nTấm mộc bài.\n",
			"Lệnh bài qua cầu đá",
			"Tấm mộc bài.\n",
		},
		{
			"H1 nhưng thân rỗng",
			"# Chương chưa viết\n",
			"Chương chưa viết",
			"",
		},
		{
			// Không có khoảng trắng sau `#` thì theo CommonMark không phải tiêu đề,
			// và quy ước ghi tệp của engine (`"# "`) cũng vậy.
			"thăng không có khoảng trắng",
			"#khônglàtiêuđề\n\nVăn.\n",
			"",
			"#khônglàtiêuđề\n\nVăn.\n",
		},
		{
			"H2 chứ không phải H1",
			"## Phần một\n\nVăn.\n",
			"",
			"## Phần một\n\nVăn.\n",
		},
		{
			"không có tiêu đề, vào thẳng văn",
			"Bến bắc hiện ra trước tiếng bánh xe.\n",
			"",
			"Bến bắc hiện ra trước tiếng bánh xe.\n",
		},
		{"rỗng", "", "", ""},
	} {
		t.Run(c.ten, func(t *testing.T) {
			tieuDe, than := tachTieuDeH1(c.vao)
			if tieuDe != c.tieuDe {
				t.Errorf("tiêu đề = %q, muốn %q", tieuDe, c.tieuDe)
			}
			if than != c.than {
				t.Errorf("thân = %q, muốn %q", than, c.than)
			}
		})
	}
}

// TestApiChuongKhongLoDauThang là bài kiểm ở ĐƯỜNG THẬT: dựng store, ghi tệp
// chương y như engine ghi, rồi gọi đúng route mà trình duyệt gọi.
//
// Vì sao phải đi qua HTTP thay vì gọi noiDungChuong: lỗi này sống được vì `title`
// và `text` là HAI trường của cùng một phản hồi, và chỉ khi xem cả phản hồi mới
// thấy tiêu đề bị trả hai lần. Gọi hàm lẻ thì không bao giờ thấy sự trùng.
func TestApiChuongKhongLoDauThang(t *testing.T) {
	goc := t.TempDir()
	st := newBook(t, goc, "sach", nil)
	ghiTho(t, st, "chapters/01.md", "# Hòm gỗ ở bến bắc\n\nBến bắc hiện ra trước tiếng bánh xe.\n")

	srv := &server{root: goc}
	rec := httptest.NewRecorder()
	srv.routes().ServeHTTP(rec, httptest.NewRequest("GET", "/api/books/sach/chapters/1", nil))

	if rec.Code != 200 {
		t.Fatalf("mã %d, thân: %s", rec.Code, rec.Body.String())
	}
	var got struct {
		Title string `json:"title"`
		Text  string `json:"text"`
		Words int    `json:"words"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("giải mã: %v", err)
	}

	if strings.HasPrefix(strings.TrimSpace(got.Text), "#") {
		t.Errorf("text mở đầu bằng dấu thăng — giao diện đọc sẽ in nó ra thành đoạn:\n  %q",
			got.Text)
	}
	if got.Title == "" {
		t.Error("title rỗng: tách H1 mà không ngã về nó là mất tiêu đề")
	}
	if strings.Contains(got.Text, got.Title) {
		t.Errorf("tiêu đề %q còn nằm trong text — vẫn đang trả hai lần", got.Title)
	}
	// Số từ phải đếm trên THÂN. Thân có 8 từ; tính cả dòng tiêu đề sẽ ra 13.
	if got.Words != 8 {
		t.Errorf("words = %d, muốn 8 (đếm trên thân, không tính dòng tiêu đề)", got.Words)
	}
}

// TestApiChuongNganTieuDeTuH1KhiDanYThieu canh hướng sai của bản sửa.
//
// Phép tách chỉ đúng nếu tiêu đề được TRẢ RA. `chapterTitle` đọc từ dàn ý, và ở
// đây dàn ý cố ý không có mục cho chương 1 — y như chương nhập từ nguồn ngoài hoặc
// chương viết chen. Nếu ai đơn giản hóa `tachTieuDeH1` thành "bỏ dòng đầu", bài
// này đỏ trong khi bài trên vẫn xanh.
func TestApiChuongNganTieuDeTuH1KhiDanYThieu(t *testing.T) {
	goc := t.TempDir()
	st := newBook(t, goc, "sach", nil)
	ghiTho(t, st, "chapters/01.md", "# Chương nhập từ ngoài\n\nMột dòng văn.\n")

	srv := &server{root: goc}
	rec := httptest.NewRecorder()
	srv.routes().ServeHTTP(rec, httptest.NewRequest("GET", "/api/books/sach/chapters/1", nil))

	var got struct {
		Title string `json:"title"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("giải mã: %v", err)
	}
	if got.Title != "Chương nhập từ ngoài" {
		t.Errorf("title = %q — dàn ý không có mục cho chương này, H1 là chỗ duy nhất "+
			"còn tiêu đề, nên phải ngã về nó", got.Title)
	}
}
