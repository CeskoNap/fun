"use client";

import { useEffect, useState } from "react";
import { useStore } from "../../src/store/useStore";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { mapErrorKey } from "../../src/lib/errorMapping";
import { useI18n } from "../../src/i18n/useI18n";
import { useToast } from "../../src/components/ToastProvider";

interface TransferHistoryItem {
  id: string;
  direction: "sent" | "received";
  username: string;
  amount: string;
  day: string;
  createdAt: string;
}

export default function TransfersPage() {
  const { balance, level, fetchLevelAndBalance } = useStore();
  const { t } = useI18n();
  const { addToast } = useToast();

  const [toUsername, setToUsername] = useState("");
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    fetchLevelAndBalance();
    loadHistory();
  }, [fetchLevelAndBalance]);

  const loadHistory = async () => {
    setHistoryError(null);
    try {
      const data = await apiClient.get<TransferHistoryItem[]>(
        "/transfers/history?limit=20&direction=all",
      );
      setHistory(data);
    } catch (e: any) {
      setHistoryError(t("errors.generic"));
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{
        fromBalance: string;
        toUsername: string;
        amount: string;
        fee: string;
        netAmount: string;
      }>("/transfers", {
        toUsername,
        amount,
      });

      addToast({
        type: "success",
        message: `Sent ${data.netAmount} FUN to ${data.toUsername}`,
      });

      await fetchLevelAndBalance();
      await loadHistory();
      setToUsername("");
      setAmount(0);
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("transfers", e);
        setError(t(key));
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  const levelTooLow = level < 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Transfers</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          Send FUN to other users once you reach level 10. Transfers are in-app only and
          subject to daily limits.
        </p>
      </div>

      <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Your level</div>
            <div className="text-xl font-semibold text-white">#{level}</div>
          </div>
          <div className="text-right text-sm text-zinc-400">
            <div>Balance</div>
            <div className="text-accent font-semibold">{Math.round(balance).toLocaleString()} FUN</div>
          </div>
        </div>

        <div className="text-xs text-zinc-400">
          Transfers unlock at level 10. Daily limits apply (count and total amount).
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">To username</label>
              <input
                type="text"
                value={toUsername}
                onChange={(e) => setToUsername(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm w-48"
                disabled={levelTooLow}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Amount (FUN)</label>
              <input
                type="number"
                value={amount}
                min={0.00000001}
                step={0.00000001}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm w-40"
                disabled={levelTooLow}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={levelTooLow || loading || amount <= 0 || !toUsername}
              className="ml-auto px-4 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>

          {levelTooLow && (
            <div className="text-sm text-zinc-400">
              You must reach level 10 to send FUN to other users.
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      </section>

      <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">History</h2>
        {historyError && <div className="text-sm text-red-400">{historyError}</div>}
        {!historyError && history.length === 0 && (
          <div className="text-sm text-zinc-400">No transfers yet.</div>
        )}
        {history.length > 0 && (
          <div className="space-y-1 text-sm text-zinc-300">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-zinc-800/60 py-1 last:border-b-0"
              >
                <div>
                  <div>
                    {item.direction === "sent" ? "Sent to" : "Received from"}{" "}
                    <span className="font-semibold">{item.username}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={
                      item.direction === "sent"
                        ? "text-red-400 font-semibold"
                        : "text-emerald-400 font-semibold"
                    }
                  >
                    {item.direction === "sent" ? "-" : "+"}
                    {item.amount} FUN
                  </div>
                  <div className="text-xs text-zinc-500">
                    Day: {item.day}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


