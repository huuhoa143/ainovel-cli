/**
 * Bộ đệm VĂN SỐNG phía client — chữ model đang sinh ra, đã nhận qua SSE.
 *
 * Đây là bộ đệm THỨ HAI, và hai bộ đệm giữ hai thứ khác nhau — đừng lẫn:
 *
 *   - **Server** (`internal/serve/dong_van.go`) giữ đúng LƯỢT HIỆN TẠI, trần 512KB, cắt từ
 *     đầu. Nó chỉ cần đủ cho người mở trang GIỮA một lượt.
 *   - **Client** (tệp này) giữ 3 lượt gần nhất để đọc lại được đoạn vừa trôi qua.
 *
 * Trần đôi là cố ý. Chỉ đếm lượt thì một lượt Writer bằng cả chương vẫn phình tới hàng chục
 * MB. Chỉ đếm byte thì một lượt dài đẩy hết lượt trước ra và mất luôn vạch ngăn — tức mất
 * đúng thứ làm người đọc biết mình đang ở lượt nào.
 */

/** Một lượt máy nói: từ lệnh xóa này tới lệnh xóa kế tiếp. */
export interface LuotVan {
  /**
   * Số thứ tự tăng dần, KHÔNG dùng lại sau khi lượt bị bỏ.
   *
   * Dùng làm `key` của React. Chỉ số mảng thì không được: khi lượt cũ nhất bị bỏ, mọi chỉ số
   * dịch xuống một bậc, React coi đó là "nội dung của phần tử 0 vừa đổi" và giữ nguyên nút
   * DOM — trong một khu đang tự cuộn thì đó là một cú nhảy vị trí ngay giữa lúc đọc.
   */
  id: number;
  /** Nhãn vạch ngăn mở đầu lượt. `undefined` cho lượt đầu tiên của phiên xem. */
  nhan?: string;
  chu: string;
}

export interface BoDemVan {
  luot: LuotVan[];
  /** id sẽ cấp cho lượt kế tiếp. */
  idKe: number;
}

export const BO_DEM_RONG: BoDemVan = { luot: [], idKe: 1 };

/** Số lượt giữ lại. Người dùng cần đối chiếu lượt này với lượt trước, không cần cả phiên. */
export const SO_LUOT_GIU = 3;

/** Trần tổng byte của cả bộ đệm. Cùng con số với trần của server, vì cùng một lý do. */
export const CO_TOI_DA = 512 * 1024;

/** Thêm một mẩu chữ vào lượt đang mở. Mở lượt đầu nếu bộ đệm còn rỗng. */
export function themChu(bd: BoDemVan, chu: string): BoDemVan {
  if (!chu) return bd;
  const luot = bd.luot.slice();
  const cuoi = luot[luot.length - 1];
  if (!cuoi) {
    // Mẩu tới trước lệnh xóa nào cả. Server LUÔN gửi `stream_clear` trước lúc nối, nên ca này
    // chỉ xảy ra khi engine mở giữa chừng — vẫn phải giữ chữ, không được bỏ.
    return cat({ luot: [{ id: bd.idKe, chu }], idKe: bd.idKe + 1 });
  }
  luot[luot.length - 1] = { ...cuoi, chu: cuoi.chu + chu };
  return cat({ luot, idKe: bd.idKe });
}

/**
 * Mở một lượt mới — phản ứng với `stream_clear`.
 *
 * Tên hàm là "mở lượt", không phải "xóa": ở TUI lệnh này XÓA sạch khu chữ, còn ở đây nó thành
 * một vạch ngăn. Trình duyệt giỏi đúng cái terminal dở — cuộn lại được — nên vứt đi phần vừa
 * đọc là bỏ phí một khả năng, và người dùng đã chọn phương án vạch ngăn.
 *
 * Lượt đang mở mà RỖNG thì thay nhãn của nó chứ không xếp thêm một lượt nữa: hai sentinel
 * liền nhau là ca hợp lệ, và một lượt rỗng vẽ ra là một vạch ngăn không ngăn gì cả.
 */
export function moLuot(bd: BoDemVan, nhan?: string): BoDemVan {
  const cuoi = bd.luot[bd.luot.length - 1];
  if (cuoi && cuoi.chu === '') {
    const luot = bd.luot.slice();
    luot[luot.length - 1] = { ...cuoi, nhan };
    return { luot, idKe: bd.idKe };
  }
  return cat({
    luot: [...bd.luot, { id: bd.idKe, nhan, chu: '' }],
    idKe: bd.idKe + 1,
  });
}

/** Cắt theo hai trần. Bước 3 của Task 4 thay thân hàm này. */
function cat(bd: BoDemVan): BoDemVan {
  return bd;
}
