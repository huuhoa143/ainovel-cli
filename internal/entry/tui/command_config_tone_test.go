package tui

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Màu dòng thông báo trong bảng cấu hình từng được suy ra bằng cách dò TIỀN TỐ
// của chính text hiển thị:
//
//	strings.HasPrefix(state.message, "连接测试成功")
//
// Cách đó vỡ ngay khi bản dịch đổi một chữ, và đã vỡ sẵn trong cả bản tiếng
// Trung — nhánh dò "已选择" không còn khớp chỗ gán nào, tức là code chết.
//
// Test này chốt rằng nó không quay lại. Nó soi mã nguồn thay vì hành vi, vì đây
// là bất biến về CÁCH VIẾT: một lần ai đó thêm lại HasPrefix trên message là
// bug tái sinh, và không có cách kiểm nào từ bên ngoài phát hiện được (màu vẫn
// "đúng" với tiếng Trung, chỉ sai với mọi ngôn ngữ khác).
func TestKhongDoTienToTextHienThiDeQuyetDinhMau(t *testing.T) {
	files := []string{"command_config.go", "model_update.go", "command_model.go"}

	for _, name := range files {
		path := filepath.Join(".", name)
		src, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("đọc %s: %v", name, err)
		}
		for i, line := range strings.Split(string(src), "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") {
				continue // comment được phép nhắc tới hành vi cũ
			}
			for _, bad := range []string{"HasPrefix(state.message", "HasPrefix(s.message", "HasPrefix(m.modelConfig.message"} {
				if strings.Contains(trimmed, bad) {
					t.Errorf("%s:%d dò tiền tố text hiển thị để suy trạng thái — dùng messageTone:\n  %s",
						name, i+1, trimmed)
				}
			}
		}
	}
}

// Setter phải đặt tone tương ứng, và mặc định là lỗi. Nếu quên gán tone thì màu
// phải an toàn (đỏ), không được lặng lẽ thành xanh "thành công".
func TestSetterDatDungTone(t *testing.T) {
	var s modelConfigState

	// Zero value: chưa gán gì thì tone là lỗi.
	if s.messageTone != configToneError {
		t.Errorf("tone mặc định = %v, phải là configToneError", s.messageTone)
	}

	s.setSuccess("xong")
	if s.message != "xong" || s.messageTone != configToneSuccess {
		t.Errorf("setSuccess: message=%q tone=%v", s.message, s.messageTone)
	}

	s.setNotice("đang chạy")
	if s.message != "đang chạy" || s.messageTone != configToneNotice {
		t.Errorf("setNotice: message=%q tone=%v", s.message, s.messageTone)
	}

	// Quan trọng: setMessage sau setSuccess phải HẠ tone về lỗi, không để sót
	// tone thành công của thông báo trước — nếu không, một lỗi ngay sau một
	// thành công sẽ hiện màu xanh.
	s.setSuccess("xong")
	s.setMessage("lỗi rồi")
	if s.messageTone != configToneError {
		t.Errorf("setMessage phải hạ tone về lỗi, được %v", s.messageTone)
	}
}

// Không được gán trực tiếp message của modelConfigState ở ngoài setter: hai
// trường lệch nhau là màu sai, và kiểu lỗi đó không thể phát hiện bằng test hành
// vi (màu vẫn "đúng" trong một số lối đi).
//
// Phạm vi CỐ Ý chỉ gồm hai file dùng modelConfigState. modelSwitchState trong
// command_model.go cũng có field `message` cùng tên nhưng render LUÔN bằng
// colorError, không suy màu từ nội dung — nó không có tone và không cần, nên bắt
// nó ở đây chỉ tạo ra tiếng ồn buộc người sau phải nới test.
func TestKhongGanMessageTrucTiep(t *testing.T) {
	for _, name := range []string{"command_config.go", "model_update.go"} {
		src, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("đọc %s: %v", name, err)
		}
		for i, line := range strings.Split(string(src), "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") {
				continue
			}
			// Thân của ba setter là chỗ duy nhất được phép gán.
			if trimmed == "s.message = text" {
				continue
			}
			for _, bad := range []string{"state.message =", "s.message =", "modelConfig.message ="} {
				if strings.HasPrefix(trimmed, bad) {
					t.Errorf("%s:%d gán message trực tiếp — dùng setMessage/setNotice/setSuccess:\n  %s",
						name, i+1, trimmed)
				}
			}
		}
	}
}
