package bootstrap

import "testing"

/*
Đổi model của một lượt chạy sang nhà cung cấp THÊM SAU khi engine đã mở.

# Ca thật

Người dùng thêm `kiraai` trong studio, rồi sang Phiên chạy đổi vai Chấp bút sang nó. `Swap`
tra `ms.config.Providers` — ảnh chụp lúc `host.New` — nên nó chết với "provider is not
configured", nói về một nhà cung cấp mà người dùng vừa lưu xong và đang nhìn thấy.

Hư hại thật hơn vẻ ngoài: đó đúng là đường thoát khi nhà cung cấp chính hết quota, tức người
dùng cần nó nhất vào lúc nó gãy.
*/
func TestModelSet_DoiSangNhaCungCapThemSau(t *testing.T) {
	cfg := Config{
		Provider: "cu", ModelName: "model-cu",
		Providers: map[string]ProviderConfig{
			"cu": {Type: "openai", APIKey: "k", Models: []ModelConfig{{Name: "model-cu"}}},
		},
	}
	ms, err := NewModelSet(cfg)
	if err != nil {
		t.Fatalf("dựng model set: %v", err)
	}

	// Chưa biết `moi` thì phải từ chối — đây là hành vi ĐÚNG, và bài kiểm khẳng định nó để
	// lượt sau chứng minh được rằng chính `CapNhatNhaCungCap` mở đường, không phải gì khác.
	if err := ms.Swap("writer", "moi", "model-moi"); err == nil {
		t.Fatal("đổi sang một nhà cung cấp chưa khai mà vẫn xuôi")
	}

	ms.CapNhatNhaCungCap(map[string]ProviderConfig{
		"moi": {Type: "openai", APIKey: "k2", Models: []ModelConfig{{Name: "model-moi"}}},
	})

	if err := ms.Swap("writer", "moi", "model-moi"); err != nil {
		t.Fatalf("đã nạp danh mục mới mà vẫn không đổi được: %v", err)
	}
	p, m, _ := ms.CurrentSelection("writer")
	if p != "moi" || m != "model-moi" {
		t.Fatalf("vai writer = %s/%s, muốn moi/model-moi", p, m)
	}
}

// TRỘN, không thay: một nhà cung cấp đang được lượt chạy dùng dở không được biến mất chỉ vì
// tệp cấu hình lúc này không còn nhắc tới nó.
func TestModelSet_CapNhatKhongXoaNhaCungCapDangDung(t *testing.T) {
	cfg := Config{
		Provider: "cu", ModelName: "model-cu",
		Providers: map[string]ProviderConfig{
			"cu": {Type: "openai", APIKey: "k", Models: []ModelConfig{{Name: "model-cu"}}},
		},
	}
	ms, err := NewModelSet(cfg)
	if err != nil {
		t.Fatalf("dựng model set: %v", err)
	}

	ms.CapNhatNhaCungCap(map[string]ProviderConfig{
		"moi": {Type: "openai", APIKey: "k2", Models: []ModelConfig{{Name: "model-moi"}}},
	})

	if err := ms.Swap("writer", "cu", "model-cu"); err != nil {
		t.Fatalf("nhà cung cấp cũ biến mất sau khi nạp danh mục mới: %v", err)
	}
}

// Danh mục rỗng (đọc cấu hình hỏng) không được xóa trắng thứ đang dùng được.
func TestModelSet_CapNhatRongLaKhongLam(t *testing.T) {
	cfg := Config{
		Provider: "cu", ModelName: "model-cu",
		Providers: map[string]ProviderConfig{
			"cu": {Type: "openai", APIKey: "k", Models: []ModelConfig{{Name: "model-cu"}}},
		},
	}
	ms, err := NewModelSet(cfg)
	if err != nil {
		t.Fatalf("dựng model set: %v", err)
	}
	ms.CapNhatNhaCungCap(nil)
	if err := ms.Swap("writer", "cu", "model-cu"); err != nil {
		t.Fatalf("nạp danh mục rỗng đã xóa mất nhà cung cấp: %v", err)
	}
}
