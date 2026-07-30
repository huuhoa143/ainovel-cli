// Package i18n cung cấp lớp bản địa hóa cho ainovel-cli, mặc định tiếng Việt và
// giữ nguyên tiếng Trung làm ngôn ngữ nguồn.
//
// # Vì sao msgid là chính chuỗi tiếng Trung
//
// Repo này là fork của voocel/ainovel-cli — upstream vẫn phát triển rất nhanh
// (65 commit trong 5 tuần, có cả refactor thay Coordinator bằng Engine+Arbiter).
// Fork nào cũng phải rebase, nên tiêu chí số một của lớp i18n ở đây là *giảm
// diff so với upstream*, không phải làm code đẹp.
//
// Đặt khóa tường minh (`i18n.F("tools.commit.no_draft")`) đọc dễ hơn, nhưng đổi
// lại: mỗi lần upstream sửa một câu tiếng Trung, khóa vẫn trỏ vào bản dịch cũ —
// sai lệch âm thầm, không ai biết. Dùng chuỗi nguồn làm msgid thì ngược lại:
// upstream sửa chữ nào, msgid đó lập tức không tra được, rơi về tiếng Trung —
// hiện ra ngay trên màn hình thay vì lẳng lặng dịch sai.
//
// Kèm hai lợi ích nữa:
//   - Bọc được bằng script cho cả 2.030 điểm, vì chuỗi nguồn giữ nguyên tại chỗ.
//   - Translation memory rút từ bản việt hóa của kentjuno vốn đã là zh→vi, dùng
//     làm catalog không cần chuyển đổi gì.
//
// # F hay T
//
// Dùng [F] khi chuỗi là format string đưa cho fmt (đặc biệt fmt.Errorf có %w —
// bọc bằng T sẽ làm mất verb %w và phá errors.Is). Dùng [T] khi cần luôn kết quả.
package i18n

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync/atomic"
)

//go:embed locales/*.json
var localeFS embed.FS

// Locale là ngôn ngữ hiển thị. Tiếng Trung được giữ lại vì đó là ngôn ngữ nguồn
// của upstream: khi một chuỗi chưa có bản dịch, rơi về zh vẫn đọc được, còn rơi
// về khóa trống thì không.
type Locale string

const (
	Vietnamese Locale = "vi"
	Chinese    Locale = "zh"
)

// DefaultLocale là tiếng Việt — đây là bản việt hóa, không phải bản gốc.
const DefaultLocale = Vietnamese

// EnvLocale cho phép ép ngôn ngữ mà không cần sửa cấu hình, hữu ích khi đối chiếu
// hành vi với upstream: AINOVEL_LANG=zh ./ainovel-cli
const EnvLocale = "AINOVEL_LANG"

// catalog giữ bản dịch của một ngôn ngữ: msgid (chuỗi nguồn zh) → chuỗi đích.
type catalog map[string]string

// current là catalog đang dùng. atomic.Pointer vì TUI đọc chuỗi từ nhiều
// goroutine (observer, engine, render) trong khi lệnh /lang có thể đổi ngôn ngữ.
var (
	current   atomic.Pointer[catalog]
	activeLoc atomic.Pointer[Locale]
)

func init() {
	loc := DefaultLocale
	if v := strings.TrimSpace(os.Getenv(EnvLocale)); v != "" {
		loc = Locale(v)
	}
	// Lỗi ở init không thể trả về; rơi về zh (chuỗi nguồn) là hành vi an toàn:
	// giao diện vẫn đọc được thay vì trống trơn.
	if err := SetLocale(loc); err != nil {
		empty := catalog{}
		current.Store(&empty)
		zh := Chinese
		activeLoc.Store(&zh)
	}
}

// SetLocale nạp catalog cho ngôn ngữ chỉ định. Với Chinese thì catalog rỗng —
// mọi msgid rơi về chính nó, tức đúng chuỗi gốc của upstream.
func SetLocale(loc Locale) error {
	if loc == Chinese {
		empty := catalog{}
		current.Store(&empty)
		activeLoc.Store(&loc)
		return nil
	}
	raw, err := localeFS.ReadFile("locales/" + string(loc) + ".json")
	if err != nil {
		return fmt.Errorf("i18n: không có catalog cho ngôn ngữ %q: %w", loc, err)
	}
	var c catalog
	if err := unmarshalCatalog(raw, &c); err != nil {
		return fmt.Errorf("i18n: catalog %q: %w", loc, err)
	}
	current.Store(&c)
	activeLoc.Store(&loc)
	return nil
}

// unmarshalCatalog đọc catalog JSON. Tách riêng để verify.go dùng lại cùng một
// đường đọc, tránh chuyện bộ kiểm tra chấp nhận thứ mà bộ nạp lại từ chối.
func unmarshalCatalog(raw []byte, c *catalog) error {
	if err := json.Unmarshal(raw, c); err != nil {
		return fmt.Errorf("lỗi cú pháp JSON: %w", err)
	}
	addRuntimeAliases(*c)
	return nil
}

// addRuntimeAliases thêm khóa dạng LÚC CHẠY cho những msgid được thu thập ở dạng
// nguyên văn nguồn Go.
//
// Bộ thu thập msgid từng trả nguyên văn nguồn thay vì giá trị lúc chạy, nên với
// `"a\nb"` trong code, catalog lưu khóa chứa HAI ký tự `\` và `n`. Còn i18n.F()
// lúc chạy nhận chuỗi Go ĐÃ giải escape — một ký tự newline thật. Hai thứ đó
// không bằng nhau, nên 111 msgid có escape không bao giờ tra được và cứ hiển thị
// tiếng Trung dù đã dịch xong. Không lỗi, không log; chỉ là bản dịch vô hiệu.
//
// Bộ thu thập đã được sửa, nhưng catalog hiện có vẫn mang khóa dạng cũ. Thay vì
// ghi lại cả tệp (tranh chấp với việc đang dịch, và làm mất bản dịch nếu ghi đè
// nhầm), ở đây THÊM khóa giải escape làm bí danh và GIỮ NGUYÊN khóa gốc.
//
// Giữ khóa gốc là điều bắt buộc, không phải cho gọn: chuỗi thô Go (`...`) không
// có escape, nên `\n` trong đó là hai ký tự thật ở cả nguồn lẫn lúc chạy. Nếu
// thay khóa thì chính những chuỗi ấy hỏng. Có cả hai khóa thì cả hai dạng đều tra
// được.
func addRuntimeAliases(c catalog) {
	for msgid, target := range c {
		if !strings.ContainsRune(msgid, '\\') {
			continue
		}
		runtimeKey := unescapeGo(msgid)
		if runtimeKey == msgid {
			continue
		}
		// Không ghi đè bản dịch đã có sẵn ở dạng lúc chạy: nếu cả hai dạng cùng
		// tồn tại thì dạng lúc chạy là dạng được thu thập đúng, phải thắng.
		if _, exists := c[runtimeKey]; !exists {
			c[runtimeKey] = target
		}
	}
}

// unescapeGo giải escape của chuỗi Go thường về giá trị lúc chạy. Chỉ xử lý các
// escape thực sự xuất hiện trong chuỗi hiển thị của repo này; escape lạ được giữ
// nguyên thay vì đoán, để không âm thầm làm méo msgid.
func unescapeGo(s string) string {
	if !strings.ContainsRune(s, '\\') {
		return s
	}
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		if s[i] != '\\' || i+1 >= len(s) {
			b.WriteByte(s[i])
			continue
		}
		switch s[i+1] {
		case 'n':
			b.WriteByte('\n')
		case 't':
			b.WriteByte('\t')
		case 'r':
			b.WriteByte('\r')
		case '"':
			b.WriteByte('"')
		case '\\':
			b.WriteByte('\\')
		default:
			b.WriteByte(s[i])
			continue // không nhận ra: giữ dấu \ và xét lại ký tự sau ở vòng kế
		}
		i++
	}
	return b.String()
}

// Active trả về ngôn ngữ đang dùng.
func Active() Locale {
	if p := activeLoc.Load(); p != nil {
		return *p
	}
	return DefaultLocale
}

// F trả về format string đã dịch, hoặc chính msgid nếu chưa có bản dịch.
//
// Dùng cho fmt.Errorf / fmt.Sprintf, nhất là khi chuỗi có %w:
//
//	fmt.Errorf(i18n.F("第 %d 章无草稿: %w"), ch, errs.ErrToolPrecondition)
func F(msgid string) string {
	if p := current.Load(); p != nil {
		if s, ok := (*p)[msgid]; ok && s != "" {
			return s
		}
	}
	return msgid
}

// T dịch rồi format luôn. Không dùng được với %w — chỗ nào cần bọc lỗi thì dùng
// [F] và tự gọi fmt.Errorf.
func T(msgid string, args ...any) string {
	f := F(msgid)
	if len(args) == 0 {
		return f
	}
	return fmt.Sprintf(f, args...)
}

// Has cho biết msgid đã có bản dịch chưa. Dùng trong test bao phủ và lệnh chẩn
// đoán, không dùng trong luồng hiển thị.
func Has(msgid string) bool {
	p := current.Load()
	if p == nil {
		return false
	}
	s, ok := (*p)[msgid]
	return ok && s != ""
}

// Size là số cặp trong catalog đang nạp.
func Size() int {
	if p := current.Load(); p != nil {
		return len(*p)
	}
	return 0
}
