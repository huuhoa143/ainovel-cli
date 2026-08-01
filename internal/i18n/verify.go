package i18n

import (
	"fmt"
	"sort"
	"strings"
)

// Rủi ro lớn nhất của việc dùng chuỗi nguồn làm msgid là bản dịch làm lệch bộ
// format verb: thiếu một %d thì fmt in ra "%!d(MISSING)" ngay giữa giao diện,
// thừa một %s thì thành "%!s(EXTRA ...)", và đổi thứ tự %s/%d thì in sai dữ liệu
// mà không hề báo lỗi. Với catalog cỡ 1.800 chuỗi, đọc mắt không bắt nổi — nên
// bộ đối chiếu này chạy trong go test, biến lỗi dịch thành lỗi build.

// Verb là một format verb trích từ chuỗi, ví dụ "%d", "%-8s", "%.2f", "%w".
type Verb struct {
	Raw  string // nguyên văn, gồm cả flag/width/precision
	Char byte   // ký tự verb: 'd', 's', 'v', 'w'...
}

// ExtractVerbs trả về các format verb theo đúng thứ tự xuất hiện. "%%" là dấu
// phần trăm literal nên bị bỏ qua, không tính là verb.
func ExtractVerbs(s string) []Verb {
	var out []Verb
	for i := 0; i < len(s); i++ {
		if s[i] != '%' {
			continue
		}
		if i+1 < len(s) && s[i+1] == '%' {
			i++ // %% là literal
			continue
		}
		j := i + 1
		// flag: + - # space 0
		for j < len(s) && strings.IndexByte("+-# 0", s[j]) >= 0 {
			j++
		}
		// width
		for j < len(s) && (s[j] >= '0' && s[j] <= '9' || s[j] == '*') {
			j++
		}
		// precision
		if j < len(s) && s[j] == '.' {
			j++
			for j < len(s) && (s[j] >= '0' && s[j] <= '9' || s[j] == '*') {
				j++
			}
		}
		// Chỉ số tham số tường minh %[n]v — cách duy nhất được phép để đảo trật
		// tự khi tiếng Việt cần thứ tự khác tiếng Trung.
		//
		// Vị trí của khối này phải là SAU width/precision, đúng như Go quy định:
		// [n] nằm ngay trước verb. Đã kiểm bằng cách chạy Go thật:
		//     %.2[2]f  → "2.00"            (đúng)
		//     %[2].2f  → "%!f(BADINDEX)"   (sai)
		// Bản đầu của hàm này phân tích [n] TRƯỚC width/precision, nên với verb có
		// precision — tức chính các chuỗi tiền tệ %.2f/%.0f — không còn lối nào an
		// toàn: viết đúng Go thì bộ đối chiếu báo lệch verb (build đỏ oan), viết
		// theo bộ đối chiếu thì runtime in BADINDEX. Bộ soát đã phát hiện ra điều
		// này bằng cách đối chiếu với hành vi thật của Go.
		if j < len(s) && s[j] == '[' {
			k := j + 1
			for k < len(s) && s[k] >= '0' && s[k] <= '9' {
				k++
			}
			if k < len(s) && s[k] == ']' && k > j+1 {
				j = k + 1
			}
		}
		if j >= len(s) {
			break
		}
		out = append(out, Verb{Raw: s[i : j+1], Char: s[j]})
		i = j
	}
	return out
}

// VerbMismatch mô tả một sai lệch giữa msgid và bản dịch.
type VerbMismatch struct {
	Msgid  string
	Target string
	Reason string
}

func (m VerbMismatch) Error() string {
	return fmt.Sprintf("i18n: %s\n  nguồn : %s\n  dịch  : %s", m.Reason, m.Msgid, m.Target)
}

// checkPair đối chiếu bộ verb của một cặp msgid→bản dịch.
//
// Yêu cầu chặt về THỨ TỰ, không chỉ về số lượng: fmt lấy tham số theo vị trí,
// nên "chương %d của %s" dịch thành "%s ở chương %d" sẽ in tên sách vào chỗ số
// chương. Tiếng Việt hay phải đảo trật tự như vậy — trường hợp đó dịch giả phải
// dùng chỉ số tường minh (%[2]s / %[1]d) chứ không được đảo ngầm.
func checkPair(msgid, target string) *VerbMismatch {
	src := ExtractVerbs(msgid)
	dst := ExtractVerbs(target)

	if hasExplicitIndex(target) {
		// Đã dùng %[n]s thì thứ tự do chỉ số quyết định; chỉ cần đủ số lượng.
		if len(src) != len(dst) {
			return &VerbMismatch{msgid, target, fmt.Sprintf("số format verb lệch (nguồn %d, dịch %d)", len(src), len(dst))}
		}
		return nil
	}

	if len(src) != len(dst) {
		return &VerbMismatch{msgid, target, fmt.Sprintf("số format verb lệch (nguồn %d, dịch %d)", len(src), len(dst))}
	}
	for i := range src {
		if src[i].Char != dst[i].Char {
			return &VerbMismatch{msgid, target, fmt.Sprintf(
				"verb thứ %d khác loại (nguồn %s, dịch %s) — nếu cần đảo trật tự tiếng Việt thì dùng chỉ số tường minh %%[n]s",
				i+1, src[i].Raw, dst[i].Raw)}
		}
	}
	return nil
}

func hasExplicitIndex(s string) bool {
	for i := 0; i+1 < len(s); i++ {
		if s[i] == '%' && s[i+1] == '[' {
			return true
		}
	}
	return false
}

// VerifyCatalog đối chiếu toàn bộ catalog của một ngôn ngữ. Trả về danh sách sai
// lệch đã sắp xếp để thông báo lỗi ổn định giữa các lần chạy.
func VerifyCatalog(loc Locale) ([]VerbMismatch, error) {
	if loc == Chinese {
		return nil, nil // zh không có catalog, mọi msgid là chính nó
	}
	raw, err := localeFS.ReadFile("locales/" + string(loc) + ".json")
	if err != nil {
		return nil, fmt.Errorf("i18n: không đọc được catalog %q: %w", loc, err)
	}
	var c catalog
	if err := unmarshalCatalog(raw, &c); err != nil {
		return nil, err
	}
	var bad []VerbMismatch
	for msgid, target := range c {
		if target == "" {
			continue // chưa dịch — rơi về nguồn, không phải lỗi
		}
		if m := checkPair(msgid, target); m != nil {
			bad = append(bad, *m)
		}
	}
	sort.Slice(bad, func(i, j int) bool { return bad[i].Msgid < bad[j].Msgid })
	return bad, nil
}

// UntranslatedIn trả về các msgid trong danh sách chưa có bản dịch ở ngôn ngữ
// đang nạp. Dùng cho lệnh chẩn đoán độ phủ.
func UntranslatedIn(msgids []string) []string {
	var out []string
	for _, m := range msgids {
		if !Has(m) {
			out = append(out, m)
		}
	}
	sort.Strings(out)
	return out
}
