export function formatUsd(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("en-US");
}

export function formatSol(amount: number): string {
  const abs = Math.abs(amount);
  if (abs === 0) return "0.0000";
  if (abs < 0.0001) return amount.toFixed(8);
  if (abs < 1) return amount.toFixed(6);
  return amount.toFixed(4);
}

export function formatTokenAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (abs < 0.01 && abs > 0) return amount.toFixed(4);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function truncate(str: string, lead = 4, tail = 4): string {
  if (!str) return "";
  if (str.length <= lead + tail) return str;
  return `${str.slice(0, lead)}...${str.slice(-tail)}`;
}

export function formatRelativeTime(
  timestamp: number | string | null,
  blockTime?: number | null,
  nowMs = Date.now()
): string {
  if (typeof timestamp === "number") {
    const diffSec = Math.floor((nowMs - timestamp) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  if (!blockTime && !timestamp) return "Unknown";
  const timeMs = blockTime ? blockTime * 1000 : new Date(timestamp ?? "").getTime();
  if (isNaN(timeMs)) {
    if (timestamp) return timestamp.slice(0, 10);
    return "Unknown";
  }

  const diffSec = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  const d = new Date(timeMs);
  return d.toISOString().slice(0, 10);
}
