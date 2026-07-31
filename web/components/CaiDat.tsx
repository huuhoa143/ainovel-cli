'use client';

import { layCaiDat } from '@/lib/api';
import { ngayGio, so } from '@/lib/dinhdang';
import {
  CHU,
  GIAI_THICH,
  nhanBacQuyHoach,
  nhanCheDoTien,
  nhanMocTamDung,
} from '@/lib/nhan';
import type { SettingsDoc } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, tinhTrangHoSo } from './HoSoKhung';

/**
 * Cài đặt: phiên chạy này được khởi động với cấu hình gì.
 *
 * # Bề mặt CHỈ ĐỌC, và đó là một sự thật kỹ thuật chứ không phải việc còn tồn
 *
 * `serve` không ghi store. Lý do ở đầu internal/serve/serve.go và nó giống hệt lý
 * do ô can thiệp bị vô hiệu: engine SỞ HỮU quyền ghi `meta/run.json`. Nếu serve
 * cũng ghi thì hai tiến trình cùng sửa một tệp — engine đọc `PendingSteer`, xử
 * lý, rồi `ClearPendingSteer`; một lượt ghi chen vào giữa sẽ mất trắng ý kiến can
 * thiệp, không lỗi, không dấu vết.
 *
 * Trạng thái đó đọc từ `writable` của server, KHÔNG hard-code ở đây. Ngày engine
 * nhận lệnh ghi thì server đổi một trường và bề mặt này theo, không phải đi sửa
 * web.
 *
 * # Vì sao không vẽ một biểu mẫu vô hiệu
 *
 * Ô can thiệp vẽ ô nhập ở trạng thái `disabled` chứ không xoá, và đó là lựa chọn
 * đúng CHO NÓ: nó có đúng một điều khiển, nên một ô xám nói được "chỗ này sẽ nhận
 * can thiệp, tìm ở đây". Cài đặt có mười trường. Mười ô xám không nói thêm gì mà
 * chúng nói dối về hình dạng của bề mặt sẽ-có — biểu mẫu sửa cấu hình phiên đang
 * chạy gần như chắc chắn không phải là mười ô này. Nên ở đây là một câu, và câu
 * đó nói rõ vì sao.
 */
export function CaiDat({ tacPham }: { tacPham: string | undefined }) {
  const tai = useHoSo(tacPham, layCaiDat);
  const tt = tinhTrangHoSo(tai);
  const du = tai.du;

  return (
    <HoSoKhung tieuDe={CHU.caiDat} motTa={tt || !du ? undefined : motTa(du)}>
      {tt ??
        (du ? (
          du.state === 'no_file' ? (
            <section className="sect">
              <p className="trongSect">{GIAI_THICH.cdChuaChay}</p>
            </section>
          ) : trongRong(du) ? (
            // Tệp CÓ mà mọi trường rỗng — khác hẳn chưa có tệp, và ta biết chắc
            // là khác vì `state` đã nói `ready`.
            <section className="sect">
              <p className="trongSect">{GIAI_THICH.cdTepCoMaRong}</p>
            </section>
          ) : (
            <>
              <PhienChay du={du} />
              <TienChuong du={du} />
              <YeuCauKhoiTao du={du} />
              <CanThiepConTon du={du} />
              <PhanQuyetKhoiDong du={du} />
              <ChiDoc du={du} />
            </>
          )
        ) : null)}
    </HoSoKhung>
  );
}

function PhienChay({ du }: { du: SettingsDoc }) {
  return (
    <section className="sect">
      <h2>{CHU.cdPhienChay}</h2>
      <dl className="kv kvcd">
        {du.started_at ? (
          <>
            <dt>{CHU.cdBatDauLuc}</dt>
            <dd className="m">{ngayGio(du.started_at) ?? du.started_at}</dd>
          </>
        ) : null}
        {du.provider ? (
          <>
            <dt>{CHU.cdNhaCungCap}</dt>
            <dd className="m">{du.provider}</dd>
          </>
        ) : null}
        {du.model ? (
          <>
            <dt>{CHU.cdModel}</dt>
            <dd className="m">{du.model}</dd>
          </>
        ) : null}
        {/* `style` là kiểu văn chọn LÚC KHỞI ĐỘNG, khác hẳn bộ luật văn phong mà
            Editor chắt ra sau ở biên cung. Hai thứ cùng tên "văn phong" trong
            tiếng Việt nên nhãn phải tách chúng ra, nếu không người vận hành sẽ
            đọc đây là bộ luật đang có hiệu lực. */}
        {du.style ? (
          <>
            <dt title={GIAI_THICH.cdMauVanPhongDay}>{CHU.cdMauVanPhong}</dt>
            <dd>{du.style}</dd>
          </>
        ) : null}
        {du.planning_tier ? (
          <>
            <dt>{CHU.cdBacQuyHoach}</dt>
            <dd>{nhanBacQuyHoach(du.planning_tier)}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

/**
 * Chế độ tiến chương — phần có hệ quả vận hành trực tiếp nhất của cả bề mặt.
 *
 * Ở chế độ `review`, engine dừng lại chờ người cho phép từng chương. Nên
 * `advance_permit_chapter` là câu trả lời cho "vì sao dây chuyền đứng yên", và
 * `0` ở đó là câu trả lời ĐÁNG GIÁ NHẤT: chưa chương nào được cấp phép.
 *
 * Vì thế kiểm `!= null`, không kiểm falsy. Nếu kiểm falsy thì đúng cái ca cần
 * hiện nhất là cái ca biến mất.
 */
function TienChuong({ du }: { du: SettingsDoc }) {
  if (!du.advance_mode && du.advance_permit_chapter == null && !du.advance_hold) {
    return null;
  }
  const cho = du.advance_mode === 'review';

  return (
    <section className="sect">
      <h2>{CHU.cdTienChuong}</h2>
      <dl className="kv kvcd">
        {du.advance_mode ? (
          <>
            <dt>{CHU.cdCheDo}</dt>
            <dd>
              {nhanCheDoTien(du.advance_mode)}
              <span className="cua">
                {cho ? GIAI_THICH.cdCheDoCho : GIAI_THICH.cdCheDoTuDong}
              </span>
            </dd>
          </>
        ) : null}
        {du.advance_permit_chapter != null ? (
          <>
            <dt>{CHU.cdChuongDuocPhep}</dt>
            <dd className="m">
              {du.advance_permit_chapter > 0 ? (
                so(du.advance_permit_chapter)
              ) : (
                <span className="chuacap">{CHU.cdChuaCapPhep}</span>
              )}
            </dd>
          </>
        ) : null}
      </dl>

      {/* Tạm dừng một lần là một Ý ĐỊNH đã ký, chưa tiêu thụ — engine sẽ dừng ở
          mốc ghi trong nó. Đó là tin sắp-xảy-ra, nên nó mang tông amber và đứng
          riêng chứ không nằm lẫn trong danh sách khoá-giá trị. */}
      {du.advance_hold ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>
            <strong>{CHU.cdTamDungMotLan(nhanMocTamDung(du.advance_hold.after))}.</strong>{' '}
            {du.advance_hold.reason}
          </span>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Yêu cầu gốc của người dùng.
 *
 * `--ui`, KHÔNG serif, và đây là chỗ phép thử của DESIGN.md:64 dễ bị làm sai
 * nhất trên cả bề mặt: đoạn này dài, là văn xuôi, và trông rất giống một khối
 * đáng cho serif. Nhưng phép thử hỏi "chữ này có nằm trong bộ truyện xuất bản
 * không" — đây là câu người vận hành dặn engine, người đọc truyện không bao giờ
 * thấy nó. Cùng loại với `core_event` của khế ước. Nên `--ui`, giữ khổ đọc dài
 * (`line-height` 1.78, `max-width` 74ch).
 */
function YeuCauKhoiTao({ du }: { du: SettingsDoc }) {
  if (!du.start_prompt) return null;
  return (
    <section className="sect">
      <h2>{CHU.cdYeuCauKhoiTao}</h2>
      <p className="steerhint">{GIAI_THICH.cdYeuCauGiai}</p>
      <p className="cdvan">{du.start_prompt}</p>
    </section>
  );
}

/**
 * Ý kiến can thiệp còn tồn.
 *
 * Trường này chỉ có giá trị khi engine CHƯA tiêu thụ nó, nên sự hiện diện của nó
 * đã là tin: có một ý kiến đã ký mà dây chuyền chưa xử lý. Nó thuộc bề mặt này vì
 * đây là chỗ duy nhất trong API trả nó ra.
 */
function CanThiepConTon({ du }: { du: SettingsDoc }) {
  if (!du.pending_steer) return null;
  return (
    <section className="sect">
      <h2>{CHU.cdCanThiepConTon}</h2>
      <p className="vphacap">
        <span className="ky" aria-hidden="true">
          ■
        </span>
        <span>{GIAI_THICH.cdCanThiepConTonGiai}</span>
      </p>
      <p className="cdvan">{du.pending_steer}</p>
    </section>
  );
}

/**
 * Phán quyết khởi động — sự thật mà việc khôi phục sau sập dựa vào.
 *
 * `decision_id` nối sang nhật ký phán quyết ở bề mặt Dòng sản xuất, nên nó hiện
 * dạng mã mono chứ không bị làm đẹp: nó là thứ để đối chiếu, không phải để đọc.
 */
function PhanQuyetKhoiDong({ du }: { du: SettingsDoc }) {
  const ps = du.plan_start;
  if (!ps) return null;
  return (
    <section className="sect">
      <h2>{CHU.cdPhanQuyetKhoiDong}</h2>
      <dl className="kv kvcd">
        {ps.planner ? (
          <>
            <dt>{CHU.cdNguoiQuyHoach}</dt>
            <dd>{ps.planner}</dd>
          </>
        ) : null}
        {ps.planner_task ? (
          <>
            <dt>{CHU.cdViecQuyHoach}</dt>
            <dd>{ps.planner_task}</dd>
          </>
        ) : null}
        {ps.decision_id ? (
          <>
            <dt>{CHU.cdMaPhanQuyet}</dt>
            <dd className="m">{ps.decision_id}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

/**
 * Vì sao bề mặt này không sửa được.
 *
 * Đọc từ `writable`, không hard-code — và cũng KHÔNG im lặng. Một bề mặt tên là
 * "Cài đặt" mà không có gì bấm được sẽ bị đọc là hỏng, trừ khi nó nói ra vì sao.
 */
function ChiDoc({ du }: { du: SettingsDoc }) {
  if (du.writable) return null;
  return (
    <section className="sect">
      <p className="steerhint">
        <strong>{GIAI_THICH.cdChiDocDau}.</strong> {GIAI_THICH.cdChiDocVi}{' '}
        {GIAI_THICH.cdKhongCoKhoa}
      </p>
    </section>
  );
}

/**
 * `ready` mà mọi trường đều rỗng là ca thật: `meta/run.json` có thể tồn tại với
 * phần lớn trường `omitempty` bị bỏ. Không kiểm `advance_permit_chapter` ở đây —
 * `0` của nó là dữ liệu, nhưng một tệp chỉ có đúng số 0 đó thì vẫn là một tệp
 * không nói được gì cho người vận hành.
 */
function trongRong(du: SettingsDoc): boolean {
  return (
    !du.started_at &&
    !du.provider &&
    !du.model &&
    !du.style &&
    !du.planning_tier &&
    !du.advance_mode &&
    !du.advance_hold &&
    !du.pending_steer &&
    !du.start_prompt &&
    !du.plan_start
  );
}

/** Dòng mô tả: model và chế độ tiến chương là hai điều đáng biết trước khi cuộn. */
function motTa(du: SettingsDoc): string | undefined {
  if (du.state === 'no_file') return undefined;
  const phan: string[] = [];
  if (du.model) phan.push(du.model);
  if (du.advance_mode) phan.push(nhanCheDoTien(du.advance_mode));
  if (du.started_at) {
    const t = ngayGio(du.started_at);
    if (t) phan.push(CHU.cdKhoiDongLuc(t));
  }
  return phan.length > 0 ? phan.join(' · ') : undefined;
}
