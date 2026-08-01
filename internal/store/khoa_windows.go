//go:build windows

package store

import "golang.org/x/sys/windows"

// conSong cho biết PID này còn sống.
//
// # Vì sao không dùng os.FindProcess như bản Unix
//
// Trên Windows `os.FindProcess` LUÔN thành công với mọi PID, kể cả PID đã chết, và
// `Signal(0)` không có nghĩa gì. Dùng nguyên bản Unix ở đây sẽ cho kết quả "còn sống"
// cho mọi số — tức khóa mồ côi không bao giờ được dọn, và người dùng Windows bị chặn
// vĩnh viễn sau một lần máy sập.
//
// OpenProcess trả handle rồi hỏi mã thoát là phép thử thật: STILL_ACTIVE (259) nghĩa là
// còn chạy. PID đã chết thì OpenProcess lỗi.
//
// # Chỗ phép thử này còn yếu
//
// Windows tái dùng PID nhanh hơn Unix, nên một PID chết rồi được cấp lại cho process
// khác sẽ bị đọc thành "còn sống". Hệ quả: studio từ chối mở sách và bảo người dùng xóa
// tệp khóa. Hướng sai đó là hướng AN TOÀN (từ chối ghi) và thông báo có nói rõ phải làm
// gì, nên không đổi nó thành phép thử phức tạp hơn (so mốc tạo process) cho một ca hiếm.
func conSong(pid int) bool {
	if pid <= 0 {
		return false
	}
	const stillActive = 259
	h, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		return false
	}
	defer windows.CloseHandle(h)
	var ma uint32
	if err := windows.GetExitCodeProcess(h, &ma); err != nil {
		// Mở được handle mà không đọc được mã thoát → coi là còn sống. Hướng sai an toàn:
		// từ chối ghi thì mất tiện, cho hai process cùng ghi thì mất dữ liệu.
		return true
	}
	return ma == stillActive
}
