import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainScope | Wallet Intelligence Platform",
  description:
    "Institutional blockchain analytics platform. Real-time wallet performance profiling, realized PnL, win rates, consistency scoring, and automated persona behavior tags.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#080D1A] text-slate-100">
        {children}
      </body>
    </html>
  );
}
