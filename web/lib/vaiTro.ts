import type { Vai } from './types';

/** Một nút trong cây vai. */
export interface NutVai {
  vai: Vai;
  con: NutVai[];
}

/**
 * Dựng cây vai từ danh sách PHẲNG có `depth`.
 *
 * Engine phát danh sách phẳng theo đúng thứ tự gọi, và `depth` là bậc lồng nhau — đúng cách
 * TUI vẽ (`writer → draft_chapter` rồi `└ writer → novel_context`). Web dựng lại cây từ hai
 * thứ đó chứ không tự suy quan hệ từ tên vai: suy từ tên là nhân bản logic của engine, đúng
 * thứ PRODUCT.md cấm, và nó sẽ lệch ngay lần engine đổi cách gọi lồng.
 *
 * Vai mồ côi (depth nhảy cóc mà không có cha ở bậc trên) được vẽ ở GỐC chứ không bị bỏ. Nuốt
 * im lặng một vai đang chạy là nói dối về việc máy đang làm.
 *
 * # Hôm nay cây này luôn PHẲNG, và đó không phải lỗi ở đây
 *
 * ĐO ĐƯỢC: `host.AgentSnapshot` (internal/host/events.go:147) KHÔNG có trường depth, nên
 * `anhXaVai` (internal/serve/snapshot.go:615) gán cứng `Depth: 0` cho mọi vai. Tức mọi
 * payload thật hiện nay cho một cây một bậc. Hàm này vẫn dựng theo hợp đồng JSON đã chốt
 * (spec §6.1) chứ không theo cái server tạm gửi: ngày phía Go suy được bậc lồng, giao diện
 * không phải sửa gì. Chiều ngược lại — viết phẳng vì hôm nay nó phẳng — là chỗ sẽ phải viết
 * lại đúng lúc dữ liệu bắt đầu có thật.
 */
export function cayVai(vao: Vai[]): NutVai[] {
  const goc: NutVai[] = [];
  /** Nút gần nhất ở mỗi bậc, để tìm cha trong một lượt duyệt. */
  const ganNhat: (NutVai | undefined)[] = [];

  for (const vai of vao) {
    const nut: NutVai = { vai, con: [] };
    const bac = Math.max(0, vai.depth);

    // Đi NGƯỢC lên từ bậc ngay trên, không chỉ nhìn đúng `bac - 1`: engine có thể nhảy cóc
    // một bậc (một tool gọi thẳng ở depth 2 khi chưa có ai ở depth 1). Nhìn đúng một bậc thì
    // vai đó rơi xuống gốc và mất chỗ đứng dưới vai đã sinh ra nó.
    let cha: NutVai | undefined;
    for (let b = bac - 1; b >= 0; b -= 1) {
      cha = ganNhat[b];
      if (cha) break;
    }

    if (cha) cha.con.push(nut);
    else goc.push(nut);

    ganNhat[bac] = nut;
    // Bậc sâu hơn của nhánh trước không còn là cha hợp lệ cho vai sau.
    ganNhat.length = bac + 1;
  }

  return goc;
}
