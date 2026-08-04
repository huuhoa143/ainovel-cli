package serve

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/voocel/ainovel-cli/internal/bootstrap"
)

// handleLietKeModel — GET /api/models?provider=<tên>
//
// # Vì sao bề mặt này tồn tại
//
// Ô Model trước đây là một ô chữ tự do, và cái giá của nó đã đo được trên máy thật: người
// dùng đặt provider dùng `cx/gpt-5.5`, nhưng ô "model mặc định" vẫn để `gpt-5.5`. Router
// không có model tên đó nên trả 404, Arbiter chết, và thông báo hiện lên là
// `model_not_found: No active credentials for provider: openai` — một câu nói về CREDENTIALS
// trong khi lỗi thật là SAI TÊN MODEL. Ba lượt tạo hỏng liên tiếp vì đúng chỗ này.
//
// Không ô chữ tự do nào tự bắt được lỗi ấy. Danh sách thì bắt được, vì nó đến từ chính nhà
// cung cấp.
//
// # Vì sao liệt kê model CŨNG LÀ kiểm tra kết nối
//
// Bề mặt này cố tình không có nút "kiểm tra" riêng gọi thử một lượt chat. Một lượt chat thử
// tiêu tiền thật, và nó kiểm được đúng những thứ mà `/models` đã kiểm rồi:
//
//	gọi được  → địa chỉ gốc đúng, mạng thông
//	200       → khóa hợp lệ (401/403 thì không)
//	có trong danh sách → tên model có thật
//
// Ba câu hỏi ấy là toàn bộ những gì hỏng ở lượt vừa rồi, và trả lời chúng miễn phí.
func (s *server) handleLietKeModel(w http.ResponseWriter, r *http.Request) {
	duong := bootstrap.EffectiveConfigPath()
	cfg, err := bootstrap.LoadConfigFile(duong)
	if err != nil {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("đọc cấu hình: %w", err))
		return
	}

	ten := strings.TrimSpace(r.URL.Query().Get("provider"))
	if ten == "" {
		ten = cfg.Provider
	}
	if ten == "" {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("chưa có nhà cung cấp nào để hỏi"))
		return
	}
	pc, ok := cfg.Providers[ten]
	if !ok {
		writeErr(w, http.StatusNotFound, fmt.Errorf("không có nhà cung cấp %q trong cấu hình", ten))
		return
	}
	if strings.TrimSpace(pc.APIKey) == "" {
		writeErr(w, http.StatusBadRequest, fmt.Errorf(
			"nhà cung cấp %q chưa có khóa API — đặt khóa rồi mới hỏi được danh sách model", ten))
		return
	}

	duongModel, dat, err := diaChiLietKe(pc)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}

	ctx, huy := context.WithTimeout(r.Context(), 20*time.Second)
	defer huy()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, duongModel, nil)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	dat(req)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		// Không gọi được là một câu trả lời CÓ ÍCH, không phải lỗi máy chủ của ta: địa chỉ
		// gốc sai hoặc mạng chặn. Trả 502 kèm nguyên văn để giao diện in ra được.
		writeErr(w, http.StatusBadGateway, fmt.Errorf(
			"không gọi được %s: %w", duongModel, err))
		return
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		writeErr(w, http.StatusBadGateway, fmt.Errorf(
			"%s trả HTTP %d — %s", duongModel, res.StatusCode, ngheoNan(res.StatusCode)))
		return
	}

	var than struct {
		Data []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"data"`
		// Anthropic trả cùng dạng `data[]`, Gemini trả `models[]`.
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.NewDecoder(res.Body).Decode(&than); err != nil {
		writeErr(w, http.StatusBadGateway, fmt.Errorf("%s trả nội dung không đọc được: %w", duongModel, err))
		return
	}

	ten2 := map[string]bool{}
	for _, m := range than.Data {
		if m.ID != "" {
			ten2[m.ID] = true
		}
	}
	for _, m := range than.Models {
		// Gemini trả "models/gemini-2.5-pro"; cắt tiền tố cho khớp thứ người dùng gõ.
		ten2[strings.TrimPrefix(m.Name, "models/")] = true
	}

	ds := make([]string, 0, len(ten2))
	for k := range ten2 {
		ds = append(ds, k)
	}
	sort.Strings(ds)

	writeJSON(w, map[string]any{
		"provider": ten,
		"models":   ds,
		"count":    len(ds),
	})
}

// diaChiLietKe trả về địa chỉ liệt kê model và hàm đặt header xác thực cho từng giao thức.
//
// Trả lỗi tường minh cho giao thức chưa dựng, thay vì đoán một đường dẫn rồi để người dùng
// nhận một lỗi 404 khó hiểu từ phía nhà cung cấp.
func diaChiLietKe(pc bootstrap.ProviderConfig) (string, func(*http.Request), error) {
	goc := strings.TrimRight(strings.TrimSpace(pc.BaseURL), "/")
	loai := strings.ToLower(strings.TrimSpace(pc.Type))
	if loai == "" {
		loai = "openai"
	}

	switch loai {
	case "openai":
		if goc == "" {
			goc = "https://api.openai.com/v1"
		}
		return goc + "/models", func(r *http.Request) {
			r.Header.Set("Authorization", "Bearer "+pc.APIKey)
		}, nil

	case "anthropic":
		if goc == "" {
			goc = "https://api.anthropic.com/v1"
		}
		return goc + "/models", func(r *http.Request) {
			r.Header.Set("x-api-key", pc.APIKey)
			r.Header.Set("anthropic-version", "2023-06-01")
		}, nil

	case "gemini":
		if goc == "" {
			goc = "https://generativelanguage.googleapis.com/v1beta"
		}
		return goc + "/models", func(r *http.Request) {
			r.Header.Set("x-goog-api-key", pc.APIKey)
		}, nil

	default:
		return "", nil, fmt.Errorf(
			"chưa liệt kê được model cho giao thức %q — gõ tay tên model vào ô bên cạnh", loai)
	}
}

// ngheoNan dịch mã HTTP thành câu nói ra NGUYÊN NHÂN, không phải lặp lại con số.
func ngheoNan(ma int) string {
	switch ma {
	case http.StatusUnauthorized, http.StatusForbidden:
		return "khóa API sai hoặc hết hạn"
	case http.StatusNotFound:
		return "địa chỉ gốc không có đường /models — kiểm tra lại Địa chỉ gốc"
	case http.StatusTooManyRequests:
		return "bị giới hạn tần suất, thử lại sau"
	default:
		return "nhà cung cấp từ chối yêu cầu"
	}
}
