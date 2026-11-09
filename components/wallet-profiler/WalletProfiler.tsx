"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  Filter,
  ShieldCheck,
  Zap,
  Flame,
  Bot,
  Coins,
  Gauge,
  Timer,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/shared/Sidebar";
import {
  PersonaTag,
  TokenChange,
  TokenPnlEntry,
  AnalyzedTransaction,
  WalletProfileData,
  SortField,
  SortOrder,
  TimeFrame,
} from "@/types";
import {
  truncate,
  formatRelativeTime,
  formatTokenAmount,
  SAMPLE_WALLETS_SOL,
  SAMPLE_WALLETS_ETH,
  PAGE_SIZE,
  TIME_FRAME_OPTIONS,
} from "@/lib";

function formatCrypto(amount: number, symbol: string): string {
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toFixed(4)} ${symbol}`;
}

function getPersonaBadge(persona: PersonaTag) {
  switch (persona) {
    case "Consistent Scalper":
      return {
        label: "Consistent Scalper",
        desc: "High win rate across frequent, low-variance trades. Exhibits high execution discipline.",
        icon: Zap,
        badgeStyle: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
      };
    case "Windfall Winner":
      return {
        label: "Windfall Winner",
        desc: "Profits are heavily concentrated in 1-2 jackpot outlier trades. High variance profile.",
        icon: Flame,
        badgeStyle: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
      };
    case "DEX Arbitrage / Bot":
      return {
        label: "DEX Arbitrage / Bot",
        desc: "Sub-second execution patterns with high transaction frequency and balanced flow.",
        icon: Bot,
        badgeStyle: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
      };
    case "Degen Trader":
      return {
        label: "Degen Trader",
        desc: "High transaction volume with sub-40% win rate. Driven by high-frequency speculation.",
        icon: TrendingDown,
        badgeStyle: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
      };
    case "Whale / Diamond Hands":
      return {
        label: "Whale / Diamond Hands",
        desc: "Significant capital balance with low trade frequency and extended holding times.",
        icon: Wallet,
        badgeStyle: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
      };
    default:
      return {
        label: "Standard Wallet",
        desc: "Regular retail activity with standard win/loss distribution.",
        icon: Coins,
        badgeStyle: "bg-slate-800 text-slate-300 border border-slate-700",
      };
  }
}

interface WalletProfilerProps {
  chain: "solana" | "ethereum";
  hideSidebar?: boolean;
  onChainChange?: (chain: "solana" | "ethereum") => void;
}

export function WalletProfiler({ chain, hideSidebar = false, onChainChange }: WalletProfilerProps) {
  const isSolana = chain === "solana";
  const currencySymbol = isSolana ? "SOL" : "ETH";
  const sampleWallets = isSolana ? SAMPLE_WALLETS_SOL : SAMPLE_WALLETS_ETH;
  const explorerName = isSolana ? "Solscan" : "Etherscan";
  const explorerUrl = isSolana ? "https://solscan.io" : "https://etherscan.io";

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

  const handleAnalyze = useCallback(
    async (targetAddress: string) => {
      const cleaned = targetAddress.trim();
      if (!cleaned) {
        setError(`Please enter a ${isSolana ? "Solana" : "Ethereum"} wallet address.`);
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setTimeFrame("all");

      const endpoint = isSolana ? `/api/wallet/${cleaned}` : `/api/wallet/ethereum/${cleaned}`;

      try {
        const response = await fetch(endpoint);
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
    },
    [isSolana]
  );

  // Automatically analyze the primary representative wallet upon mount or chain switch
  useEffect(() => {
    const defaultAddress = isSolana
      ? "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
      : "0xE592427A0AEce92De3Edee1F18E0157C05861564";

    setAddressInput(defaultAddress);
    handleAnalyze(defaultAddress);
  }, [isSolana, handleAnalyze]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyze(addressInput);
  };

  const handleCopy = (text: string, isAddr = false) => {
    navigator.clipboard.writeText(text);
    if (isAddr) {
      setCopiedAddress(true);
      setToastMessage(`Address copied: ${truncate(text, 6, 6)}`);
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
    const totalRealized = txs.reduce((sum, tx) => sum + tx.solChange, 0);
    const winRate = txs.length > 0 ? (wins.length / (wins.length + losses.length || 1)) * 100 : 0;

    return {
      txs,
      winsCount: wins.length,
      lossesCount: losses.length,
      neutralCount: neutral.length,
      totalRealized,
      winRate,
    };
  }, [data, timeFrame, clientNowMs]);

  const displayedTransactions = useMemo(() => {
    let list = [...filteredStats.txs];

    if (filterType === "wins") list = list.filter((tx) => tx.solChange > 0);
    else if (filterType === "losses") list = list.filter((tx) => tx.solChange < 0);
    else if (filterType === "neutral") list = list.filter((tx) => tx.solChange === 0);

    list.sort((a, b) => {
      let comp = 0;
      if (sortField === "date") {
        const timeA = a.blockTime ?? (a.timestamp ? new Date(a.timestamp).getTime() / 1000 : 0);
        const timeB = b.blockTime ?? (b.timestamp ? new Date(b.timestamp).getTime() / 1000 : 0);
        comp = timeA - timeB;
      } else if (sortField === "delta") {
        comp = a.solChange - b.solChange;
      } else if (sortField === "fee") {
        comp = a.feeSol - b.feeSol;
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return list;
  }, [filteredStats.txs, filterType, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(displayedTransactions.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayedTransactions.slice(start, start + PAGE_SIZE);
  }, [displayedTransactions, currentPage]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const headers = ["Signature", "BlockTime", "Status", `NetDelta_${currencySymbol}`, `Fee_${currencySymbol}`];
    const rows = displayedTransactions.map((tx) => [
      tx.signature,
      tx.timestamp || tx.blockTime || "",
      tx.status,
      tx.solChange,
      tx.feeSol,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ChainScope_${chain}_${data.address.slice(0, 8)}_transactions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const personaInfo = data ? getPersonaBadge(data.personaTag) : null;
  const PersonaIcon = personaInfo?.icon;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#080D1A] text-slate-100 selection:bg-blue-600/30 selection:text-blue-200">
      {/* ChainScope Sidebar Navigation (From Pic 1) */}
      {!hideSidebar && <Sidebar currentModule={chain} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-[#0F172A] border border-blue-500/40 text-blue-300 shadow-2xl backdrop-blur-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Breadcrumb & Status */}
        <header className="border-b border-slate-800/80 bg-[#0A0F1D]/80 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          {/* Left: breadcrumb */}
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                isSolana
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
              }`}
            >
              {isSolana ? <Activity className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm min-w-0">
              <span className="text-slate-400 shrink-0">Modules</span>
              <span className="text-slate-600 shrink-0">/</span>
              <span className="font-bold text-white truncate">Wallet Performance</span>
            </div>
          </div>

          {/* Center: Solana / Ethereum chain switcher pills */}
          <div className="flex items-center bg-slate-900/70 border border-slate-800 rounded-xl p-1 gap-1 shrink-0">
            {onChainChange ? (
              <>
                <button
                  type="button"
                  onClick={() => onChainChange("solana")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSolana
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Solana Mainnet
                </button>
                <button
                  type="button"
                  onClick={() => onChainChange("ethereum")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isSolana
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Ethereum Mainnet
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/solana"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSolana
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Solana Mainnet
                </Link>
                <Link
                  href="/ethereum"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    !isSolana
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Ethereum Mainnet
                </Link>
              </>
            )}
          </div>

          {/* Right: live status badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Mainnet JSON-RPC</span>
          </div>
        </header>

        {/* Main Dashboard Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Hero & Search Bar Section */}
          <section className="text-center max-w-3xl mx-auto space-y-4">
            <div
              className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-medium border ${
                isSolana
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ChainScope {isSolana ? "Solana" : "Ethereum"} On-Chain Intelligence</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {isSolana ? "Solana" : "Ethereum"} Wallet{" "}
              <span
                className={`bg-gradient-to-r bg-clip-text text-transparent ${
                  isSolana ? "from-purple-400 via-indigo-300 to-cyan-400" : "from-blue-400 via-cyan-300 to-teal-400"
                }`}
              >
                Performance Profiler
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
              Inspect any {isSolana ? "Solana" : "Ethereum"} wallet to evaluate realized {currencySymbol} PnL, win rates,
              consistency scoring, holding duration analysis, and automated persona behavior tags.
            </p>

            {/* Search Input Form */}
            <form id="wallet-search-form" onSubmit={handleSubmit} className="pt-2">
              <div className="relative flex items-center bg-[#0F172A]/80 border border-slate-800 shadow-2xl rounded-2xl p-2 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                <div className="pl-2 pointer-events-none text-slate-400">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  id="wallet-address-input"
                  type="text"
                  placeholder={
                    isSolana
                      ? "Enter Solana wallet address (e.g. 5Q544fKr...)"
                      : "Enter Ethereum wallet address (e.g. 0xd8dA6B...)"
                  }
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm sm:text-base placeholder-slate-500 text-white focus:outline-none font-mono"
                  disabled={loading}
                />
                <button
                  id="analyze-btn"
                  type="submit"
                  disabled={loading || !addressInput.trim()}
                  className={`inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap active:scale-[0.98] ${
                    isSolana
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30"
                      : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-600/30"
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Analyze {isSolana ? "Solana" : "Ethereum"}</span>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Select Sample Wallets */}
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-medium mr-1">Quick Select:</span>
              {sampleWallets.map((sample) => (
                <button
                  key={sample.address}
                  type="button"
                  onClick={() => {
                    setAddressInput(sample.address);
                    handleAnalyze(sample.address);
                  }}
                  className="bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span className={isSolana ? "text-purple-400 font-medium" : "text-blue-400 font-medium"}>
                    {sample.label}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({truncate(sample.address, 3, 3)})
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Error Message */}
          {error && (
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Analysis Failed</p>
                <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Skeleton Loading State */}
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
                ))}
              </div>
              <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800" />
            </div>
          )}

          {/* Loaded Profile View */}
          {data && !loading && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Wallet Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0F172A]/70 border border-slate-800 shadow-xl backdrop-blur-xl">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                    <span>Analyzed {isSolana ? "Solana" : "Ethereum"} Wallet</span>
                    <span>•</span>
                    <span className="text-slate-500">
                      {data.totalTransactions} transactions ingested
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-lg sm:text-xl font-bold text-white tracking-tight break-all">
                      {data.address}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(data.address, true)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Address"
                    >
                      {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={
                        isSolana
                          ? `https://solscan.io/account/${data.address}`
                          : `https://etherscan.io/address/${data.address}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={`Open on ${explorerName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Persona Badge */}
                {personaInfo && PersonaIcon && (
                  <div className="flex items-center space-x-3 self-start md:self-auto">
                    <div className={`px-4 py-2.5 rounded-2xl flex items-center space-x-2.5 text-xs font-semibold ${personaInfo.badgeStyle}`}>
                      <PersonaIcon className="w-4 h-4" />
                      <span>{personaInfo.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeframe Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Timeframe Filter:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_FRAME_OPTIONS.map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeFrame(tf.key)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        timeFrame === tf.key
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Realized PnL */}
                <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Realized Net PnL</span>
                    {filteredStats.totalRealized >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                      filteredStats.totalRealized >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCrypto(filteredStats.totalRealized, currencySymbol)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Calculated over {filteredStats.txs.length} transactions
                  </div>
                </div>

                {/* Metric 2: Win Rate */}
                <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Win Rate</span>
                    <Gauge className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                    {filteredStats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <span className="text-emerald-400">{filteredStats.winsCount} Wins</span>
                    <span>/</span>
                    <span className="text-rose-400">{filteredStats.lossesCount} Losses</span>
                  </div>
                </div>

                {/* Metric 3: Consistency Score */}
                <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Consistency Score</span>
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-semibold cursor-pointer underline flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Info</span>
                    </button>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                    {data.consistencyScore}
                    <span className="text-sm text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Execution discipline index
                  </div>
                </div>

                {/* Metric 4: Trade Frequency & Duration */}
                <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Trade Velocity</span>
                    <Timer className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                    {data.tradeFrequencyPerDay}
                    <span className="text-xs text-slate-400 font-normal ml-1">tx/day</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Avg Holding: {data.avgHoldingDurationHours}h
                  </div>
                </div>
              </div>

              {/* Transactions Table Section */}
              <div className="rounded-3xl bg-[#0F172A]/70 border border-slate-800 shadow-xl overflow-hidden space-y-4 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="space-y-1">
                    <h2 className="font-bold text-lg text-white">Recent Verified Transactions</h2>
                    <p className="text-xs text-slate-400">
                      Parsed on-chain balance deltas directly via Alchemy JSON-RPC
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Filter buttons */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                      <button
                        onClick={() => {
                          setFilterType("all");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          filterType === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setFilterType("wins");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          filterType === "wins" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Wins
                      </button>
                      <button
                        onClick={() => {
                          setFilterType("losses");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          filterType === "losses" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Losses
                      </button>
                    </div>

                    {/* Export CSV button */}
                    <button
                      onClick={exportCsv}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">Transaction / Hash</th>
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-white"
                          onClick={() => handleSortToggle("date")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Time</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="py-3 px-3">Status</th>
                        <th
                          className="py-3 px-3 text-right cursor-pointer hover:text-white"
                          onClick={() => handleSortToggle("delta")}
                        >
                          <div className="flex items-center justify-end space-x-1">
                            <span>Net Flow ({currencySymbol})</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 text-right cursor-pointer hover:text-white"
                          onClick={() => handleSortToggle("fee")}
                        >
                          <div className="flex items-center justify-end space-x-1">
                            <span>Fee</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="py-3 px-3 text-right">Explorer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {paginatedTransactions.map((tx, idx) => (
                        <tr
                          key={`${tx.signature}-${tx.slot ?? "tx"}-${idx}`}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white">
                                {truncate(tx.signature, 6, 6)}
                              </span>
                              <button
                                onClick={() => handleCopy(tx.signature)}
                                className="text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {copiedSig === tx.signature ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {tx.tokenChanges && tx.tokenChanges.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 font-sans">
                                {tx.tokenChanges.map((tc, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono"
                                  >
                                    {tc.delta > 0 ? "+" : ""}
                                    {formatTokenAmount(tc.delta)} {tc.symbol}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-sans text-slate-400">
                            {formatRelativeTime(tx.timestamp, tx.blockTime, clientNowMs)}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans ${
                                tx.status === "success"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={`font-bold ${
                                tx.solChange > 0
                                  ? "text-emerald-400"
                                  : tx.solChange < 0
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {formatCrypto(tx.solChange, currencySymbol)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-400">
                            {tx.feeSol.toFixed(5)}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <a
                              href={
                                isSolana
                                  ? `https://solscan.io/tx/${tx.signature}`
                                  : `https://etherscan.io/tx/${tx.signature}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <div>
                    Page {currentPage} of {totalPages} ({displayedTransactions.length} items)
                  </div>
                  <div className="flex space-x-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Institutional Feature Highlights (Landing info cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Real-Time Ingestion</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct RPC connection to Alchemy {isSolana ? "Solana" : "Ethereum"} Mainnet nodes for sub-second balance delta computation.
              </p>
            </div>

            <div className="bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Consistency Scoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                0-100 execution discipline metric differentiating repeatable edge from high-variance lottery wins.
              </p>
            </div>

            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="block bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-emerald-500/40 transition-all space-y-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                {explorerName} On-Chain Proof
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-click deep links to {explorerName} for every signature and address, enabling instant verification.
              </p>
              <span className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-1 pt-1">
                Open {explorerName} Explorer ↗
              </span>
            </a>
          </div>

          {/* Consistency Explainer Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-white text-base">Consistency & Persona Scoring</h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg"
                  >
                    ×
                  </button>
                </div>

                <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                  <p>
                    The <strong>Consistency Score (0-100)</strong> evaluates execution discipline using transaction frequency, win rate variance, and holding duration.
                  </p>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-slate-300">
                    <div className="font-semibold text-white">Persona Categories:</div>
                    <div>• <strong>Consistent Scalper:</strong> Win rate ≥ 65% across 15+ trades</div>
                    <div>• <strong>Windfall Winner:</strong> &gt;60% of profits come from 1-2 jackpot outlier trades</div>
                    <div>• <strong>DEX Arbitrage / Bot:</strong> High frequency (&gt;50/day) sub-second execution</div>
                    <div>• <strong>Degen Trader:</strong> High turnover with sub-40% win rates</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition-colors"
                  >
                    Close Explainer
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#0A0F1D] py-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>ChainScope • Intelligent Blockchain Trading and Wallet Analytics Platform</span>
            <span>Powered by Alchemy Mainnet JSON-RPC</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
