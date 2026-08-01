'use client';

import { useState } from 'react';

import {
  LoiApi,
  chayMoPhong,
  nhapHoSoMoPhong,
  nhapTruyen,
  xuatBan,
} from '@/lib/api';
import { CHU, GIAI_THICH } from '@/lib/nhan';
import type { DongNhatKy } from '@/lib/types';

/**
 * Nhập & Xuất — ba luồng cần tệp.
 *
 * # Vì sao ba luồng ở CÙNG một bề mặt
 *
 * Chúng khác nhau về mục đích nhưng giống nhau về hình dạng tương tác: chọn tệp, bấm chạy,
 * đọc nhật ký. Tách thành ba khu sẽ nhân ba cùng một bố cục trong rail và buộc người vận
 * hành nhớ ba chỗ cho một loại việc.
 *
 * Xuất bản đi ngược chiều (tải VỀ) nhưng vẫn thuộc đây: nó là đầu ra của cùng cái xưởng, và
 * người tìm "chỗ đưa tệp vào ra" tìm ở một chỗ.
 *
 * # Cả ba đòi engine ĐANG MỞ
 *
 * `ImportFrom`, `SimulateFrom` và `Export` đều là method của `Host`. Hai luồng đầu còn giữ
 * khóa độc quyền của engine (`acquireExclusive`), tức chúng không chạy song song với việc
 * viết — và đó là đúng: nhập một cuốn ngoài vào giữa lúc đang viết sẽ ghi chồng dàn ý.
 */
export function NhapXuat({ tacPham }: { tacPham: string | undefined }) {
  return (
    <main className="canvas" id="nhap-xuat">
      <div className="head">
        <h1>{CHU.nhapXuat}</h1>
      </div>

      {!tacPham ? (
        <p className="trongSect">{GIAI_THICH.nhapXuatCanTacPham}</p>
      ) : (
        <>
          <XuatBan tacPham={tacPham} />
          <NhapTruyen tacPham={tacPham} />
          <MoPhong tacPham={tacPham} />
        </>
      )}

      <div style={{ height: 8 }} />
    </main>
  );
}

/* ── xuất bản ──────────────────────────────────────────────────────────── */

/**
 * Xuất bản đứng ĐẦU bề mặt vì nó là việc hay làm nhất trong ba luồng, và là việc duy nhất
 * không có hệ quả lên store — người dùng bấm nó nhiều lần mà không sợ gì.
 */
function XuatBan({ tacPham }: { tacPham: string }) {
  const [dinhDang, datDinhDang] = useState<'TXT' | 'EPUB'>('TXT');
  const [tu, datTu] = useState('');
  const [den, datDen] = useState('');
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [xong, datXong] = useState<{ ten: string; boQua: number[]; soChuong: number } | null>(
    null,
  );

  const gui = () => {
    datDangGui(true);
    datLoi(null);
    datXong(null);
    xuatBan(tacPham, {
      format: dinhDang,
      from: Number(tu) || undefined,
      to: Number(den) || undefined,
    })
      .then(datXong)
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datDangGui(false));
  };

  return (
    <section className="sect">
      <h2>{CHU.xuatBan}</h2>
      <p className="steerhint">{GIAI_THICH.xuatBanGiaiThich}</p>

      <div className="bieuMau">
        <label className="oNhap">
          <span>{CHU.dinhDang}</span>
          <select value={dinhDang} onChange={(e) => datDinhDang(e.target.value as 'TXT' | 'EPUB')}>
            <option value="TXT">TXT</option>
            <option value="EPUB">EPUB</option>
          </select>
        </label>
        <label className="oNhap">
          <span>{CHU.tuChuong}</span>
          <input
            type="number"
            min={1}
            value={tu}
            onChange={(e) => datTu(e.target.value)}
            placeholder="1"
          />
        </label>
        <label className="oNhap">
          <span>{CHU.denChuong}</span>
          <input
            type="number"
            min={1}
            value={den}
            onChange={(e) => datDen(e.target.value)}
            placeholder={CHU.chuongCuoi}
          />
        </label>

        {loi ? <p className="loiDoc">{loi}</p> : null}
        {xong ? (
          <p className="steerhint">
            {CHU.daTaiVe(xong.ten, xong.soChuong)}
            {/* Chương bị bỏ qua KHÔNG phải lỗi — chương chưa viết xong thì exp.Run bỏ qua có
                chủ ý. Nhưng người dùng phải biết bản họ vừa tải thiếu gì, nếu không họ gửi
                đi một bản thiếu chương mà tưởng là đủ. */}
            {xong.boQua.length > 0 ? ` — ${CHU.boQuaChuong(xong.boQua)}` : ''}
          </p>
        ) : null}

        <div className="nccNut">
          <button type="button" className="nutChinh" disabled={dangGui} onClick={gui}>
            {dangGui ? CHU.dangGui : CHU.taiVe}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── nhập truyện ngoài ─────────────────────────────────────────────────── */

function NhapTruyen({ tacPham }: { tacPham: string }) {
  const [tep, datTep] = useState<File | null>(null);
  const [huongDan, datHuongDan] = useState('');
  const [tuDongChot, datTuDongChot] = useState(false);
  const [chay, datChay] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [nhatKy, datNhatKy] = useState<DongNhatKy[] | null>(null);

  const gui = () => {
    if (!tep) return;
    datChay(true);
    datLoi(null);
    datNhatKy(null);
    nhapTruyen(tacPham, tep, { autoConfirm: tuDongChot, guide: huongDan })
      .then((r) => datNhatKy(r.log))
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datChay(false));
  };

  return (
    <section className="sect">
      <h2>{CHU.nhapTruyenNgoai}</h2>
      <p className="steerhint">{GIAI_THICH.nhapTruyenGiaiThich}</p>

      <div className="bieuMau">
        <label className="oNhap">
          <span>{CHU.tepNguon}</span>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => datTep(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="oNhap">
          <span>{CHU.huongDanChia}</span>
          <input
            value={huongDan}
            onChange={(e) => datHuongDan(e.target.value)}
            placeholder="ví dụ: mỗi phần bắt đầu bằng dòng chỉ có số"
          />
        </label>
        <label className="oNhap oNhapCheck">
          <span>{CHU.tuDongChotChia}</span>
          <input
            type="checkbox"
            checked={tuDongChot}
            onChange={(e) => datTuDongChot(e.target.checked)}
          />
        </label>
        {/* Cảnh báo đứng cạnh CHÍNH ô nó nói về, không ở đầu mục: đây là uỷ quyền mù, và
            người dùng phải đọc nó lúc đang bấm chứ không phải lúc bắt đầu đọc trang. */}
        <p className="steerhint">{GIAI_THICH.tuDongChotLaUyQuyenMu}</p>

        {loi ? <p className="loiDoc">{loi}</p> : null}

        <div className="nccNut">
          <button type="button" className="nutChinh" disabled={chay || !tep} onClick={gui}>
            {chay ? CHU.dangChayLuong : CHU.batDauNhap}
          </button>
        </div>
      </div>

      <NhatKyLuong nhatKy={nhatKy} dangChay={chay} />
    </section>
  );
}

/* ── mô phỏng văn phong ────────────────────────────────────────────────── */

function MoPhong({ tacPham }: { tacPham: string }) {
  const [nguLieu, datNguLieu] = useState<File[]>([]);
  const [hoSo, datHoSo] = useState<File | null>(null);
  const [chay, datChay] = useState<'ngu-lieu' | 'ho-so' | null>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [nhatKy, datNhatKy] = useState<DongNhatKy[] | null>(null);

  const goi = (ten: 'ngu-lieu' | 'ho-so', fn: () => Promise<{ log: DongNhatKy[] }>) => {
    datChay(ten);
    datLoi(null);
    datNhatKy(null);
    fn()
      .then((r) => datNhatKy(r.log))
      .catch((e: unknown) => datLoi(e instanceof LoiApi ? e.message : String(e)))
      .finally(() => datChay(null));
  };

  return (
    <section className="sect">
      <h2>{CHU.moPhongVanPhong}</h2>
      <p className="steerhint">{GIAI_THICH.moPhongGiaiThich}</p>

      <div className="bieuMau">
        <label className="oNhap">
          <span>{CHU.nguLieu}</span>
          <input
            type="file"
            multiple
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => datNguLieu(Array.from(e.target.files ?? []))}
          />
        </label>
        <div className="nccNut">
          <button
            type="button"
            className="nutChinh"
            disabled={chay !== null || nguLieu.length === 0}
            onClick={() => goi('ngu-lieu', () => chayMoPhong(tacPham, nguLieu))}
          >
            {chay === 'ngu-lieu' ? CHU.dangChayLuong : CHU.dungHoSoTuNguLieu}
          </button>
        </div>

        {/* Nhập hồ sơ sẵn là đường KHÁC, không phải một tùy chọn của đường trên: nó bỏ qua
            cả bước phân tích ngữ liệu, nên gộp hai thứ vào một nút sẽ che mất khác biệt. */}
        <label className="oNhap">
          <span>{CHU.hoSoSan}</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => datHoSo(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="nccNut">
          <button
            type="button"
            className="nutPhu"
            disabled={chay !== null || !hoSo}
            onClick={() => goi('ho-so', () => nhapHoSoMoPhong(tacPham, hoSo!))}
          >
            {chay === 'ho-so' ? CHU.dangChayLuong : CHU.nhapHoSoSan}
          </button>
        </div>

        {loi ? <p className="loiDoc">{loi}</p> : null}
      </div>

      <NhatKyLuong nhatKy={nhatKy} dangChay={chay !== null} />
    </section>
  );
}

/* ── nhật ký chung ─────────────────────────────────────────────────────── */

/**
 * Nhật ký của một luồng đã chạy xong.
 *
 * Bản này KHÔNG stream: server vét cạn channel rồi trả cả nhật ký một lượt (xem chú thích
 * đầu internal/serve/tep.go). Nên trong lúc chạy chỉ có một dòng "đang chạy" — và dòng đó
 * phải nói rõ là có thể lâu, nếu không người dùng tưởng nó treo và bấm lại.
 */
function NhatKyLuong({
  nhatKy,
  dangChay,
}: {
  nhatKy: DongNhatKy[] | null;
  dangChay: boolean;
}) {
  if (dangChay) return <p className="trongSect">{GIAI_THICH.luongCoTheLau}</p>;
  if (!nhatKy || nhatKy.length === 0) return null;
  return (
    <ul className="nkLuong">
      {nhatKy.map((d, i) => (
        <li key={i} className={d.error ? 'loi' : d.level === 'warn' ? 'canh' : undefined}>
          <span className="nkCd">{d.stage}</span>
          <span className="nkChu">{d.text}</span>
          {d.total && d.total > 0 ? (
            <span className="nkTd">
              {d.current}/{d.total}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
