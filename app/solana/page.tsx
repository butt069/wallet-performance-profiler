import { Suspense } from "react";
import { WalletProfiler } from "@/components/WalletProfiler";

export const metadata = {
  title: "Solana Wallet Performance Profiler | ChainScope",
  description: "Evaluate Solana wallet performance, realized SOL PnL, win rates, and consistency scoring.",
};

export default function SolanaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <WalletProfiler chain="solana" />
    </Suspense>
  );
}

