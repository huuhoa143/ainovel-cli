import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Bộ chạy test cho `web/`.
 *
 * # Vì sao web/ giờ mới có bộ chạy test
 *
 * Trước đây mọi bộ canh cho web nằm ở phía Go, quét TỆP NGUỒN (`TestNhanDlPhaiQuaTuDien`,
 * `TestKieuTruongSongPhaiChoNull`). Cách đó canh được luật cấu trúc — "nhãn phải qua từ
 * điển", "trường này phải khai `| null`" — nhưng KHÔNG canh được hành vi.
 *
 * Buồng lái mang ba hành vi mà quét nguồn không chạm tới được:
 *   - bộ đệm văn sống bỏ lượt cũ nhất khi chạm một trong HAI trần,
 *   - tự cuộn dừng khi người dùng cuộn lên và chạy lại khi bấm "về cuối",
 *   - vạch ngăn xuất hiện đúng chỗ mà chữ lượt trước không mất.
 *
 * Ba thứ này là logic, và viết chúng không có bài kiểm đỏ-trước là viết mù. Bộ canh quét
 * nguồn ở Go vẫn giữ nguyên; hai lớp canh hai loại lỗi khác nhau.
 *
 * # Vì sao hai project chứ không một
 *
 * Bài kiểm logic thuần chạy trong Node, không dựng DOM giả — nhanh hơn nhiều và, quan trọng
 * hơn, một bài kiểm logic KHÔNG ĐƯỢC lặng lẽ dựa vào `document`. Tách môi trường làm điều đó
 * thành lỗi biên dịch chứ không phải một phụ thuộc ẩn.
 *
 * Đuôi `.mts`: tệp này dùng cú pháp ESM, và `web/package.json` không khai `type: module`
 * (Next tự lo phần đó), nên `.ts` sẽ bị nạp như CommonJS và Vite cảnh báo.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
        test: {
          name: 'logic',
          environment: 'node',
          include: ['lib/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
        test: {
          name: 'giaodien',
          environment: 'jsdom',
          // `lib/**/*.test.tsx` cũng vào đây, và ĐUÔI TỆP là thứ chia hai project chứ không
          // phải thư mục: một hook (`useStudio`) là logic, nhưng đo nó cần bộ chạy React,
          // tức `document`. Để nó ở project `logic` thì `renderHook` nổ; đặt nó vào
          // `components/` cho khớp mẫu cũ thì tệp kiểm nằm cách xa thứ nó đo. `.ts` trong
          // `lib/` vẫn là logic thuần chạy trong Node — ranh giới đó không đổi.
          include: ['{components,app}/**/*.test.tsx', 'lib/**/*.test.tsx'],
          // Dọn DOM giữa hai bài kiểm. Không có dòng này thì render của bài trước ở lại
          // trong `document` và mọi truy vấn qua `screen` chạy trên phần thừa đó — xem
          // phép đo trong chính tệp setup.
          setupFiles: ['./vitest.setup.giaodien.ts'],
        },
      },
    ],
  },
});
