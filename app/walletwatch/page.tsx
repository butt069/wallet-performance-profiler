import { Suspense } from "react";
import { WalletWatchDashboard } from "@/components/WalletWatchDashboard";

export const metadata = {
  title: "WalletWatch Pro | Institutional Whale Radar & Candlestick Terminal",
  description:
    "Institutional cryptocurrency trading terminal. Real-time live market ticker, candlestick charts with EMA28, whale radar metrics, watched entity manager, and streaming order tape.",
};

export default function WalletWatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <WalletWatchDashboard />
    </Suspense>
  );
}

