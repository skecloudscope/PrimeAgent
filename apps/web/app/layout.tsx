import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "PrimeAgent",
  description: "Cross-border ecommerce agent workspace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

