//go:build !windows

package store

import (
	"errors"
	"os"
	"syscall"
)

// conSong cho biết PID này còn sống.
//
// Tín hiệu 0 là phép thử chuẩn của POSIX: nó không gửi gì cả, chỉ chạy phần kiểm quyền và
// kiểm tồn tại của kernel. ESRCH = không có process nào. EPERM = CÓ process nhưng khác chủ
// — vẫn là còn sống, và đó là ca thật khi studio chạy dưới người dùng khác.
func conSong(pid int) bool {
	if pid <= 0 {
		return false
	}
	p, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = p.Signal(syscall.Signal(0))
	if err == nil {
		return true
	}
	return errors.Is(err, os.ErrPermission) || errors.Is(err, syscall.EPERM)
}
