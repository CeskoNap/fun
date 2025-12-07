"use client";

import { useState } from "react";
import { useStore } from "../../../src/store/useStore";
import { useI18n } from "../../../src/i18n/useI18n";
import { apiClient, ApiError } from "../../../src/lib/apiClient";
import { mapErrorKey } from "../../../src/lib/errorMapping";

interface MinesResult {
  status: string;
  payout: string;
  multiplier: number;
  xpEarned: string;
  newLevel: number;
  levelsGained: number;
  balance: string;
  gameData: {
    rows: number;
    cols: number;
    minesCount: number;
    minePositions: number[];
    safeRevealed: number;
    finalMultiplier: number;
    hitMine: boolean;
  };
}

export default function MinesPage() {
  const { t } = useI18n();
  const { balance, setBalance, fetchLevelAndBalance } = useStore();
  const [amount, setAmount] = useState(10);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [minesCount, setMinesCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MinesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<MinesResult>("/bets", {
        gameType: "MINES",
        amount,
        params: { rows, cols, minesCount },
      });
      setResult(data);

      const newBalance = parseFloat(data.balance);
      if (!isNaN(newBalance)) setBalance(newBalance);

      // Riallinea level/XP con il backend (XP totale, non solo delta)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("home.minesTitle")}</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          {t("home.minesDesc")}
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
            <input
              type="number"
              value={rows}
              min={2}
              max={8}
              onChange={(e) => setRows(parseInt(e.target.value) || 5)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cols</label>
            <input
              type="number"
              value={cols}
              min={2}
              max={8}
              onChange={(e) => setCols(parseInt(e.target.value) || 5)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Mines</label>
            <input
              type="number"
              value={minesCount}
              min={1}
              onChange={(e) => setMinesCount(parseInt(e.target.value) || 1)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-24"
            />
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
              <div className="font-semibold mb-1">Game data (one-shot Mines)</div>
              <div className="text-zinc-300">
                rows: {result.gameData.rows}, cols: {result.gameData.cols}, mines:{" "}
                {result.gameData.minesCount}
              </div>
              <div className="text-zinc-300">
                minePositions: [{result.gameData.minePositions.join(", ")}]
              </div>
              <div className="text-zinc-300">
                safeRevealed: {result.gameData.safeRevealed}, hitMine:{" "}
                {String(result.gameData.hitMine)}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


