import { NextRequest, NextResponse } from "next/server";

const LAMPORT_PER_SOL = 1_000_000_000;
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const KNOWN_TOKENS: Record<string, string> = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "WIF",
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
  "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof": "RENDER",
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": "ETH",
  "So11111111111111111111111111111111111111112": "WSOL",
};

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
  /** Approximate realized PnL in SOL — derived from correlated SOL flows */
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
  tokenChanges: TokenChange[];
}

interface TokenBalanceEntry {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString?: string;
  };
}

interface SignatureInfo {
  signature: string;
  slot?: number;
  err?: unknown;
  memo?: string | null;
  blockTime?: number | null;
  confirmationStatus?: string;
}

interface SolanaTransactionResult {
  slot?: number;
  blockTime?: number | null;
  transaction?: {
    signatures?: string[];
    message?: {
      accountKeys?: Array<string | { pubkey: string }>;
    };
  };
  meta?: {
    err?: unknown;
    fee?: number;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: TokenBalanceEntry[];
    postTokenBalances?: TokenBalanceEntry[];
    loadedAddresses?: {
      writable?: Array<string | { pubkey?: string }>;
      readonly?: Array<string | { pubkey?: string }>;
    };
  };
}

interface RpcBatchResponse {
  id: number;
  jsonrpc: string;
  result?: SolanaTransactionResult;
  error?: {
    code: number;
    message: string;
  };
}

export async function GET(
  _request: NextRequest | Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    // Validate wallet address
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Wallet address parameter is required." },
        { status: 400 }
      );
    }

    const trimmedAddress = address.trim();
    if (!BASE58_REGEX.test(trimmedAddress)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address format." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey || apiKey === "your_copied_key_here") {
      return NextResponse.json(
        {
          error:
            "ALCHEMY_API_KEY is not configured or contains placeholder. Please set a valid Alchemy API key in .env.local.",
        },
        { status: 401 }
      );
    }

    const rpcUrl = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;

    // 1. Retrieve the last 20 transaction signatures for the provided address
    const signaturesRes = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [
          trimmedAddress,
          {
            limit: 20,
          },
        ],
      }),
    });

    if (!signaturesRes.ok) {
      const errorText = await signaturesRes.text();
      return NextResponse.json(
        {
          error: `Alchemy RPC returned status ${signaturesRes.status}: ${errorText}`,
        },
        { status: signaturesRes.status >= 400 && signaturesRes.status < 500 ? signaturesRes.status : 502 }
      );
    }

    const signaturesData = await signaturesRes.json();
    if (signaturesData.error) {
      return NextResponse.json(
        {
          error:
            signaturesData.error.message ||
            "Failed to retrieve signatures from Solana RPC.",
        },
        { status: 502 }
      );
    }

    const signatures: SignatureInfo[] = Array.isArray(signaturesData.result)
      ? signaturesData.result
      : [];

    if (signatures.length === 0) {
      return NextResponse.json({
        address: trimmedAddress,
        personaTag: "Standard Wallet" as PersonaTag,
        realizedPnl: 0,
        winRate: 0,
        consistencyScore: 0,
        tradeFrequencyPerDay: 0,
        avgHoldingDurationHours: 0,
        isWindfallDriven: false,
        totalTransactions: 0,
        winningTransactions: 0,
        losingTransactions: 0,
        neutralTransactions: 0,
        recentTransactions: [],
        tokenPnl: [],
      });
    }

    // 2. Fetch transaction details using getTransaction for those signatures (with JSON-RPC batching)
    const batchPayload = signatures.map((sig, index) => ({
      jsonrpc: "2.0",
      id: index + 1,
      method: "getTransaction",
      params: [
        sig.signature,
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    }));

    const txMap = new Map<string, SolanaTransactionResult>();

    try {
      const batchRes = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchPayload),
      });

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        if (Array.isArray(batchData)) {
          for (const item of batchData as RpcBatchResponse[]) {
            if (item && typeof item.id === "number" && item.id >= 1 && item.id <= signatures.length) {
              const sig = signatures[item.id - 1].signature;
              if (item.result) {
                txMap.set(sig, item.result);
              }
            }
          }
        }
      }
    } catch (batchErr) {
      console.warn("Batch getTransaction encountered an error, falling back to individual calls:", batchErr);
    }

    // Individual fallback for any signatures not fulfilled by batch
    const pendingSignatures = signatures.filter((s) => !txMap.has(s.signature));
    if (pendingSignatures.length > 0) {
      await Promise.all(
        pendingSignatures.map(async (sig) => {
          try {
            const singleRes = await fetch(rpcUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTransaction",
                params: [
                  sig.signature,
                  {
                    encoding: "jsonParsed",
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                  },
                ],
              }),
            });
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              if (singleData.result) {
                txMap.set(sig.signature, singleData.result);
              }
            }
          } catch {
            // Ignore error for individual tx fallback
          }
        })
      );
    }

    // 3. Process transactions: Native SOL + SPL Token & Swap Parsing
    const recentTransactions: AnalyzedTransaction[] = [];
    let totalSolChange = 0;
    let winningTransactions = 0;
    let losingTransactions = 0;
    let neutralTransactions = 0;

    for (const sig of signatures) {
      const tx = txMap.get(sig.signature);
      const meta = tx?.meta;
      const slot = tx?.slot ?? sig.slot ?? null;
      const blockTime = tx?.blockTime ?? sig.blockTime ?? null;
      const timestamp = blockTime ? new Date(blockTime * 1000).toISOString() : null;
      const hasError = Boolean(sig.err || meta?.err);
      const status: "success" | "failed" = hasError ? "failed" : "success";
      const feeSol = meta?.fee ? meta.fee / LAMPORT_PER_SOL : 0;

      let preBalanceSol = 0;
      let postBalanceSol = 0;
      let solChange = 0;
      const tokenChanges: TokenChange[] = [];

      // Collect all accounts involved in the transaction in exact index order
      const accountKeys: string[] = [];
      if (tx?.transaction?.message?.accountKeys) {
        const rawAccountKeys = tx.transaction.message.accountKeys;
        if (Array.isArray(rawAccountKeys)) {
          for (const key of rawAccountKeys) {
            if (typeof key === "string") {
              accountKeys.push(key);
            } else if (key && typeof key === "object" && typeof key.pubkey === "string") {
              accountKeys.push(key.pubkey);
            }
          }
        }
      }

      // Account for versioned Address Lookup Tables (loadedAddresses)
      if (meta?.loadedAddresses) {
        if (Array.isArray(meta.loadedAddresses.writable)) {
          for (const key of meta.loadedAddresses.writable) {
            accountKeys.push(typeof key === "string" ? key : key?.pubkey || String(key));
          }
        }
        if (Array.isArray(meta.loadedAddresses.readonly)) {
          for (const key of meta.loadedAddresses.readonly) {
            accountKeys.push(typeof key === "string" ? key : key?.pubkey || String(key));
          }
        }
      }

      // Compute native SOL balance delta
      if (meta && accountKeys.length > 0) {
        const walletIndex = accountKeys.findIndex((k) => k === trimmedAddress);

        if (
          walletIndex !== -1 &&
          Array.isArray(meta.preBalances) &&
          Array.isArray(meta.postBalances) &&
          meta.preBalances[walletIndex] !== undefined &&
          meta.postBalances[walletIndex] !== undefined
        ) {
          const preLamports = Number(meta.preBalances[walletIndex]);
          const postLamports = Number(meta.postBalances[walletIndex]);
          preBalanceSol = preLamports / LAMPORT_PER_SOL;
          postBalanceSol = postLamports / LAMPORT_PER_SOL;
          solChange = (postLamports - preLamports) / LAMPORT_PER_SOL;
        }

        // 1. SPL Token & Swap Parsing: Match preTokenBalances & postTokenBalances
        const isWalletTokenAccount = (entry: TokenBalanceEntry): boolean => {
          if (entry.owner && entry.owner.toLowerCase() === trimmedAddress.toLowerCase()) {
            return true;
          }
          const acc = accountKeys[entry.accountIndex];
          if (acc && acc.toLowerCase() === trimmedAddress.toLowerCase()) {
            return true;
          }
          return false;
        };

        const preTokenMap = new Map<string, { amount: number; decimals: number }>();
        const postTokenMap = new Map<string, { amount: number; decimals: number }>();

        if (Array.isArray(meta.preTokenBalances)) {
          for (const entry of meta.preTokenBalances) {
            if (isWalletTokenAccount(entry)) {
              const val =
                entry.uiTokenAmount?.uiAmount ??
                (entry.uiTokenAmount?.uiAmountString
                  ? parseFloat(entry.uiTokenAmount.uiAmountString)
                  : 0);
              preTokenMap.set(entry.mint, {
                amount: val || 0,
                decimals: entry.uiTokenAmount?.decimals ?? 0,
              });
            }
          }
        }

        if (Array.isArray(meta.postTokenBalances)) {
          for (const entry of meta.postTokenBalances) {
            if (isWalletTokenAccount(entry)) {
              const val =
                entry.uiTokenAmount?.uiAmount ??
                (entry.uiTokenAmount?.uiAmountString
                  ? parseFloat(entry.uiTokenAmount.uiAmountString)
                  : 0);
              postTokenMap.set(entry.mint, {
                amount: val || 0,
                decimals: entry.uiTokenAmount?.decimals ?? 0,
              });
            }
          }
        }

        const allMints = new Set([...preTokenMap.keys(), ...postTokenMap.keys()]);
        for (const mint of allMints) {
          const pre = preTokenMap.get(mint)?.amount ?? 0;
          const post = postTokenMap.get(mint)?.amount ?? 0;
          const decimals =
            postTokenMap.get(mint)?.decimals ?? preTokenMap.get(mint)?.decimals ?? 0;
          const delta = Number((post - pre).toFixed(decimals > 0 ? decimals : 6));
          if (Math.abs(delta) > 0) {
            const symbol =
              KNOWN_TOKENS[mint] || `${mint.slice(0, 4)}...${mint.slice(-4)}`;
            tokenChanges.push({
              mint,
              symbol,
              preAmount: pre,
              postAmount: post,
              delta,
              decimals,
            });
          }
        }
      }

      const isWin = solChange > 0;
      if (solChange > 0) {
        winningTransactions++;
      } else if (solChange < 0) {
        losingTransactions++;
      } else {
        neutralTransactions++;
      }

      totalSolChange += solChange;

      recentTransactions.push({
        signature: sig.signature,
        slot,
        blockTime,
        timestamp,
        feeSol: Number(feeSol.toFixed(9)),
        status,
        preBalanceSol: Number(preBalanceSol.toFixed(9)),
        postBalanceSol: Number(postBalanceSol.toFixed(9)),
        solChange: Number(solChange.toFixed(9)),
        isWin,
        err: sig.err || meta?.err || null,
        tokenChanges,
      });
    }

    const totalTransactions = recentTransactions.length;
    const evaluatedTransactions = winningTransactions + losingTransactions;
    const winRate =
      evaluatedTransactions > 0
        ? Number(((winningTransactions / evaluatedTransactions) * 100).toFixed(2))
        : 0;

    const realizedPnl = Number(totalSolChange.toFixed(9));

    // 2. Outlier & Windfall Detection
    const positiveWins = recentTransactions
      .map((tx) => tx.solChange)
      .filter((change) => change > 0);
    const maxSingleWin = positiveWins.length > 0 ? Math.max(...positiveWins) : 0;
    const isWindfallDriven =
      realizedPnl > 0 && maxSingleWin > 0 && maxSingleWin / realizedPnl > 0.7;

    // Consistency Score (0-100 scale) based on win variance and standard deviation of net trade returns
    let consistencyScore = 50;
    if (totalTransactions > 0) {
      const returns = recentTransactions.map((tx) => tx.solChange);
      const mean = returns.reduce((a, b) => a + b, 0) / totalTransactions;
      const variance =
        returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / totalTransactions;
      const stdDev = Math.sqrt(variance);

      const volatilityPenalty = Math.min(40, (stdDev / (Math.abs(mean) + 0.1)) * 12);
      const winRateScore = (winRate / 100) * 40;
      const stabilityScore = Math.max(0, 40 - volatilityPenalty);
      const profitBonus = realizedPnl > 0 ? 20 : (realizedPnl === 0 ? 10 : 0);
      const windfallPenalty = isWindfallDriven ? 30 : 0;

      const rawScore = winRateScore + stabilityScore + profitBonus - windfallPenalty;
      consistencyScore = Math.round(Math.min(100, Math.max(0, rawScore)));
    } else {
      consistencyScore = 0;
    }

    // 3. Activity & Duration Metrics
    const validBlockTimes = recentTransactions
      .map((tx) => tx.blockTime)
      .filter((t): t is number => typeof t === "number" && t > 0);

    let tradeFrequencyPerDay = 0;
    if (validBlockTimes.length >= 2) {
      const minTime = Math.min(...validBlockTimes);
      const maxTime = Math.max(...validBlockTimes);
      const timespanDays = (maxTime - minTime) / 86400;

      if (timespanDays > 0) {
        tradeFrequencyPerDay = Number((totalTransactions / timespanDays).toFixed(2));
      } else {
        tradeFrequencyPerDay = Number((totalTransactions * 24).toFixed(2));
      }
    } else if (totalTransactions === 1) {
      tradeFrequencyPerDay = 1.0;
    }

    // Calculate avgHoldingDurationHours
    const chronologicalTxs = [...recentTransactions]
      .filter((tx) => tx.blockTime !== null)
      .sort((a, b) => (a.blockTime as number) - (b.blockTime as number));

    const holdingDurations: number[] = [];

    // Track matched token acquisitions (delta > 0) and liquidations (delta < 0)
    const acquisitionTimesByMint = new Map<string, number[]>();
    for (const tx of chronologicalTxs) {
      const bt = tx.blockTime as number;
      for (const tc of tx.tokenChanges) {
        if (tc.delta > 0) {
          const arr = acquisitionTimesByMint.get(tc.mint) || [];
          arr.push(bt);
          acquisitionTimesByMint.set(tc.mint, arr);
        } else if (tc.delta < 0) {
          const arr = acquisitionTimesByMint.get(tc.mint);
          if (arr && arr.length > 0) {
            const acqTime = arr.shift()!;
            if (bt > acqTime) {
              holdingDurations.push((bt - acqTime) / 3600);
            }
          }
        }
      }
    }

    // Fallback: check SOL trade cycles (outflow followed by inflow)
    if (holdingDurations.length === 0) {
      const buyTimes: number[] = [];
      for (const tx of chronologicalTxs) {
        const bt = tx.blockTime as number;
        if (tx.solChange < -tx.feeSol) {
          buyTimes.push(bt);
        } else if (tx.solChange > 0 && buyTimes.length > 0) {
          const buyTime = buyTimes.shift()!;
          if (bt > buyTime) {
            holdingDurations.push((bt - buyTime) / 3600);
          }
        }
      }
    }

    let avgHoldingDurationHours = 0;
    if (holdingDurations.length > 0) {
      const avg = holdingDurations.reduce((a, b) => a + b, 0) / holdingDurations.length;
      avgHoldingDurationHours = Number(avg.toFixed(1));
    } else if (validBlockTimes.length >= 2) {
      const minTime = Math.min(...validBlockTimes);
      const maxTime = Math.max(...validBlockTimes);
      const avgInterval =
        (maxTime - minTime) / (3600 * Math.max(1, chronologicalTxs.length - 1));
      avgHoldingDurationHours = Number(Math.max(0.1, avgInterval).toFixed(1));
    }

    // 4. Automated Behavior Profiling (Persona Tag)
    let hasRapidIdenticalPattern = false;
    for (let i = 0; i < chronologicalTxs.length - 1; i++) {
      const tA = chronologicalTxs[i];
      const tB = chronologicalTxs[i + 1];
      if (tA.blockTime && tB.blockTime) {
        const gap = Math.abs(tB.blockTime - tA.blockTime);
        if (gap < 10) {
          const sameSolChange =
            Math.abs(tA.solChange - tB.solChange) < 0.0001 && tA.solChange !== 0;
          const sameTokens = tA.tokenChanges.some((tcA) =>
            tB.tokenChanges.some((tcB) => tcB.mint === tcA.mint)
          );
          if (sameSolChange || sameTokens || gap <= 2) {
            hasRapidIdenticalPattern = true;
            break;
          }
        }
      }
    }

    let personaTag: PersonaTag = "Standard Wallet";

    if (tradeFrequencyPerDay > 50 || hasRapidIdenticalPattern) {
      personaTag = "DEX Arbitrage / Bot";
    } else if (isWindfallDriven) {
      personaTag = "Windfall Winner";
    } else if (winRate >= 65 && totalTransactions >= 15) {
      personaTag = "Consistent Scalper";
    } else if (realizedPnl > 100 && tradeFrequencyPerDay < 2) {
      personaTag = "Whale / Diamond Hands";
    } else if (winRate < 40 && totalTransactions >= 10) {
      personaTag = "Degen Trader";
    } else {
      personaTag = "Standard Wallet";
    }

    // 5. Per-token PnL aggregation
    const tokenPnlMap = new Map<
      string,
      { symbol: string; netDelta: number; decimals: number; tradeCount: number; correlatedSolFlow: number }
    >();

    for (const tx of recentTransactions) {
      for (const tc of tx.tokenChanges) {
        const existing = tokenPnlMap.get(tc.mint) ?? {
          symbol: tc.symbol,
          netDelta: 0,
          decimals: tc.decimals,
          tradeCount: 0,
          correlatedSolFlow: 0,
        };
        existing.netDelta += tc.delta;
        existing.tradeCount += 1;
        // Attribute the SOL change from this transaction to the tokens touched in it
        // (distributes the sol flow equally across token mints in the same tx)
        existing.correlatedSolFlow += tc.delta !== 0 ? tx.solChange / Math.max(1, tx.tokenChanges.length) : 0;
        tokenPnlMap.set(tc.mint, existing);
      }
    }

    const tokenPnl: TokenPnlEntry[] = Array.from(tokenPnlMap.entries())
      .map(([mint, v]) => ({
        mint,
        symbol: v.symbol,
        netDelta: Number(v.netDelta.toFixed(v.decimals > 0 ? Math.min(v.decimals, 6) : 6)),
        decimals: v.decimals,
        tradeCount: v.tradeCount,
        estimatedPnlSol: Number(v.correlatedSolFlow.toFixed(9)),
      }))
      .sort((a, b) => Math.abs(b.estimatedPnlSol) - Math.abs(a.estimatedPnlSol));

    // 6. Return updated JSON contract
    return NextResponse.json({
      address: trimmedAddress,
      personaTag,
      realizedPnl,
      winRate,
      consistencyScore,
      tradeFrequencyPerDay,
      avgHoldingDurationHours,
      isWindfallDriven,
      totalTransactions,
      winningTransactions,
      losingTransactions,
      neutralTransactions,
      recentTransactions,
      tokenPnl,
    });
  } catch (err: unknown) {
    console.error("Error analyzing wallet:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
