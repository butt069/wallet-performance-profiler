"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";

interface AnalyzedTransaction {
  signature: string;
  slot: number | null;
  blockTime: number | null;
  timestamp: string | null;
  feeSol: number;
  status: "success" | "failed";
  preBalanceSol: number;
  postBalanceSol: number;
  solChange: number;
  isWin: boolean;
  err: unknown;
}

interface WalletProfileData {
  address: string;
  realizedPnl: number;
  winRate: number;
  totalTransactions: number;
  winningTransactions: number;
  losingTransactions: number;
  neutralTransactions: number;
  recentTransactions: AnalyzedTransaction[];
}

const SAMPLE_WALLETS = [
  { label: "Raydium Authority", address: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" },
  { label: "Pump.fun Fee", address: "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM" },
  { label: "Solana Foundation", address: "vines1vzrYbzLMRdu58sy5XTsepGYSxjfvxJAWFP5q" },
  { label: "Jupiter Aggregator", address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" },
];

function truncate(str: string, lead = 4, tail = 4): string {
  if (!str) return "";
  if (str.length <= lead + tail) return str;
  return `${str.slice(0, lead)}...${str.slice(-tail)}`;
}

function formatSol(amount: number): string {
  const abs = Math.abs(amount);
  if (abs === 0) return "0.0000";
  if (abs < 0.0001) return amount.toFixed(8);
  if (abs < 1) return amount.toFixed(6);
  return amount.toFixed(4);
}

function formatRelativeTime(timestamp: string | null, blockTime: number | null): string {
  if (!blockTime && !timestamp) return "Unknown";
  const timeMs = blockTime ? blockTime * 1000 : new Date(timestamp ?? "").getTime();
  const diffSec = Math.floor((Date.now() - timeMs) / 1000);
  if (diffSec < 0) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function WalletProfilerPage() {
  const [addressInput, setAddressInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WalletProfileData | null>(null);
  const [copiedSig, setCopiedSig] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "wins" | "losses" | "neutral">("all");

  const analyzeWallet = useCallback(async (targetAddress: string) => {
    const cleaned = targetAddress.trim();
    if (!cleaned) {
      setError("Please enter a Solana wallet address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/wallet/${cleaned}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error ${response.status}: Failed to fetch wallet profile.`);
      }

      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeWallet(addressInput);
  };

  const handleCopy = (text: string, isAddr = false) => {
    navigator.clipboard.writeText(text);
    if (isAddr) {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedSig(text);
      setTimeout(() => setCopiedSig(null), 2000);
    }
  };

  const filteredTransactions = data?.recentTransactions.filter((tx) => {
    if (filterType === "wins") return tx.solChange > 0;
    if (filterType === "losses") return tx.solChange < 0;
    if (filterType === "neutral") return tx.solChange === 0;
    return true;
  }) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#07090e] rounded-[10px] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Solana Profiler
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
              <span className="font-medium text-slate-300">Solana Mainnet</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero & Search Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 text-xs text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>On-Chain Performance & Realized PnL Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Wallet Performance{" "}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Profiler
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Inspect any Solana wallet to evaluate recent trading efficiency, net SOL balance deltas, and win rate percentages powered by Alchemy JSON-RPC.
          </p>

          {/* Search Bar Form */}
          <form
            id="wallet-search-form"
            onSubmit={handleSubmit}
            className="pt-2"
          >
            <div className="relative flex items-center shadow-2xl shadow-purple-950/20 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-1.5 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all duration-200">
              <div className="pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                id="wallet-address-input"
                type="text"
                placeholder="Enter Solana wallet address (e.g. 5Q544fKr...)"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full bg-transparent px-3 py-2.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none font-mono"
                disabled={loading}
              />
              <button
                id="analyze-btn"
                type="submit"
                disabled={loading || !addressInput.trim()}
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/30 whitespace-nowrap active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Wallet</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sample Wallet Pills */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500 font-medium mr-1">Quick Select:</span>
            {SAMPLE_WALLETS.map((sample) => (
              <button
                key={sample.address}
                type="button"
                onClick={() => {
                  setAddressInput(sample.address);
                  analyzeWallet(sample.address);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-colors duration-150 flex items-center space-x-1.5"
              >
                <span className="text-purple-400 font-medium">{sample.label}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  ({truncate(sample.address, 3, 3)})
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse" id="loading-state">
            <div className="flex items-center justify-center space-x-3 py-4 text-purple-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">
                Fetching signatures & parsing transaction metadata via Alchemy...
              </span>
            </div>

            {/* Skeleton Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-slate-800 rounded" />
                    <div className="h-8 w-8 bg-slate-800 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-32 bg-slate-800 rounded" />
                    <div className="h-3 w-20 bg-slate-800/60 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Skeleton Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <div className="h-6 w-48 bg-slate-800 rounded" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="h-12 bg-slate-800/40 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            id="error-state"
            className="max-w-2xl mx-auto rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-red-200 flex items-start space-x-4 shadow-xl shadow-red-950/20"
          >
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-semibold text-sm text-red-300">Analysis Failed</h3>
              <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed">{error}</p>
              {error.includes("ALCHEMY_API_KEY") && (
                <div className="mt-3 p-3 rounded-lg bg-black/40 border border-red-500/20 text-xs text-slate-300 font-mono">
                  Update <code className="text-purple-300">.env.local</code> with your actual Alchemy API Key and ensure the dev server is active.
                </div>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => analyzeWallet(addressInput)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-xs text-red-200 font-medium transition-colors"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results View */}
        {data && !loading && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Active Wallet Header Card */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-900/90 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Profiled Wallet
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono text-sm sm:text-base font-semibold text-white break-all">
                      {data.address}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(data.address, true)}
                      title="Copy Address"
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedAddress ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://solscan.io/account/${data.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on Solscan"
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => analyzeWallet(data.address)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-medium text-slate-200 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Refresh Profile</span>
                </button>
              </div>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Realized PnL (SOL) */}
              <div
                className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                  data.realizedPnl > 0
                    ? "bg-gradient-to-b from-emerald-950/20 to-slate-900/90 border-emerald-500/30 shadow-lg shadow-emerald-950/10"
                    : data.realizedPnl < 0
                    ? "bg-gradient-to-b from-rose-950/20 to-slate-900/90 border-rose-500/30 shadow-lg shadow-rose-950/10"
                    : "bg-slate-900/90 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Realized PnL (SOL)
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      data.realizedPnl > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : data.realizedPnl < 0
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {data.realizedPnl >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div
                    className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                      data.realizedPnl > 0
                        ? "text-emerald-400"
                        : data.realizedPnl < 0
                        ? "text-rose-400"
                        : "text-slate-200"
                    }`}
                  >
                    {data.realizedPnl > 0 ? "+" : ""}
                    {formatSol(data.realizedPnl)}{" "}
                    <span className="text-xs font-sans text-slate-400 font-normal">SOL</span>
                  </div>
                  <div className="mt-1 flex items-center space-x-1.5 text-xs">
                    <span
                      className={`font-medium ${
                        data.realizedPnl > 0
                          ? "text-emerald-400"
                          : data.realizedPnl < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {data.realizedPnl > 0
                        ? "Net Profitable"
                        : data.realizedPnl < 0
                        ? "Net Drawdown"
                        : "Break-even"}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">across 20 txs</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Win Rate (%) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Win Rate (%)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                    {data.winRate.toFixed(1)}%
                  </div>

                  {/* Win Rate Progress Bar */}
                  <div className="mt-2 w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, data.winRate))}%` }}
                    />
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${100 - Math.min(100, Math.max(0, data.winRate))}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-medium">
                      {data.winningTransactions} Wins
                    </span>
                    <span className="text-rose-400 font-medium">
                      {data.losingTransactions} Losses
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Transactions */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Transactions
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                    {data.totalTransactions}
                  </div>
                  <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last 20 Mainnet transactions</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Win/Loss Breakdown */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Win / Loss Breakdown
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
                    <Filter className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 font-medium block">Wins</span>
                    <span className="text-lg font-bold font-mono text-emerald-300">
                      {data.winningTransactions}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-xs text-rose-400 font-medium block">Losses</span>
                    <span className="text-lg font-bold font-mono text-rose-300">
                      {data.losingTransactions}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                    <span className="text-xs text-slate-400 font-medium block">Neutral</span>
                    <span className="text-lg font-bold font-mono text-slate-300">
                      {data.neutralTransactions}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm overflow-hidden shadow-2xl">
              {/* Table Header & Controls */}
              <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                    <span>Recent Transactions</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {data.recentTransactions.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detailed SOL balance change and Solscan verification for recent activity
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "all"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All ({data.recentTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("wins")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "wins"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-400 hover:text-emerald-400"
                    }`}
                  >
                    Wins ({data.winningTransactions})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("losses")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "losses"
                        ? "bg-rose-600 text-white shadow"
                        : "text-slate-400 hover:text-rose-400"
                    }`}
                  >
                    Losses ({data.losingTransactions})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("neutral")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "neutral"
                        ? "bg-slate-700 text-white shadow"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Neutral ({data.neutralTransactions})
                  </button>
                </div>
              </div>

              {/* Transactions Table (Desktop & Tablet) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Signature</th>
                      <th className="py-3.5 px-4 font-semibold">Time / Slot</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Outcome</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Pre-Balance</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Post-Balance</th>
                      <th className="py-3.5 px-4 font-semibold text-right">SOL Delta</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          No transactions found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr
                          key={tx.signature}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Signature */}
                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="text-purple-300 group-hover:text-purple-200">
                                {truncate(tx.signature, 6, 6)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(tx.signature)}
                                title="Copy Signature"
                                className="opacity-40 group-hover:opacity-100 hover:text-white transition-opacity"
                              >
                                {copiedSig === tx.signature ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </button>
                              <a
                                href={`https://solscan.io/tx/${tx.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View on Solscan"
                                className="text-slate-400 hover:text-emerald-400 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>

                          {/* Time / Slot */}
                          <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                            <div title={tx.timestamp || "Unknown"}>
                              {formatRelativeTime(tx.timestamp, tx.blockTime)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Slot: {tx.slot?.toLocaleString() || "—"}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {tx.status === "success" ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Success</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </span>
                            )}
                          </td>

                          {/* Outcome */}
                          <td className="py-3.5 px-4 text-center">
                            {tx.solChange > 0 ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Win</span>
                              </span>
                            ) : tx.solChange < 0 ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <ArrowDownRight className="w-3 h-3" />
                                <span>Loss</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                <MinusCircle className="w-3 h-3" />
                                <span>Neutral</span>
                              </span>
                            )}
                          </td>

                          {/* Pre-Balance */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">
                            {formatSol(tx.preBalanceSol)} SOL
                          </td>

                          {/* Post-Balance */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300">
                            {formatSol(tx.postBalanceSol)} SOL
                          </td>

                          {/* SOL Delta */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold">
                            <span
                              className={
                                tx.solChange > 0
                                  ? "text-emerald-400"
                                  : tx.solChange < 0
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }
                            >
                              {tx.solChange > 0 ? "+" : ""}
                              {formatSol(tx.solChange)} SOL
                            </span>
                          </td>

                          {/* Fee */}
                          <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                            {tx.feeSol.toFixed(6)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Transactions Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-800">
                {filteredTransactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No transactions found for this filter.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div key={tx.signature} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-purple-300 font-medium">
                            {truncate(tx.signature, 5, 5)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.signature)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            {copiedSig === tx.signature ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <a
                            href={`https://solscan.io/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div>
                          {tx.solChange > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              WIN
                            </span>
                          ) : tx.solChange < 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              LOSS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                              NEUTRAL
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Net SOL Change:</span>
                        <span
                          className={`font-mono font-bold ${
                            tx.solChange > 0
                              ? "text-emerald-400"
                              : tx.solChange < 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        >
                          {tx.solChange > 0 ? "+" : ""}
                          {formatSol(tx.solChange)} SOL
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>
                          {formatSol(tx.preBalanceSol)} → {formatSol(tx.postBalanceSol)} SOL
                        </span>
                        <span>{formatRelativeTime(tx.timestamp, tx.blockTime)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty Initial State Banner */}
        {!data && !loading && !error && (
          <div className="max-w-4xl mx-auto pt-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">Realized PnL Delta</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Calculates native SOL lamport balance changes before and after each transaction across all account keys and address lookup tables.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">Win Rate Analytics</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Evaluates winning vs losing transactions to measure trade execution consistency and profitability over the last 20 network signatures.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">Solscan On-Chain Proof</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct one-click deep links to Solscan for every transaction signature, enabling instant verification of program logs and instructions.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#07090e] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Solana Wallet Performance Profiler</span>
          <span>Powered by Alchemy Solana Mainnet JSON-RPC</span>
        </div>
      </footer>
    </div>
  );
}
