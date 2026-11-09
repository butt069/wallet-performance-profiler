export type PersonaTag =
  | "Windfall Winner"
  | "Consistent Scalper"
  | "DEX Arbitrage / Bot"
  | "Whale / Diamond Hands"
  | "Degen Trader"
  | "Standard Wallet";

export interface TokenChange {
  mint: string;
  symbol: string;
  preAmount: number;
  postAmount: number;
  delta: number;
  decimals: number;
}

export interface TokenPnlEntry {
  mint: string;
  symbol: string;
  netDelta: number;
  decimals: number;
  tradeCount: number;
  estimatedPnlSol: number;
}

export interface AnalyzedTransaction {
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

export interface WalletProfileData {
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

export type SortField = "date" | "delta" | "fee";
export type TimeFrame = "24h" | "7d" | "30d" | "all";

