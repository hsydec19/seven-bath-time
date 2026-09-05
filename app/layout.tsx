import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "老七，该洗澡了",
  description: "给 Seven 搓出满满泡泡，但它回头时一定要停手。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
