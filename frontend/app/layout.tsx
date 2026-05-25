import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agno AgentOS",
  description: "A transparent Agno AgentOS web console"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
