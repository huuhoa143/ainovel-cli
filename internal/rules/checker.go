package rules

import (
	"strings"
)

// Check 对章节正文按结构化规则进行机械检查，返回违规事实列表。
//
// 设计契约：
//   - 仅返事实，不下指令（铁律一）
//   - 不阻断任何调用方流程
//   - severity 按规则类型固定映射（参见 types.go 注释表）
//
// 参数：
//   - text：章节正文（终稿或草稿都可）
//   - s：合并后的结构化规则；IsEmpty 时直接返回 nil。
func Check(text string, s Structured) []Violation {
	if s.IsEmpty() {
		return nil
	}

	var violations []Violation
	violations = appendForbiddenChars(violations, text, s.ForbiddenChars)
	// Hạ chữ MỘT lần rồi truyền xuống, không hạ trong vòng lặp: bảng từ gây mỏi có
	// 16 mục nên hạ trong vòng lặp là 16 lần cấp phát trên toàn văn mỗi chương.
	lower := strings.ToLower(text)
	violations = appendForbiddenPhrases(violations, lower, s.ForbiddenPhrases)
	violations = appendFatigueWords(violations, lower, s.FatigueWords)
	return violations
}

// Vì sao so khớp không phân biệt hoa thường, và vì sao chỉ cho cụm/từ chứ không
// cho ký tự:
//
// Bảng ở snapshot.go toàn chữ thường, còn strings.Count thì phân biệt hoa thường.
// Các cụm bị cấm và liên từ gây mỏi tiếng Việt BẢN CHẤT là từ mở câu — "Tuy
// nhiên,", "Ngoài ra,", "Đáng chú ý là" — nên trong văn thật chúng luôn viết hoa
// và không bao giờ bị bắt. Đo được: "Tuy nhiên," mở câu 4 lần với ngưỡng 2 mà lọt
// sạch. Với forbidden_phrases thì nặng hơn nữa vì nó là SeverityError.
//
// Đây là lỗi RIÊNG của bản việt hóa: tiếng Trung không có chữ hoa nên upstream
// không thể gặp. Và vì strings.ToLower không đổi chữ Hán, nhánh zh giữ nguyên
// hành vi từng byte — sửa này không có rủi ro hồi quy cho đường gốc.
//
// Chú thích ở snapshot.go tự đặt yêu cầu "phải khớp với bộ mẫu của stylestat", mà
// stylestat dùng `(?i)` ở cả 11 mẫu tiếng Việt. Trước sửa này, hai lớp nói là đo
// cùng một thứ nhưng một bên phân biệt hoa thường, một bên không.
//
// forbidden_chars CỐ Ý không hạ chữ: đó là ký tự do người dùng tự khai, và chữ
// hoa/thường ở đó có thể là chủ ý (cấm đúng một biến thể). Hạ chữ giúp nó bắt
// rộng hơn nhưng là quyết định thay người dùng.

// forbidden_chars：出现 ≥1 次即 error。
// 同一条规则只产生一条 violation，actual 是出现次数。
func appendForbiddenChars(vs []Violation, text string, list []string) []Violation {
	for _, ch := range list {
		if ch == "" {
			continue
		}
		n := strings.Count(text, ch)
		if n == 0 {
			continue
		}
		vs = append(vs, Violation{
			Rule:     "forbidden_chars",
			Target:   ch,
			Actual:   n,
			Severity: SeverityError,
		})
	}
	return vs
}

// forbidden_phrases：出现 ≥1 次即 error；行为与 forbidden_chars 一致，仅 rule 名区分。
//
// lower là văn bản ĐÃ hạ chữ (xem Check). Cụm cần tìm cũng hạ chữ tại đây vì
// ForbiddenPhrases còn được trộn từ tệp rule của người dùng, nơi họ có thể viết
// hoa. Target vẫn trả nguyên văn người dùng khai để bản ghi và hiển thị không đổi.
func appendForbiddenPhrases(vs []Violation, lower string, list []string) []Violation {
	for _, ph := range list {
		if ph == "" {
			continue
		}
		n := strings.Count(lower, strings.ToLower(ph))
		if n == 0 {
			continue
		}
		vs = append(vs, Violation{
			Rule:     "forbidden_phrases",
			Target:   ph,
			Actual:   n,
			Severity: SeverityError,
		})
	}
	return vs
}

// fatigue_words：本章出现次数超过阈值才违规，warning 级。
// 不跨章累计——跨章问题后续交诊断。
// lower là văn bản ĐÃ hạ chữ (xem Check); từ trong bảng cũng hạ để chịu được bảng
// do người dùng khai. Target giữ nguyên văn để ngưỡng và bản ghi đọc khớp bảng.
func appendFatigueWords(vs []Violation, lower string, m map[string]int) []Violation {
	for word, limit := range m {
		if word == "" || limit <= 0 {
			continue
		}
		n := strings.Count(lower, strings.ToLower(word))
		if n <= limit {
			continue
		}
		vs = append(vs, Violation{
			Rule:     "fatigue_words",
			Target:   word,
			Limit:    limit,
			Actual:   n,
			Severity: SeverityWarning,
		})
	}
	return vs
}
