"use client";

import { Flame } from "lucide-react";

interface GlobalLiveTickerProps {
  onSelectAsset?: (asset: string) => void;
  activeAsset?: string;
}

export function GlobalLiveTicker({ onSelectAsset, activeAsset }: GlobalLiveTickerProps) {
  return (
    <div className="bg-[#090713] border-b border-purple-900/30 px-4 py-1.5 flex items-center justify-between text-xs font-mono overflow-x-auto scrollbar-none gap-4">
      {/* Live Market Feeds */}
      <div className="flex items-center space-x-4 shrink-0">
        <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold uppercase text-[11px] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          <span>LIVE MARKET</span>
        </div>

        {/* BTC/USD */}
        <button
          type="button"
          onClick={() => onSelectAsset?.("BTC")}
          className={`flex items-center space-x-1 hover:text-white shrink-0 transition-colors cursor-pointer ${
            activeAsset === "BTC" ? "text-purple-300 font-bold" : ""
          }`}
        >
          <span className="text-slate-400">BTC/USD</span>
          <span className="text-white font-bold">$96,423.30</span>
          <span className="text-emerald-400 font-bold">+3.42% ▲</span>
        </button>

        {/* ETH/USD */}
        <button
          type="button"
          onClick={() => onSelectAsset?.("WETH")}
          className={`flex items-center space-x-1 hover:text-white shrink-0 transition-colors cursor-pointer ${
            activeAsset === "WETH" ? "text-purple-300 font-bold" : ""
          }`}
        >
          <span className="text-slate-400">ETH/USD</span>
          <span className="text-white font-bold">$2,784.95</span>
          <span className="text-emerald-400 font-bold">+1.85% ▲</span>
        </button>

        {/* SOL/USD */}
        <button
          type="button"
          onClick={() => onSelectAsset?.("SOL")}
          className={`flex items-center space-x-1 hover:text-white shrink-0 transition-colors cursor-pointer ${
            activeAsset === "SOL" ? "text-purple-300 font-bold" : ""
          }`}
        >
          <span className="text-slate-400">SOL/USD</span>
          <span className="text-white font-bold">$184.68</span>
          <span className="text-rose-400 font-bold">-0.45% ▼</span>
        </button>

        {/* BNB/USD */}
        <button
          type="button"
          onClick={() => onSelectAsset?.("BNB")}
          className={`flex items-center space-x-1 hover:text-white shrink-0 transition-colors cursor-pointer ${
            activeAsset === "BNB" ? "text-purple-300 font-bold" : ""
          }`}
        >
          <span className="text-slate-400">BNB/USD</span>
          <span className="text-white font-bold">$642.18</span>
          <span className="text-emerald-400 font-bold">+0.95% ▲</span>
        </button>

        {/* DXY */}
        <button
          type="button"
          onClick={() => onSelectAsset?.("DXY")}
          className={`flex items-center space-x-1 hover:text-white shrink-0 transition-colors cursor-pointer ${
            activeAsset === "DXY" ? "text-purple-300 font-bold" : ""
          }`}
        >
          <span className="text-slate-400">DXY</span>
          <span className="text-white font-bold">184.25</span>
          <span className="text-emerald-400 font-bold">+0.12% ▲</span>
        </button>
      </div>

      {/* Network Gas & RPC Health */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <Flame className="w-3 h-3" />
          <span>Gas 12 Gwei Optimal</span>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Mainnet JSON-RPC Active</span>
        </div>
      </div>
    </div>
  );
}
