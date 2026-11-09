"use client";

import { Suspense, useState } from "react";
import { Activity, Radio, Layers, Sparkles } from "lucide-react";
import { GlobalLiveTicker } from "@/components/shared/GlobalLiveTicker";
import { WalletProfiler } from "@/components/wallet-profiler/WalletProfiler";
import { WalletWatchDashboard } from "@/components/whale-radar/WalletWatchDashboard";
import { ActiveModuleType, ChainType } from "@/types";

function UnifiedDashboard() {
  const [activeModule, setActiveModule] = useState<ActiveModuleType>("whale-radar");
  const [activeChain, setActiveChain] = useState<ChainType>("solana");

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col selection:bg-purple-600/30 selection:text-purple-200">
      {/* =========================================================================
          PERSISTENT TOP HEADER: GLOBAL LIVE MARKET TICKER BAR
         ========================================================================= */}
      <GlobalLiveTicker />

      {/* =========================================================================
          EXECUTIVE ACTIVE VIEW ROUTER (Tab Bar Switcher)
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0A0F1D]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        {/* Left: Platform Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-600/20 shrink-0">
            CS
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                ChainScope
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono uppercase tracking-wider">
                V1.0 UNIFIED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
              Institutional Multi-Module Blockchain Intelligence Suite
            </p>
          </div>
        </div>

        {/* Center/Right: Executive Tab Bar Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Main Module Tabs */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
            {/* Tab 1: Whale Radar & Live Terminal */}
            <button
              type="button"
              onClick={() => setActiveModule("whale-radar")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeModule === "whale-radar"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Whale Radar &amp; Live Terminal</span>
            </button>

            {/* Tab 2: Wallet Performance Profiler */}
            <button
              type="button"
              onClick={() => setActiveModule("profiler")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeModule === "profiler"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>Wallet Performance Profiler</span>
            </button>
          </div>

          {/* Quick Chain Switcher (Visible when Profiler is active) */}
          {activeModule === "profiler" && (
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setActiveChain("solana")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeChain === "solana"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Solana
              </button>
              <button
                type="button"
                onClick={() => setActiveChain("ethereum")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeChain === "ethereum"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Ethereum
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =========================================================================
          PRIMARY CONTENT AREA: ACTIVE VIEW RENDERING
         ========================================================================= */}
      <main className="flex-1 w-full min-w-0">
        {activeModule === "whale-radar" ? (
          <WalletWatchDashboard />
        ) : (
          <WalletProfiler chain={activeChain} onChainChange={setActiveChain} />
        )}
      </main>
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <UnifiedDashboard />
    </Suspense>
  );
}
