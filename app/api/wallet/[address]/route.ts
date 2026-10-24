import { NextRequest, NextResponse } from "next/server";

const LAMPORT_PER_SOL = 1_000_000_000;
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
        realizedPnl: 0,
        winRate: 0,
        totalTransactions: 0,
        winningTransactions: 0,
        losingTransactions: 0,
        neutralTransactions: 0,
        recentTransactions: [],
      });
    }

    // 2. Fetch transaction details using getTransaction for those signatures
    // Use JSON-RPC batching for performance, with fallback to individual calls
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

    // If any transactions were not returned by batch request, fetch individually
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

    // 3. Process transactions and calculate SOL balance changes
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

      if (meta && tx?.transaction?.message) {
        // Collect all accounts involved in the transaction in exact index order
        const accountKeys: string[] = [];
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

        // Account for versioned transaction address lookup tables (loadedAddresses)
        if (meta.loadedAddresses) {
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
      });
    }

    // 4. Calculate metrics
    const evaluatedTransactions = winningTransactions + losingTransactions;
    const winRate =
      evaluatedTransactions > 0
        ? Number(((winningTransactions / evaluatedTransactions) * 100).toFixed(2))
        : 0;

    const realizedPnl = Number(totalSolChange.toFixed(9));

    return NextResponse.json({
      address: trimmedAddress,
      realizedPnl,
      winRate,
      totalTransactions: recentTransactions.length,
      winningTransactions,
      losingTransactions,
      neutralTransactions,
      recentTransactions,
    });
  } catch (err: unknown) {
    console.error("Error analyzing wallet:", err);
    const message = err instanceof Error ? err.message : "Internal server error occurred.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
