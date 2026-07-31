'use client';

import { layCaiDat } from '@/lib/api';
import { ngayGio, so } from '@/lib/dinhdang';
import {
  CHU,
  GIAI_THICH,
  nhanCheDoTien,
  nhanMocTamDung,
  nhanMucQuyHoach,
} from '@/lib/nhan';
import type { SettingsDoc } from '@/lib/types';
import { useHoSo } from '@/lib/useHoSo';

import { HoSoKhung, tinhTrangNguon } from './HoSoKhung';
import { KenhVai } from './KenhVai';

/**
 * Cài đặt: phiên chạy này được khởi động với cấu hình gì.
 *
 * # Bề mặt CHỈ ĐỌC, và đó là một sự thật kỹ thuật chứ không phải việc còn tồn
 *
 * `serve` không ghi store. Lý do ở đầu internal/serve/serve.go và nó giống hệt lý
 * do ô can thiệp bị vô hiệu: engine SỞ HỮU quyền ghi `meta/run.json`. Nếu serve
 * cũng ghi thì hai tiến trình cùng sửa một tệp — engine đọc `PendingSteer`, xử lý,
 * rồi `ClearPendingSteer`; một lượt ghi chen vào giữa sẽ mất trắng ý kiến can
 * thiệp, không lỗi, không dấu vết.
 *
 * Trạng thái đó đọc từ `writable` của server, KHÔNG hard-code ở đây. Ngày engine
 * nhận lệnh ghi thì server đổi một trường và bề mặt này theo, không phải phát hành
 * lại web.
 *
 * # Vì sao không vẽ một biểu mẫu vô hiệu
 *
 * Ô can thiệp vẽ ô nhập ở trạng thái `disabled` chứ không xoá, và đó là lựa chọn
 * đúng CHO NÓ: nó có đúng một điều khiển, nên một ô xám nói được "chỗ này sẽ nhận
 * can thiệp, tìm ở đây". Cài đặt có mười trường. Mười ô xám không nói thêm gì, mà
 * chúng còn nói dối về hình dạng của bề mặt sẽ-có — một biểu mẫu sửa cấu hình phiên
 * đang chạy gần như chắc chắn không phải mười ô này. Nên ở đây là một câu, và câu
 * đó nói rõ vì sao.
 */
export function CaiDat({ tacPham }: { tacPham: string | undefined }) {
  const tai = useHoSo(tacPham, layCaiDat);
  const tt = tinhTrangNguon(tai);
  const du = tai.du;

  return (
    <HoSoKhung tieuDe={CHU.caiDat} motTa={tt || !du ? undefined : motTa(du)}>
      {tt ??
        (du ? (
          du.state === 'no_file' ? (
            <section className="sect">
              <p className="trongSect">
                {GIAI_THICH.nguonChuaGhi(
                  GIAI_THICH.caiDatTepNguon,
                  GIAI_THICH.caiDatKhiNao,
                )}
              </p>
            </section>
          ) : trongRong(du) ? (
            // Tệp CÓ mà mọi trường rỗng — khác hẳn chưa có tệp, và ta biết chắc là
            // khác vì `state` đã nói `ready`.
            <section className="sect">
              <p className="trongSect">
                {GIAI_THICH.nguonCoMaRong(GIAI_THICH.caiDatTepNguon, 'trường')}
              </p>
            </section>
          ) : (
            <>
              <PhienChay du={du} />
              {/* Dải kênh model đứng ngay sau Phiên chạy vì nó là thứ DUY NHẤT trên bề
                  mặt này đổi được, và nó đổi đúng cái vừa hiện phía trên (model). Đặt
                  nó dưới cùng sẽ tách hành động khỏi con số mà hành động ấy sửa. */}
              <KenhVai tacPham={tacPham} />
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
      <h2>{CHU.phienChay}</h2>
      <dl className="kv kvcd">
        {du.started_at ? (
          <>
            <dt>{CHU.batDauLuc}</dt>
            <dd className="m">{ngayGio(du.started_at) ?? du.started_at}</dd>
          </>
        ) : null}
        {du.provider ? (
          <>
            <dt>{CHU.nhaCungCap}</dt>
            <dd className="m">{du.provider}</dd>
          </>
        ) : null}
        {du.model ? (
          <>
            <dt>{CHU.model}</dt>
            <dd className="m">{du.model}</dd>
          </>
        ) : null}
        {/* `style` là kiểu văn chọn LÚC KHỞI ĐỘNG, khác hẳn bộ quy tắc văn phong mà
            Editor chưng ra sau ở ranh giới cung. Hai thứ đều gọi là "văn phong"
            trong tiếng Việt nên nhãn phải tách chúng ra, nếu không người vận hành
            đọc đây là bộ quy tắc đang có hiệu lực. */}
        {du.style ? (
          <>
            <dt title={GIAI_THICH.caiDatKieuVanKhac}>{CHU.kieuVan}</dt>
            <dd>{du.style}</dd>
          </>
        ) : null}
        {du.planning_tier ? (
          <>
            <dt>{CHU.mucQuyHoach}</dt>
            <dd>{nhanMucQuyHoach(du.planning_tier)}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

/**
 * Chế độ đi tiếp chương — phần có hệ quả vận hành trực tiếp nhất của cả bề mặt.
 *
 * Ở chế độ `review`, engine dừng lại chờ người cho phép từng chương. Nên
 * `advance_permit_chapter` là câu trả lời cho "vì sao dây chuyền đứng yên", và `0`
 * ở đó là câu trả lời ĐÁNG GIÁ NHẤT: chưa cấp phép chương nào.
 *
 * Vì thế kiểm `!= null`, không kiểm falsy. Kiểm falsy thì đúng cái ca cần hiện
 * nhất là cái ca biến mất.
 */
function TienChuong({ du }: { du: SettingsDoc }) {
  if (!du.advance_mode && du.advance_permit_chapter == null && !du.advance_hold) {
    return null;
  }
  const cho = du.advance_mode === 'review';

  return (
    <section className="sect">
      <h2>{CHU.tienChuong}</h2>
      <dl className="kv kvcd">
        {du.advance_mode ? (
          <>
            <dt>{CHU.cheDoTien}</dt>
            <dd>{nhanCheDoTien(du.advance_mode)}</dd>
          </>
        ) : null}
        {du.advance_permit_chapter != null ? (
          <>
            <dt
              title={cho ? GIAI_THICH.caiDatCapPhepReview : GIAI_THICH.caiDatCapPhepAuto}
            >
              {CHU.chuongDuocCapPhep}
            </dt>
            <dd className="m">
              {du.advance_permit_chapter > 0 ? (
                so(du.advance_permit_chapter)
              ) : (
                <span className="chuacap">{CHU.chuaCapPhepChuongNao}</span>
              )}
            </dd>
          </>
        ) : null}
      </dl>

      {/* Ở chế độ chờ cấp phép, số 0 nghĩa là dây chuyền ĐANG ĐỨNG. Đó là tin vận
          hành, không phải một ô trống trong bảng — nên nó được nói ra thành câu
          thay vì chỉ nằm trong `title` của nhãn. */}
      {cho && du.advance_permit_chapter === 0 ? (
        <p className="steerhint">{GIAI_THICH.caiDatCapPhepReview}</p>
      ) : null}

      {/* Tạm dừng một lần là một Ý ĐỊNH đã ký, CHƯA tiêu thụ — engine sẽ dừng ở mốc
          ghi trong nó. Tin sắp-xảy-ra, nên tông amber và đứng riêng chứ không nằm
          lẫn trong danh sách khoá-giá trị. */}
      {du.advance_hold ? (
        <p className="vphacap">
          <span className="ky" aria-hidden="true">
            ■
          </span>
          <span>
            <strong>{CHU.tamDungSauKhi(nhanMocTamDung(du.advance_hold.after) ?? '')}.</strong>{' '}
            {GIAI_THICH.caiDatTamDung} {du.advance_hold.reason}
          </span>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Yêu cầu gốc của người dùng.
 *
 * `--ui`, KHÔNG serif, và đây là chỗ phép thử của DESIGN.md:64 dễ bị làm sai nhất
 * trên cả bề mặt: đoạn này dài, là văn xuôi, và trông rất giống một khối đáng cho
 * serif. Nhưng phép thử hỏi "chữ này có nằm trong bộ truyện xuất bản không" — đây
 * là câu người vận hành dặn engine, người đọc truyện không bao giờ thấy nó. Cùng
 * loại với `core_event` của khế ước chương. Nên `--ui`, và vẫn giữ khổ đọc dài
 * (`line-height` 1.78, `max-width` 74ch).
 */
function YeuCauKhoiTao({ du }: { du: SettingsDoc }) {
  if (!du.start_prompt) return null;
  return (
    <section className="sect">
      <h2>{CHU.yeuCauKhoiTao}</h2>
      <p className="steerhint">{GIAI_THICH.caiDatYeuCau}</p>
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
      <h2>{CHU.canThiepConTon}</h2>
      <p className="vphacap">
        <span className="ky" aria-hidden="true">
          ■
        </span>
        <span>{GIAI_THICH.caiDatCanThiepConTon}</span>
      </p>
      <p className="cdvan">{du.pending_steer}</p>
    </section>
  );
}

/**
 * Phán quyết khởi động — sự thật mà việc khôi phục sau sập dựa vào.
 *
 * `decision_id` nối sang nhật ký phán quyết ở bề mặt Dòng sản xuất, nên nó hiện
 * dạng mã mono chứ không được làm đẹp: nó là thứ để đối chiếu, không phải để đọc.
 */
function PhanQuyetKhoiDong({ du }: { du: SettingsDoc }) {
  const ps = du.plan_start;
  if (!ps) return null;
  return (
    <section className="sect">
      <h2>{CHU.phanQuyetKhoiDong}</h2>
      <dl className="kv kvcd">
        {ps.planner ? (
          <>
            <dt>{CHU.nguoiQuyHoach}</dt>
            <dd>{ps.planner}</dd>
          </>
        ) : null}
        {ps.planner_task ? (
          <>
            <dt>{CHU.viecQuyHoach}</dt>
            <dd>{ps.planner_task}</dd>
          </>
        ) : null}
        {ps.decision_id ? (
          <>
            <dt>{CHU.maPhanQuyet}</dt>
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
      <h2>{CHU.chiDoc}</h2>
      <p className="trongSect">{GIAI_THICH.caiDatChiDoc}</p>
      {/* Nói ra điều CỐ Ý không có, để không ai đi tìm nó rồi tưởng bề mặt thiếu. */}
      <p className="steerhint">{GIAI_THICH.caiDatKhongCoKhoa}</p>
    </section>
  );
}

/**
 * `ready` mà mọi trường đều rỗng là ca thật: `meta/run.json` có thể tồn tại với
 * phần lớn trường rỗng.
 *
 * KHÔNG kiểm `advance_permit_chapter` ở đây — `0` của nó là dữ liệu, nhưng một tệp
 * chỉ có đúng số 0 đó thì vẫn là một tệp không nói được gì cho người vận hành.
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

/** Dòng mô tả: model, chế độ đi tiếp, và mốc khởi động — ba điều đáng biết trước khi cuộn. */
function motTa(du: SettingsDoc): string | undefined {
  if (du.state === 'no_file') return undefined;
  const phan: string[] = [];
  if (du.model) phan.push(du.model);
  const cd = nhanCheDoTien(du.advance_mode);
  if (cd) phan.push(cd);
  const t = ngayGio(du.started_at);
  if (t) phan.push(CHU.khoiDongLuc(t));
  return phan.length > 0 ? phan.join(' · ') : undefined;
}
