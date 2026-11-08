"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Activity,
  Flame,
  Bell,
  BellOff,
  Download,
  Filter,
  Check,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers,
  Radio,
  Zap,
  Play,
  RotateCcw,
} from "lucide-react";
import { Sidebar } from "./Sidebar";

// --- Types & Interfaces ---

export interface WatchedEntity {
  id: string;
  address: string;
  label: string;
  minThreshold: number;
  tokens: string[];
  eventTypes: string[];
  createdAt: number;
}

export interface WhaleSignal {
  id: string;
  eventType: "SWAP" | "TRANSFER" | "POOL";
  entityLabel: string;
  address: string;
  token: string;
  amountUsd: number;
  tokenAmount: string;
  txHash: string;
  timestamp: number;
  isRead: boolean;
}

interface AssetInfo {
  name: string;
  basePrice: number;
  decimals: number;
  change24h: number;
  vol24h: string;
  high24h: number;
  low24h: number;
  badge: string;
}

const ASSET_REGISTRY: Record<string, AssetInfo> = {
  USDT: {
    name: "Tether USD (USDT / USD)",
    basePrice: 0.9933,
    decimals: 4,
    change24h: 0.12,
    vol24h: "$42.8M",
    high24h: 0.9934,
    low24h: 0.9919,
    badge: "USDT/USD",
  },
  WETH: {
    name: "Wrapped Ether (WETH / USD)",
    basePrice: 2784.95,
    decimals: 2,
    change24h: 1.85,
    vol24h: "$1.42B",
    high24h: 2815.0,
    low24h: 2730.0,
    badge: "WETH/USD",
  },
  USDC: {
    name: "USD Coin (USDC / USD)",
    basePrice: 1.0,
    decimals: 4,
    change24h: 0.01,
    vol24h: "$28.1M",
    high24h: 1.0002,
    low24h: 0.9998,
    badge: "USDC/USD",
  },
  BTC: {
    name: "Bitcoin (BTC / USD)",
    basePrice: 96423.3,
    decimals: 2,
    change24h: 3.42,
    vol24h: "$3.89B",
    high24h: 97100.0,
    low24h: 94800.0,
    badge: "BTC/USD",
  },
  SOL: {
    name: "Solana (SOL / USD)",
    basePrice: 184.68,
    decimals: 2,
    change24h: -0.45,
    vol24h: "$820M",
    high24h: 189.5,
    low24h: 182.2,
    badge: "SOL/USD",
  },
  BNB: {
    name: "Binance Coin (BNB / USD)",
    basePrice: 642.18,
    decimals: 2,
    change24h: 0.95,
    vol24h: "$310M",
    high24h: 649.0,
    low24h: 635.0,
    badge: "BNB/USD",
  },
  COIN: {
    name: "Coinbase Global Inc (COIN / USD)",
    basePrice: 286.4,
    decimals: 2,
    change24h: 2.15,
    vol24h: "$195M",
    high24h: 291.0,
    low24h: 281.5,
    badge: "COIN/USD",
  },
  NVDA: {
    name: "NVIDIA Corp (NVDA / USD)",
    basePrice: 146.5,
    decimals: 2,
    change24h: 1.64,
    vol24h: "$4.2B",
    high24h: 148.2,
    low24h: 144.1,
    badge: "NVDA/USD",
  },
  SPY: {
    name: "S&P 500 ETF (SPY / USD)",
    basePrice: 598.2,
    decimals: 2,
    change24h: 0.48,
    vol24h: "$22.4B",
    high24h: 600.1,
    low24h: 596.5,
    badge: "SPY/USD",
  },
  DXY: {
    name: "US Dollar Index (DXY)",
    basePrice: 184.25,
    decimals: 2,
    change24h: 0.12,
    vol24h: "$14.1B",
    high24h: 184.6,
    low24h: 183.9,
    badge: "DXY/USD",
  },
};

const INITIAL_WATCHED_ENTITIES: WatchedEntity[] = [
  {
    id: "w-1",
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    label: "Binance 14 Hot Wallet",
    minThreshold: 50000,
    tokens: ["USDC", "WETH", "USDT"],
    eventTypes: ["SWAP", "TRANSFER"],
    createdAt: Date.now() - 86400000,
  },
  {
    id: "w-2",
    address: "0x00000000ae347930bd1e7b0f35588b92280f9e75",
    label: "Wintermute Institutional MM",
    minThreshold: 100000,
    tokens: ["WETH", "USDC", "WBTC"],
    eventTypes: ["SWAP", "POOL"],
    createdAt: Date.now() - 172800000,
  },
];

const INITIAL_SIGNALS: WhaleSignal[] = [
  {
    id: "sig-1",
    eventType: "TRANSFER",
    entityLabel: "Wintermute Institutional MM",
    address: "0x00000000ae347930bd1e7b0f35588b92280f9e75",
    token: "WETH",
    amountUsd: 500000,
    tokenAmount: "179.53 WETH",
    txHash: "0x1a179b47cfbc8d21b023f993189a6472d82bbff08",
    timestamp: Date.now() - 45000,
    isRead: false,
  },
  {
    id: "sig-2",
    eventType: "SWAP",
    entityLabel: "Binance 14 Hot Wallet",
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    token: "USDC",
    amountUsd: 250000,
    tokenAmount: "250,000 USDC",
    txHash: "0x89e248b94cc6f131109a908a8a2bc45012ab6488",
    timestamp: Date.now() - 130000,
    isRead: false,
  },
  {
    id: "sig-3",
    eventType: "SWAP",
    entityLabel: "Wintermute Institutional MM",
    address: "0x00000000ae347930bd1e7b0f35588b92280f9e75",
    token: "USDT",
    amountUsd: 120000,
    tokenAmount: "120,000 USDT",
    txHash: "0x44c9a0129bc8d011287e009a25b29384bbad3efd",
    timestamp: Date.now() - 250000,
    isRead: false,
  },
  {
    id: "sig-4",
    eventType: "TRANSFER",
    entityLabel: "Binance 14 Hot Wallet",
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    token: "ETH",
    amountUsd: 95000,
    tokenAmount: "34.11 ETH",
    txHash: "0x992384a8bc12a0f8892300b1a09424c88319f012",
    timestamp: Date.now() - 410000,
    isRead: false,
  },
  {
    id: "sig-5",
    eventType: "POOL",
    entityLabel: "Genesis Creditor Cluster",
    address: "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
    token: "USDC",
    amountUsd: 75000,
    tokenAmount: "75,000 USDC",
    txHash: "0x12bb944cf9983190ab776109923a483bc0192837",
    timestamp: Date.now() - 620000,
    isRead: false,
  },
  {
    id: "sig-6",
    eventType: "SWAP",
    entityLabel: "Jump Trading Arbitrage",
    address: "0x9812984bbcf2837108924bcf89129482b8849102",
    token: "MINI",
    amountUsd: 1250000,
    tokenAmount: "12,500,000 MINI",
    txHash: "0x77bc1290bbfa8830192a83bc1029482a0b12948a",
    timestamp: Date.now() - 950000,
    isRead: false,
  },
  {
    id: "sig-7",
    eventType: "TRANSFER",
    entityLabel: "Binance 14 Hot Wallet",
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    token: "WETH",
    amountUsd: 83277,
    tokenAmount: "29.89 WETH",
    txHash: "0x00938472910abbce129840192384712039481234",
    timestamp: Date.now() - 1450000,
    isRead: false,
  },
  {
    id: "sig-8",
    eventType: "SWAP",
    entityLabel: "Wintermute Institutional MM",
    address: "0x00000000ae347930bd1e7b0f35588b92280f9e75",
    token: "WBTC",
    amountUsd: 250000,
    tokenAmount: "2.59 WBTC",
    txHash: "0x330948102948bbca102948102948102948120498",
    timestamp: Date.now() - 2100000,
    isRead: false,
  },
];

// Helper to format currency
function formatUsd(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("en-US");
}

function truncate(str: string, lead = 6, tail = 4): string {
  if (!str) return "";
  if (str.length <= lead + tail) return str;
  return `${str.slice(0, lead)}...${str.slice(-tail)}`;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Synthesizer chime sound using Web Audio API (Zero external assets required)
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context prevented or unavailable
  }
}

export function WalletWatchDashboard() {
  // Global Market Ticker & Header State
  const [activeAsset, setActiveAsset] = useState<string>("USDT");
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [symbolInput, setSymbolInput] = useState<string>("");
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);
  const [simModalOpen, setSimModalOpen] = useState<boolean>(false);

  // Entities & Signals State
  const [entities, setEntities] = useState<WatchedEntity[]>(INITIAL_WATCHED_ENTITIES);
  const [signals, setSignals] = useState<WhaleSignal[]>(INITIAL_SIGNALS);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [walletFilter, setWalletFilter] = useState<string>("ALL");

  // Form State for "Add Watched Whale Entity"
  const [formAddress, setFormAddress] = useState<string>("");
  const [formLabel, setFormLabel] = useState<string>("");
  const [formThreshold, setFormThreshold] = useState<number>(50000);
  const [formTokens, setFormTokens] = useState<string[]>(["USDC", "WETH"]);
  const [formEvents, setFormEvents] = useState<string[]>(["SWAP", "TRANSFER"]);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Simulator Form State
  const [simAsset, setSimAsset] = useState<string>("WETH");
  const [simAmount, setSimAmount] = useState<number>(185000);
  const [simType, setSimType] = useState<"SWAP" | "TRANSFER" | "POOL">("SWAP");

  // Canvas Ref for Interactive Candlestick Chart
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    vol: number;
    time: string;
    ema: number;
  } | null>(null);

  // Unread signals count
  const unreadCount = useMemo(() => {
    return signals.filter((s) => !s.isRead).length;
  }, [signals]);

  // Macro-level Whale Radar Metrics
  const totalMonitoredCapital = useMemo(() => {
    const sum = signals.reduce((acc, s) => acc + s.amountUsd, 0);
    return Math.max(2298277, sum);
  }, [signals]);

  const peakMovement = useMemo(() => {
    let peak = { amount: 500000, asset: "WETH" };
    for (const s of signals) {
      if (s.amountUsd >= peak.amount) {
        peak = { amount: s.amountUsd, asset: s.token };
      }
    }
    return peak;
  }, [signals]);

  // Current Asset Data
  const currentAsset = ASSET_REGISTRY[activeAsset] || ASSET_REGISTRY["USDT"];

  // Filtered Signals for Live Tape
  const displayedSignals = useMemo(() => {
    return signals.filter((s) => {
      if (unreadOnly && s.isRead) return false;
      if (walletFilter !== "ALL" && s.address.toLowerCase() !== walletFilter.toLowerCase()) return false;
      return true;
    });
  }, [signals, unreadOnly, walletFilter]);

  // Handle Mark All Read
  const handleMarkAllRead = () => {
    setSignals((prev) => prev.map((s) => ({ ...s, isRead: true })));
  };

  // Toggle single signal read state
  const handleToggleRead = (id: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isRead: !s.isRead } : s))
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Timestamp", "EventType", "EntityLabel", "Address", "Token", "AmountUSD", "TokenAmount", "TxHash", "IsRead"];
    const rows = displayedSignals.map((s) => [
      new Date(s.timestamp).toISOString(),
      s.eventType,
      `"${s.entityLabel}"`,
      s.address,
      s.token,
      s.amountUsd,
      `"${s.tokenAmount}"`,
      s.txHash,
      s.isRead ? "YES" : "NO",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `walletwatch_whale_tape_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayedSignals, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `walletwatch_whale_tape_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Add Entity Form Submit
  const handleAddEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddress.trim().startsWith("0x")) {
      alert("Please enter a valid 0x EVM wallet or contract address.");
      return;
    }
    const newEnt: WatchedEntity = {
      id: "w-" + Date.now(),
      address: formAddress.trim(),
      label: formLabel.trim() || "Institutional Entity",
      minThreshold: formThreshold,
      tokens: formTokens.length ? formTokens : ["USDC"],
      eventTypes: formEvents.length ? formEvents : ["SWAP"],
      createdAt: Date.now(),
    };
    setEntities((prev) => [newEnt, ...prev]);
    setFormAddress("");
    setFormLabel("");
    setFormSuccess(`Added "${newEnt.label}" to Whale Radar watchlist.`);
    setTimeout(() => setFormSuccess(null), 3000);
  };

  // Remove Entity
  const handleRemoveEntity = (id: string) => {
    setEntities((prev) => prev.filter((e) => e.id !== id));
  };

  // Handle Simulator Trigger
  const handleTriggerSim = () => {
    const newSig: WhaleSignal = {
      id: "sim-" + Date.now(),
      eventType: simType,
      entityLabel: "Wintermute Institutional MM",
      address: "0x00000000ae347930bd1e7b0f35588b92280f9e75",
      token: simAsset,
      amountUsd: simAmount,
      tokenAmount: `${(simAmount / (ASSET_REGISTRY[simAsset]?.basePrice || 1)).toFixed(2)} ${simAsset}`,
      txHash: `0x${Math.random().toString(16).slice(2).padEnd(40, "f")}`,
      timestamp: Date.now(),
      isRead: false,
    };
    setSignals((prev) => [newSig, ...prev]);
    if (chimeEnabled) playChime();
    setSimModalOpen(false);
  };

  // Generate Candlestick Data for Active Asset
  const candleData = useMemo(() => {
    const candles: {
      time: string;
      open: number;
      high: number;
      low: number;
      close: number;
      vol: number;
      ema: number;
    }[] = [];

    const base = currentAsset.basePrice;
    const vola = base * 0.0035;
    let current = base * 0.994;
    const totalBars = 36;
    let ema = current;

    for (let i = 0; i < totalBars; i++) {
      const delta = (Math.sin(i * 0.5) + (Math.random() - 0.48)) * vola;
      const open = current;
      const close = open + delta;
      const high = Math.max(open, close) + Math.random() * vola * 0.8;
      const low = Math.min(open, close) - Math.random() * vola * 0.8;
      const vol = Math.floor(Math.random() * 850 + 150);

      // EMA 28 approximation smoothing
      const k = 2 / (28 + 1);
      ema = close * k + ema * (1 - k);

      current = close;
      const minsAgo = (totalBars - i) * (timeframe === "1m" ? 1 : timeframe === "5m" ? 5 : 15);
      const d = new Date(Date.now() - minsAgo * 60000);
      const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

      candles.push({
        time: timeStr,
        open: Number(open.toFixed(currentAsset.decimals)),
        high: Number(high.toFixed(currentAsset.decimals)),
        low: Number(low.toFixed(currentAsset.decimals)),
        close: Number(close.toFixed(currentAsset.decimals)),
        vol,
        ema: Number(ema.toFixed(currentAsset.decimals)),
      });
    }

    return candles;
  }, [currentAsset, timeframe]);

  // Draw Candlestick Canvas
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (candleData.length === 0) return;

    // Determine min and max prices
    let minP = Math.min(...candleData.map((c) => c.low));
    let maxP = Math.max(...candleData.map((c) => c.high));
    const pad = (maxP - minP) * 0.1 || 1;
    minP -= pad;
    maxP += pad;

    const chartHeight = height - 60; // Leave 60px for volume histogram & labels
    const maxVol = Math.max(...candleData.map((c) => c.vol)) || 1;

    // Draw horizontal grid lines
    ctx.strokeStyle = "rgba(43, 34, 76, 0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (chartHeight / 4) * i + 10;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 50, y);
      ctx.stroke();

      // Price labels
      const priceVal = maxP - ((maxP - minP) / 4) * i;
      ctx.fillStyle = "#8b7ca8";
      ctx.font = "10px monospace";
      ctx.fillText(priceVal.toFixed(currentAsset.decimals), width - 45, y + 3);
    }

    // Candle layout
    const barSpacing = (width - 90) / candleData.length;
    const barWidth = Math.max(3, barSpacing * 0.65);

    // Draw EMA28 Line
    ctx.beginPath();
    ctx.strokeStyle = "#38bdf8"; // Cyber Cyan EMA line
    ctx.lineWidth = 2;
    candleData.forEach((c, idx) => {
      const x = 50 + idx * barSpacing + barWidth / 2;
      const y = 10 + ((maxP - c.ema) / (maxP - minP)) * (chartHeight - 20);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Candles & Volume Bars
    candleData.forEach((c, idx) => {
      const x = 50 + idx * barSpacing;
      const isBull = c.close >= c.open;
      const candleColor = isBull ? "#10b981" : "#f43f5e"; // Green / Red

      const yOpen = 10 + ((maxP - c.open) / (maxP - minP)) * (chartHeight - 20);
      const yClose = 10 + ((maxP - c.close) / (maxP - minP)) * (chartHeight - 20);
      const yHigh = 10 + ((maxP - c.high) / (maxP - minP)) * (chartHeight - 20);
      const yLow = 10 + ((maxP - c.low) / (maxP - minP)) * (chartHeight - 20);

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + barWidth / 2, yHigh);
      ctx.lineTo(x + barWidth / 2, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = candleColor;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x, bodyTop, barWidth, bodyHeight);

      // Volume histogram bar (bottom 40px)
      const volHeight = (c.vol / maxVol) * 35;
      const volY = height - 20 - volHeight;
      ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)";
      ctx.fillRect(x, volY, barWidth, volHeight);

      // Time axis labels for every 6th bar
      if (idx % 6 === 0) {
        ctx.fillStyle = "#8b7ca8";
        ctx.font = "10px sans-serif";
        ctx.fillText(c.time, x, height - 5);
      }
    });

    // Last Price Pulse Line
    const last = candleData[candleData.length - 1];
    if (last) {
      const lastY = 10 + ((maxP - last.close) / (maxP - minP)) * (chartHeight - 20);
      ctx.strokeStyle = last.close >= last.open ? "rgba(16, 185, 129, 0.6)" : "rgba(244, 63, 94, 0.6)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(50, lastY);
      ctx.lineTo(width - 50, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge on right axis
      ctx.fillStyle = last.close >= last.open ? "#10b981" : "#f43f5e";
      ctx.fillRect(width - 50, lastY - 9, 48, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.fillText(last.close.toFixed(currentAsset.decimals), width - 46, lastY + 4);
    }
  }, [candleData, currentAsset]);

  // Redraw on canvas size change
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Handle Canvas Mousemove (Crosshair & Tooltip)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = canvas.width;
    const barSpacing = (width - 90) / candleData.length;
    const idx = Math.floor((mouseX - 50) / barSpacing);

    if (idx >= 0 && idx < candleData.length) {
      setHoveredCandle(candleData[idx]);
    } else {
      setHoveredCandle(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#080D1A] text-slate-100 selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* ChainScope Navigation Sidebar */}
      <Sidebar currentModule="walletwatch" />

      {/* Main WalletWatch Pro Trading Terminal Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* =========================================================================
            FEATURE 1: GLOBAL LIVE MARKET TICKER BAR (Top Bar Header)
           ========================================================================= */}
        <header className="sticky top-0 z-40 bg-[#090713]/95 backdrop-blur-xl border-b border-purple-900/40 text-xs px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
          
          {/* Live Feeds Section */}
          <div className="flex items-center space-x-4 overflow-x-auto w-full md:w-auto py-1 font-mono">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold uppercase text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
              <span>LIVE RADAR</span>
            </div>

            {/* BTC/USD */}
            <button
              onClick={() => setActiveAsset("BTC")}
              className="flex items-center space-x-1 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <span className="text-slate-400 font-semibold">BTC/USD</span>
              <span className="text-white font-bold">$96,423.30</span>
              <span className="text-emerald-400 font-bold">+3.42%</span>
            </button>

            {/* ETH/USD */}
            <button
              onClick={() => setActiveAsset("WETH")}
              className="flex items-center space-x-1 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <span className="text-slate-400 font-semibold">ETH/USD</span>
              <span className="text-white font-bold">$2,784.95</span>
              <span className="text-emerald-400 font-bold">+1.85%</span>
            </button>

            {/* SOL/USD */}
            <button
              onClick={() => setActiveAsset("SOL")}
              className="flex items-center space-x-1 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <span className="text-slate-400 font-semibold">SOL/USD</span>
              <span className="text-white font-bold">$184.68</span>
              <span className="text-rose-400 font-bold">-0.45%</span>
            </button>

            {/* BNB/USD */}
            <button
              onClick={() => setActiveAsset("BNB")}
              className="flex items-center space-x-1 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <span className="text-slate-400 font-semibold">BNB/USD</span>
              <span className="text-white font-bold">$642.18</span>
              <span className="text-emerald-400 font-bold">+0.95%</span>
            </button>

            {/* DXY */}
            <button
              onClick={() => setActiveAsset("DXY")}
              className="flex items-center space-x-1 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <span className="text-slate-400 font-semibold">DXY</span>
              <span className="text-white font-bold">184.25</span>
              <span className="text-emerald-400 font-bold">+0.12%</span>
            </button>
          </div>

          {/* Status Controls & Action Badges */}
          <div className="flex items-center space-x-3 text-xs shrink-0 self-end md:self-auto">
            {/* Real-Time Gas Metric */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              <Flame className="w-3.5 h-3.5" />
              <span>Gas 12 Gwei Optimal</span>
            </div>

            {/* Polling Node Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-[11px]">Node Active - 4s Polling</span>
            </div>

            {/* Alert Chime Toggle */}
            <button
              onClick={() => {
                setChimeEnabled(!chimeEnabled);
                if (!chimeEnabled) playChime();
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                chimeEnabled
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-900 text-slate-500 border-slate-800"
              }`}
              title={chimeEnabled ? "Chime Mute" : "Chime Enable"}
            >
              {chimeEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>

            {/* Simulator Sandbox Button */}
            <button
              onClick={() => setSimModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulator Sandbox</span>
            </button>

            {/* Unread Signals Counter Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold font-mono">
              <span>Unread Signals:</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[11px]">
                {unreadCount}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* =========================================================================
              FEATURE 2: HIGH-LEVEL WHALE RADAR METRIC CARDS (Top Hero Grid)
             ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Monitored Capital */}
            <div className="bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl backdrop-blur-xl hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Total Monitored Capital
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  NET INFLOW ▲
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                {formatUsd(totalMonitoredCapital)}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Cumulative tracked high-value transactions
              </p>
            </div>

            {/* Card 2: Whale Signals Triggered */}
            <div className="bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl backdrop-blur-xl hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Whale Signals Triggered
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  REAL-TIME
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {signals.length}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Unread signals: {unreadCount}
              </p>
            </div>

            {/* Card 3: Watched Whale Entities */}
            <div className="bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl backdrop-blur-xl hover:border-cyan-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Watched Whale Entities
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  ACTIVE RADAR
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 tracking-tight">
                {entities.length}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Institutional funds & smart money
              </p>
            </div>

            {/* Card 4: Peak Single Movement */}
            <div className="bg-[#0F172A]/70 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl backdrop-blur-xl hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Peak Single Movement
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  MEGA WHALE ★
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight">
                {formatUsd(peakMovement.amount)}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Asset: {peakMovement.asset}
              </p>
            </div>

          </div>

          {/* =========================================================================
              FEATURE 3: INTERACTIVE CANDLESTICK CHARTING TERMINAL (Main Center Workspace)
             ========================================================================= */}
          <div className="bg-[#0F172A]/70 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
            
            {/* Terminal Top Details Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono font-bold text-xs">
                    {currentAsset.badge}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {currentAsset.name}
                  </h2>
                </div>
                <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>Price: <b className="text-white">${currentAsset.basePrice}</b></span>
                  <span className={currentAsset.change24h >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {currentAsset.change24h >= 0 ? "+" : ""}{currentAsset.change24h}%
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>24h Vol: <b className="text-white">{currentAsset.vol24h}</b></span>
                  <span className="text-slate-600">|</span>
                  <span>24h High: <b className="text-white">${currentAsset.high24h}</b></span>
                  <span className="text-slate-600">|</span>
                  <span>24h Low: <b className="text-white">${currentAsset.low24h}</b></span>
                </div>
              </div>

              {/* Timeframe Selectors & Symbol Search */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Timeframes */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  {["1m", "5m", "15m", "1h", "4h", "1D"].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        timeframe === tf ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Symbol Search Bar */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                  <input
                    type="text"
                    placeholder="Symbol (e.g. TSLA)"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                    className="bg-transparent px-2.5 py-1 text-white focus:outline-none font-mono w-28 uppercase placeholder-slate-500"
                  />
                  <button
                    onClick={() => {
                      if (symbolInput && ASSET_REGISTRY[symbolInput]) {
                        setActiveAsset(symbolInput);
                        setSymbolInput("");
                      } else if (symbolInput) {
                        alert(`Symbol ${symbolInput} loaded in terminal view.`);
                        setSymbolInput("");
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition-colors cursor-pointer"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>

            {/* Multi-Asset Quick Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
              {["USDT", "WETH", "USDC", "BTC", "SOL", "COIN", "NVDA", "SPY", "DXY"].map((assetKey) => (
                <button
                  key={assetKey}
                  onClick={() => setActiveAsset(assetKey)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeAsset === assetKey
                      ? "bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm"
                      : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/80"
                  }`}
                >
                  {assetKey}
                </button>
              ))}
            </div>

            {/* Candlestick Chart Canvas Viewport */}
            <div className="relative w-full h-[340px] bg-[#07060c] rounded-2xl border border-slate-800 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={900}
                height={340}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoveredCandle(null)}
                className="w-full h-full block cursor-crosshair"
              />

              {/* Hover Crosshair Tooltip */}
              {hoveredCandle && (
                <div className="absolute top-3 left-4 bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-[11px] font-mono text-slate-200 shadow-xl pointer-events-none space-x-3 flex items-center">
                  <span>Time: <b className="text-white">{hoveredCandle.time}</b></span>
                  <span>O: <b className="text-white">${hoveredCandle.open}</b></span>
                  <span>H: <b className="text-emerald-400">${hoveredCandle.high}</b></span>
                  <span>L: <b className="text-rose-400">${hoveredCandle.low}</b></span>
                  <span>C: <b className="text-white">${hoveredCandle.close}</b></span>
                  <span>EMA28: <b className="text-cyan-400">${hoveredCandle.ema}</b></span>
                </div>
              )}

              {/* Watermark Branding */}
              <div className="absolute bottom-3 left-4 text-[10px] text-slate-600 font-mono pointer-events-none">
                ChainScope / Lightweight Terminal • EMA 28 Overlay Active
              </div>
            </div>

          </div>

          {/* Dual Column Layout: Form Panel (Left) & Real-Time Tape (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* =========================================================================
                FEATURE 4: "ADD WATCHED WHALE ENTITY" INPUT PANEL (Left Form Column - 5 Cols)
               ========================================================================= */}
            <div className="lg:col-span-5 bg-[#0F172A]/70 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Add Watched Whale Entity</h3>
                  <p className="text-xs text-slate-400">Configure alert rules & minimum movement triggers</p>
                </div>
              </div>

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddEntity} className="space-y-4 text-xs">
                {/* Address Input */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Wallet / Contract Address</label>
                  <input
                    type="text"
                    required
                    placeholder="0x... 42-char EVM Address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Entity Name / Label */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Entity Name / Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Binance Institutional #1 / Wintermute MM"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Alert Threshold (Min USD) & Quick Pills */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-300">Alert Threshold (Min USD)</label>
                    <span className="font-mono text-cyan-400 font-bold">{formatUsd(formThreshold)}</span>
                  </div>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[10000, 50000, 100000, 500000, 1000000].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setFormThreshold(th)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                          formThreshold === th
                            ? "bg-purple-600 text-white font-bold"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        {formatUsd(th)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset Whitelist Tag Pills */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Asset Whitelist</label>
                  <div className="flex flex-wrap gap-2">
                    {["USDC", "WETH", "USDT", "WBTC"].map((tok) => {
                      const selected = formTokens.includes(tok);
                      return (
                        <button
                          key={tok}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setFormTokens(formTokens.filter((t) => t !== tok));
                            } else {
                              setFormTokens([...formTokens, tok]);
                            }
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                            selected
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold"
                              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                          }`}
                        >
                          + {tok}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Event Type Checkboxes */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Event Types</label>
                  <div className="flex items-center space-x-4">
                    {[
                      { key: "SWAP", label: "⚡ Swaps" },
                      { key: "TRANSFER", label: "💸 Transfers" },
                      { key: "POOL", label: "💧 Pools" },
                    ].map((item) => {
                      const checked = formEvents.includes(item.key);
                      return (
                        <label key={item.key} className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setFormEvents([...formEvents, item.key]);
                              else setFormEvents(formEvents.filter((k) => k !== item.key));
                            }}
                            className="rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-900"
                          />
                          <span className="text-slate-300">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  → Start Tracking Entity
                </button>
              </form>

              {/* Current Tracked Entities List */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Tracked Entities</span>
                  <span className="text-cyan-400">{entities.length} Active</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {entities.map((e) => (
                    <div
                      key={e.id}
                      className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{e.label}</div>
                        <div className="font-mono text-[11px] text-slate-400">{truncate(e.address, 6, 6)}</div>
                        <div className="text-[10px] text-cyan-400">Min: {formatUsd(e.minThreshold)}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveEntity(e.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove from radar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* =========================================================================
                FEATURE 5: REAL-TIME WHALE ORDER STREAM (Live Tape - 7 Cols)
                FEATURE 6: QUICK ACTION CONTROLS & EXPORT TOOLS
               ========================================================================= */}
            <div className="lg:col-span-7 bg-[#0F172A]/70 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
              
              {/* Tape Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white text-base">
                      Real-Time Whale Order Stream (Live Tape)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    High-value on-chain movements filtered by whale threshold
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-mono font-semibold self-start sm:self-auto">
                  {signals.length} signals recorded
                </span>
              </div>

              {/* Quick Action Controls Toolbar (Feature 6) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                
                <div className="flex items-center space-x-3">
                  {/* Unread Only Checkbox */}
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={unreadOnly}
                      onChange={(e) => setUnreadOnly(e.target.checked)}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-900"
                    />
                    <span>Unread only</span>
                  </label>

                  {/* All Wallets Dropdown Filter */}
                  <select
                    value={walletFilter}
                    onChange={(e) => setWalletFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="ALL">All Wallets</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.address}>
                        {ent.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Mark All Read Button */}
                  <button
                    onClick={handleMarkAllRead}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    Mark All Read
                  </button>

                  {/* Export Tools */}
                  <button
                    onClick={handleExportCsv}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="Export as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>📊 CSV</span>
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="Export as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{} JSON</span>
                  </button>
                </div>

              </div>

              {/* Streaming Order Tape Items */}
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {displayedSignals.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No signals found matching current filter rules.
                  </div>
                ) : (
                  displayedSignals.map((sig) => {
                    return (
                      <div
                        key={sig.id}
                        onClick={() => handleToggleRead(sig.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          sig.isRead
                            ? "bg-slate-900/40 border-slate-800 hover:bg-slate-800/40"
                            : "bg-[#140e28]/80 border-purple-500/30 shadow-md shadow-purple-950/20 hover:border-purple-400/50"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Unread Glow Indicator */}
                          <div className="pt-1">
                            <span
                              className={`w-2 h-2 rounded-full block ${
                                sig.isRead ? "bg-slate-700" : "bg-purple-400 shadow-sm shadow-purple-400 animate-pulse"
                              }`}
                            />
                          </div>

                          {/* Event Tag & Details */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              {/* Event Type Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono ${
                                  sig.eventType === "SWAP"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : sig.eventType === "TRANSFER"
                                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                                    : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {sig.eventType}
                              </span>

                              {/* Entity Label */}
                              <span className="font-bold text-white text-xs">
                                {sig.entityLabel}
                              </span>

                              {/* Token Badge */}
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                                {sig.token}
                              </span>
                            </div>

                            {/* Tx Hash Deep Link */}
                            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                              <span>{sig.tokenAmount}</span>
                              <span>•</span>
                              <a
                                href={`https://etherscan.io/tx/${sig.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-cyan-400 hover:underline flex items-center space-x-0.5"
                              >
                                <span>Tx: {truncate(sig.txHash, 6, 4)}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Value & Time */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-sm text-emerald-400">
                            +{formatUsd(sig.amountUsd)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatRelativeTime(sig.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#0A0F1D] py-5 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>WalletWatch Pro • Institutional Cyber-Violet Trading Terminal & Market Charts</span>
            <span>WebSocket Live Tape & Ethereum JSON-RPC Active</span>
          </div>
        </footer>

      </div>

      {/* Simulator Sandbox Modal */}
      {simModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Simulator Sandbox</h3>
              </div>
              <button
                onClick={() => setSimModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>Inject a synthetic high-volume whale transaction to test alert triggers and tape feeds.</p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Select Asset</label>
                <select
                  value={simAsset}
                  onChange={(e) => setSimAsset(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                >
                  <option value="WETH">WETH (Wrapped Ether)</option>
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="USDT">USDT (Tether USD)</option>
                  <option value="WBTC">WBTC (Wrapped Bitcoin)</option>
                  <option value="SOL">SOL (Solana)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Transaction USD Value</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Event Action</label>
                <div className="flex space-x-2">
                  {(["SWAP", "TRANSFER", "POOL"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSimType(t)}
                      className={`flex-1 py-1.5 rounded-lg font-mono text-xs cursor-pointer ${
                        simType === t ? "bg-purple-600 text-white font-bold" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setSimModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerSim}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Inject Whale Signal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
