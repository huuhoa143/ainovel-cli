'use client';

import { so, tongTien } from '@/lib/dinhdang';
import { CHU, GIAI_THICH, nhanVai } from '@/lib/nhan';
import type { UsageTotals } from '@/lib/types';
import { tienCuaXuong, type TaiTongXuong } from '@/lib/tongXuong';

import { HoSoKhung } from './HoSoKhung';

/**
 * Chi phí TOÀN XƯỞNG — bổ theo vai và theo model.
 *
 * # Vì sao bề mặt này chỉ tồn tại được từ bản này
 *
 * `/api/books/{b}/cost` là per-book. Cộng ở web nghĩa là N lượt gọi mỗi lần mở màn, và hai
 * người xem cùng lúc sẽ thấy hai con số khác nhau vì N lượt ấy không cùng một thời điểm. Nên
 * phép cộng phải ở server, và `GET /api/workshop/cost` là route mới làm việc đó.
 *
 * # Hai câu bề mặt này BẮT BUỘC phải nói ra
 *
 *   1. **Mẫu số.** Đo trên xưởng thật: tổng `$7,37` với `counted: 1` trên ba cuốn — hai cuốn
 *      còn lại chưa có `meta/usage.json`. Một con số tiền không kèm mẫu số sẽ được đọc thành
 *      "cả xưởng tốn có thế", và người vận hành sẽ lập ngân sách theo nó.
 *   2. **Số lượt thiếu usage.** `missing_assistant_usage` lớn nghĩa là MỌI con số ở đây đều
 *      thiếu một phần. Im lặng về nó là để người dùng tin một tổng bị hụt.
 *
 * # Vì sao các thanh KHÔNG phải trang trí
 *
 * Câu hỏi thật của bề mặt này là "tiền đi đâu", và câu trả lời là một tỉ lệ — Writer thường
 * ăn 60–80%. Một cột số mono trả lời được câu đó nhưng phải đọc từng dòng rồi tự chia; thanh
 * trả lời nó bằng một cú nhìn. Mỗi dải tỉ lệ với hàng LỚN NHẤT CỦA CHÍNH NÓ, không với tổng
 * và không dùng chung mốc với dải kia: chia theo tổng thì bốn vai đều thành những vạch ngắn
 * cạnh nhau và mất đúng phép so sánh cần thấy — còn dùng chung mốc thì một thanh tính ra
 * quá 100% và bị `overflow: hidden` cắt thành một thanh đầy nói dối (xem `dinhVai`).
 */
export function ChiPhiXuong({ tong }: { tong: TaiTongXuong }) {
  if (tong.loi) {
    return (
      <HoSoKhung tieuDe={CHU.chiPhiXuong}>
        <section className="sect">
          <h2>{GIAI_THICH.nguonKhongDocDuocTieuDe}</h2>
          <p className="trongSect">{GIAI_THICH.nguonKhongDocDuoc}</p>
          <p className="loiDoc">{tong.loi}</p>
        </section>
      </HoSoKhung>
    );
  }
  if (tong.dangTai) {
    return (
      <HoSoKhung tieuDe={CHU.chiPhiXuong}>
        <section className="sect">
          <p className="trongSect">{CHU.dangTai}</p>
        </section>
      </HoSoKhung>
    );
  }

  const tien = tienCuaXuong(tong.du);
  if (!tong.du || !tien) {
    return (
      <HoSoKhung tieuDe={CHU.chiPhiXuong}>
        <section className="sect">
          <p className="trongSect">{GIAI_THICH.chiPhiXuongChuaCoGi}</p>
        </section>
      </HoSoKhung>
    );
  }

  const vai = sapTheoTien(tong.du.per_agent);
  const model = sapTheoTien(tong.du.per_model);
  /**
   * Mỗi dải có MẪU SỐ RIÊNG: hàng tốn nhất của chính dải đó.
   *
   * Bản đầu dùng một mẫu số chung (đỉnh của dải vai) cho cả hai dải, và nó SAI — đo được
   * trên xưởng thật: `gemini-2.5-pro` tốn $7,37 trong khi vai tốn nhất (Writer) là $4,18, nên
   * thanh của nó tính ra **176%**. Nó không hiện ra như một lỗi vì `overflow: hidden` của
   * `.boThanh` cắt phần thừa: thanh trông đầy 100% và đọc ra là "vai này tốn nhất", đúng lúc
   * nó thực ra tốn gần gấp đôi cái được lấy làm mốc. Một thanh nói dối mà không có vạch nào
   * cho thấy nó đang nói dối.
   *
   * Hai dải trả lời hai câu khác nhau ("tiền đi vào vai nào" / "vào model nào") nên tỉ lệ của
   * chúng không được chia chung một mốc; tổng của hai dải bằng nhau nhưng đỉnh thì không.
   */
  const dinhVai = vai[0]?.[1].cost_usd ?? 0;
  const dinhModel = model[0]?.[1].cost_usd ?? 0;

  return (
    <HoSoKhung
      tieuDe={CHU.chiPhiXuong}
      motTa={
        tien.tongSach > 0 && tien.demDuoc < tien.tongSach
          ? tien.demDuoc === 0
            ? CHU.chuaDoDuocCuonNao
            : CHU.doDuocO(tien.demDuoc, tien.tongSach)
          : undefined
      }
    >
      <section className="sect">
        <div className="xtong">
          <span className="o">
            {tongTien(tien.chiPhi)} <em>{CHU.donViDaTieu}</em>
          </span>
          {/* Tiền cache tiết kiệm được là con số dễ gây nhầm nhất ở đây: nó KHÔNG phải tiền
              trong ví mà là tiền lẽ ra phải trả nếu không có bộ đệm. Nhãn nói ra điều đó. */}
          <span className="o">
            {tongTien(tien.tietKiem)} <em>{CHU.cacheTietKiem}</em>
          </span>
          <span className="o">
            {so(tien.demDuoc)} <em>{CHU.cuonDaDo}</em>
          </span>
        </div>

        {/* Lượt thiếu usage: tin về ĐỘ TIN CẬY của mọi con số phía trên, nên nó đứng ngay
            dưới chúng chứ không ở cuối trang. */}
        {tien.thieuUsage > 0 ? (
          <p className="vphacap">
            <span className="ky" aria-hidden="true">
              ■
            </span>
            <span>{GIAI_THICH.chiPhiXuongThieuUsage(tien.thieuUsage)}</span>
          </p>
        ) : null}
      </section>

      {vai.length > 0 ? (
        <section className="sect">
          <h2>{CHU.boTheoVai}</h2>
          <p className="steerhint">{GIAI_THICH.chiPhiXuongGiaiThich}</p>
          <div className="boDai">
            {vai.map(([ten, t]) => (
              <HangBo key={ten} ten={nhanVai(ten)} t={t} dinh={dinhVai} />
            ))}
          </div>
        </section>
      ) : null}

      {model.length > 0 ? (
        <section className="sect">
          <h2>{CHU.boTheoModel}</h2>
          <div className="boDai">
            {model.map(([ten, t]) => (
              <HangBo key={ten} ten={ten} t={t} dinh={dinhModel} mono />
            ))}
          </div>
        </section>
      ) : null}
    </HoSoKhung>
  );
}

/**
 * Một hàng bổ: tên · thanh · số tiền.
 *
 * Số tiền mang cả `$0,00` khi vai đó chưa tốn gì, KHÔNG phải một dấu `—`. `0` ở đây là một
 * phép đo có thật ("vai này đã chạy và chưa tốn đồng nào", ca thật của `arbiter` trên xưởng
 * đo được), và nó khác hẳn vắng mặt. Cùng luật null≠0 mà cả hợp đồng giữ.
 */
function HangBo({
  ten,
  t,
  dinh,
  mono,
}: {
  ten: string;
  t: UsageTotals;
  dinh: number;
  /** Tên model là ĐỊNH DANH đối chiếu được, nên nó dùng chữ mono; tên vai là nhãn tiếng Việt. */
  mono?: boolean;
}) {
  const phanTram = dinh > 0 ? Math.round((t.cost_usd / dinh) * 100) : 0;
  return (
    <div className="hangBo">
      <span className={`boTen${mono ? ' m' : ''}`}>{ten}</span>
      <span className="boThanh" aria-hidden="true">
        <span className="day" style={{ width: `${phanTram}%` }} />
      </span>
      <span className="boTien">{tongTien(t.cost_usd)}</span>
      {/* Tiền cache của TỪNG vai: chỉ hiện khi có, vì `$0,00` ở cột này là ca thường (vai
          dùng model không biết cache) và một cột đầy $0,00 làm loãng cột chính. */}
      <span className="boCache">{t.saved_usd > 0 ? tongTien(t.saved_usd) : ''}</span>
    </div>
  );
}

/**
 * Xếp giảm dần theo tiền.
 *
 * Thứ tự này là thông tin, không phải chuyện gọn gàng: câu hỏi của bề mặt là "tiền đi đâu",
 * nên vai tốn nhất phải ở dòng đầu. Xếp theo tên (thứ tự map của JSON) sẽ đặt `arbiter` —
 * vai gần như luôn $0 — lên đầu bảng.
 */
function sapTheoTien(m: Record<string, UsageTotals>): [string, UsageTotals][] {
  return Object.entries(m).sort((a, b) => b[1].cost_usd - a[1].cost_usd);
}
