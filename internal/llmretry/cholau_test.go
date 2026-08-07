package llmretry

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/voocel/agentcore"
)

// loiQuota là 429 THẬT như nó tới tay ta: thử lại được, không có header `Retry-After`, và mốc
// chờ chỉ nằm trong câu chữ. Nó phải mang được sentinel của agentcore, vì nửa giá trị của bản
// vá này là chuỗi sentinel còn nguyên sau khi bị chặn.
type loiQuota struct{ msg string }

func (e loiQuota) Error() string   { return e.msg }
func (e loiQuota) Retryable() bool { return true }
func (e loiQuota) Unwrap() error   { return agentcore.ErrProviderRateLimit }

const CAU_429 = "[codex/gpt-5.5] [429]: The usage limit has been reached (reset after 13m 16s)"

/* ── ChanChoLau: chặn hay không chặn ───────────────────────────────────── */

func TestChanChoLau(t *testing.T) {
	cs := ChinhSach{}

	ca := []struct {
		ten   string
		err   error
		chan_ bool
	}{
		// Ca đã ĐO ĐƯỢC: "Thử lại (6/7)" sinh ra từ đúng câu này.
		{"quota nói chờ 13 phút", loiQuota{CAU_429}, true},

		// Chờ NGẮN không được chặn — đó là ca mà thử lại thật sự có ích, và chặn nó là biến
		// một trục trặc hai giây thành một lượt tạm dừng cần người vào bấm.
		{"chờ 30 giây", loiGia{msg: "rate limited, try again in 30s", thuLai: true}, false},
		{"chờ đúng ngưỡng 2 phút", loiGia{msg: "retry after 2m", thuLai: true}, false},
		{"quá ngưỡng một giây", loiGia{msg: "retry after 121s", thuLai: true}, true},

		// Không nói mốc nào → luật đếm số lần lo, không phải luật này.
		{"lỗi mạng trơn", loiGia{msg: "connection reset by peer", thuLai: true}, false},

		// Vốn đã không thử lại được thì không có vòng lặp nào để chặn.
		{"401 kèm mốc dài", loiGia{msg: "401: blocked, retry after 30m", thuLai: false}, false},
		{"lỗi lạ không khai retryable", loiTron{"reset after 30m"}, false},

		{"nil", nil, false},
	}

	for _, c := range ca {
		t.Run(c.ten, func(t *testing.T) {
			ra := ChanChoLau(c.err, cs)
			var bo *LoiBoCuoc
			if got := errors.As(ra, &bo); got != c.chan_ {
				t.Fatalf("ChanChoLau(%v) chặn = %v, muốn %v (ra = %v)", c.err, got, c.chan_, ra)
			}
			if !c.chan_ && ra != nil && !errors.Is(ra, c.err.(error)) && ra != c.err {
				t.Fatalf("không chặn thì phải trả NGUYÊN lỗi, được %v", ra)
			}
		})
	}
}

// Đây là điều kiện đúng-sai của cả bản vá: vòng lặp của agentcore chỉ hỏi `isRetryable`, cài
// bằng `errors.As` trên `RetryableError`. Lớp ngoài cùng phải khai FALSE, nếu không nó vẫn gõ
// đủ 7 lần và bản vá không làm gì cả.
func TestChanChoLau_AgentcoreThayKhongDangThuLai(t *testing.T) {
	ra := ChanChoLau(loiQuota{CAU_429}, ChinhSach{})

	var r agentcore.RetryableError
	if !errors.As(ra, &r) {
		t.Fatal("lỗi sau khi chặn không implement RetryableError — agentcore sẽ coi là không thử lại được vì lý do SAI")
	}
	if r.Retryable() {
		t.Fatal("vẫn khai retryable — vòng lặp agentcore sẽ thử đủ 7 lần, đúng thứ bản vá tồn tại để chặn")
	}
	if thuLaiDuoc(loiQuota{CAU_429}) != true {
		t.Fatal("lỗi gốc phải retryable, nếu không bài kiểm này không chứng minh gì")
	}
}

// Nửa còn lại: chặn thử lại KHÔNG được đổi phép phân loại của tầng trên.
//
// # Vì sao khẳng định là "không đổi" chứ không phải "vẫn đổi được nhà cung cấp"
//
// Bản đầu của bài kiểm này đòi `IsFailoverEligible` phải TRUE cho câu 429 thật, và nó đỏ. Đọc
// `agentcore/errors.go:266` mới ra: `classifyProviderSentinel` khớp `"usage limit"` TRƯỚC nhánh
// rate-limit và trả `ErrProviderQuota`, mà `IsFailoverEligible` chỉ liệt RateLimit / Timeout /
// Network / StreamIdle / Overloaded. Tức câu quota của codex CHƯA BAO GIỜ kích hoạt failover,
// từ trước bản vá — đó là chính sách của agentcore, không phải hư hại do ta gây ra.
//
// Nên điều đáng canh là phép BẢO TOÀN: sau khi chặn, mọi phân loại phải ra đúng như trước. Đó
// là thứ giữ cho `Unwrap` không bị ai gỡ mất, và nó canh được cả hai loại lỗi.
func TestChanChoLau_GiuNguyenPhepPhanLoai(t *testing.T) {
	ca := []struct {
		ten string
		err error
	}{
		// Phân loại thành Quota → không đổi nhà cung cấp (chính sách agentcore).
		{"quota", loiQuota{CAU_429}},
		// Phân loại thành RateLimit → CÓ đổi nhà cung cấp. Câu này cố ý không chứa "usage
		// limit", nếu không nó rơi vào nhánh quota và bài kiểm chỉ còn đo một chiều.
		{"rate limit", loiGia{msg: "[429] rate limit exceeded, retry after 30m", thuLai: true}},
	}

	for _, c := range ca {
		t.Run(c.ten, func(t *testing.T) {
			truoc := agentcore.IsFailoverEligible(c.err)
			ra := ChanChoLau(c.err, ChinhSach{})

			var bo *LoiBoCuoc
			if !errors.As(ra, &bo) {
				t.Fatalf("ca này phải bị chặn mới nói được gì về bảo toàn")
			}
			if sau := agentcore.IsFailoverEligible(ra); sau != truoc {
				t.Fatalf("chặn xong đổi luôn quyền failover: %v → %v", truoc, sau)
			}
			// Phân loại phải ra ĐÚNG KẾT QUẢ CŨ.
			//
			// Không so bằng `errors.Is(ra, ClassifyProvider(err))`: `ClassifyProvider` phân loại
			// theo VĂN BẢN (`errors.go:262`), nên sentinel nó trả về thường không hề nằm trong
			// chuỗi `Unwrap` — phép so đó đỏ ngay cả với mã đúng, và tôi đã viết nó sai một lần.
			if sau, truoc := agentcore.ClassifyProvider(ra), agentcore.ClassifyProvider(c.err); sau != truoc {
				t.Fatalf("phân loại đổi sau khi chặn: %v → %v", truoc, sau)
			}
			// Và chuỗi lỗi gốc phải còn với tới được — đây là phần CẤU TRÚC, độc lập với việc
			// câu chữ có được chép vào thông báo hay không.
			if !errors.Is(ra, c.err) {
				t.Fatal("Unwrap đứt — errors.Is của tầng trên không còn thấy lỗi gốc")
			}
		})
	}
}

// Và chiều dương phải được chứng minh riêng, nếu không bài trên vẫn xanh khi CẢ HAI phía đều
// false vì một lý do sai.
func TestChanChoLau_RateLimitVanDoiDuocNhaCungCap(t *testing.T) {
	ra := ChanChoLau(loiGia{msg: "[429] rate limit exceeded, retry after 30m", thuLai: true}, ChinhSach{})
	if !agentcore.IsFailoverEligible(ra) {
		t.Fatal("chặn thử lại đã giết failover của lỗi rate-limit — người dùng có fallback vẫn bị dừng máy")
	}
}

// Lũy đẳng: `failoverModel` gọi `ChanChoLau` trên một lỗi có thể đã qua `SwappableModel`.
func TestChanChoLau_LuyDang(t *testing.T) {
	mot := ChanChoLau(loiQuota{CAU_429}, ChinhSach{})
	hai := ChanChoLau(mot, ChinhSach{})
	if hai != mot {
		t.Fatalf("bọc chồng: lần hai trả một lỗi khác (%v ≠ %v)", hai, mot)
	}
	var bo *LoiBoCuoc
	errors.As(hai, &bo)
	if bo.LanThu != 0 {
		t.Fatalf("LanThu = %d, muốn 0 — lớp ngoài đã ghi đè con số của lớp trong", bo.LanThu)
	}
}

// Câu người vận hành đọc lúc quay lại. Phải nói ĐƯỢC BAO LÂU, vì đó là thứ quyết định họ chờ
// hay đi đổi nhà cung cấp.
func TestChanChoLau_CauLoi(t *testing.T) {
	ra := ChanChoLau(loiQuota{CAU_429}, ChinhSach{})
	// 13m16s làm tròn LÊN thành 14 phút — nói ngắn hơn thực tế là mời quay lại lúc cửa còn đóng.
	if got := ra.Error(); got == "" ||
		!contains(got, "14") ||
		!contains(got, CAU_429) {
		t.Fatalf("câu lỗi thiếu mốc chờ hoặc thiếu lỗi gốc: %q", got)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

/* ── LocChoLau: đường stream ───────────────────────────────────────────── */

// Writer chạy streaming, và `callLLMStream` biến `StreamEventError` THÀNH lỗi của lượt gọi.
// Bỏ sót đường này là bỏ sót đúng đường đã đẻ ra "Thử lại (6/7)".
func TestLocChoLau_ChanLoiTrongDongSuKien(t *testing.T) {
	nguon := make(chan agentcore.StreamEvent, 3)
	nguon <- agentcore.StreamEvent{Type: agentcore.StreamEventTextDelta, Delta: "chữ"}
	nguon <- agentcore.StreamEvent{Type: agentcore.StreamEventError, Err: loiQuota{CAU_429}}
	close(nguon)

	var ds []agentcore.StreamEvent
	for ev := range LocChoLau(context.Background(), nguon, ChinhSach{}) {
		ds = append(ds, ev)
	}

	if len(ds) != 2 {
		t.Fatalf("nuốt mất sự kiện: %d, muốn 2", len(ds))
	}
	if ds[0].Delta != "chữ" {
		t.Fatalf("sự kiện thường bị đổi: %+v", ds[0])
	}
	var bo *LoiBoCuoc
	if !errors.As(ds[1].Err, &bo) {
		t.Fatalf("lỗi trong dòng sự kiện KHÔNG bị chặn (%v) — Writer vẫn sẽ thử đủ 7 lần", ds[1].Err)
	}
}

// Sự kiện lỗi chờ ngắn phải đi qua nguyên vẹn — nếu không mọi trục trặc thoáng qua đều thành
// một lượt tạm dừng.
func TestLocChoLau_ChoNganDiQuaNguyenVen(t *testing.T) {
	goc := loiGia{msg: "try again in 5s", thuLai: true}
	nguon := make(chan agentcore.StreamEvent, 1)
	nguon <- agentcore.StreamEvent{Type: agentcore.StreamEventError, Err: goc}
	close(nguon)

	ev := <-LocChoLau(context.Background(), nguon, ChinhSach{})
	if ev.Err != error(goc) {
		t.Fatalf("lỗi chờ ngắn bị đổi: %v", ev.Err)
	}
}

// `callLLMStream` RỜI BỎ kênh giữa chừng khi gặp lỗi. Không có nhánh `ctx.Done()` thì goroutine
// của bộ lọc treo vĩnh viễn ở lượt gửi kế tiếp — một rò rỉ mỗi lần stream hỏng.
func TestLocChoLau_KhongTreoKhiNguoiDocBoDi(t *testing.T) {
	nguon := make(chan agentcore.StreamEvent)
	ctx, huy := context.WithCancel(context.Background())
	ra := LocChoLau(ctx, nguon, ChinhSach{})

	// Đổ đầy đệm rồi thêm một sự kiện nữa để bộ lọc kẹt ở lượt gửi.
	go func() {
		for i := 0; i < 200; i++ {
			select {
			case nguon <- agentcore.StreamEvent{Type: agentcore.StreamEventTextDelta}:
			case <-ctx.Done():
				close(nguon)
				return
			}
		}
		close(nguon)
	}()

	<-ra // đọc đúng một cái rồi bỏ đi, y như `callLLMStream` lúc gặp lỗi
	huy()

	xong := make(chan struct{})
	go func() {
		for range ra { //nolint:revive // rút cạn để biết goroutine đã thoát
		}
		close(xong)
	}()
	select {
	case <-xong:
	case <-time.After(2 * time.Second):
		t.Fatal("bộ lọc không thoát sau khi hủy context — rò rỉ một goroutine mỗi lần stream hỏng")
	}
}
