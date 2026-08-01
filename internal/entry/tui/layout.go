package tui

import (
	"fmt"
	"math"

	"github.com/charmbracelet/lipgloss"
	"strings"
)

// --- 辅助函数 ---

// fieldLabelColumn là bề rộng cột nhãn trong khối "nhãn — giá trị". Nhãn ngắn hơn
// thì được đệm cho đủ; nhãn dài hơn thì đẩy giá trị sang phải (không cắt, không xé).
const fieldLabelColumn = 10

// renderFieldLabel dựng nhãn trường: đệm cho đủ cột rồi LUÔN thêm đúng một khoảng
// trắng phân cách.
//
// Trước đây việc đệm giao cho fieldLabelStyle.Width(10). Sai hai đường:
//
//  1. Width của lipgloss vừa là bề rộng tối thiểu vừa là điểm XUỐNG DÒNG. Nhãn Hán
//     không bao giờ chạm ngưỡng (运行态 chỉ 6 cột) nên lỗi ngủ yên; nhãn tiếng Việt
//     "Trạng thái chạy" chiếm 15 cột thì bị xé thành "Trạng thái" / "chạy", và giá
//     trị rơi xuống dòng dưới dính vào đuôi nhãn — trên màn đọc ra hai dòng vô nghĩa.
//  2. Bản cũ chỉ thêm khoảng trắng KHI THIẾU, nên nhãn ≤9 cột để giá trị ở cột 10
//     còn nhãn đúng 10 cột ("Đẩy chương") đẩy giá trị sang cột 11 → cột giá trị lệch
//     một cột giữa các dòng ngay cạnh nhau.
//
// Cả hai chỉ lộ ra khi chạy TUI thật rồi nhìn; xem layout_vi_width_test.go.
func renderFieldLabel(label string) string {
	rendered := fieldLabelStyle.Render(label)
	if pad := fieldLabelColumn - lipgloss.Width(label); pad > 0 {
		rendered += strings.Repeat(" ", pad)
	}
	return rendered + " "
}

// fitHintToWidth thu gọn dòng gợi ý phím cho vừa maxW bằng cách bỏ bớt MỤC, chứ không
// cắt giữa chữ — và luôn giữ lại MỤC CUỐI.
//
// Hai lý do:
//
//  1. Bản cũ cắt cứng theo cột, nên gợi ý tiếng Việt (dài hơn bản Hán) hiện ra
//     "… · Esc quay lạ" — mất đúng ký tự cuối, không dấu hiệu gì, người dùng đọc ra
//     một chữ không tồn tại. Thấy ở /config danh sách model tại 100 cột.
//  2. Mục cuối theo quy ước là lối thoát ("Esc đóng" / "Esc quay lại"). Bỏ lần lượt
//     từ cuối thì đúng cái người dùng cần nhất khi bí lại là cái mất đầu tiên, nên ở
//     đây bỏ các mục GIỮA và giữ mục cuối.
func fitHintToWidth(hint string, maxW int) string {
	if maxW <= 0 {
		return ""
	}
	if lipgloss.Width(hint) <= maxW {
		return hint
	}
	const sep = " · "
	items := strings.Split(hint, sep)
	last := items[len(items)-1]
	// Giữ items[:k] rồi nối mục cuối; thu k dần cho tới khi vừa.
	for k := len(items) - 1; k >= 1; k-- {
		candidate := strings.Join(append(append([]string{}, items[:k]...), last), sep)
		if lipgloss.Width(candidate) <= maxW {
			return candidate
		}
	}
	if lipgloss.Width(last) <= maxW {
		return last
	}
	// Ngay cả mục cuối cũng không vừa: đành cắt, nhưng có "..." để thấy là bị cắt.
	return truncate(hint, maxW)
}

func renderField(label, value string) string {
	if value == "" {
		value = "-"
	}
	return renderFieldLabel(label) + fieldValueStyle.Render(value) + "\n"
}

func renderHighlightField(label, value string) string {
	return renderFieldLabel(label) + highlightValueStyle.Render(value) + "\n"
}

// contextPercentColor returns a health-gradient color based on context usage.
// Mirrors Claude Code's calculateTokenWarningState concept:
//   - < 70%: green (healthy headroom)
//   - 70-85%: yellow (approaching compression threshold)
//   - > 85%: red (compression imminent or active)
func contextPercentColor(percent float64) lipgloss.AdaptiveColor {
	switch {
	case percent >= 85:
		return colorError
	case percent >= 70:
		return colorReview
	default:
		return colorSuccess
	}
}

func renderContextUsageField(label string, percent float64, tokens, window int) string {
	if window <= 0 || tokens <= 0 {
		return ""
	}
	percentColor := contextPercentColor(percent)
	usage := lipgloss.NewStyle().Foreground(percentColor).Bold(true).
		Render(fmt.Sprintf("%.0f%%", percent)) +
		contextUsageMetaStyle.Render(" · ") +
		contextUsageMetaStyle.Render(fmt.Sprintf("%s/%s", formatNumber(tokens), formatNumber(window)))
	return renderFieldLabel(label) + usage + "\n"
}

// formatContextWindow 把 token 数格式化成紧凑窗口标记："128K" / "200K" / "1M" / "2M"。
// Gemini 的 1048576 (2^20) 等技术意义上的 1M 会展示为 "1M" 而非 "1.0M"。
// n<=0 返回空串，调用方应据此决定是否展示。
func formatContextWindow(n int) string {
	if n <= 0 {
		return ""
	}
	if n >= 1_000_000 {
		m := float64(n) / 1_000_000
		rounded := math.Round(m)
		if rounded > 0 && math.Abs(m-rounded)/rounded < 0.05 {
			return fmt.Sprintf("%dM", int(rounded))
		}
		return fmt.Sprintf("%.1fM", m)
	}
	if n >= 1000 {
		return fmt.Sprintf("%dK", n/1000)
	}
	return fmt.Sprintf("%d", n)
}

// formatCostUSD 格式化美元成本。<$0.01 用 4 位小数，否则 2 位。0 返回空。
func formatCostUSD(usd float64) string {
	if usd <= 0 {
		return ""
	}
	if usd < 0.01 {
		return fmt.Sprintf("$%.4f", usd)
	}
	return fmt.Sprintf("$%.2f", usd)
}

func formatNumber(n int) string {
	if n == 0 {
		return "0"
	}
	s := fmt.Sprintf("%d", n)
	result := make([]byte, 0, len(s)+len(s)/3)
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result = append(result, ',')
		}
		result = append(result, byte(c))
	}
	return string(result)
}

// truncate 按视觉宽度截断（中文算 2 列），超宽时以"..."收尾。
// 不能按 rune 数截：纯中文行会溢出近一倍列宽，被外层 viewport 贴边硬裁，
// 连省略号一起裁掉，用户看到的就是"文本贴边截断、不换行"。
func truncate(s string, max int) string {
	if max <= 0 {
		return ""
	}
	if lipgloss.Width(s) <= max {
		return s
	}
	if max < 4 {
		return truncateWidth(s, max)
	}
	return truncateWidth(s, max-3) + "..."
}
