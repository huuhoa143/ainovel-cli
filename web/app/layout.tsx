import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Noto_Serif } from 'next/font/google';

import './globals.css';

/**
 * Ba họ chữ, mỗi họ một nhiệm vụ (DESIGN.md § Typography). Ghép theo trục
 * tương phản, không ghép hai sans gần giống nhau.
 *
 * `next/font` tải font lúc BUILD rồi nhúng vào `out/`, không gọi CDN lúc chạy.
 * Điều này quan trọng vì studio thường chạy trên localhost cạnh engine, có khi
 * không có mạng — font qua CDN sẽ rơi về font hệ thống và cả thang cỡ lệch.
 *
 * Subset `vietnamese` là bắt buộc cho cả ba: mono cũng chứa chữ Việt ("chương
 * 45–50" trong khối trục), không chỉ chữ số.
 */
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  variable: '--ui',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const mono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  variable: '--mono',
  display: 'swap',
  fallback: ['ui-monospace', 'Menlo', 'monospace'],
});

const serif = Noto_Serif({
  subsets: ['latin', 'vietnamese'],
  weight: ['400'],
  variable: '--serif',
  display: 'swap',
  fallback: ['ui-serif', 'Georgia', 'serif'],
});

export const metadata: Metadata = {
  title: 'ainovel studio',
  description: 'Bề mặt vận hành của engine ainovel: dây chuyền, kiểm định, phán quyết.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#241f18',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
