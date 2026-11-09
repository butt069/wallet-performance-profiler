"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ShieldAlert,
  Network,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  currentModule?: "solana" | "ethereum" | "walletwatch" | "screener";
}

export function Sidebar({ currentModule }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [modalModule, setModalModule] = useState<"screener" | "cluster" | null>(null);

  // Active module detection
  const isModule2Active =
    currentModule === "walletwatch" ||
    currentModule === "screener" ||
    pathname === "/walletwatch" ||
    pathname === "/contract-screener";

  const isWalletPerformance =
    !isModule2Active &&
    (currentModule === "solana" ||
      currentModule === "ethereum" ||
      pathname === "/" ||
      pathname === "/solana" ||
      pathname === "/ethereum");

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0A0F1D] border-b border-slate-800/80 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            CS
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">ChainScope</div>
            <div className="text-[10px] text-slate-400">Wallet Intelligence Platform</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white cursor-pointer"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-[#0A0F1D] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col">
          {/* Header Brand */}
          <div className="p-5 flex items-center space-x-3.5 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0">
              CS
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base text-white tracking-tight leading-tight truncate">
                ChainScope
              </h1>
              <p className="text-xs text-slate-400 font-normal leading-tight truncate mt-0.5">
                Wallet Intelligence Platform
              </p>
            </div>
          </div>

          {/* Modules Navigation Section */}
          <div className="px-3 pt-5 pb-2">
            <div className="px-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Modules
            </div>

            <nav className="space-y-1.5">
              {/* Module 1: Wallet Performance — covers Solana & Ethereum */}
              <Link
                href="/solana"
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isWalletPerformance
                    ? "bg-[#131d31] text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Activity
                  className={`w-5 h-5 shrink-0 ${
                    isWalletPerformance ? "text-purple-400" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                <span className="truncate">Wallet Performance</span>
              </Link>

              {/* Module 2: Contract Screener / Whale Radar */}
              <Link
                href="/contract-screener"
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isModule2Active
                    ? "bg-[#131d31] text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <ShieldAlert
                  className={`w-5 h-5 shrink-0 ${
                    isModule2Active ? "text-purple-400" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                <span className="truncate">Contract Screener</span>
              </Link>

              {/* Module 3: Cluster Mapper Module (ChainScope Platform Module) */}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setModalModule("cluster");
                }}
                className="w-full text-left group flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <Network className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate">Cluster Mapper</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 m-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px]">Mainnet JSON-RPC Live</span>
          </div>
          <div className="text-[10px] text-slate-400">
            ChainScope Platform v1.0
            <br />
            Final Year Project
          </div>
        </div>
      </aside>

      {/* Explainer Modal for Teammate Modules (Cluster Mapper) */}
      {modalModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Network className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Cluster Mapper</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalModule(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong>Cluster Mapper</strong> is Module 3 of the ChainScope Suite. It reconstructs multi-hop transaction topologies to identify coordinated insider rings and Sybil clusters.
              </p>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1 text-slate-400">
                <div>• Interactive React Flow network graphs</div>
                <div>• Multi-hop funding origin tracking</div>
                <div>• Coordinated wash trading ring alerts</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalModule(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

