'use client';

import { useState } from 'react';

import { LoiApi, canThiep } from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { Capabilities } from '@/lib/types';

/**
 * Ô can thiệp — người vận hành nói vào dây chuyền.
 *
 * # Ô này từng bị vô hiệu, và lý do đã hết hiệu lực
 *
 * Bản trước vô hiệu hóa ô nhập vì "engine sở hữu quyền ghi; serve ghi vào cùng tệp thì
 * hai process cùng sửa `meta/run_meta.json` và ý kiến can thiệp sẽ mất trắng". Lý lẽ đó
 * đúng với tiền đề của nó, và tiền đề đã đổi: engine chạy TRONG process studio nên chỉ
 * còn một người ghi. `capabilities.steer` giờ nói đúng sự thật đó — server đặt nó theo
 * việc có mắc nhóm route ghi hay không — và ô này vẫn theo cờ như nó vẫn làm, nên khi
 * studio chạy ngoài loopback (đường ghi tắt) nó tự trở lại vô hiệu.
 *
 * Lo ngại cũ vẫn đúng và KHÔNG bị bỏ qua: vẽ một ô nhập hoạt động rồi gửi vào hư không là
 * lỗi tệ nhất ở đây. Nên ô chỉ hoạt động khi cờ bật, và mọi lỗi từ server được hiện nguyên
 * văn thay vì nuốt.
 *
 * # Vì sao MỘT ô cho ba việc
 *
 * Server tự chọn `Steer` (đang chạy → tiêm vào lượt hiện tại) hay `Continue` (đã dừng →
 * đánh thức lượt mới) theo trạng thái engine, đúng như TUI dùng một ô nhập cho cả ba ca.
 * Hai ô riêng sẽ buộc người vận hành phải biết engine đang ở trạng thái nào TRƯỚC khi gõ —
 * thứ mà họ mở studio ra để biết.
 *
 * Nhưng nhãn nút thì nói TRƯỚC câu này sẽ thành gì, vì hai việc khác nhau về hệ quả: tiêm
 * vào lượt đang chạy có thể làm chương đang viết bị xếp lại vào hàng chờ, còn đánh thức là
 * bắt đầu một lượt mới và tiêu tiền.
 */
export function OCanThiep({
  capabilities,
  tacPham,
  dangChay,
}: {
  capabilities: Capabilities;
  tacPham: string | undefined;
  dangChay?: boolean;
}) {
  const bat = capabilities.steer && !!tacPham;
  const [chu, datChu] = useState('');
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [daLam, datDaLam] = useState<'steer' | 'continue' | null>(null);

  const gui = () => {
    if (!tacPham || !chu.trim()) return;
    datDangGui(true);
    datLoi(null);
    datDaLam(null);
    canThiep(tacPham, chu.trim())
      .then((r) => {
        datDaLam(r.applied);
        datChu('');
      })
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <>
      <div className="steerbox">
        <input
          type="text"
          placeholder={CHU.viDuCanThiep}
          aria-label={CHU.canThiep}
          aria-describedby="vi-sao-can-thiep"
          value={chu}
          onChange={(e) => datChu(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              gui();
            }
          }}
          disabled={!bat || dangGui}
          readOnly={!bat}
        />
        <button type="button" onClick={gui} disabled={!bat || dangGui || !chu.trim()}>
          {dangGui ? CHU.dangGui : dangChay ? CHU.tiemVaoLuotDangChay : CHU.danhThucLuotMoi}
        </button>
      </div>

      {loi ? <p className="loiDoc">{loi}</p> : null}
      {daLam ? (
        <p className="steerhint">
          {daLam === 'steer' ? GIAI_THICH.daTiemVaoLuot : GIAI_THICH.daDanhThuc}
        </p>
      ) : null}

      <p className="steerhint" id="vi-sao-can-thiep">
        {bat ? (
          GIAI_THICH.canThiepArbiterXuLy
        ) : (
          <>
            <strong>{GIAI_THICH.canThiepChoDay}.</strong> {GIAI_THICH.canThiepTat}
          </>
        )}
      </p>
    </>
  );
}
