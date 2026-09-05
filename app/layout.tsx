import type { Metadata } from "next";
import "./globals.css";

declare const __PUBLIC_BASE_PATH__: string;

export const metadata: Metadata = {
  title: "SEVEN 爱洗澡",
  description: "给 Seven 搓出满满泡泡，但它回头时一定要停手。",
  icons: {
    icon: [
      { url: `${__PUBLIC_BASE_PATH__}/assets/brand/game-icon-64.png`, sizes: "64x64", type: "image/png" },
      { url: `${__PUBLIC_BASE_PATH__}/assets/brand/game-icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: `${__PUBLIC_BASE_PATH__}/assets/brand/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
