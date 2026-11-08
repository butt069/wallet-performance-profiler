import { Suspense } from "react";
import { WalletProfiler } from "@/components/WalletProfiler";

export const metadata = {
  title: "Ethereum Wallet Performance Profiler | ChainScope",
  description: "Evaluate Ethereum wallet performance, realized ETH PnL, win rates, and consistency scoring.",
};

export default function EthereumPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <WalletProfiler chain="ethereum" />
    </Suspense>
  );
}

