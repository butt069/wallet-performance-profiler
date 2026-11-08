import { Suspense } from "react";
import { WalletProfiler } from "@/components/WalletProfiler";

export const metadata = {
  title: "ChainScope | Wallet Intelligence Platform",
  description:
    "Institutional blockchain analytics platform. Real-time wallet performance profiling, realized PnL, win rates, consistency scoring, and automated persona behavior tags.",
};

export default function RootPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <WalletProfiler chain="solana" />
    </Suspense>
  );
}
