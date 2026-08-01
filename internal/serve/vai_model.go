package serve

import (
	"fmt"
	"net/http"
)

// Model + độ suy luận theo VAI — bản web của lệnh `/model` trong TUI.
//
// # Vì sao ủy quyền cho Host chứ không tự ghi cấu hình
//
// `Host.SwitchModel` làm ba việc trong một giao dịch: dựng lại model set đang chạy, cập
// nhật `cfg.Roles`, rồi ghi xuống tệp cấu hình (`host.go:1367`). Nếu serve tự ghi
// `cfg.Roles` thì engine đang chạy vẫn dùng model cũ trong khi tệp nói model mới — tức
// giao diện nói một điều, dây chuyền làm điều khác, và không có gì báo lệch.
//
// Cái giá: nhóm route này đòi engine ĐANG MỞ. Đó là cái giá đúng — đổi model của một
// dây chuyền không chạy là đổi cấu hình, và việc đó đã có `PUT /api/config`.

// handleDocVaiModel — GET /api/books/{book}/models
func (s *server) handleDocVaiModel(w http.ResponseWriter, r *http.Request) {
	p, err := s.may.dangMo(r.PathValue("book"))
	if err != nil {
		writeErr(w, maLoi(err), err)
		return
	}
	eng := p.eng

	// Danh sách model theo từng provider: giao diện cần nó để dựng ô chọn hai tầng
	// (provider → model) mà không phải gọi thêm một vòng cho mỗi provider.
	theoNCC := map[string][]string{}
	for _, ncc := range eng.ConfiguredProviders() {
		theoNCC[ncc] = eng.ConfiguredModels(ncc)
	}

	kenh := make([]map[string]any, 0, len(vaiCoTheDoi))
	for _, vai := range vaiCoTheDoi {
		ncc, model, coRieng := eng.CurrentModelSelection(vai)
		muc := eng.AvailableThinking(vai)
		mucTen := make([]string, 0, len(muc))
		for _, m := range muc {
			mucTen = append(mucTen, string(m))
		}
		kenh = append(kenh, map[string]any{
			"role":             vai,
			"provider":         ncc,
			"model":            model,
			"explicit":         coRieng, // false = đang thừa hưởng mặc định, không phải đặt riêng
			"thinking":         eng.CurrentThinking(vai),
			"thinking_options": mucTen,
		})
	}

	writeJSON(w, map[string]any{
		"channels":           kenh,
		"providers":          eng.ConfiguredProviders(),
		"models_by_provider": theoNCC,
	})
}

// handleGhiVaiModel — PUT /api/books/{book}/models
//
// Một route đổi được cả model và độ suy luận vì hai thứ đó là hai núm của CÙNG một kênh,
// và người dùng thường đổi cùng lúc. Trả về danh sách việc đã làm để giao diện không phải
// đoán cái nào đã ăn.
func (s *server) handleGhiVaiModel(w http.ResponseWriter, r *http.Request) {
	var than struct {
		Vai      string  `json:"role"`
		Provider *string `json:"provider,omitempty"`
		Model    *string `json:"model,omitempty"`
		Thinking *string `json:"thinking,omitempty"`
	}
	if err := docThan(r, &than); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if !laVaiHopLe(than.Vai) {
		writeErr(w, http.StatusBadRequest,
			fmt.Errorf("vai %q không đặt được model riêng; chọn một trong: %v", than.Vai, vaiCoTheDoi))
		return
	}
	p, err := s.may.dangMo(r.PathValue("book"))
	if err != nil {
		writeErr(w, maLoi(err), err)
		return
	}

	daLam := []string{}
	// Đổi model đòi CẢ provider và model. Cho gửi lẻ một nửa sẽ tạo ra một trạng thái
	// nửa vời (provider mới + model cũ) mà `SwitchModel` không thể diễn giải đúng.
	if than.Provider != nil || than.Model != nil {
		if than.Provider == nil || than.Model == nil {
			writeErr(w, http.StatusBadRequest,
				fmt.Errorf("đổi model phải gửi cả provider và model, không gửi lẻ một nửa"))
			return
		}
		if err := p.eng.SwitchModel(than.Vai, *than.Provider, *than.Model); err != nil {
			writeErr(w, http.StatusBadRequest, err)
			return
		}
		daLam = append(daLam, "model")
	}
	if than.Thinking != nil {
		if err := p.eng.SetRoleThinking(than.Vai, *than.Thinking); err != nil {
			writeErr(w, http.StatusBadRequest, err)
			return
		}
		daLam = append(daLam, "thinking")
	}
	if len(daLam) == 0 {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("không có gì để đổi"))
		return
	}
	writeJSON(w, map[string]any{"applied": daLam})
}

func laVaiHopLe(vai string) bool {
	for _, v := range vaiCoTheDoi {
		if v == vai {
			return true
		}
	}
	return false
}
