import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { TrangThai } from './TrangThai';

/**
 * Chim hoàng yến cho project `giaodien`: dựng một component THẬT trong DOM giả và đọc lại
 * chữ nó vẽ ra. Nếu tệp này đỏ thì lỗi nằm ở jsdom hoặc plugin-react, không ở bài kiểm đang
 * sửa — và biết được điều đó ngay là đáng giá hơn tám dòng mã.
 */
test('project giaodien dựng được component thật trong DOM giả', () => {
  render(<TrangThai tt={{ ky: '●', nhan: 'đang chạy', mau: 'gold' }} />);
  expect(screen.getByText('đang chạy')).toBeDefined();
});
