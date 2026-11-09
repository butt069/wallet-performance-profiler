"use client";

import { Suspense, useState } from "react";
import { WalletProfiler } from "@/components/WalletProfiler";
import { WalletWatchDashboard } from "@/components/WalletWatchDashboard";
import WhaleTerminal from "@/components/WhaleTerminal"; 
import WhaleWatchlist from "@/components/WhaleWatchlist";

export default function RootPage() {
  const [activeTab, setActiveTab] = useState<"profiler" | "whale-radar">("whale-radar");

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <div className="min-h-screen bg-[#080D1A] text-white flex flex-col">
        {/* Module Switcher Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 sm:px-6 py-2.5 bg-[#0A0F1D] sticky top-0 z-50">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0">
              CS
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-sm tracking-wider text-slate-200 uppercase block truncate">
                ChainScope Platform
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Multi-Module Blockchain Intelligence Suite
              </span>
            </div>
          </div>

          {/* Module Switcher Pills */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("whale-radar")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "whale-radar"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Whale Radar & Live Terminal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("profiler")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "profiler"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Wallet Performance Profiler
            </button>
          </div>
        </div>

        {/* Dynamic View Rendering */}
        <div className="flex-1">
          {activeTab === "whale-radar" ? (
            <WalletWatchDashboard />
          ) : (
            <WalletProfiler chain="solana" />
          )}
        </div>
      </div>
    </Suspense>
  );
}