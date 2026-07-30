package i18n

import (
	"fmt"
	"strings"
	"testing"
)

func TestExtractVerbs(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{"không có verb", nil},
		{"第 %d 章", []string{"%d"}},
		{"%s: %w", []string{"%s", "%w"}},
		{"tiến độ 100%% xong", nil},                        // %% là literal
		{"%-8s|%.2f|%+d", []string{"%-8s", "%.2f", "%+d"}}, // flag, precision
		{"%v và %#v", []string{"%v", "%#v"}},               // flag #
		{"%[2]s trước %[1]d", []string{"%[2]s", "%[1]d"}},  // chỉ số tường minh
		{"đạt 50%% ở chương %d", []string{"%d"}},           // literal lẫn verb

		// Chỉ số tường minh phải nằm SAU width/precision, đúng như Go quy định.
		// Đã kiểm bằng Go thật: %.2[2]f cho "2.00", còn %[2].2f cho BADINDEX.
		{"%.2[2]f", []string{"%.2[2]f"}},
		{"%-8[2]s", []string{"%-8[2]s"}},
		{"%.0[3]f%% của %[1]s", []string{"%.0[3]f", "%[1]s"}},

		// KHÔNG phải dương tính giả, dù trông giống: Go cũng đọc "% c" là một verb
		// (space là flag, c là verb). Nên một bản dịch quên nhân đôi dấu phần trăm
		// sẽ bị bắt — đúng ý muốn, vì chuỗi đó lúc chạy sẽ in ra rác.
		{"đạt 80% của", []string{"% c"}},
	}
	for _, c := range cases {
		got := ExtractVerbs(c.in)
		if len(got) != len(c.want) {
			t.Errorf("ExtractVerbs(%q): được %d verb, muốn %d (%v)", c.in, len(got), len(c.want), got)
			continue
		}
		for i := range got {
			if got[i].Raw != c.want[i] {
				t.Errorf("ExtractVerbs(%q)[%d] = %q, muốn %q", c.in, i, got[i].Raw, c.want[i])
			}
		}
	}
}

func TestCheckPairBatChoLech(t *testing.T) {
	cases := []struct {
		name    string
		msgid   string
		target  string
		wantBad bool
	}{
		{"khớp hoàn toàn", "第 %d 章无草稿", "Chương %d chưa có bản nháp", false},
		{"thiếu verb", "第 %d 章无草稿", "Chương chưa có bản nháp", true},
		{"thừa verb", "无草稿", "Chương %d chưa có bản nháp", true},
		{"đảo trật tự ngầm", "第 %d 章的 %s", "%s ở chương %d", true},
		{"đảo trật tự bằng chỉ số", "第 %d 章的 %s", "%[2]s ở chương %[1]d", false},
		{"giữ %w để errors.Is còn chạy", "读取失败: %w", "Đọc thất bại: %w", false},
		{"mất %w", "读取失败: %w", "Đọc thất bại", true},
		{"%% không tính là verb", "完成 100%%", "Hoàn thành 100%%", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := checkPair(c.msgid, c.target)
			if (got != nil) != c.wantBad {
				t.Fatalf("checkPair(%q, %q) = %v, muốn sai lệch=%v", c.msgid, c.target, got, c.wantBad)
			}
		})
	}
}

// TestCatalogViKhopVerb là cái gác chính của thiết kế "msgid là chuỗi nguồn":
// mọi bản dịch phải giữ đúng bộ format verb, nếu không fmt sẽ in "%!d(MISSING)"
// ra giữa giao diện người dùng.
func TestCatalogViKhopVerb(t *testing.T) {
	bad, err := VerifyCatalog(Vietnamese)
	if err != nil {
		t.Fatalf("VerifyCatalog: %v", err)
	}
	for _, m := range bad {
		t.Errorf("%v", m)
	}
	if len(bad) > 0 {
		t.Logf("%d bản dịch lệch format verb — sửa trong internal/i18n/locales/vi.json", len(bad))
	}
}

// Bản dịch phải giữ ký tự xuống dòng ở đầu/cuối: TUI dựa vào chúng để canh dòng,
// mất "\n" là layout xô lệch mà test khác không bắt được.
//
// Bản đầu của test này RỖNG mà trông như đang gác: nó so `HasSuffix(msgid, "\n")`
// với newline THẬT, nhưng catalog cũ lưu msgid ở dạng nguyên văn nguồn nên chỗ
// xuống dòng là hai ký tự `\` + `n`. Với những entry đó cả hai vế đều false, nên
// điều kiện luôn đúng và không có gì bị kiểm. Hai agent soát độc lập cùng chỉ ra
// điều này.
//
// Cách sửa: chuẩn hóa cả hai phía về dạng lúc chạy trước khi so, để test kiểm
// đúng cái mà người dùng thấy — bất kể catalog lưu ở dạng nào.
func TestCatalogViGiuXuongDong(t *testing.T) {
	if err := SetLocale(Vietnamese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}
	p := current.Load()
	if p == nil {
		t.Fatal("catalog chưa nạp")
	}

	var kiemTra int
	for msgid, target := range *p {
		if target == "" {
			continue
		}
		src, dst := unescapeGo(msgid), unescapeGo(target)
		if !strings.Contains(src, "\n") {
			continue // chỉ những chuỗi CÓ xuống dòng mới đáng kiểm
		}
		kiemTra++

		if strings.HasSuffix(src, "\n") != strings.HasSuffix(dst, "\n") {
			t.Errorf("lệch \\n ở cuối:\n  nguồn: %q\n  dịch : %q", src, dst)
		}
		if strings.HasPrefix(src, "\n") != strings.HasPrefix(dst, "\n") {
			t.Errorf("lệch \\n ở đầu:\n  nguồn: %q\n  dịch : %q", src, dst)
		}
	}

	// Chốt rằng test không rỗng: nếu không có entry nào chứa xuống dòng thì test
	// này chẳng gác gì, và ta phải biết điều đó thay vì thấy màu xanh giả.
	if kiemTra == 0 {
		t.Error("không kiểm được entry nào có xuống dòng — test đang rỗng")
	} else {
		t.Logf("đã kiểm %d entry có xuống dòng", kiemTra)
	}
}

// Bí danh dạng lúc chạy phải hoạt động: msgid được thu thập ở dạng nguyên văn
// nguồn (có `\` + `n`) vẫn phải tra được khi i18n.F nhận newline thật. Đây là
// bug đã làm 111 msgid hiển thị tiếng Trung dù đã dịch.
func TestMsgidCoEscapeTraDuocODangLucChay(t *testing.T) {
	if err := SetLocale(Vietnamese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}
	p := current.Load()
	if p == nil {
		t.Fatal("catalog chưa nạp")
	}

	var soCoEscape, traDuoc int
	for msgid, target := range *p {
		if target == "" || !strings.Contains(msgid, `\n`) {
			continue
		}
		soCoEscape++
		if Has(unescapeGo(msgid)) {
			traDuoc++
		} else {
			t.Errorf("msgid có escape không tra được ở dạng lúc chạy: %q", msgid)
		}
	}

	if soCoEscape == 0 {
		t.Skip("catalog không còn msgid dạng escape — bí danh không còn cần thiết")
	}
	t.Logf("%d/%d msgid dạng escape tra được ở dạng lúc chạy", traDuoc, soCoEscape)
}

func TestUnescapeGo(t *testing.T) {
	cases := []struct{ in, want string }{
		{"không có escape", "không có escape"},
		{`a\nb`, "a\nb"},
		{`a\tb`, "a\tb"},
		{`\n đầu dòng`, "\n đầu dòng"},
		{`cuối dòng \n`, "cuối dòng \n"},
		{`dấu \" ngoặc`, `dấu " ngoặc`},
		{`gạch \\ chéo`, `gạch \ chéo`},
		// Escape không nhận ra phải giữ nguyên, không đoán.
		{`\q lạ`, `\q lạ`},
	}
	for _, c := range cases {
		if got := unescapeGo(c.in); got != c.want {
			t.Errorf("unescapeGo(%q) = %q, muốn %q", c.in, got, c.want)
		}
	}
}

func TestFRoiVeNguonKhiChuaDich(t *testing.T) {
	if err := SetLocale(Vietnamese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}
	const chuaCo = "这句话绝对不在 catalog 里"
	if got := F(chuaCo); got != chuaCo {
		t.Errorf("F(chưa dịch) = %q, muốn rơi về chính nó", got)
	}
}

func TestLocaleZhTraVeNguyenVanUpstream(t *testing.T) {
	t.Cleanup(func() { _ = SetLocale(Vietnamese) })
	if err := SetLocale(Chinese); err != nil {
		t.Fatalf("SetLocale(zh): %v", err)
	}
	const msgid = "第 %d 章无草稿"
	if got := F(msgid); got != msgid {
		t.Errorf("ở locale zh, F phải trả nguyên văn upstream, được %q", got)
	}
	if Size() != 0 {
		t.Errorf("catalog zh phải rỗng, được %d cặp", Size())
	}
}

func TestTFormatDung(t *testing.T) {
	t.Cleanup(func() { _ = SetLocale(Vietnamese) })
	if err := SetLocale(Chinese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}
	if got := T("第 %d 章", 47); got != "第 47 章" {
		t.Errorf("T = %q", got)
	}
}

// %w phải đi qua F rồi fmt.Errorf mới bọc lỗi được — T dùng Sprintf nên làm mất
// %w. Test này chốt đúng cách dùng để lần sau không ai bọc nhầm.
func TestFGiuDuocErrorsIs(t *testing.T) {
	t.Cleanup(func() { _ = SetLocale(Vietnamese) })
	if err := SetLocale(Chinese); err != nil {
		t.Fatalf("SetLocale: %v", err)
	}
	sentinel := fmt.Errorf("lỗi gốc")
	wrapped := fmt.Errorf(F("读取失败: %w"), sentinel)
	if !strings.Contains(wrapped.Error(), "lỗi gốc") {
		t.Errorf("không bọc được lỗi: %v", wrapped)
	}
}
