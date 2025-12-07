"use client";

import { useState } from "react";
import { useStore } from "../../../src/store/useStore";
import { useI18n } from "../../../src/i18n/useI18n";
import { apiClient, ApiError } from "../../../src/lib/apiClient";
import { mapErrorKey } from "../../../src/lib/errorMapping";

type PlinkoRisk = "low" | "medium" | "high";

interface PlinkoResult {
  status: string;
  payout: string;
  multiplier: number;
  xpEarned: string;
  newLevel: number;
  levelsGained: number;
  balance: string;
  gameData: {
    rows: number;
    risk: PlinkoRisk;
    path: ("L" | "R")[];
    finalSlot: number;
    finalMultiplier: number;
  };
}

export default function PlinkoPage() {
  const { t } = useI18n();
  const { balance, setBalance, fetchLevelAndBalance } = useStore();

  const [amount, setAmount] = useState(10);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlinkoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<PlinkoResult>("/bets", {
        gameType: "PLINKO",
        amount,
        params: { rows, risk },
      });
      setResult(data);

      const newBalance = parseFloat(data.balance);
      if (!isNaN(newBalance)) setBalance(newBalance);

      // Riallinea level/XP con il backend
      await fetchLevelAndBalance();
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("bets", e);
        setError(t(key));
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("home.plinkoTitle")}</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          {t("home.plinkoDesc")}
        </p>
      </div>

      <section className="bg-card/80 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Amount (FUN)</label>
            <input
              type="number"
              value={amount}
              min={0.00000001}
              step={0.00000001}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Rows</label>
            <select
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 12)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-32"
            >
              <option value={12}>12</option>
              <option value={14}>14</option>
              <option value={16}>16</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Risk</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value as PlinkoRisk)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-32"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <button
            onClick={handleBet}
            disabled={loading || amount <= 0}
            className="ml-auto px-4 py-2 rounded bg-accent text-black font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Betting..." : "Place Bet"}
          </button>
        </div>

        <div className="text-xs text-zinc-400">
          Current balance:{" "}
          <span className="text-accent font-semibold">
            {Math.round(balance).toLocaleString()} FUN
          </span>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <span
                className={
                  result.status === "WON"
                    ? "text-accent font-semibold"
                    : "text-red-400 font-semibold"
                }
              >
                {result.status}
              </span>
            </div>
            <div>Payout: {Math.round(parseFloat(result.payout || "0")).toLocaleString()} FUN</div>
            <div>Multiplier: x{result.multiplier}</div>
            <div>XP earned: {result.xpEarned}</div>
            <div>New level: {result.newLevel} (+{result.levelsGained})</div>
            <div>New balance: {Math.round(parseFloat(result.balance || "0")).toLocaleString()} FUN</div>
            <div className="mt-2">
              <div className="font-semibold mb-1">Game data (Plinko)</div>
              <div className="text-zinc-300">
                rows: {result.gameData.rows}, risk: {result.gameData.risk}
              </div>
              <div className="text-zinc-300">
                path: {result.gameData.path.join(" \u2192 ")}
              </div>
              <div className="text-zinc-300">
                finalSlot: {result.gameData.finalSlot}, finalMultiplier:{" "}
                {result.gameData.finalMultiplier}
              </div>
            </div>
          </div>
        )}
      </section>
      </div>
    </section>
  );
}


