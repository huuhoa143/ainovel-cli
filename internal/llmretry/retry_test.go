package llmretry

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/voocel/agentcore"
)

/* ── đồ giả ────────────────────────────────────────────────────────────── */

// loiGia dựng đúng ba tính chất mà hạt nhân đọc: câu lỗi, có thử lại được không, và mốc
// `Retry-After` có cấu trúc. Đây là hình dạng thật của `agentcore/llm.providerError`.
type loiGia struct {
	msg      string
	thuLai   bool
	mocCoCau time.Duration
}

func (e loiGia) Error() string             { return e.msg }
func (e loiGia) Retryable() bool           { return e.thuLai }
func (e loiGia) RetryAfter() time.Duration { return e.mocCoCau }

// loiTron KHÔNG implement `RetryableError` — ca một lỗi lạ lọt vào hạt nhân.
type loiTron struct{ msg string }

func (e loiTron) Error() string { return e.msg }

/* ── Xet: bảng ca của luật bỏ cuộc ─────────────────────────────────────── */

func TestXet(t *testing.T) {
	cs := ChinhSach{LanToiDa: 5, ChoMoiLan: 60 * time.Second, ChoToiDa: 5 * time.Minute, MocXaLaBo: 2 * time.Minute}

	ca := []struct {
		ten    string
		err    error
		lanThu int
		daCho  time.Duration
		muon   Quyet
		cho    time.Duration
	}{
		{"không lỗi", nil, 1, 0, QuyetTraNgay, 0},
		{"bị hủy", context.Canceled, 1, 0, QuyetTraNgay, 0},
		{"hết hạn", context.DeadlineExceeded, 1, 0, QuyetTraNgay, 0},
		{"không thử lại được", loiGia{msg: "401 unauthorized"}, 1, 0, QuyetTraNgay, 0},
		{"lỗi lạ không khai retryable", loiTron{"cái gì đó"}, 1, 0, QuyetTraNgay, 0},

		// Lùi theo cấp số nhân khi provider không nói gì.
		{"lần 1 → 1s", loiGia{msg: "503", thuLai: true}, 1, 0, QuyetThuLai, time.Second},
		{"lần 4 → 8s", loiGia{msg: "503", thuLai: true}, 4, 0, QuyetThuLai, 8 * time.Second},
		{"lần 5 → 16s", loiGia{msg: "503", thuLai: true}, 5, 0, QuyetThuLai, 16 * time.Second},

		// Mốc có cấu trúc thắng phép lùi.
		{"mốc ngắn thắng backoff", loiGia{msg: "429", thuLai: true, mocCoCau: 5 * time.Second}, 4, 0, QuyetThuLai, 5 * time.Second},

		// LUẬT 1 — mốc xa. Ca đầu là chính lỗi đã đo được trên máy thật.
		{"quota 27 phút đọc từ câu lỗi → bỏ ngay", loiGia{msg: "429 usage limit reached (reset after 26m 54s)", thuLai: true}, 1, 0, QuyetBoCuoc, 0},
		{"mốc xa qua header → bỏ ngay", loiGia{msg: "429", thuLai: true, mocCoCau: 30 * time.Minute}, 1, 0, QuyetBoCuoc, 0},
		// Ranh giới: ĐÚNG bằng ngưỡng thì vẫn chờ (`>` chứ không `>=`).
		{"mốc đúng bằng ngưỡng → vẫn chờ", loiGia{msg: "429", thuLai: true, mocCoCau: 2 * time.Minute}, 1, 0, QuyetThuLai, 60 * time.Second},

		// LUẬT 2 — hết lượt.
		{"lần cuối vẫn chờ", loiGia{msg: "503", thuLai: true}, 5, 0, QuyetThuLai, 16 * time.Second},
		{"quá lượt → bỏ", loiGia{msg: "503", thuLai: true}, 6, 0, QuyetBoCuoc, 0},

		// LUẬT 3 — hết giờ.
		{"tổng chờ vượt trần → bỏ", loiGia{msg: "503", thuLai: true}, 2, 5 * time.Minute, QuyetBoCuoc, 0},
	}

	for _, c := range ca {
		t.Run(c.ten, func(t *testing.T) {
			pq := Xet(c.err, c.lanThu, c.daCho, cs)
			if pq.Quyet != c.muon {
				t.Fatalf("Quyet = %v, muốn %v (lý do: %q)", pq.Quyet, c.muon, pq.LyDo)
			}
			if c.muon == QuyetThuLai && pq.Cho != c.cho {
				t.Fatalf("Cho = %s, muốn %s", pq.Cho, c.cho)
			}
			if c.muon == QuyetBoCuoc && pq.LyDo == "" {
				t.Fatal("bỏ cuộc mà không có lý do — thông báo tạm dừng sẽ trống")
			}
		})
	}
}

// Thứ tự ba luật là một quyết định, không phải ngẫu nhiên: mốc do provider đưa ra đáng tin
// hơn phỏng đoán từ số lần thất bại, nên nó phải được xét TRƯỚC. Không có bài này thì đảo
// thứ tự vẫn xanh, và người vận hành nhận câu "đã thử 5 lần" thay vì "chờ 30 phút" — mất
// đúng con số cho họ biết bao giờ quay lại.
func TestXet_MocXaThangHetLuot(t *testing.T) {
	err := loiGia{msg: "429", thuLai: true, mocCoCau: 30 * time.Minute}
	pq := Xet(err, 99, time.Hour, ChinhSach{})
	if pq.Quyet != QuyetBoCuoc {
		t.Fatalf("Quyet = %v, muốn QuyetBoCuoc", pq.Quyet)
	}
	if !strings.Contains(pq.LyDo, "30") {
		t.Fatalf("LyDo = %q — phải nói mốc của provider, không phải số lần thử", pq.LyDo)
	}
}

func TestChinhSachMacDinh(t *testing.T) {
	// Config rỗng phải dùng được ngay: cả bốn đường gọi hiện không truyền chính sách.
	pq := Xet(loiGia{msg: "503", thuLai: true}, 1, 0, ChinhSach{})
	if pq.Quyet != QuyetThuLai || pq.Cho != time.Second {
		t.Fatalf("mặc định cho ra %v/%s, muốn QuyetThuLai/1s", pq.Quyet, pq.Cho)
	}
	if pq := Xet(loiGia{msg: "503", thuLai: true}, 6, 0, ChinhSach{}); pq.Quyet != QuyetBoCuoc {
		t.Fatalf("mặc định phải bỏ cuộc ở lần 6, nhận %v", pq.Quyet)
	}
}

/* ── lui: giữ nguyên hàng rào tràn số của bản trước ─────────────────────── */

func TestLuiKhongTran(t *testing.T) {
	if got := lui(10_000, 60*time.Second); got != 60*time.Second {
		t.Fatalf("lui = %s, muốn 60s", got)
	}
	if got := lui(3, 60*time.Second); got != 8*time.Second {
		t.Fatalf("lui = %s, muốn 8s", got)
	}
}

/* ── Generate: hành vi thật của vòng lặp ────────────────────────────────── */

type modelGia struct {
	loi []error // lỗi theo từng lần gọi; hết mảng thì thành công
	dem int
}

func (m *modelGia) Generate(context.Context, []agentcore.Message, []agentcore.ToolSpec, ...agentcore.CallOption) (*agentcore.LLMResponse, error) {
	m.dem++
	if m.dem <= len(m.loi) {
		return nil, m.loi[m.dem-1]
	}
	return &agentcore.LLMResponse{}, nil
}

// Chính sách siêu nhanh để bài kiểm không chờ thật.
func csNhanh(lan int) ChinhSach {
	return ChinhSach{LanToiDa: lan, ChoMoiLan: time.Millisecond, ChoToiDa: time.Second, MocXaLaBo: 2 * time.Minute}
}

func TestGenerate_ThanhCongSauKhiThuLai(t *testing.T) {
	m := &modelGia{loi: []error{loiGia{msg: "503", thuLai: true}}}
	if _, err := Generate(context.Background(), m, Config{ChinhSach: csNhanh(5)}, nil); err != nil {
		t.Fatalf("muốn thành công, nhận %v", err)
	}
	if m.dem != 2 {
		t.Fatalf("gọi %d lần, muốn 2", m.dem)
	}
}

// Bài canh chính lỗi đã đo được: 20 lần thử lại và không có điểm dừng.
func TestGenerate_BoCuocThayViLapVoHan(t *testing.T) {
	loi := loiGia{msg: "503 overloaded", thuLai: true}
	m := &modelGia{loi: []error{loi, loi, loi, loi, loi, loi, loi, loi}}

	_, err := Generate(context.Background(), m, Config{ChinhSach: csNhanh(3)}, nil)

	var bo *LoiBoCuoc
	if !errors.As(err, &bo) {
		t.Fatalf("muốn *LoiBoCuoc, nhận %T: %v", err, err)
	}
	// 1 lần gọi đầu + 3 lần thử lại = 4; lần thứ 4 mới bị `Xet` chặn.
	if m.dem != 4 {
		t.Fatalf("gọi %d lần, muốn 4 (1 đầu + 3 thử lại)", m.dem)
	}
}

// `Unwrap` là điều kiện đúng-sai, không phải tiện nghi: engine phân loại lỗi bằng
// `errors.Is` với sentinel của agentcore rồi mới chọn câu khuyên kèm thông báo tạm dừng.
// Nuốt lỗi gốc là làm cả tầng đó mù.
func TestLoiBoCuoc_GiuLoiGoc(t *testing.T) {
	goc := loiGia{msg: "429 quota", thuLai: true, mocCoCau: time.Hour}
	m := &modelGia{loi: []error{goc}}

	_, err := Generate(context.Background(), m, Config{ChinhSach: csNhanh(3)}, nil)

	if !errors.Is(err, error(goc)) {
		t.Fatalf("errors.Is không tìm thấy lỗi gốc trong %v", err)
	}
	// Mốc một tiếng thì phải bỏ NGAY, không thử lại lần nào.
	if m.dem != 1 {
		t.Fatalf("gọi %d lần, muốn 1 — mốc xa phải chặn trước mọi lần thử", m.dem)
	}
}

func TestGenerate_LoiKhongThuLaiTraNguyenVan(t *testing.T) {
	m := &modelGia{loi: []error{loiGia{msg: "401 unauthorized"}}}

	_, err := Generate(context.Background(), m, Config{ChinhSach: csNhanh(3)}, nil)

	var bo *LoiBoCuoc
	if errors.As(err, &bo) {
		t.Fatal("lỗi không thử lại được phải trả NGUYÊN VĂN, không bọc thành LoiBoCuoc")
	}
	if m.dem != 1 {
		t.Fatalf("gọi %d lần, muốn 1", m.dem)
	}
}

func TestGenerate_TonTrongContext(t *testing.T) {
	ctx, huy := context.WithCancel(context.Background())
	huy()
	m := &modelGia{loi: []error{loiGia{msg: "503", thuLai: true}}}

	_, err := Generate(ctx, m, Config{ChinhSach: csNhanh(5)}, nil)

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("muốn context.Canceled, nhận %v", err)
	}
	var bo *LoiBoCuoc
	if errors.As(err, &bo) {
		t.Fatal("một cú bấm Dừng có chủ ý không được báo là 'thôi thử lại'")
	}
}

func TestGenerate_BaoSuKienThuLai(t *testing.T) {
	var thay []Event
	m := &modelGia{loi: []error{loiGia{msg: "503", thuLai: true}}}
	cfg := Config{ChinhSach: csNhanh(4), OnRetry: func(ev Event) { thay = append(thay, ev) }}

	if _, err := Generate(context.Background(), m, cfg, nil); err != nil {
		t.Fatalf("muốn thành công, nhận %v", err)
	}
	if len(thay) != 1 || thay[0].Attempt != 1 {
		t.Fatalf("sự kiện thử lại = %+v, muốn đúng một lần với Attempt=1", thay)
	}
}

// Câu lỗi phải đọc được ở CẢ HAI ca bỏ cuộc. Luật "mốc xa" chặn ngay lần xét đầu nên
// `LanThu == 0`, và một câu "thôi thử lại sau 0 lần" đọc ra như lỗi của phần mềm.
func TestLoiBoCuoc_CauChuTheoSoLanThu(t *testing.T) {
	goc := loiGia{msg: "429"}
	if s := (&LoiBoCuoc{Cuoi: goc, LanThu: 0, LyDo: "quota"}).Error(); strings.Contains(s, "0") {
		t.Fatalf("Error() = %q — không được nói 'sau 0 lần'", s)
	}
	if s := (&LoiBoCuoc{Cuoi: goc, LanThu: 5, LyDo: "quota"}).Error(); !strings.Contains(s, "5") {
		t.Fatalf("Error() = %q — phải nói số lần đã thử", s)
	}
}
