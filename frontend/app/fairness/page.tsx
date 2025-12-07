"use client";

import { useState } from "react";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { useToast } from "../../src/components/ToastProvider";
import { useI18n } from "../../src/i18n/useI18n";

type GameType = "MINES" | "PLINKO";

interface VerifyBetResponse {
  betId: string;
  valid: boolean;
  stored: {
    multiplier: number;
    payout: string;
    gameData: any;
  };
  recomputed: {
    multiplier: number;
    payout: string;
    gameData: any;
  };
}

interface ManualResponse {
  gameData: any;
  multiplier: number;
  expectedPayout: string;
}

export default function FairnessPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  // Verify by bet id
  const [betId, setBetId] = useState("");
  const [betGameType, setBetGameType] = useState<GameType>("MINES");
  const [betResult, setBetResult] = useState<VerifyBetResponse | null>(null);
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  // Manual Mines
  const [minesInput, setMinesInput] = useState({
    serverSeed: "",
    clientSeed: "",
    nonce: 0,
    amount: 100,
    rows: 5,
    cols: 5,
    minesCount: 5,
  });
  const [minesResult, setMinesResult] = useState<ManualResponse | null>(null);
  const [minesLoading, setMinesLoading] = useState(false);

  // Manual Plinko
  const [plinkoInput, setPlinkoInput] = useState({
    serverSeed: "",
    clientSeed: "",
    nonce: 0,
    amount: 100,
    rows: 12,
    risk: "medium",
  });
  const [plinkoResult, setPlinkoResult] = useState<ManualResponse | null>(null);
  const [plinkoLoading, setPlinkoLoading] = useState(false);

  const handleVerifyBet = async () => {
    if (!betId) return;
    setBetLoading(true);
    setBetError(null);
    setBetResult(null);
    try {
      const path =
        betGameType === "MINES"
          ? `/fairness/mines/verify-bet/${betId}`
          : `/fairness/plinko/verify-bet/${betId}`;
      const data = await apiClient.get<VerifyBetResponse>(path);
      setBetResult(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : t("errors.generic");
      setBetError(msg);
    } finally {
      setBetLoading(false);
    }
  };

  const handleMinesManual = async () => {
    setMinesLoading(true);
    setMinesResult(null);
    try {
      const data = await apiClient.post<ManualResponse>("/fairness/mines/verify-manual", {
        ...minesInput,
      });
      setMinesResult(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : t("errors.generic");
      addToast({ type: "error", message: msg });
    } finally {
      setMinesLoading(false);
    }
  };

  const handlePlinkoManual = async () => {
    setPlinkoLoading(true);
    setPlinkoResult(null);
    try {
      const data = await apiClient.post<ManualResponse>("/fairness/plinko/verify-manual", {
        ...plinkoInput,
      });
      setPlinkoResult(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : t("errors.generic");
      addToast({ type: "error", message: msg });
    } finally {
      setPlinkoLoading(false);
    }
  };

  const renderGameData = (data: any) => {
    return (
      <pre className="text-xs bg-zinc-950/70 rounded p-2 overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("fairness.title")}</h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          {t("fairness.subtitle")}
        </p>
      </div>

      {/* Verify by Bet ID */}
      <section className="bg-card/80 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold">{t("fairness.verifyByBetId")}</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              {t("fairness.betId")}
            </label>
            <input
              type="text"
              value={betId}
              onChange={(e) => setBetId(e.target.value)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-64"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              {t("fairness.gameType")}
            </label>
            <select
              value={betGameType}
              onChange={(e) => setBetGameType(e.target.value as GameType)}
              className="bg-zinc-950 rounded px-2 py-1 text-sm w-32"
            >
              <option value="MINES">Mines</option>
              <option value="PLINKO">Plinko</option>
            </select>
          </div>
          <button
            onClick={handleVerifyBet}
            disabled={betLoading || !betId}
            className="ml-auto px-4 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {betLoading ? t("fairness.verifying") : t("fairness.verifyButton")}
          </button>
        </div>
        {betError && <div className="text-sm text-red-400">{betError}</div>}
        {betResult && (
          <div
            className={`border rounded-lg p-3 text-sm ${
              betResult.valid ? "border-emerald-500/70" : "border-red-500/70"
            }`}
          >
            <div className="mb-2">
              <span className="font-semibold">
                {t("fairness.valid")}:{" "}
                <span className={betResult.valid ? "text-emerald-400" : "text-red-400"}>
                  {betResult.valid ? t("fairness.yes") : t("fairness.no")}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="font-semibold mb-1">{t("fairness.stored")}</div>
                <div className="text-xs text-zinc-400 mb-1">
                  Multiplier: {betResult.stored.multiplier} • Payout: {betResult.stored.payout}
                </div>
                {renderGameData(betResult.stored.gameData)}
              </div>
              <div>
                <div className="font-semibold mb-1">{t("fairness.recomputed")}</div>
                <div className="text-xs text-zinc-400 mb-1">
                  Multiplier: {betResult.recomputed.multiplier} • Payout:{" "}
                  {betResult.recomputed.payout}
                </div>
                {renderGameData(betResult.recomputed.gameData)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Manual verification */}
      <section className="bg-card/80 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold">{t("fairness.manualTitle")}</h2>

        {/* Mines manual */}
        <div className="rounded-lg p-3 space-y-3">
          <h3 className="text-sm font-semibold">{t("fairness.manualMines")}</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Server seed</label>
              <input
                type="text"
                value={minesInput.serverSeed}
                onChange={(e) =>
                  setMinesInput((s) => ({ ...s, serverSeed: e.target.value }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-64"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Client seed</label>
              <input
                type="text"
                value={minesInput.clientSeed}
                onChange={(e) =>
                  setMinesInput((s) => ({ ...s, clientSeed: e.target.value }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-56"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nonce</label>
              <input
                type="number"
                value={minesInput.nonce}
                onChange={(e) =>
                  setMinesInput((s) => ({ ...s, nonce: parseInt(e.target.value) || 0 }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-24"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Amount</label>
              <input
                type="number"
                value={minesInput.amount}
                onChange={(e) =>
                  setMinesInput((s) => ({
                    ...s,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-28"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rows</label>
              <input
                type="number"
                value={minesInput.rows}
                onChange={(e) =>
                  setMinesInput((s) => ({
                    ...s,
                    rows: parseInt(e.target.value) || 1,
                  }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Cols</label>
              <input
                type="number"
                value={minesInput.cols}
                onChange={(e) =>
                  setMinesInput((s) => ({
                    ...s,
                    cols: parseInt(e.target.value) || 1,
                  }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Mines</label>
              <input
                type="number"
                value={minesInput.minesCount}
                onChange={(e) =>
                  setMinesInput((s) => ({
                    ...s,
                    minesCount: parseInt(e.target.value) || 1,
                  }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-20"
              />
            </div>
            <button
              onClick={handleMinesManual}
              disabled={minesLoading}
              className="ml-auto px-3 py-1.5 rounded bg-accent text-black text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {minesLoading ? t("fairness.verifying") : t("fairness.verifyButton")}
            </button>
          </div>
          {minesResult && (
            <div className="text-xs text-zinc-300 space-y-1">
              <div>
                Multiplier: {minesResult.multiplier} • Expected payout:{" "}
                {minesResult.expectedPayout}
              </div>
              {renderGameData(minesResult.gameData)}
            </div>
          )}
        </div>

        {/* Plinko manual */}
        <div className="rounded-lg p-3 space-y-3">
          <h3 className="text-sm font-semibold">{t("fairness.manualPlinko")}</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Server seed</label>
              <input
                type="text"
                value={plinkoInput.serverSeed}
                onChange={(e) =>
                  setPlinkoInput((s) => ({ ...s, serverSeed: e.target.value }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-64"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Client seed</label>
              <input
                type="text"
                value={plinkoInput.clientSeed}
                onChange={(e) =>
                  setPlinkoInput((s) => ({ ...s, clientSeed: e.target.value }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-56"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nonce</label>
              <input
                type="number"
                value={plinkoInput.nonce}
                onChange={(e) =>
                  setPlinkoInput((s) => ({ ...s, nonce: parseInt(e.target.value) || 0 }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-24"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Amount</label>
              <input
                type="number"
                value={plinkoInput.amount}
                onChange={(e) =>
                  setPlinkoInput((s) => ({
                    ...s,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-28"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rows</label>
              <input
                type="number"
                value={plinkoInput.rows}
                onChange={(e) =>
                  setPlinkoInput((s) => ({
                    ...s,
                    rows: parseInt(e.target.value) || 12,
                  }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Risk</label>
              <select
                value={plinkoInput.risk}
                onChange={(e) =>
                  setPlinkoInput((s) => ({ ...s, risk: e.target.value }))
                }
                className="bg-zinc-950 rounded px-2 py-1 text-xs w-24"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <button
              onClick={handlePlinkoManual}
              disabled={plinkoLoading}
              className="ml-auto px-3 py-1.5 rounded bg-accent text-black text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {plinkoLoading ? t("fairness.verifying") : t("fairness.verifyButton")}
            </button>
          </div>
          {plinkoResult && (
            <div className="text-xs text-zinc-300 space-y-1">
              <div>
                Multiplier: {plinkoResult.multiplier} • Expected payout:{" "}
                {plinkoResult.expectedPayout}
              </div>
              {renderGameData(plinkoResult.gameData)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


