/**
 * Hình học của trục sản xuất.
 *
 * Đây là chỗ dễ vẽ sai nhất trong cả bề mặt, nên logic tách khỏi component để
 * đọc được và thử được riêng.
 */

import type { ChapterMark, LaneBlock, MarkState } from './types';

export interface KhoiDaDo extends LaneBlock {
  /** Trọng số flex-grow. Luôn > 0. */
  trongSo: number;
  /** true khi `chapters === 0`, tức phạm vi CHƯA BIẾT. */
  chuaBietPhamVi: boolean;
}

/**
 * Biến `chapters` thành trọng số độ rộng.
 *
 * `LaneBlock.chapters === 0` nghĩa là CHƯA BIẾT, không phải "không có chương
 * nào": tập chưa mở thì chưa có cung nào nên chưa có cả số dự kiến (xem ghi chú
 * ở model.go:LaneBlock.Chapters). Nhân trực tiếp với 0 làm khối biến mất khỏi
 * trục — người vận hành sẽ thấy một tác phẩm 6 tập chỉ còn 4 khối và tin rằng
 * hai tập kia không tồn tại.
 *
 * Khối chưa biết nhận trọng số trung bình của các khối đã biết, nên nó vẫn có
 * mặt và không giả vờ biết mình rộng bao nhiêu. Nếu cả lane đều chưa biết thì
 * chia đều. Kèm min-width để khối hẹp nhất vẫn đọc được nhãn.
 */
export function doTruc(blocks: LaneBlock[]): KhoiDaDo[] {
  const daBiet = blocks.filter((b) => b.chapters > 0).map((b) => b.chapters);
  const trungBinh =
    daBiet.length > 0
      ? daBiet.reduce((a, b) => a + b, 0) / daBiet.length
      : 1;

  return blocks.map((b) => ({
    ...b,
    trongSo: b.chapters > 0 ? b.chapters : trungBinh,
    chuaBietPhamVi: b.chapters === 0,
  }));
}

/**
 * Khoảng hở giữa các vạch trên lane chương, theo số chương.
 *
 * 1 vạch = 1 chương theo DESIGN.md. Với 300 chương trong khoảng 800px, mỗi vạch
 * còn dưới 3px; giữ khoảng hở 1,5px như bản mockup (108 chương) sẽ làm hở rộng
 * hơn vạch và trục đọc thành đường kẻ sọc thay vì dãy chương.
 */
export function hoVach(soChuong: number): number {
  if (soChuong > 220) return 0;
  if (soChuong > 120) return 1;
  return 1.5;
}

/** Một dải chương liền nhau cùng trạng thái. */
export interface DaiVach {
  from: number;
  to: number;
  state: MarkState;
  /** Số chương trong dải — cũng là trọng số độ rộng. */
  len: number;
}

/**
 * Gộp các chương liền nhau cùng trạng thái thành một dải.
 *
 * Vì sao cần: với 300 chương trong 810px, mỗi vạch rộng 2,7px và rơi vào vị trí
 * lẻ của điểm ảnh thiết bị. Trình duyệt làm mờ viền từng ô, nên một dãy 40
 * chương đã nghiệm thu — vốn phải là một khối liền — hiện ra thành vạch sọc.
 * ĐO ĐƯỢC: gap thật là 0px, các ô kề nhau đúng (x = 320 / 322,7 / 325,4), nên
 * sọc không phải do khoảng hở mà do làm mờ dưới điểm ảnh.
 *
 * Gộp dải giữ nguyên ngữ nghĩa "một vạch một chương" ở mức tỉ lệ: độ rộng mỗi
 * dải vẫn đúng bằng số chương của nó, và ranh giới nằm đúng chỗ trạng thái đổi.
 * Lane thưa (còn khoảng hở) vẫn vẽ từng chương để đếm được bằng mắt.
 */
export function nhomVach(marks: ChapterMark[]): DaiVach[] {
  const dai: DaiVach[] = [];
  for (const m of marks) {
    const cuoi = dai[dai.length - 1];
    if (cuoi && cuoi.state === m.state && m.chapter === cuoi.to + 1) {
      cuoi.to = m.chapter;
      cuoi.len += 1;
      continue;
    }
    dai.push({ from: m.chapter, to: m.chapter, state: m.state, len: 1 });
  }
  return dai;
}

/**
 * Chương tương ứng với một điểm bấm trong dải.
 *
 * Dải gộp không mất khả năng chọn chương: vị trí bấm trong dải quy về chỉ số
 * chương theo tỉ lệ, nên bấm vào giữa một dải 40 chương vẫn ra chương ở giữa.
 */
export function chuongTaiDiem(d: DaiVach, ti: number): number {
  const buoc = Math.floor(Math.min(Math.max(ti, 0), 0.999999) * d.len);
  return d.from + buoc;
}

/**
 * Các mốc số chương trên thước dưới lane chương.
 *
 * Bước làm tròn theo tổng số chương để nhãn không chen nhau: 300 chương → 1,
 * 100, 200, 300.
 */
export function mocThuoc(tong: number): number[] {
  if (tong <= 0) return [];
  if (tong <= 12) return [1, tong];

  const buoc = tong > 400 ? 200 : tong > 150 ? 100 : tong > 60 ? 25 : 10;
  const mocs: number[] = [1];
  for (let m = buoc; m < tong; m += buoc) mocs.push(m);
  mocs.push(tong);
  // Mốc cuối và mốc trước nó dính nhau khi tổng không chia hết cho bước.
  if (mocs.length > 2) {
    const cuoi = mocs[mocs.length - 1]!;
    const truoc = mocs[mocs.length - 2]!;
    if (cuoi - truoc < buoc / 2) mocs.splice(mocs.length - 2, 1);
  }
  return mocs;
}

/** Nhãn phạm vi của một khối: "chương 45–50", hoặc undefined khi chưa mở. */
export function nhanPhamVi(b: LaneBlock): string | undefined {
  if (b.from && b.to) {
    return b.from === b.to ? `chương ${b.from}` : `chương ${b.from}–${b.to}`;
  }
  return undefined;
}

/**
 * Phạm vi dạng gọn cho chữ TRONG khối: "1–18".
 *
 * Khối hẹp nhất trên trục chỉ hơn 100px, mà "T1 · chương 1–18" ở 10.5px mono
 * cần nhiều hơn thế nên bị cắt thành "T1 · chương …" — mất đúng phần mang tin.
 * Lane đã có nhãn "Tập"/"Cung" bên trái nên chữ "chương" trong khối là dư.
 * Dạng dài vẫn còn trong chú giải khi trỏ chuột.
 */
export function phamViGon(b: LaneBlock): string | undefined {
  if (b.from && b.to) {
    return b.from === b.to ? `${b.from}` : `${b.from}–${b.to}`;
  }
  return undefined;
}
