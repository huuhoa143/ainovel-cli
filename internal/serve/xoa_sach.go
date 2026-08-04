package serve

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// handleXoaSach — DELETE /api/books/{book}
//
// # Vì sao bề mặt này phải tồn tại
//
// Trước bản này studio TẠO được mà không XÓA được, và cái giá của nó đã đo được trên máy
// thật: một khóa API sai làm ba lượt tạo liên tiếp hỏng, để lại ba thư mục 0 chương nằm
// trên bảng Quản lý như tác phẩm bình thường. Người dùng không có đường nào gỡ chúng từ
// giao diện — phải mở terminal `rm -rf`, tức đúng cái mà studio tồn tại để khỏi phải làm.
//
// `tao` giờ đã tự dọn khi hỏng, nên rác kiểu đó không sinh ra nữa. Nhưng "không sinh thêm
// rác" và "dọn được rác" là hai việc khác nhau: người ta vẫn cần bỏ một cuốn viết dở, một
// bản chạy thử, một cái tên đặt sai.
//
// # Vì sao phải gõ lại tên để xác nhận
//
// Xóa một cuốn là xóa bản thảo và toàn bộ lịch sử phán quyết của nó — không hoàn tác được,
// không có thùng rác. `tran-yeu-ky` trên máy này có 5 chương đã chốt và $7,37 tiền thật đã
// tiêu. Một cú bấm nhầm là mất sạch.
//
// Nên thân yêu cầu phải chứa ĐÚNG tên cuốn. Đây không phải nghi thức thừa: nó biến một cú
// click lỡ tay thành một hành động phải chủ ý gõ, và nó chặn luôn kiểu tai nạn nguy hiểm
// nhất — giao diện gửi nhầm id của cuốn đang mở thay vì cuốn người dùng chọn.
func (s *server) handleXoaSach(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("book")

	dir, err := s.bookDir(id)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if _, err := os.Stat(dir); err != nil {
		writeErr(w, http.StatusNotFound, fmt.Errorf("không có tác phẩm %q", id))
		return
	}

	var than struct {
		XacNhan string `json:"xac_nhan"`
	}
	if err := docThan(r, &than); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if strings.TrimSpace(than.XacNhan) != id {
		writeErr(w, http.StatusBadRequest, fmt.Errorf(
			"xóa tác phẩm %q cần gõ lại đúng tên của nó để xác nhận — không hoàn tác được", id))
		return
	}

	// Engine đang mở thì TỪ CHỐI, không tự đóng hộ.
	//
	// Tự đóng nghe tiện hơn, nhưng engine đang mở có thể đang viết dở một chương: đóng
	// ngầm rồi xóa là giật tờ giấy khỏi tay người đang viết. Bắt người dùng bấm Dừng
	// trước là bắt họ nhìn thấy cuốn này đang chạy — thứ mà một nút xóa "thông minh" sẽ
	// giấu đi đúng lúc không nên giấu.
	// `s.may != nil` là chốt thật, không phải phòng xa: route này chỉ mắc vào mux khi bộ máy
	// có mặt, nhưng handler là hàm công khai của struct và một lần gọi thẳng (bài kiểm, hoặc
	// một route mới mai sau) sẽ nổ nil-pointer ngay dòng dưới.
	if s.may != nil {
		if _, err := s.may.dangMo(id); err == nil {
			writeErr(w, http.StatusConflict, fmt.Errorf(
				"tác phẩm %q đang có engine mở — dừng và đóng nó trước rồi mới xóa được", id))
			return
		}
	}

	// Chốt lần cuối trước khi RemoveAll: `dir` phải nằm THẬT SỰ trong gốc.
	//
	// `bookDir` đã canh việc này rồi, nên đây là lớp thừa — và nó thừa một cách có chủ ý.
	// Mọi lớp canh khác trong tệp này trả về lỗi; riêng lớp này đứng trước một lệnh xóa
	// đệ quy. Cái giá của một lần canh thừa là vài dòng, cái giá của một lần thiếu là
	// `rm -rf` chạy ngoài thư mục gốc.
	rootAbs, err := filepath.Abs(s.root)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	if dir == rootAbs || !strings.HasPrefix(dir, rootAbs+string(os.PathSeparator)) {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("tên tác phẩm không hợp lệ: %q", id))
		return
	}

	if err := os.RemoveAll(dir); err != nil {
		writeErr(w, http.StatusInternalServerError, fmt.Errorf("xóa %q không xong: %w", id, err))
		return
	}
	slog.Info("studio xóa tác phẩm", "module", "serve", "book", id, "dir", dir)

	writeJSON(w, map[string]any{"book": id, "deleted": true})
}
