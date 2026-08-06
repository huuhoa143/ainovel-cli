import type { CauHinhDoc } from './types';

/**
 * Chuyển cả dây chuyền sang một nhà cung cấp khác — phần LUẬT, không có DOM.
 *
 * # Vì sao việc này cần một mô-đun riêng
 *
 * Ca thật của người dùng: *"đang dùng nhà cung cấp A, hết tiền, mua nhà cung cấp B"*. Hôm nay
 * đó là bốn lượt sửa tay ở bốn kênh, và mỗi lượt là một cơ hội dựng ra một cặp không tồn tại —
 * vì ô Nhà cung cấp và ô Model là hai ô ĐỘC LẬP, trong khi một tên model chỉ có nghĩa BÊN
 * TRONG một nhà cung cấp. `cx/gpt-5.5` là model của 9Router; ở `gateway.dichvuright.ai` nó
 * không mang nghĩa gì.
 *
 * ĐO ĐƯỢC hậu quả trên máy người dùng: ba vai trỏ `openai · cx/gpt-5.5` sau khi `openai` bị
 * đổi ruột sang một gateway khác. Arbiter chạy được (nó theo mặc định, khớp), Writer chết ở
 * lượt đầu — và thông báo lúc đó nói về KHÓA API chứ không nói về tên model.
 *
 * Tách khỏi component vì đây là toàn bộ phần có luật, và luật thì phải kiểm được bằng bảng ca
 * chứ không bằng cách dựng một hộp thoại rồi bấm.
 */

/** Một dòng trong bảng đối chiếu trước khi ghi. */
export interface DongChuyen {
  /** `default` | `architect` | `writer` | `editor`. */
  vai: string;
  /** Nhà cung cấp và model ĐANG có hiệu lực cho vai này. */
  tuProvider: string;
  tuModel: string;
  /** Model đề xuất ở nhà cung cấp đích. Người dùng sửa được trước khi xác nhận. */
  denModel: string;
  /**
   * Nhà cung cấp đích CÓ khai đúng tên model cũ hay không.
   *
   * `true` = giữ nguyên tên, gần như chắc chắn đúng. `false` = phải chọn lại, và bảng đối
   * chiếu phải nói ra để người dùng biết dòng nào cần mắt mình.
   */
  giuDuocTen: boolean;
  /** Vai này đang ĐẶT RIÊNG (có mặt trong `cfg.Roles`) hay đang thừa hưởng mặc định. */
  dangGhim: boolean;
}

/** Nhà cung cấp và model đang có hiệu lực cho một vai. */
export function hieuLucCua(du: CauHinhDoc, vai: string): { provider: string; model: string } {
  const r = vai === 'default' ? undefined : du.roles?.[vai];
  return { provider: r?.provider ?? du.provider, model: r?.model ?? du.model };
}

function modelKhaiCua(du: CauHinhDoc, provider: string): string[] {
  return (du.providers.find((p) => p.name === provider)?.models ?? []).map((m) => m.name);
}

/**
 * Dựng bảng đối chiếu cho một lượt chuyển sang `denProvider`.
 *
 * Đề xuất theo đúng một luật: TÊN TRÙNG THÌ GIỮ, không thì rơi về model mặc định của nhà cung
 * cấp đích. Giữ tên khi nhà cung cấp đích có khai nó là điều đúng — nhiều gateway phục vụ
 * cùng một danh mục model, nên ép mọi vai về một model duy nhất sẽ gộp mất sắp xếp lớn/nhỏ mà
 * người dùng cố ý dựng (Chấp bút model lớn, Biên tập model mini).
 */
export function duKienChuyen(
  du: CauHinhDoc,
  denProvider: string,
  denModel: string,
): DongChuyen[] {
  const khai = modelKhaiCua(du, denProvider);
  return du.role_names.map((vai) => {
    const { provider, model } = hieuLucCua(du, vai);
    const giuDuocTen = khai.includes(model);
    return {
      vai,
      tuProvider: provider,
      tuModel: model,
      denModel: giuDuocTen ? model : denModel,
      giuDuocTen,
      dangGhim: vai !== 'default' && !!du.roles?.[vai],
    };
  });
}

/** Có vai nào ĐẶT RIÊNG mà đang ở một nhà cung cấp khác đích đến không. */
export function coVaiLacCho(du: CauHinhDoc, denProvider: string): boolean {
  return Object.values(du.roles ?? {}).some((r) => r.provider !== denProvider);
}

/**
 * Thân yêu cầu ghi cho lượt chuyển CẢ dây chuyền.
 *
 * Ghi `roles` ĐẦY ĐỦ chứ không trộn từng khóa: `PUT /api/config` thay cả map, nên một vai
 * vắng mặt nghĩa là "thừa hưởng mặc định" — gửi thiếu là lặng lẽ gỡ nó.
 *
 * Vai `default` KHÔNG vào map `roles`: nó là `cfg.Provider` + `cfg.ModelName`, một trường
 * khác. Nhét nó vào map sẽ tạo một vai tên `default` mà tầng Go không biết.
 */
export function thanChuyenCaDay(
  dong: DongChuyen[],
  denProvider: string,
): { provider: string; model: string; roles: Record<string, { provider: string; model: string }> } {
  const macDinh = dong.find((d) => d.vai === 'default');
  const roles: Record<string, { provider: string; model: string }> = {};
  for (const d of dong) {
    if (d.vai === 'default') continue;
    roles[d.vai] = { provider: denProvider, model: d.denModel };
  }
  return { provider: denProvider, model: macDinh?.denModel ?? '', roles };
}
