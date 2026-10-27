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
  HelpCircle,
  Star,
  ArrowLeftRight,
  FileCode2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  { label: "Solana Foundation", address: "vines1vzrYbzLMRdu58sy5XTsepGYSxjfvxJAWFP5q" },
  { label: "Jupiter Aggregator", address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" },
];

const SOL_PRICE_USD = 175.0;
const PAGE_SIZE = 10;

type SortField = "date" | "delta" | "fee";
type SortOrder = "asc" | "desc";

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
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (abs < 0.01 && abs > 0) return amount.toFixed(4);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatRelativeTime(timestamp: string | null, blockTime: number | null, nowMs?: number): string {
  if (!blockTime && !timestamp) return "Unknown";
  const timeMs = blockTime ? blockTime * 1000 : new Date(timestamp ?? "").getTime();
  const currentMs = nowMs && nowMs > 0 ? nowMs : 0;
  if (currentMs === 0) {
    if (timestamp) return timestamp.slice(0, 10);
    return "Recent";
  }
  const diffSec = Math.floor((currentMs - timeMs) / 1000);
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
        icon: ShieldCheck,
        bg: "bg-emerald-500/15 text-emerald-300 border-cyan-400/40",
        glow: "shadow-emerald-500/20",
        description: "High win rate (≥65%) across consistent trades",
      };
    case "Windfall Winner":
      return {
        label: "Windfall Winner",
        icon: Zap,
        bg: "bg-amber-500/15 text-amber-300 border-yellow-400/40",
        glow: "shadow-amber-500/20",
        description: "Single trade drives >70% of total profit",
      };
    case "Whale / Diamond Hands":
      return {
        label: "Whale / Diamond Hands",
        icon: Coins,
        bg: "bg-purple-500/15 text-indigo-300 border-purple-400/40",
        glow: "shadow-purple-500/20",
        description: ">100 SOL profit with patient holding time",
      };
    case "Degen Trader":
      return {
        label: "Degen Trader",
        icon: Flame,
        bg: "bg-rose-500/15 text-red-300 border-rose-500/40",
        glow: "shadow-rose-500/20",
        description: "Aggressive trading with win rate <40%",
      };
    case "DEX Arbitrage / Bot":
      return {
        label: "DEX Arbitrage / Bot",
        icon: Bot,
        bg: "bg-blue-500/15 text-sky-300 border-blue-400/40",
        glow: "shadow-blue-500/20",
        description: "High velocity (>50 txs/day or <10s execution gaps)",
      };
    default:
      return {
        label: "Standard Wallet",
        icon: Activity,
        bg: "bg-slate-800/80 text-slate-300 border-slate-700",
        glow: "shadow-slate-800/10",
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
      color: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    };
  }
  if (Math.abs(tx.solChange) > tx.feeSol + 0.000001) {
    return {
      label: "SOL Transfer",
      icon: Wallet,
      color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    };
  }
  return {
    label: "Contract Interaction",
    icon: FileCode2,
    color: "bg-slate-800 text-slate-400 border-slate-700",
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
  const [timeFrame, setTimeFrame] = useState<"24h" | "7d" | "30d" | "all">("all");
  const [clientNowSec, setClientNowSec] = useState<number>(0);

  useEffect(() => {
    setClientNowSec(Math.floor(Date.now() / 1000));
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
      setToastMessage(`Wallet address copied to clipboard: ${truncate(text, 6, 6)}`);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedSig(text);
      setToastMessage(`Signature copied to clipboard: ${truncate(text, 6, 6)}`);
      setTimeout(() => setCopiedSig(null), 2000);
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  // ─── Time-frame derived stats ────────────────────────────────────────────────
  type TimeFrame = "24h" | "7d" | "30d" | "all";

  const TIME_FRAME_OPTIONS: { key: TimeFrame; label: string; seconds: number | null }[] = [
    { key: "24h", label: "24 Hours",  seconds: 86_400 },
    { key: "7d",  label: "7 Days",    seconds: 604_800 },
    { key: "30d", label: "30 Days",   seconds: 2_592_000 },
    { key: "all", label: "All Recent", seconds: null },
  ];

  const filteredStats = useMemo(() => {
    const allTxs = data?.recentTransactions ?? [];
    const cutoffSec = TIME_FRAME_OPTIONS.find((o) => o.key === timeFrame)?.seconds ?? null;

    const txs = cutoffSec && clientNowSec > 0
      ? allTxs.filter((tx) => tx.blockTime !== null && clientNowSec - (tx.blockTime as number) <= cutoffSec)
      : allTxs;

    const wins   = txs.filter((tx) => tx.solChange > 0);
    const losses = txs.filter((tx) => tx.solChange < 0);
    const neutral = txs.filter((tx) => tx.solChange === 0);

    const realizedPnl = txs.reduce((sum, tx) => sum + tx.solChange, 0);
    const evaluated   = wins.length + losses.length;
    const winRate     = evaluated > 0 ? (wins.length / evaluated) * 100 : 0;

    // Trade frequency over the filtered window (or the full API window)
    const blockTimes = txs.map((tx) => tx.blockTime).filter((t): t is number => typeof t === "number" && t > 0);
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
      realizedPnl:          Number(realizedPnl.toFixed(9)),
      winRate:              Number(winRate.toFixed(2)),
      tradeFrequencyPerDay: Number(tradeFrequencyPerDay.toFixed(2)),
      winningTransactions:  wins.length,
      losingTransactions:   losses.length,
      neutralTransactions:  neutral.length,
      totalTransactions:    txs.length,
      topWin,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, timeFrame, clientNowSec]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // ─── CSV Export ───────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (!data) return;

    const esc = (v: string | number | null | undefined): string => {
      const s = v === null || v === undefined ? "" : String(v);
      // Wrap in quotes and escape any embedded quotes
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines: string[] = [];

    // ── Section 1: Wallet Summary ────────────────────────────────────────
    lines.push("WALLET PROFILER REPORT");
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

    // ── Section 2: Token Holdings Breakdown ─────────────────────────────
    if (data.tokenPnl && data.tokenPnl.length > 0) {
      lines.push("TOKEN HOLDINGS BREAKDOWN");
      lines.push(
        [
          "Rank",
          "Symbol",
          "Mint Address",
          "Trade Count",
          "Net Balance Delta",
          "Est. Realized PnL (SOL)",
          "Est. Realized PnL (USD)",
        ]
          .map(esc)
          .join(",")
      );
      data.tokenPnl.forEach((t, i) => {
        lines.push(
          [
            i + 1,
            t.symbol,
            t.mint,
            t.tradeCount,
            t.netDelta,
            t.estimatedPnlSol,
            (t.estimatedPnlSol * SOL_PRICE_USD).toFixed(2),
          ]
            .map(esc)
            .join(",")
        );
      });
      lines.push("");
    }

    // ── Section 3: Transaction Detail ────────────────────────────────────
    lines.push("TRANSACTION HISTORY");
    lines.push(
      [
        "Signature",
        "Slot",
        "Timestamp (UTC)",
        "Status",
        "Outcome",
        "Pre-Balance (SOL)",
        "Post-Balance (SOL)",
        "SOL Delta",
        "Fee (SOL)",
        "SPL Token Changes",
      ]
        .map(esc)
        .join(",")
    );

    for (const tx of data.recentTransactions) {
      const outcome = tx.solChange > 0 ? "WIN" : tx.solChange < 0 ? "LOSS" : "NEUTRAL";
      const tokenSummary =
        tx.tokenChanges && tx.tokenChanges.length > 0
          ? tx.tokenChanges
              .map((tc) => `${tc.delta > 0 ? "+" : ""}${tc.delta} ${tc.symbol}`)
              .join(" | ")
          : "";

      lines.push(
        [
          tx.signature,
          tx.slot ?? "",
          tx.timestamp ?? "",
          tx.status,
          outcome,
          tx.preBalanceSol,
          tx.postBalanceSol,
          tx.solChange,
          tx.feeSol,
          tokenSummary,
        ]
          .map(esc)
          .join(",")
      );
    }

    // ── Trigger download ─────────────────────────────────────────────────
    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `solana-profiler-${data.address.slice(0, 8)}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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
    if (!data?.recentTransactions) return [];

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
  }, [data, filterType, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredTransactions.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFilteredTransactions.slice(start, start + PAGE_SIZE);
  }, [sortedAndFilteredTransactions, currentPage]);

  // Radial progress calculations for consistency score (Card 3)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const scoreValue = data?.consistencyScore ?? 0;
  const strokeDashoffset = circumference - (scoreValue / 100) * circumference;

  // maxSingleWin for the FILTERED window
  const maxSingleWin = filteredStats.topWin;

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 border border-emerald-500/30 text-emerald-300 shadow-2xl backdrop-blur-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-gradient-to-tr from-purple-600 to-emerald-400 p-2.5 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-bold text-2xl tracking-tight">
                Solana Profiler
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                Web3 Beta
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium">Solana Mainnet</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search & Quick-Select Bar Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20 text-xs text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Behavioral Profiler, SPL Swaps & Windfall Detection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Wallet Performance{" "}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Profiler
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Inspect any Solana wallet to evaluate realized PnL, win rates, consistency scoring, duration analysis, and automated persona behavior tags.
          </p>

          {/* Search Bar Form with Glowing Focus State */}
          <form id="wallet-search-form" onSubmit={handleSubmit} className="pt-2">
            <div className="relative flex items-center shadow-2xl shadow-purple-950/20 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1.5 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/50 transition-all duration-300">
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
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/30 whitespace-nowrap active:scale-[0.98]"
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
                className="bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50 rounded-lg text-xs px-3 py-1.5 transition-all flex items-center space-x-1.5"
              >
                <span className="text-purple-400 font-medium">{sample.label}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  ({truncate(sample.address, 3, 3)})
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* State Handling UI: Skeleton Loaders */}
        {loading && (
          <div className="space-y-6 animate-pulse" id="loading-state">
            <div className="flex items-center justify-center space-x-3 py-4 text-purple-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">
                Parsing transactions, evaluating consistency & profiling wallet persona...
              </span>
            </div>

            {/* Skeleton 6 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-slate-800/60 rounded-xl" />
                    <div className="h-8 w-8 bg-slate-800/60 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-36 bg-slate-800/60 rounded-xl" />
                    <div className="h-3 w-24 bg-slate-800/40 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>

            {/* Skeleton Table */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 space-y-4">
              <div className="h-6 w-48 bg-slate-800/60 rounded-xl" />
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
            className="max-w-2xl mx-auto rounded-2xl border border-red-500/30 bg-red-950/20 backdrop-blur-xl p-5 text-red-200 flex items-start space-x-4 shadow-xl shadow-red-950/20"
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
            {/* Active Wallet Header Card with Glassmorphism */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Profiled Wallet
                    </span>

                    {/* Persona Badge */}
                    {(() => {
                      const badge = getPersonaBadge(data.personaTag);
                      const Icon = badge.icon;
                      return (
                        <span
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.glow} shadow-md transition-all`}
                          title={badge.description}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}

                    {/* Windfall Driven Pill with Hover Tooltip Wrapper */}
                    {data.isWindfallDriven && (
                      <div className="relative group inline-flex items-center cursor-help">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Windfall Driven (&gt;70% Single Win)</span>
                        </span>

                        {/* Tooltip Overlay */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-950/95 border border-amber-500/40 rounded-xl shadow-2xl backdrop-blur-xl text-slate-300 text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                          <p className="font-semibold text-amber-300 mb-1 flex items-center space-x-1">
                            <Zap className="w-3.5 h-3.5" />
                            <span>Windfall Detection</span>
                          </p>
                          Flags wallets where a single outsized win accounts for more than 70% of total realized profit. Indicates luck or one-off trades rather than a repeatable trading strategy.
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-amber-500/40" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mt-1.5">
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
                        <Check className="w-4 h-4 text-emerald-400 scale-110 transition-transform" />
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
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-medium text-slate-200 transition-all active:scale-95 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Refresh Profile</span>
                </button>

                <button
                  id="export-csv-btn"
                  type="button"
                  onClick={exportCSV}
                  title="Export wallet report as CSV"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-all active:scale-95 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* ── Time-Frame Filter Tabs ───────────────────────────────────────────── */}
            <div
              id="timeframe-tabs"
              className="flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center p-1 gap-1 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-inner">
                {TIME_FRAME_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    id={`timeframe-${key}`}
                    type="button"
                    onClick={() => {
                      setTimeFrame(key);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                      timeFrame === key
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Live count badge */}
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                <span>
                  <span className="font-semibold text-slate-300">{filteredStats.totalTransactions}</span>
                  {" "}of{" "}
                  <span className="font-semibold text-slate-300">{data.totalTransactions}</span>
                  {" "}transactions in window
                </span>
              </div>
            </div>

            {/* Summary Metric Cards Grid (6 Cards with Glassmorphism) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1: Realized PnL */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Realized PnL
                  </span>

                  {/* Colored stat badge */}
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
                      filteredStats.realizedPnl >= 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {filteredStats.realizedPnl >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>{filteredStats.realizedPnl >= 0 ? "Profit" : "Drawdown"}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div
                    className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                      filteredStats.realizedPnl > 0
                        ? "text-emerald-400"
                        : filteredStats.realizedPnl < 0
                        ? "text-rose-400"
                        : "text-slate-200"
                    }`}
                  >
                    {filteredStats.realizedPnl > 0 ? "+" : ""}
                    {formatSol(filteredStats.realizedPnl)}{" "}
                    <span className="text-xs font-sans text-slate-400 font-normal">SOL</span>
                  </div>

                  {/* Estimated USD Value */}
                  <div className="mt-1 text-xs text-slate-400 font-mono flex items-center space-x-1.5">
                    <span className="text-slate-300 font-medium">
                      ≈ ${Math.abs(filteredStats.realizedPnl * SOL_PRICE_USD).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] text-slate-500">(@${SOL_PRICE_USD}/SOL)</span>
                  </div>

                  <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">
                      {filteredStats.realizedPnl > 0
                        ? "Net Profitable"
                        : filteredStats.realizedPnl < 0
                        ? "Net Drawdown"
                        : "Break-even"}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>across {filteredStats.totalTransactions} transactions</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Win Rate Meter */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Win Rate Meter
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                    {filteredStats.winRate.toFixed(1)}%
                  </div>

                  {/* Dual-color Progress Bar with Rounded Ends */}
                  <div className="mt-3 w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-l-full"
                      style={{ width: `${Math.min(100, Math.max(0, filteredStats.winRate))}%` }}
                    />
                    <div
                      className="h-full bg-rose-500/80 transition-all duration-500 rounded-r-full"
                      style={{ width: `${100 - Math.min(100, Math.max(0, filteredStats.winRate))}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-emerald-400 font-medium">
                      {filteredStats.winningTransactions} Wins ({filteredStats.winRate.toFixed(0)}%)
                    </span>
                    <span className="text-rose-400 font-medium">
                      {filteredStats.losingTransactions} Losses ({(100 - filteredStats.winRate).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Consistency Score with Hover Tooltip Overlay */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 flex flex-col justify-between relative">
                <div className="flex items-center justify-between">
                  {/* Tooltip Overlay Heading Wrapper */}
                  <div className="relative group inline-flex items-center space-x-1.5 cursor-help">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition-colors">
                      Consistency Score
                    </span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />

                    {/* Tooltip Popup */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 p-3 bg-slate-950/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl text-slate-300 text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                      <p className="font-semibold text-white mb-1 flex items-center space-x-1.5">
                        <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Consistency Score (0–100)</span>
                      </p>
                      Calculated using trade return standard deviation and variance. Rewards steady, repeatable profit distributions while penalizing high return volatility and windfall dependency.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700/80" />
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Gauge className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                        {data.consistencyScore}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">/ 100</span>
                    </div>

                    <div className="mt-1 text-xs font-medium">
                      {data.consistencyScore >= 70 ? (
                        <span className="text-emerald-400">Steady & Repeatable</span>
                      ) : data.consistencyScore >= 45 ? (
                        <span className="text-amber-400">Moderate Variance</span>
                      ) : (
                        <span className="text-rose-400">Volatile / Windfall Dependent</span>
                      )}
                    </div>
                  </div>

                  {/* Circular SVG Gauge Ring */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                      <circle
                        cx="34"
                        cy="34"
                        r={radius}
                        className="stroke-slate-800"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="34"
                        cy="34"
                        r={radius}
                        className={`transition-all duration-1000 ${
                          data.consistencyScore >= 70
                            ? "stroke-emerald-400"
                            : data.consistencyScore >= 45
                            ? "stroke-amber-400"
                            : "stroke-rose-400"
                        }`}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-xs font-mono font-bold text-white">
                      {data.consistencyScore}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Trade Frequency & Average Holding Time with Tooltip */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Activity & Duration
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Timer className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-[11px] text-slate-400 block font-medium">Frequency</span>
                    <span className="text-xl font-bold font-mono text-white block mt-0.5">
                      {filteredStats.tradeFrequencyPerDay}
                    </span>
                    <span className="text-[10px] text-slate-500">trades / day</span>
                  </div>

                  {/* Avg Holding Time with Tooltip */}
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 relative group cursor-help">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 block font-medium group-hover:text-slate-200 transition-colors">
                        Avg Holding
                      </span>
                      <HelpCircle className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <span className="text-xl font-bold font-mono text-white block mt-0.5">
                      {data.avgHoldingDurationHours >= 24
                        ? `${(data.avgHoldingDurationHours / 24).toFixed(1)}d`
                        : `${data.avgHoldingDurationHours}h`}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {data.avgHoldingDurationHours >= 24 ? "days duration" : "hours duration"}
                    </span>

                    {/* Tooltip Overlay */}
                    <div className="absolute right-0 bottom-full mb-2 w-56 p-2.5 bg-slate-950/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl text-slate-300 text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                      <p className="font-semibold text-white mb-0.5">Avg Holding Time</p>
                      Estimated elapsed duration between asset acquisition and liquidation across parsed transactions.
                      <div className="absolute right-4 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700/80" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: Win / Loss Breakdown */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Win / Loss Breakdown
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
                    <Filter className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 font-medium block">Wins</span>
                    <span className="text-xl font-bold font-mono text-emerald-300">
                      {filteredStats.winningTransactions}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-xs text-rose-400 font-medium block">Losses</span>
                    <span className="text-xl font-bold font-mono text-rose-300">
                      {filteredStats.losingTransactions}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700">
                    <span className="text-xs text-slate-400 font-medium block">Neutral</span>
                    <span className="text-xl font-bold font-mono text-slate-300">
                      {filteredStats.neutralTransactions}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 6: On-Chain Explorer Proof */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    On-Chain Explorer Proof
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified via Alchemy Mainnet RPC</span>
                  </div>

                  <a
                    href={`https://solscan.io/account/${data.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:to-cyan-600/50 border border-purple-500/30 text-white font-medium text-xs transition-all active:scale-[0.98] shadow-sm group"
                  >
                    <span>View Account on Solscan</span>
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                Top Traded Tokens Section
            ════════════════════════════════════════════════════ */}
            {data.tokenPnl && data.tokenPnl.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
                {/* Section Header */}
                <div className="p-4 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                      <span>Top Traded Tokens</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {data.tokenPnl.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Per-token holdings breakdown — net balance change &amp; correlated realized PnL across all transactions
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <span>SPL Token Aggregation</span>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800/80 select-none">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold w-8">#</th>
                        <th className="py-3.5 px-4 font-semibold">Token</th>
                        <th className="py-3.5 px-4 font-semibold text-center">Trades</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Net Balance Δ</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Est. Realized PnL (SOL)</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Est. Realized PnL (USD)</th>
                        <th className="py-3.5 px-4 font-semibold text-center">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.tokenPnl.map((token, idx) => {
                        const pnlPositive = token.estimatedPnlSol > 0;
                        const pnlNegative = token.estimatedPnlSol < 0;
                        const pnlUsd = token.estimatedPnlSol * SOL_PRICE_USD;
                        const isKnown = !token.symbol.includes("...");

                        return (
                          <tr
                            key={token.mint}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            {/* Rank */}
                            <td className="py-3.5 px-5 text-xs text-slate-500 font-mono">{idx + 1}</td>

                            {/* Token Identity */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isKnown
                                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                      : "bg-slate-800 text-slate-400 border border-slate-700"
                                  }`}
                                >
                                  {token.symbol.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-xs text-white">{token.symbol}</div>
                                  <div
                                    className="text-[10px] text-slate-500 font-mono cursor-pointer hover:text-purple-400 transition-colors"
                                    title={token.mint}
                                    onClick={() => handleCopy(token.mint)}
                                  >
                                    {truncate(token.mint, 5, 5)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Trade Count */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs font-mono font-semibold text-slate-300">
                                {token.tradeCount}
                              </span>
                            </td>

                            {/* Net Delta */}
                            <td className="py-3.5 px-4 text-right font-mono text-xs">
                              <span
                                className={`font-semibold ${
                                  token.netDelta > 0
                                    ? "text-emerald-400"
                                    : token.netDelta < 0
                                    ? "text-rose-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {token.netDelta > 0 ? "+" : ""}
                                {formatTokenAmount(token.netDelta)}
                              </span>
                              <div className="text-[10px] text-slate-600 mt-0.5">{token.symbol}</div>
                            </td>

                            {/* Est. PnL SOL */}
                            <td className="py-3.5 px-4 text-right font-mono text-xs">
                              <span
                                className={`font-bold ${
                                  pnlPositive
                                    ? "text-emerald-400"
                                    : pnlNegative
                                    ? "text-rose-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {pnlPositive ? "+" : ""}
                                {formatSol(token.estimatedPnlSol)} SOL
                              </span>
                            </td>

                            {/* Est. PnL USD */}
                            <td className="py-3.5 px-4 text-right font-mono text-xs">
                              <span
                                className={`${
                                  pnlPositive
                                    ? "text-emerald-300"
                                    : pnlNegative
                                    ? "text-rose-300"
                                    : "text-slate-400"
                                }`}
                              >
                                {pnlUsd >= 0 ? "+" : ""}$
                                {Math.abs(pnlUsd).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </td>

                            {/* Outcome Pill */}
                            <td className="py-3.5 px-4 text-center">
                              {pnlPositive ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>Gain</span>
                                </span>
                              ) : pnlNegative ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <ArrowDownRight className="w-3 h-3" />
                                  <span>Loss</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <MinusCircle className="w-3 h-3" />
                                  <span>Neutral</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-800/60">
                  {data.tokenPnl.map((token, idx) => {
                    const pnlPositive = token.estimatedPnlSol > 0;
                    const pnlNegative = token.estimatedPnlSol < 0;
                    const pnlUsd = token.estimatedPnlSol * SOL_PRICE_USD;
                    const isKnown = !token.symbol.includes("...");

                    return (
                      <div key={token.mint} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                isKnown
                                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}
                            >
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white">{token.symbol}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{truncate(token.mint, 4, 4)}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                              #{idx + 1}
                            </span>
                            {pnlPositive ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Gain</span>
                              </span>
                            ) : pnlNegative ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <ArrowDownRight className="w-3 h-3" />
                                <span>Loss</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                <MinusCircle className="w-3 h-3" />
                                <span>Neutral</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center">
                            <div className="text-slate-500 text-[10px] mb-0.5">Trades</div>
                            <div className="font-mono font-bold text-white">{token.tradeCount}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center">
                            <div className="text-slate-500 text-[10px] mb-0.5">Net Δ</div>
                            <div
                              className={`font-mono font-bold ${
                                token.netDelta > 0
                                  ? "text-emerald-400"
                                  : token.netDelta < 0
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {token.netDelta > 0 ? "+" : ""}{formatTokenAmount(token.netDelta)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center">
                            <div className="text-slate-500 text-[10px] mb-0.5">PnL (SOL)</div>
                            <div
                              className={`font-mono font-bold ${
                                pnlPositive
                                  ? "text-emerald-400"
                                  : pnlNegative
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {pnlPositive ? "+" : ""}{formatSol(token.estimatedPnlSol)}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 font-mono">
                          USD ≈{" "}
                          <span
                            className={`font-semibold ${
                              pnlPositive ? "text-emerald-400" : pnlNegative ? "text-rose-400" : "text-slate-400"
                            }`}
                          >
                            {pnlUsd >= 0 ? "+" : ""}$
                            {Math.abs(pnlUsd).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer note */}
                <div className="p-3 border-t border-slate-800/60 bg-slate-950/40 text-[11px] text-slate-500 flex items-center space-x-1.5">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span>
                    Estimated PnL is derived from the SOL flow correlated with each token swap transaction and is not based on historical token prices. Use as a directional indicator only.
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced Transactions Table with Sorting & Pagination */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
              {/* Table Header & Controls */}
              <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                    <span>Recent Transactions</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {sortedAndFilteredTransactions.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click table headers to sort by Date, SOL Delta, or Fee
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("all");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "all"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All ({filteredStats.totalTransactions})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("wins");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "wins"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-400 hover:text-emerald-400"
                    }`}
                  >
                    Wins ({filteredStats.winningTransactions})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("losses");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "losses"
                        ? "bg-rose-600 text-white shadow"
                        : "text-slate-400 hover:text-rose-400"
                    }`}
                  >
                    Losses ({filteredStats.losingTransactions})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("neutral");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === "neutral"
                        ? "bg-slate-700 text-white shadow"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Neutral ({filteredStats.neutralTransactions})
                  </button>
                </div>
              </div>

              {/* Transactions Table (Desktop & Tablet) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800/80 select-none">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Signature</th>
                      <th className="py-3.5 px-4 font-semibold">Type</th>

                      {/* Sortable: Time / Slot */}
                      <th className="py-3.5 px-4 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort("date")}
                          className="inline-flex items-center space-x-1.5 hover:text-white transition-colors group cursor-pointer"
                          title="Sort by Date / Slot"
                        >
                          <span>Time / Slot</span>
                          {sortField === "date" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-purple-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          )}
                        </button>
                      </th>

                      <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Outcome</th>

                      {/* Sortable: SOL Delta */}
                      <th className="py-3.5 px-4 font-semibold text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("delta")}
                          className="inline-flex items-center space-x-1.5 hover:text-white transition-colors group ml-auto cursor-pointer"
                          title="Sort by SOL Delta"
                        >
                          <span>SOL Delta</span>
                          {sortField === "delta" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-purple-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          )}
                        </button>
                      </th>

                      <th className="py-3.5 px-4 font-semibold text-left">SPL Token Changes</th>

                      {/* Sortable: Fee */}
                      <th className="py-3.5 px-4 font-semibold text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("fee")}
                          className="inline-flex items-center space-x-1.5 hover:text-white transition-colors group ml-auto cursor-pointer"
                          title="Sort by Fee"
                        >
                          <span>Fee</span>
                          {sortField === "fee" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-purple-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          )}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          No transactions found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((tx) => {
                        const txType = getTransactionType(tx);
                        const isTopWin = maxSingleWin > 0 && tx.solChange === maxSingleWin;

                        return (
                          <tr
                            key={tx.signature}
                            className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50 text-sm group"
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
                                    <Check className="w-3.5 h-3.5 text-emerald-400 scale-110 transition-transform" />
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

                            {/* Type Column */}
                            <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${txType.color}`}
                              >
                                <txType.icon className="w-3 h-3" />
                                <span>{txType.label}</span>
                              </span>
                            </td>

                            {/* Time / Slot */}
                            <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                              <div title={tx.timestamp || "Unknown"}>
                                {formatRelativeTime(tx.timestamp, tx.blockTime, clientNowSec * 1000)}
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

                            {/* Outcome + Outlier / Windfall Badge */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {tx.solChange > 0 ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <ArrowUpRight className="w-3 h-3" />
                                    <span>[WIN]</span>
                                  </span>
                                ) : tx.solChange < 0 ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <ArrowDownRight className="w-3 h-3" />
                                    <span>[LOSS]</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    <MinusCircle className="w-3 h-3" />
                                    <span>[NEUTRAL]</span>
                                  </span>
                                )}

                                {/* Outlier Trade Badge */}
                                {isTopWin && (
                                  <span
                                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                      data.isWindfallDriven
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    }`}
                                    title={
                                      data.isWindfallDriven
                                        ? "Windfall Driver (>70% of total profit)"
                                        : "Top Performing Trade"
                                    }
                                  >
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    <span>{data.isWindfallDriven ? "Windfall Win" : "Top Win"}</span>
                                  </span>
                                )}
                              </div>
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

                            {/* SPL Token Changes */}
                            <td className="py-3.5 px-4 text-left font-mono text-xs">
                              {tx.tokenChanges && tx.tokenChanges.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {tx.tokenChanges.map((tc) => (
                                    <span
                                      key={tc.mint}
                                      title={`Mint: ${tc.mint}`}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                        tc.delta > 0
                                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                      }`}
                                    >
                                      {tc.delta > 0 ? "+" : ""}
                                      {formatTokenAmount(tc.delta)} {tc.symbol}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>

                            {/* Fee */}
                            <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                              {tx.feeSol.toFixed(6)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Transactions Mobile Cards View */}
              <div className="md:hidden divide-y divide-slate-800/60">
                {paginatedTransactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No transactions found for this filter.
                  </div>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const txType = getTransactionType(tx);
                    const isTopWin = maxSingleWin > 0 && tx.solChange === maxSingleWin;

                    return (
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
                                <Check className="w-3 h-3 text-emerald-400 scale-110 transition-transform" />
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

                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${txType.color}`}
                            >
                              {txType.label}
                            </span>
                            {isTopWin && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                TOP WIN
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

                        {tx.tokenChanges && tx.tokenChanges.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {tx.tokenChanges.map((tc) => (
                              <span
                                key={tc.mint}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                  tc.delta > 0
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                }`}
                              >
                                {tc.delta > 0 ? "+" : ""}
                                {formatTokenAmount(tc.delta)} {tc.symbol}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>
                            {formatSol(tx.preBalanceSol)} → {formatSol(tx.postBalanceSol)} SOL
                          </span>
                          <span>{formatRelativeTime(tx.timestamp, tx.blockTime, clientNowSec * 1000)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 3. Table Pagination Controls */}
              <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
                <div className="flex items-center space-x-2">
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-white">
                      {sortedAndFilteredTransactions.length === 0
                        ? 0
                        : (currentPage - 1) * PAGE_SIZE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-white">
                      {Math.min(currentPage * PAGE_SIZE, sortedAndFilteredTransactions.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-white">
                      {sortedAndFilteredTransactions.length}
                    </span>{" "}
                    transactions
                  </span>
                  {sortedAndFilteredTransactions.length > 0 && (
                    <span className="hidden lg:inline text-slate-600">
                      • Sorted by {sortField === "date" ? "Date" : sortField === "delta" ? "SOL Delta" : "Fee"} (
                      {sortOrder})
                    </span>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                            currentPage === pageNum
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                              : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Traded Tokens Section */}
        {data && data.tokenPnl && data.tokenPnl.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Top Traded Tokens</h2>
                  <p className="text-xs text-slate-500">Per-token aggregated PnL & balance breakdown</p>
                </div>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1">
                {data.tokenPnl.length} token{data.tokenPnl.length !== 1 ? "s" : ""} detected
              </span>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-slate-800/60 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <div className="col-span-3">Token</div>
                <div className="col-span-2 text-right">Net Balance Δ</div>
                <div className="col-span-2 text-right">Est. PnL (SOL)</div>
                <div className="col-span-2 text-right">Est. PnL (USD)</div>
                <div className="col-span-1 text-right">Trades</div>
                <div className="col-span-2 text-right">PnL Bar</div>
              </div>

              <div className="divide-y divide-slate-800/40">
                {data.tokenPnl.map((token) => {
                  const pnlPositive = token.estimatedPnlSol >= 0;
                  const maxAbsPnl = Math.max(...data.tokenPnl!.map((t) => Math.abs(t.estimatedPnlSol)), 0.00001);
                  const barPct = Math.min(100, (Math.abs(token.estimatedPnlSol) / maxAbsPnl) * 100);
                  const usdVal = token.estimatedPnlSol * SOL_PRICE_USD;
                  return (
                    <div
                      key={token.mint}
                      className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center hover:bg-slate-800/20 transition-colors duration-150 group"
                    >
                      {/* Token symbol + mint */}
                      <div className="col-span-3 flex items-center space-x-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          pnlPositive
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        }`}>
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{token.symbol}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {token.mint.slice(0, 6)}…{token.mint.slice(-4)}
                          </div>
                        </div>
                      </div>

                      {/* Net balance delta */}
                      <div className={`col-span-2 text-right text-sm font-mono font-medium ${
                        token.netDelta > 0 ? "text-emerald-400" : token.netDelta < 0 ? "text-rose-400" : "text-slate-400"
                      }`}>
                        {token.netDelta > 0 ? "+" : ""}{formatTokenAmount(token.netDelta)}
                      </div>

                      {/* Estimated PnL SOL */}
                      <div className={`col-span-2 text-right text-sm font-mono font-medium ${
                        pnlPositive ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {pnlPositive ? "+" : ""}{formatSol(token.estimatedPnlSol)} SOL
                      </div>

                      {/* Estimated PnL USD */}
                      <div className={`col-span-2 text-right text-xs font-mono ${
                        pnlPositive ? "text-emerald-500" : "text-rose-500"
                      }`}>
                        {pnlPositive ? "+" : "-"}${Math.abs(usdVal).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>

                      {/* Trade count */}
                      <div className="col-span-1 text-right">
                        <span className="text-xs text-slate-300 font-mono bg-slate-800/60 border border-slate-700/40 rounded-md px-1.5 py-0.5">
                          {token.tradeCount}
                        </span>
                      </div>

                      {/* PnL bar */}
                      <div className="col-span-2 flex items-center justify-end">
                        <div className="w-full max-w-[80px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pnlPositive ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-rose-600 to-rose-400"
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty / Landing State Feature Grid */}
        {!data && !loading && !error && (
          <div className="max-w-4xl mx-auto pt-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 space-y-3 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">SPL Token & Swaps</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deeply parses token balances to calculate net deltas across USDC, BONK, WIF, and DEX swap routing.
                </p>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 space-y-3 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base">Consistency & Persona</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Categorizes wallets into DEX Bots, Consistent Scalpers, Windfall Winners, or Degen Traders with a 0-100 consistency score.
                </p>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 space-y-3 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
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
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <WalletProfilerPage />
    </Suspense>
  );
}
