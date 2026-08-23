import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAP S/4HANA - 3-Way Match Resolution Cockpit",
  description: "Intelligent Supplier Invoice Exception & 3-Way Match Cockpit powered by SAP Business AI & Joule",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
