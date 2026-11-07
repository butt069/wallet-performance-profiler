"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
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
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ShieldCheck,
  Zap,
  Flame,
  Bot,
  Coins,
  Gauge,
  Timer,
  ArrowLeftRight,
  FileCode2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

export type PersonaTag =
  | "Windfall Winner"
  | "Consistent Scalper"
  | "DEX Arbitrage / Bot"
  | "Whale / Diamond Hands"
  | "Degen Trader"
  | "Standard Wallet";

interface TokenChange {
  mint: string;
  symbol: string;
  preAmount: number;
  postAmount: number;
  delta: number;
  decimals: number;
}

interface TokenPnlEntry {
  mint: string;
  symbol: string;
  netDelta: number;
  decimals: number;
  tradeCount: number;
  estimatedPnlSol: number;
}

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
  tokenChanges?: TokenChange[];
}

interface WalletProfileData {
  address: string;
  personaTag: PersonaTag;
  realizedPnl: number;
  winRate: number;
  consistencyScore: number;
  tradeFrequencyPerDay: number;
  avgHoldingDurationHours: number;
  isWindfallDriven: boolean;
  totalTransactions: number;
  winningTransactions: number;
  losingTransactions: number;
  neutralTransactions: number;
  recentTransactions: AnalyzedTransaction[];
  tokenPnl?: TokenPnlEntry[];
}

const SAMPLE_WALLETS = [
  { label: "Raydium Authority", address: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" },
  { label: "Pump.fun Fee", address: "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM" },
  { label: "Solana Foundation", address: "BnGCkn5Z8HHx3Qb7D2RVeNhimCpbps3S7LZYNTMCw7dd" },
  { label: "Jupiter Aggregator", address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" },
];

const SOL_PRICE_USD = 175.0;
const PAGE_SIZE = 10;

type SortField = "date" | "delta" | "fee";
type SortOrder = "asc" | "desc";
type TimeFrame = "24h" | "7d" | "30d" | "all";

const TIME_FRAME_OPTIONS: { key: TimeFrame; label: string; seconds: number | null }[] = [
  { key: "24h", label: "24 Hours", seconds: 86_400 },
  { key: "7d", label: "7 Days", seconds: 604_800 },
  { key: "30d", label: "30 Days", seconds: 2_592_000 },
  { key: "all", label: "All Recent", seconds: null },
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

function formatTokenAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (abs < 0.01 && abs > 0) return amount.toFixed(4);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatRelativeTime(timestamp: string | null, blockTime: number | null, nowMs: number): string {
  if (!blockTime && !timestamp) return "Unknown";
  const timeMs = blockTime ? blockTime * 1000 : new Date(timestamp ?? "").getTime();
  if (nowMs <= 0 || isNaN(timeMs)) {
    if (timestamp) return timestamp.slice(0, 10);
    return "Recent";
  }
  const diffSec = Math.floor((nowMs - timeMs) / 1000);
  if (diffSec < 0) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getPersonaBadge(persona: PersonaTag) {
  switch (persona) {
    case "Consistent Scalper":
      return {
        label: "Consistent Scalper",
        icon: Zap,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        description: "Win rate ≥ 65% across 15+ trades — consistent execution precision",
      };
    case "Windfall Winner":
      return {
        label: "Windfall Winner",
        icon: Sparkles,
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        description: "Returns driven primarily by 1-2 jackpot outlier trades (>60% of total profit)",
      };
    case "DEX Arbitrage / Bot":
      return {
        label: "DEX Arbitrage / Bot",
        icon: Bot,
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        description: "High execution velocity (>50/day) or sub-second program-automated trade patterns",
      };
    case "Whale / Diamond Hands":
      return {
        label: "Whale / Diamond Hands",
        icon: Coins,
        bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
        description: "High capital (>100 SOL profit) paired with patient, low-frequency holding periods",
      };
    case "Degen Trader":
      return {
        label: "Degen Trader",
        icon: Flame,
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        description: "High transaction activity with sub-40% win rates and rapid turnover",
      };
    default:
      return {
        label: "Standard Wallet",
        icon: Wallet,
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        description: "Standard on-chain activity pattern",
      };
  }
}

function getTransactionType(tx: AnalyzedTransaction): {
  label: "SPL Token Swap" | "SOL Transfer" | "Contract Interaction";
  icon: typeof ArrowLeftRight;
  color: string;
} {
  if (tx.tokenChanges && tx.tokenChanges.length > 0) {
    return {
      label: "SPL Token Swap",
      icon: ArrowLeftRight,
      color: "bg-purple-50 text-purple-700 border border-purple-200",
    };
  }
  if (Math.abs(tx.solChange) > tx.feeSol) {
    return {
      label: "SOL Transfer",
      icon: Coins,
      color: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    };
  }
  return {
    label: "Contract Interaction",
    icon: FileCode2,
    color: "bg-slate-100 text-slate-700 border border-slate-200",
  };
}

function WalletProfilerPage() {
  const [addressInput, setAddressInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WalletProfileData | null>(null);
  const [copiedSig, setCopiedSig] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "wins" | "losses" | "neutral">("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("all");
  const [showModal, setShowModal] = useState(false);
  const [clientNowMs, setClientNowMs] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClientNowMs(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const analyzeWallet = useCallback(async (targetAddress: string) => {
    const cleaned = targetAddress.trim();
    if (!cleaned) {
      setError("Please enter a Solana wallet address.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setTimeFrame("all");

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
      setToastMessage(`Wallet address copied: ${truncate(text, 6, 6)}`);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedSig(text);
      setToastMessage(`Signature copied: ${truncate(text, 6, 6)}`);
      setTimeout(() => setCopiedSig(null), 2000);
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filteredStats = useMemo(() => {
    const allTxs = data?.recentTransactions ?? [];
    const cutoffSec = TIME_FRAME_OPTIONS.find((o) => o.key === timeFrame)?.seconds ?? null;
    const nowSec = Math.floor(clientNowMs / 1000);

    const txs =
      cutoffSec && nowSec > 0
        ? allTxs.filter((tx) => tx.blockTime !== null && nowSec - (tx.blockTime as number) <= cutoffSec)
        : allTxs;

    const wins = txs.filter((tx) => tx.solChange > 0);
    const losses = txs.filter((tx) => tx.solChange < 0);
    const neutral = txs.filter((tx) => tx.solChange === 0);

    const realizedPnl = txs.reduce((sum, tx) => sum + tx.solChange, 0);
    const evaluated = wins.length + losses.length;
    const winRate = evaluated > 0 ? (wins.length / evaluated) * 100 : 0;

    const blockTimes = txs
      .map((tx) => tx.blockTime)
      .filter((t): t is number => typeof t === "number" && t > 0);

    let tradeFrequencyPerDay = 0;
    if (blockTimes.length >= 2) {
      const span = (Math.max(...blockTimes) - Math.min(...blockTimes)) / 86400;
      tradeFrequencyPerDay = span > 0 ? txs.length / span : txs.length * 24;
    } else if (txs.length === 1) {
      tradeFrequencyPerDay = 1;
    }

    const topWin = wins.length > 0 ? Math.max(...wins.map((t) => t.solChange)) : 0;

    return {
      txs,
      realizedPnl: Number(realizedPnl.toFixed(9)),
      winRate: Number(winRate.toFixed(2)),
      tradeFrequencyPerDay: Number(tradeFrequencyPerDay.toFixed(2)),
      winningTransactions: wins.length,
      losingTransactions: losses.length,
      neutralTransactions: neutral.length,
      totalTransactions: txs.length,
      topWin,
    };
  }, [data, timeFrame, clientNowMs]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const exportCSV = useCallback(() => {
    if (!data) return;

    const esc = (v: string | number | null | undefined): string => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines: string[] = [];
    lines.push("SOLANA WALLET PROFILER REPORT");
    lines.push(`Generated,${esc(new Date().toISOString())}`);
    lines.push("");
    lines.push("WALLET SUMMARY");
    lines.push(`Wallet Address,${esc(data.address)}`);
    lines.push(`Persona Tag,${esc(data.personaTag)}`);
    lines.push(`Realized PnL (SOL),${esc(data.realizedPnl)}`);
    lines.push(`Realized PnL (USD),${esc((data.realizedPnl * SOL_PRICE_USD).toFixed(2))}`);
    lines.push(`Win Rate (%),${esc(data.winRate)}`);
    lines.push(`Consistency Score,${esc(data.consistencyScore)}`);
    lines.push(`Total Transactions,${esc(data.totalTransactions)}`);
    lines.push(`Winning Transactions,${esc(data.winningTransactions)}`);
    lines.push(`Losing Transactions,${esc(data.losingTransactions)}`);
    lines.push(`Neutral Transactions,${esc(data.neutralTransactions)}`);
    lines.push(`Trade Frequency (per day),${esc(data.tradeFrequencyPerDay)}`);
    lines.push(`Avg Holding Duration (hours),${esc(data.avgHoldingDurationHours)}`);
    lines.push(`Windfall Driven,${esc(data.isWindfallDriven ? "Yes" : "No")}`);
    lines.push("");

    if (data.tokenPnl && data.tokenPnl.length > 0) {
      lines.push("SPL TOKEN HOLDINGS BREAKDOWN");
      lines.push(
        ["Rank", "Symbol", "Mint Address", "Trade Count", "Net Balance Delta", "Est. Realized PnL (SOL)", "Est. Realized PnL (USD)"]
          .map(esc)
          .join(",")
      );
      data.tokenPnl.forEach((t, i) => {
        lines.push(
          [i + 1, t.symbol, t.mint, t.tradeCount, t.netDelta, t.estimatedPnlSol, (t.estimatedPnlSol * SOL_PRICE_USD).toFixed(2)]
            .map(esc)
            .join(",")
        );
      });
      lines.push("");
    }

    lines.push("TRANSACTION HISTORY");
    lines.push(
      ["Signature", "Slot", "Timestamp (UTC)", "Status", "Outcome", "Pre-Balance (SOL)", "Post-Balance (SOL)", "SOL Delta", "Fee (SOL)", "SPL Token Changes"]
        .map(esc)
        .join(",")
    );

    for (const tx of data.recentTransactions) {
      const outcome = tx.solChange > 0 ? "WIN" : tx.solChange < 0 ? "LOSS" : "NEUTRAL";
      const tokenSummary =
        tx.tokenChanges && tx.tokenChanges.length > 0
          ? tx.tokenChanges.map((tc) => `${tc.delta > 0 ? "+" : ""}${tc.delta} ${tc.symbol}`).join(" | ")
          : "";

      lines.push(
        [tx.signature, tx.slot ?? "", tx.timestamp ?? "", tx.status, outcome, tx.preBalanceSol, tx.postBalanceSol, tx.solChange, tx.feeSol, tokenSummary]
          .map(esc)
          .join(",")
      );
    }

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `solana-profiler-${data.address.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage(`Report exported: ${fileName}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [data]);

  const sortedAndFilteredTransactions = useMemo(() => {
    const filtered = filteredStats.txs.filter((tx) => {
      if (filterType === "wins") return tx.solChange > 0;
      if (filterType === "losses") return tx.solChange < 0;
      if (filterType === "neutral") return tx.solChange === 0;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        const timeA = a.blockTime ?? (a.slot ?? 0);
        const timeB = b.blockTime ?? (b.slot ?? 0);
        comparison = timeA - timeB;
      } else if (sortField === "delta") {
        comparison = a.solChange - b.solChange;
      } else if (sortField === "fee") {
        comparison = a.feeSol - b.feeSol;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredStats.txs, filterType, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredTransactions.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFilteredTransactions.slice(start, start + PAGE_SIZE);
  }, [sortedAndFilteredTransactions, currentPage]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const scoreValue = data?.consistencyScore ?? 0;
  const strokeDashoffset = circumference - (scoreValue / 100) * circumference;
  const maxSingleWin = filteredStats.topWin;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center">
              <span className="font-bold text-xl sm:text-2xl tracking-tight text-slate-900">
                Solana Profiler
              </span>
              <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-medium">
                Web3 Beta
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1 rounded-full flex items-center gap-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Solana Mainnet</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search & Quick-Select Bar Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Behavioral Profiler, SPL Swaps & Windfall Detection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
            Wallet Performance{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Profiler
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            Inspect any Solana wallet to evaluate realized PnL, win rates, consistency scoring, duration analysis, and automated persona behavior tags.
          </p>

          {/* Search Bar Form with Focused Input */}
          <form id="wallet-search-form" onSubmit={handleSubmit} className="pt-2">
            <div className="relative flex items-center bg-white border border-slate-300 shadow-sm focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl p-2 transition-all duration-200">
              <div className="pl-2 pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                id="wallet-address-input"
                type="text"
                placeholder="Enter Solana wallet address (e.g. 5Q544fKr...)"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-sm sm:text-base placeholder-slate-400 text-slate-900 focus:outline-none font-mono"
                disabled={loading}
              />
              <button
                id="analyze-btn"
                type="submit"
                disabled={loading || !addressInput.trim()}
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 whitespace-nowrap active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze Wallet</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Select Pills */}
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
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono transition-all shadow-sm flex items-center space-x-1.5"
              >
                <span className="text-indigo-600 font-medium">{sample.label}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  ({truncate(sample.address, 3, 3)})
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-white rounded-2xl border border-slate-200 shadow-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="w-24 h-4 bg-slate-100 rounded" />
                  <div className="w-36 h-8 bg-slate-200 rounded" />
                  <div className="w-full h-3 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start space-x-3 text-rose-700 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-xs text-rose-800">Profiling Error</h4>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700 text-sm font-bold">
              ×
            </button>
          </div>
        )}

        {/* Results View */}
        {!loading && data && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Active Wallet Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Active Wallet Address
                  </span>
                  {data.isWindfallDriven && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Sparkles className="w-3 h-3" />
                      <span>Windfall Driven</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-mono text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                    {data.address}
                  </span>
                  <button
                    onClick={() => handleCopy(data.address, true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Copy full address"
                  >
                    {copiedAddress ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`https://solscan.io/account/${data.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-indigo-600 font-semibold text-xs transition-colors"
                  >
                    <span>Solscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Persona Badge & Export Button */}
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const badge = getPersonaBadge(data.personaTag);
                  const BadgeIcon = badge.icon;
                  return (
                    <button
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs ${badge.bg}`}
                      title={badge.description}
                    >
                      <BadgeIcon className="w-4 h-4" />
                      <span>{badge.label}</span>
                    </button>
                  );
                })()}

                <button
                  onClick={exportCSV}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs shadow-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Time-Frame Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Timeframe Window:
                </span>
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {TIME_FRAME_OPTIONS.map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeFrame(tf.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${timeFrame === tf.key
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Auditing <strong className="text-slate-800">{filteredStats.totalTransactions}</strong> recent transactions
              </span>
            </div>

            {/* Summary Metric Cards Grid (6 High-Contrast Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1: Realized PnL */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Realized PnL
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${filteredStats.realizedPnl >= 0
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}
                  >
                    {filteredStats.realizedPnl >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                <div className="my-3">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {filteredStats.realizedPnl >= 0 ? "+" : ""}
                    {formatSol(filteredStats.realizedPnl)}{" "}
                    <span className="text-sm font-semibold text-slate-500">SOL</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    ≈ $
                    {(filteredStats.realizedPnl * SOL_PRICE_USD).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USD
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${filteredStats.realizedPnl >= 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                  >
                    {filteredStats.realizedPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {filteredStats.realizedPnl >= 0 ? "Profitable" : "Drawdown"}
                  </span>
                  <span className="text-slate-400 text-[11px]">SOL @ ${SOL_PRICE_USD}</span>
                </div>
              </div>

              {/* Card 2: Win Rate Meter */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Win Rate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-3">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {filteredStats.winRate.toFixed(1)}%
                  </div>
                  {/* Dual-color Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex mt-2">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${filteredStats.winRate}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-500"
                      style={{ width: `${100 - filteredStats.winRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {filteredStats.winningTransactions} Wins
                  </span>
                  <span className="text-rose-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {filteredStats.losingTransactions} Losses
                  </span>
                  <span className="text-slate-500 font-medium">
                    {filteredStats.neutralTransactions} Neutral
                  </span>
                </div>
              </div>

              {/* Card 3: Consistency Score */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Consistency Score
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Gauge className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-3 flex items-center space-x-3">
                  {/* Circular Gauge Ring */}
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 -rotate-90">
                      <circle cx="28" cy="28" r={radius} stroke="#E2E8F0" strokeWidth="5" fill="transparent" />
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        stroke={data.consistencyScore >= 70 ? "#10B981" : data.consistencyScore >= 40 ? "#6366F1" : "#F43F5E"}
                        strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-slate-900">
                      {data.consistencyScore}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {data.consistencyScore >= 70
                        ? "High Precision"
                        : data.consistencyScore >= 40
                          ? "Moderate Variance"
                          : "High Volatility"}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Execution rating out of 100
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Rating: {data.isWindfallDriven ? "Windfall Bias" : "Systematic"}</span>
                  <span className="font-semibold text-indigo-700">
                    {data.consistencyScore >= 70 ? "Grade A" : data.consistencyScore >= 50 ? "Grade B" : "Grade C"}
                  </span>
                </div>
              </div>

              {/* Card 4: Trade Frequency & Holding Time */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Velocity & Duration
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Timer className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-3 grid grid-cols-2 gap-3 divide-x divide-slate-100">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">
                      {filteredStats.tradeFrequencyPerDay.toFixed(1)}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">Trades / Day</div>
                    <div className="text-[10px] text-slate-400">Execution velocity</div>
                  </div>
                  <div className="pl-3">
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">
                      {data.avgHoldingDurationHours.toFixed(1)}h
                    </div>
                    <div className="text-xs font-semibold text-slate-700">Avg Hold Time</div>
                    <div className="text-[10px] text-slate-400">Position duration</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Active velocity</span>
                  <span className="font-medium text-indigo-600">Measured span</span>
                </div>
              </div>

              {/* Card 5: Win / Loss Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Execution Outcome Split
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Winning Executions:</span>
                    <span className="font-bold text-emerald-700">{filteredStats.winningTransactions}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Capital Losses:</span>
                    <span className="font-bold text-rose-700">{filteredStats.losingTransactions}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Peak Single Win:</span>
                    <span className="font-bold text-slate-900">
                      +{maxSingleWin > 0 ? maxSingleWin.toFixed(3) : "0.000"} SOL
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                  <span>Evaluated Window</span>
                  <span className="font-semibold text-slate-700">{filteredStats.totalTransactions} Trades</span>
                </div>
              </div>

              {/* Card 6: On-Chain Explorer Proof */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Solscan On-Chain Proof
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-3 space-y-1">
                  <div className="text-sm font-bold text-slate-900">
                    Verified on Solana Mainnet
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Live balance deltas parsed directly via Alchemy JSON-RPC batching.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                  </span>
                  <a
                    href={`https://solscan.io/account/${data.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
                  >
                    <span>View on Solscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Top Traded Tokens Section */}
            {data.tokenPnl && data.tokenPnl.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Top Traded Tokens
                      </h2>
                      <p className="text-xs text-slate-500">
                        SPL token balances and correlated PnL across recent swap activity
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">
                    {data.tokenPnl.length} Token{data.tokenPnl.length !== 1 ? "s" : ""} Detected
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Token Identity</th>
                        <th className="py-3 px-4">Trade Count</th>
                        <th className="py-3 px-4">Net Balance Delta</th>
                        <th className="py-3 px-4">Est. PnL (SOL)</th>
                        <th className="py-3 px-4">Est. PnL (USD)</th>
                        <th className="py-3 px-4 text-right">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {data.tokenPnl.map((token, idx) => {
                        const isWin = token.estimatedPnlSol > 0;
                        const isLoss = token.estimatedPnlSol < 0;
                        const usdVal = token.estimatedPnlSol * SOL_PRICE_USD;

                        return (
                          <tr key={token.mint + idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                  {token.symbol.slice(0, 3)}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900">{token.symbol}</div>
                                  <a
                                    href={`https://solscan.io/token/${token.mint}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-[10px] text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-0.5"
                                  >
                                    <span>{truncate(token.mint, 4, 4)}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              {token.tradeCount} trade{token.tradeCount !== 1 ? "s" : ""}
                            </td>

                            <td className="py-3 px-4 font-mono font-semibold">
                              <span className={token.netDelta > 0 ? "text-emerald-700" : token.netDelta < 0 ? "text-rose-700" : "text-slate-600"}>
                                {token.netDelta > 0 ? "+" : ""}
                                {formatTokenAmount(token.netDelta)} {token.symbol}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={isWin ? "text-emerald-700" : isLoss ? "text-rose-700" : "text-slate-500"}>
                                {isWin ? "+" : ""}
                                {token.estimatedPnlSol.toFixed(4)} SOL
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-600 font-mono">
                              ≈ ${usdVal.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-right">
                              {isWin ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  PROFIT
                                </span>
                              ) : isLoss ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  LOSS
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  NEUTRAL
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Enhanced Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-0">
              {/* Header & Controls */}
              <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Transaction Ledger & Execution Detail
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological audit of recent signatures with fee and balance analysis
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filter:</span>
                  {(["all", "wins", "losses", "neutral"] as const).map((ft) => (
                    <button
                      key={ft}
                      onClick={() => {
                        setFilterType(ft);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${filterType === ft
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                        }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Signature</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th
                        onClick={() => handleSort("date")}
                        className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Timestamp / Slot</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Outcome</th>
                      <th
                        onClick={() => handleSort("delta")}
                        className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>SOL Delta</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">SPL Token Changes</th>
                      <th
                        onClick={() => handleSort("fee")}
                        className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Fee</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-right">Explorer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedTransactions.map((tx) => {
                      const isWin = tx.solChange > 0;
                      const isLoss = tx.solChange < 0;
                      const txType = getTransactionType(tx);
                      const TxIcon = txType.icon;

                      return (
                        <tr key={tx.signature} className="hover:bg-slate-50/70 transition-colors">
                          {/* Signature */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-900 font-semibold">
                                {truncate(tx.signature, 6, 6)}
                              </span>
                              <button
                                onClick={() => handleCopy(tx.signature, false)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Copy signature"
                              >
                                {copiedSig === tx.signature ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${txType.color}`}>
                              <TxIcon className="w-3 h-3" />
                              <span>{txType.label}</span>
                            </span>
                          </td>

                          {/* Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                            <div>{formatRelativeTime(tx.timestamp, tx.blockTime, clientNowMs)}</div>
                            {tx.slot && <div className="text-[10px] text-slate-400 font-mono">Slot {tx.slot}</div>}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {tx.status === "success" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Failed
                              </span>
                            )}
                          </td>

                          {/* Outcome */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isWin ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ArrowUpRight className="w-3 h-3 mr-0.5" /> WIN
                              </span>
                            ) : isLoss ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <ArrowDownRight className="w-3 h-3 mr-0.5" /> LOSS
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <MinusCircle className="w-3 h-3 mr-0.5" /> NEUTRAL
                              </span>
                            )}
                          </td>

                          {/* SOL Delta */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                            <span className={`font-bold ${isWin ? "text-emerald-700" : isLoss ? "text-rose-700" : "text-slate-500"}`}>
                              {tx.solChange > 0 ? "+" : ""}
                              {formatSol(tx.solChange)} SOL
                            </span>
                          </td>

                          {/* SPL Token Changes */}
                          <td className="py-3.5 px-4">
                            {tx.tokenChanges && tx.tokenChanges.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {tx.tokenChanges.slice(0, 2).map((tc, idx) => (
                                  <span
                                    key={tc.mint + idx}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${tc.delta > 0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : tc.delta < 0
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                      }`}
                                  >
                                    {tc.delta > 0 ? "+" : ""}
                                    {formatTokenAmount(tc.delta)} {tc.symbol}
                                  </span>
                                ))}
                                {tx.tokenChanges.length > 2 && (
                                  <span className="text-[10px] text-slate-400 self-center">
                                    +{tx.tokenChanges.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Fee */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {tx.feeSol.toFixed(6)} SOL
                          </td>

                          {/* Explorer */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <a
                              href={`https://solscan.io/tx/${tx.signature}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center"
                              title="Inspect signature on Solscan"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}

                    {paginatedTransactions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                          No transactions match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Showing{" "}
                    <strong className="text-slate-800">
                      {(currentPage - 1) * PAGE_SIZE + 1}
                    </strong>{" "}
                    to{" "}
                    <strong className="text-slate-800">
                      {Math.min(currentPage * PAGE_SIZE, sortedAndFilteredTransactions.length)}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-slate-800">
                      {sortedAndFilteredTransactions.length}
                    </strong>{" "}
                    executions
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Feature Cards Grid (Interactive) */}
        {!data && !loading && !error && (
          <div className="max-w-4xl mx-auto pt-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: SPL Token & Swaps (Triggers Sample Wallet Analysis) */}
              <button
                type="button"
                onClick={() => {
                  const sampleAddr = SAMPLE_WALLETS[0].address;
                  setAddressInput(sampleAddr);
                  analyzeWallet(sampleAddr);
                }}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-purple-300 transition-all space-y-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-purple-600 transition-colors">
                  SPL Token & Swaps
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Deeply parses token balances to calculate net deltas across USDC, BONK, WIF, and DEX swap routing.
                </p>
                <span className="text-[11px] text-purple-600 font-semibold inline-flex items-center gap-1 pt-1">
                  Analyze Raydium Sample →
                </span>
              </button>

              {/* Card 2: Consistency & Persona (Opens Explainer Modal) */}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-blue-300 transition-all space-y-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                  Consistency & Persona
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Categorizes wallets into DEX Bots, Consistent Scalpers, Windfall Winners, or Degen Traders with a 0-100 consistency score.
                </p>
                <span className="text-[11px] text-blue-600 font-semibold inline-flex items-center gap-1 pt-1">
                  Learn How Scoring Works →
                </span>
              </button>

              {/* Card 3: Solscan On-Chain Proof (Opens Solscan in New Tab) */}
              <a
                href="https://solscan.io"
                target="_blank"
                rel="noreferrer"
                className="block bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-emerald-300 transition-all space-y-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                  Solscan On-Chain Proof
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Direct one-click deep links to Solscan for every transaction signature, enabling instant verification of program logs and instructions.
                </p>
                <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1 pt-1">
                  Open Solscan Explorer ↗
                </span>
              </a>
            </div>

            {/* Consistency Explainer Modal */}
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-base">Consistency & Persona Scoring</h3>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
                    >
                      ×
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                    <p>
                      The <strong>Consistency Score (0-100)</strong> evaluates execution discipline using transaction frequency, win rate variance, and holding duration.
                    </p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="font-semibold text-slate-800">Persona Categories:</div>
                      <div>• <strong>Consistent Scalper:</strong> Win rate ≥ 65% across 15+ trades</div>
                      <div>• <strong>Windfall Winner:</strong> &gt;60% of profits come from 1-2 jackpot outlier trades</div>
                      <div>• <strong>DEX Arbitrage / Bot:</strong> High frequency (&gt;50/day) sub-second execution</div>
                      <div>• <strong>Degen Trader:</strong> High turnover with sub-40% win rates</div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      Close Explainer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Solana Wallet Performance Profiler</span>
          <span>Powered by Alchemy Solana Mainnet JSON-RPC</span>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <WalletProfilerPage />
    </Suspense>
  );
}