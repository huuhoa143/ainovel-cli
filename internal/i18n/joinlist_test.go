package i18n

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestJoinListTheoNgonNgu(t *testing.T) {
	t.Cleanup(func() { _ = SetLocale(DefaultLocale) })

	items := []string{"characters", "world_rules"}

	if err := SetLocale(Vietnamese); err != nil {
		t.Fatal(err)
	}
	if got, want := JoinList(items), "characters, world_rules"; got != want {
		t.Errorf("vi: JoinList = %q, muốn %q", got, want)
	}

	// Đường zh phải giữ đúng dấu của upstream: đổi nó là đổi ngầm mọi chuỗi
	// người dùng tiếng Trung đang thấy.
	if err := SetLocale(Chinese); err != nil {
		t.Fatal(err)
	}
	if got, want := JoinList(items), "characters、world_rules"; got != want {
		t.Errorf("zh: JoinList = %q, muốn %q", got, want)
	}

	if got := JoinList(nil); got != "" {
		t.Errorf("danh sách rỗng phải cho chuỗi rỗng, được %q", got)
	}
}

// Không được viết cứng dấu nối liệt kê tiếng Trung trong code sản phẩm.
//
// Đây là bất biến về CÁCH VIẾT, nên phải soi mã nguồn: dấu nối không phải msgid
// nên nó không nằm trong catalog, và mọi phép đo độ phủ dịch đều vô hình với nó.
// Bộ đối chiếu format verb cũng không thấy. Lỗi chỉ lộ khi chạy ở locale vi và
// ĐỌC output — "characters、world_rules" nằm giữa một câu tiếng Việt.
func TestKhongVietCungDauNoiLietKe(t *testing.T) {
	root := filepath.Join("..", "..", "internal")
	var found []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		// listSeparator là chỗ DUY NHẤT được phép nêu dấu đó.
		if strings.HasSuffix(path, filepath.Join("i18n", "i18n.go")) {
			return nil
		}
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for i, line := range strings.Split(string(src), "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") {
				continue // comment được phép nhắc tới dấu đó
			}
			// Chỉ bắt đúng lớp lỗi: dấu 、 làm ĐỐI SỐ của strings.Join. Dấu đó
			// nằm trong nội dung một msgid tiếng Trung (ví dụ prompt cocreate) hay
			// trong comment cuối dòng là hợp lệ — nó là chữ của bản gốc, không phải
			// lựa chọn dấu nối của ta.
			if strings.Contains(line, `strings.Join(`) && strings.Contains(line, `"、"`) {
				found = append(found, filepath.Base(path)+":"+itoa(i+1)+"  "+trimmed)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("quét: %v", err)
	}

	for _, f := range found {
		t.Errorf("viết cứng dấu nối liệt kê tiếng Trung — dùng i18n.JoinList:\n  %s", f)
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}
