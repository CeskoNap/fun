"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { useI18n } from "../../src/i18n/useI18n";
import { useToast } from "../../src/components/ToastProvider";

interface WheelConfigResponse {
  segmentsCount: number;
  hasTokenReward: boolean;
  hasXpReward: boolean;
  maxSpinsPerDay: number;
  spinsToday: number;
}

interface SpinResponse {
  segmentIndex: number;
  rewardType: "token" | "xp" | "none";
  amount: string;
  xpAmount: string;
  spinsToday: number;
  maxSpinsPerDay: number;
}

export default function WheelPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const [config, setConfig] = useState<WheelConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoadingConfig(true);
    setError(null);
    try {
      const data = await apiClient.get<WheelConfigResponse>("/wheel/config");
      setConfig(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load wheel config.";
      setError(msg);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSpin = async () => {
    setSpinning(true);
    setError(null);
    try {
      const data = await apiClient.post<SpinResponse>("/wheel/spin");
      setLastResult(data);
      setConfig((cfg) =>
        cfg
          ? { ...cfg, spinsToday: data.spinsToday, maxSpinsPerDay: data.maxSpinsPerDay }
          : cfg,
      );

      if (data.rewardType === "token" && parseFloat(data.amount) > 0) {
        addToast({
          type: "success",
          message: `Wheel: +${Math.round(parseFloat(data.amount)).toLocaleString()} FUN`,
        });
      } else if (data.rewardType === "xp" && parseFloat(data.xpAmount) > 0) {
        addToast({
          type: "success",
          message: `Wheel: +${data.xpAmount} XP`,
        });
      } else {
        addToast({
          type: "info",
          message: "Wheel: no reward this time.",
        });
      }
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Wheel spin failed.";
      setError(msg);
      addToast({ type: "error", message: msg });
    } finally {
      setSpinning(false);
    }
  };

  const spinsLeft =
    config && config.maxSpinsPerDay >= 0
      ? Math.max(0, config.maxSpinsPerDay - config.spinsToday)
      : null;

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("wheel.title")}</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          Spin the bonus wheel a limited number of times per day to win FUN or XP.
        </p>
      </div>

      <section className="bg-card/80 rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {t("wheel.spinsLeft")}:{" "}
            <span className="text-accent font-semibold">
              {spinsLeft !== null ? spinsLeft : "-"}
            </span>
          </div>
          <button
            onClick={loadConfig}
            className="text-xs px-2 py-1 rounded transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        {loadingConfig && (
          <div className="text-sm text-zinc-400">Loading wheel configuration...</div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSpin}
            disabled={
              spinning ||
              !config ||
              (spinsLeft !== null && spinsLeft <= 0)
            }
            className="px-6 py-3 rounded-md bg-accent text-black font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {spinning ? "Spinning..." : t("wheel.spinButton")}
          </button>
          {config && (
            <div className="text-xs text-zinc-400">
              Segments: {config.segmentsCount} • Rewards:{" "}
              {config.hasTokenReward ? "FUN" : ""}{" "}
              {config.hasXpReward ? (config.hasTokenReward ? "+ XP" : "XP") : ""}
            </div>
          )}
        </div>

        {lastResult && (
          <div className="mt-4 text-sm text-zinc-300">
            <div className="font-semibold mb-1">{t("wheel.lastResult")}</div>
            <div className="text-xs text-zinc-400">
              Segment index: {lastResult.segmentIndex} • Reward type:{" "}
              {lastResult.rewardType}
            </div>
            <div className="text-xs text-zinc-400">
              Token: {Math.round(parseFloat(lastResult.amount || "0")).toLocaleString()} FUN • XP: {lastResult.xpAmount}
            </div>
          </div>
        )}
      </section>
      </div>
    </section>
  );
}


