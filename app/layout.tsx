import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BYT Brand Brain",
  description: "Internal Brand Brain and design workflow app for Bếp Yêu Thương",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
