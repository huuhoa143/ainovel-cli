'use client';

import { GIAI_THICH } from '@/lib/nhan';
import type { Capabilities } from '@/lib/types';

/**
 * Ô can thiệp — người vận hành nói vào dây chuyền đang chạy.
 *
 * `capabilities.steer === false` ở bản engine này, nên ô nhập bị VÔ HIỆU và nói
 * rõ vì sao. Đây là chỗ dễ làm sai nhất trong cả bề mặt: vẽ một ô nhập hoạt
 * động rồi gửi vào hư không thì người vận hành tưởng đã can thiệp, engine
 * không nhận được gì, và không có lỗi nào hiện ra để họ biết.
 *
 * Lý do kỹ thuật ở internal/serve/serve.go: engine SỞ HỮU quyền ghi. Nếu serve
 * cũng ghi thì hai process cùng sửa meta/run_meta.json — engine đọc
 * PendingSteer, xử lý, rồi ClearPendingSteer; một lượt ghi chen vào giữa sẽ mất
 * trắng ý kiến can thiệp, không lỗi, không dấu vết.
 *
 * Nút vẫn được vẽ ở trạng thái vô hiệu chứ không bị xóa: nó cho biết bề mặt này
 * SẼ nhận can thiệp khi engine hợp tác, và người vận hành biết phải tìm ở đâu.
 */
export function OCanThiep({ capabilities }: { capabilities: Capabilities }) {
  const bat = capabilities.steer;

  return (
    <>
      <div className="steerbox">
        <input
          type="text"
          placeholder="ví dụ: Lâm Thanh nên do dự lâu hơn trước khi rút kiếm"
          aria-label="Ý kiến can thiệp"
          aria-describedby="vi-sao-can-thiep"
          disabled={!bat}
          readOnly={!bat}
        />
        <button type="button" disabled={!bat}>
          Gửi cho Arbiter
        </button>
      </div>
      <p className="steerhint" id="vi-sao-can-thiep">
        {bat ? (
          <>
            Arbiter phân loại phạm vi ảnh hưởng rồi xếp các chương bị tác động vào hàng chờ
            viết lại. Phán quyết được ghi vào nhật ký ở trên.
          </>
        ) : (
          <>
            <strong>{GIAI_THICH.canThiepChoDay}.</strong> {GIAI_THICH.canThiepTat}
          </>
        )}
      </p>
    </>
  );
}
