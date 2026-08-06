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

/*
Đổi KHÓA API của một nhà cung cấp giữa lúc engine đang mở.

# Ca thật, đo được đầu-cuối

Gateway hết hạn mức. Người dùng mua khóa mới, lưu vào cấu hình, và `POST /chat/completions`
bằng khóa mới trả 200 trong 5,3 giây — đo bằng curl. Nhưng engine đang mở vẫn 429 với đúng câu
cũ ("token quota exceeded for this API key"), vì `NewModelSet` dựng client MỘT LẦN lúc
`host.New` và nó cầm khóa của 14:14.

Trộn danh mục thôi là chưa đủ: nó chỉ chữa đường `Swap`, không chạm tới client đã dựng. Không
dấu hiệu nào trên màn hình nói ra điều đó — người dùng chỉ thấy "đổi khóa rồi mà vẫn lỗi".
*/
func TestModelSet_DoiKhoaThiDungLaiClient(t *testing.T) {
	cfg := Config{
		Provider: "g", ModelName: "m",
		Providers: map[string]ProviderConfig{
			"g": {Type: "openai", APIKey: "khoa-cu", Models: []ModelConfig{{Name: "m"}}},
		},
		Roles: map[string]RoleConfig{"writer": {Provider: "g", Model: "m"}},
	}
	ms, err := NewModelSet(cfg)
	if err != nil {
		t.Fatalf("dựng model set: %v", err)
	}
	truocMacDinh := ms.Default.SwappableModel.Current()
	truocWriter := ms.models["writer"].SwappableModel.Current()

	ms.CapNhatNhaCungCap(map[string]ProviderConfig{
		"g": {Type: "openai", APIKey: "khoa-moi", Models: []ModelConfig{{Name: "m"}}},
	})

	if ms.Default.SwappableModel.Current() == truocMacDinh {
		t.Fatal("kênh mặc định vẫn cầm client cũ — engine sẽ gọi bằng khóa đã hết hạn mức")
	}
	if ms.models["writer"].SwappableModel.Current() == truocWriter {
		t.Fatal("vai writer vẫn cầm client cũ")
	}
	// Danh tính KHÔNG được đổi: vẫn đúng nhà cung cấp và model, chỉ ruột client là mới.
	if p, m, _ := ms.CurrentSelection("writer"); p != "g" || m != "m" {
		t.Fatalf("danh tính vai đổi theo: %s/%s", p, m)
	}
}

// Sửa DANH SÁCH MODEL không được làm dựng lại client: danh mục chỉ để gợi ý, nó không đổi cách
// gọi. Dựng lại vô cớ là vứt kết nối đang ấm ở mỗi lần người dùng gõ thêm một tên.
func TestModelSet_ThemTenModelKhongDungLaiClient(t *testing.T) {
	cfg := Config{
		Provider: "g", ModelName: "m",
		Providers: map[string]ProviderConfig{
			"g": {Type: "openai", APIKey: "k", Models: []ModelConfig{{Name: "m"}}},
		},
	}
	ms, err := NewModelSet(cfg)
	if err != nil {
		t.Fatalf("dựng model set: %v", err)
	}
	truoc := ms.Default.SwappableModel.Current()

	ms.CapNhatNhaCungCap(map[string]ProviderConfig{
		"g": {Type: "openai", APIKey: "k", Models: []ModelConfig{{Name: "m"}, {Name: "m2"}}},
	})

	if ms.Default.SwappableModel.Current() != truoc {
		t.Fatal("dựng lại client chỉ vì danh sách model dài thêm một dòng")
	}
}

// Nhà cung cấp KHÁC đổi khóa thì vai đang dùng nhà cung cấp này phải đứng yên.
func TestModelSet_DoiKhoaNoiKhacKhongDungLaiNoiNay(t *testing.T) {
	cfg := Config{
		Provider: "a", ModelName: "m",
		Providers: map[string]ProviderConfig{
			"a": {Type: "openai", APIKey: "ka", Models: []ModelConfig{{Name: "m"}}},
			"b": {Type: "openai", APIKey: "kb", Models: []ModelConfig{{Name: "m"}}},
		},
	}
	ms, err := NewModelSet(cfg)
	if err != nil {
		t.Fatalf("dựng model set: %v", err)
	}
	truoc := ms.Default.SwappableModel.Current()

	ms.CapNhatNhaCungCap(map[string]ProviderConfig{
		"b": {Type: "openai", APIKey: "kb-moi", Models: []ModelConfig{{Name: "m"}}},
	})

	if ms.Default.SwappableModel.Current() != truoc {
		t.Fatal("đổi khóa của `b` mà client của `a` cũng bị dựng lại")
	}
}
