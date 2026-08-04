'use client';

import { useEffect, useRef } from 'react';

import { CHU } from '@/lib/nhan';

/**
 * Hộp xác nhận cho một hành động không hoàn tác được.
 *
 * # Vì sao KHÔNG dùng `window.confirm`
 *
 * Bản đầu của nút Xóa gọi `window.confirm`, và cái giá của nó thấy ngay trên ảnh chụp: một
 * hộp NỀN SÁNG mang tiêu đề `127.0.0.1:8420 says`, chữ hệ thống, nút theo hệ điều hành. Nó
 * không sai chức năng — nó phá sạch thế giới hình ảnh ở đúng khoảnh khắc người dùng cần tin
 * vào bề mặt nhất: khoảnh khắc quyết định xóa. Và một hộp mang tên máy chủ đọc ra như một
 * cảnh báo của trình duyệt, không như một câu hỏi của phần mềm.
 *
 * # Vì sao `<dialog>` gốc chứ không dựng lớp phủ bằng div
 *
 * `showModal()` cho sẵn ba thứ mà một lớp phủ tự dựng phải viết tay và thường viết thiếu:
 * bẫy focus trong hộp, `Escape` đóng hộp, và `::backdrop` chặn tương tác phía sau. Tự dựng là
 * nhận ba cơ hội làm sai để đổi lấy quyền kiểm soát mà bề mặt này không cần.
 *
 * # Vì sao focus mặc định vào HỦY
 *
 * Đây là hộp của một hành động phá hủy. Người ta bấm Enter theo phản xạ, nên phím Enter phải
 * rơi vào nút KHÔNG làm gì. Muốn xóa thì phải chỉ đích danh nút xóa.
 */
export function HopXacNhan({
  moRa,
  tieuDe,
  than,
  nhanLam,
  onLam,
  onHuy,
  dangLam = false,
}: {
  moRa: boolean;
  /** Câu hỏi, một dòng. */
  tieuDe: string;
  /** Nói ra CÁI MẤT — số chương, số tiền. Đây là phần buộc phải đọc. */
  than: string;
  nhanLam: string;
  onLam: () => void;
  onHuy: () => void;
  dangLam?: boolean;
}) {
  const hop = useRef<HTMLDialogElement>(null);
  const nutHuy = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = hop.current;
    if (!d) return;
    if (moRa) {
      // jsdom chưa hiện thực `showModal`, và một bài kiểm về nội dung hộp không được đỏ vì
      // chuyện đó — cùng lý lẽ đã ghi cho `EventSource` trong lib/useStudio.test.tsx.
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      nutHuy.current?.focus();
    } else if (d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [moRa]);

  return (
    <dialog
      ref={hop}
      className="hopxn"
      /* `Escape` đóng hộp là hành vi sẵn có của `<dialog>`; bắt `cancel` để state của React
         không lệch khỏi DOM sau khi trình duyệt tự đóng. */
      onCancel={(e) => {
        e.preventDefault();
        if (!dangLam) onHuy();
      }}
      aria-labelledby="hopxn-de"
    >
      <h2 id="hopxn-de">{tieuDe}</h2>
      <p>{than}</p>
      <div className="hopxnNut">
        <button type="button" ref={nutHuy} onClick={onHuy} disabled={dangLam}>
          {CHU.huy}
        </button>
        <button type="button" className="hopxnLam" onClick={onLam} disabled={dangLam}>
          {dangLam ? CHU.dangXoa : nhanLam}
        </button>
      </div>
    </dialog>
  );
}
