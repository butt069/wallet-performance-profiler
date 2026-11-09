export interface WatchedEntity {
  id: string;
  address: string;
  label: string;
  minThreshold: number;
  tokens: string[];
  eventTypes: string[];
  createdAt: number;
}

export type WhaleEventType = "SWAP" | "TRANSFER" | "POOL";

export interface WhaleSignal {
  id: string;
  eventType: WhaleEventType;
  entityLabel: string;
  address: string;
  token: string;
  amountUsd: number;
  tokenAmount: string;
  txHash: string;
  timestamp: number;
  isRead: boolean;
}

export interface AssetInfo {
  name: string;
  basePrice: number;
  decimals: number;
  change24h: number;
  vol24h: string;
  high24h: number;
  low24h: number;
  badge: string;
}

export interface CandleDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  ema: number;
}

