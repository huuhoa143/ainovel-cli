import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { expect, test } from 'vitest';

import { useTruot } from './truot';

/**
 * jsdom KHÔNG bố cục, nên `offsetLeft`/`offsetWidth` luôn là 0. Bài kiểm ở đây vì thế đo đúng
 * cái nó đo được — hook có ĐỌC phần tử đang chọn và có GHI ra biến CSS — bằng offset đặt tay.
 * Vị trí thật là việc của phép kiểm trên trình duyệt; nói ra chỗ này để không ai tưởng bộ kiểm
 * đã canh cả toạ độ.
 *
 * `ResizeObserver` (hook dùng để đo lại khi đổi khổ) được vá ở `vitest.setup.giaodien.ts`, không
 * ở đây: dấu trượt nằm trong `MucXem`, `Inspector` và `Rail` nên gần như mọi cây component đều
 * chạm tới nó — lý do đầy đủ ghi tại tệp setup.
 */

function datOffset(el: HTMLElement, v: { left?: number; width?: number; top?: number; height?: number }) {
  for (const [k, val] of Object.entries(v)) {
    const ten = 'offset' + k[0]!.toUpperCase() + k.slice(1);
    Object.defineProperty(el, ten, { value: val, configurable: true });
  }
}

function BoChon({ dau = 0 }: { dau?: number }) {
  const [chon, datChon] = useState(dau);
  const hop = useTruot<HTMLDivElement>('[aria-pressed="true"]', 'ngang', chon);
  return (
    <div ref={hop} data-testid="hop">
      {['Tập', 'Cung', 'Chương'].map((t, i) => (
        <button key={t} aria-pressed={i === chon} onClick={() => datChon(i)}>
          {t}
        </button>
      ))}
    </div>
  );
}

test('ghi --x và --w từ phần tử đang chọn, và chỉ bật lớp `truot` SAU khi đo', () => {
  const { getByTestId, getByText } = render(<BoChon />);
  const hop = getByTestId('hop');
  // Bật lớp là lời hứa "dấu trượt đang nói đúng" — nó chỉ được bật khi đã đo.
  expect(hop.classList.contains('truot')).toBe(true);

  // Đặt offset cho MỌI nút trước khi bấm: React dựng lại nút khi `aria-pressed` đổi, nên một
  // offset gắn sau cú bấm có thể rơi vào nút đã bị thay.
  datOffset(getByText('Tập'), { left: 0, width: 44 });
  datOffset(getByText('Cung'), { left: 77, width: 52 });
  datOffset(getByText('Chương'), { left: 133, width: 63 });
  act(() => getByText('Cung').click());

  expect(hop.style.getPropertyValue('--x')).toBe('77px');
  expect(hop.style.getPropertyValue('--w')).toBe('52px');
});

test('trục DỌC ghi --y và --h, không ghi --x', () => {
  // Rail là trục dọc. Ghi lẫn hai bộ biến sẽ làm dấu chỉ ở rail nhận toạ độ ngang.
  function Rail() {
    const [chon, datChon] = useState(0);
    const hop = useTruot<HTMLDivElement>('[aria-current="page"]', 'doc', chon);
    return (
      <div ref={hop} data-testid="rail">
        {['Bản thảo', 'Dòng sản xuất'].map((t, i) => (
          <button key={t} aria-current={i === chon ? 'page' : undefined} onClick={() => datChon(i)}>
            {t}
          </button>
        ))}
      </div>
    );
  }
  const { getByTestId, getByText } = render(<Rail />);
  const rail = getByTestId('rail');
  datOffset(getByText('Bản thảo'), { top: 0, height: 27 });
  datOffset(getByText('Dòng sản xuất'), { top: 34, height: 27 });
  act(() => getByText('Dòng sản xuất').click());

  expect(rail.style.getPropertyValue('--y')).toBe('34px');
  expect(rail.style.getPropertyValue('--h')).toBe('27px');
  expect(rail.style.getPropertyValue('--x')).toBe('');
});

test('không có phần tử nào đang chọn thì KHÔNG ghi gì, và không ném', () => {
  // Ca thật: inspector chưa chọn chương nào, hoặc rail đang ở một khu không nằm trong nhóm này.
  function Rong() {
    const hop = useTruot<HTMLDivElement>('[aria-pressed="true"]', 'ngang', 0);
    return <div ref={hop} data-testid="rong"><button aria-pressed="false">Tập</button></div>;
  }
  const { getByTestId } = render(<Rong />);
  const el = getByTestId('rong');
  expect(el.style.getPropertyValue('--x')).toBe('');
  // Không bật lớp: chưa đo được thì đừng hứa là đã đo.
  expect(el.classList.contains('truot')).toBe(false);
});
