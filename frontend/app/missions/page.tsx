"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { useI18n } from "../../src/i18n/useI18n";
import { useToast } from "../../src/components/ToastProvider";

type MissionStatus = "ACTIVE" | "COMPLETED" | "REWARDED" | "EXPIRED";
type MissionType = "DAILY" | "WEEKLY" | "MONTHLY";

interface MissionDto {
  id: string;
  type: MissionType;
  name: string;
  description: string;
  objective: any;
  reward: { tokenAmount?: number; xpAmount?: number };
  status: MissionStatus;
  progress: any;
  endsAt?: string | null;
}

export default function MissionsPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const [missions, setMissions] = useState<MissionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MissionDto[]>("/missions/active");
      setMissions(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : t("errors.generic");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleClaim = async (mission: MissionDto) => {
    setClaimingId(mission.id);
    try {
      const data = await apiClient.post<{
        missionId: string;
        tokenReward: string;
        xpReward: string;
        status: MissionStatus;
      }>(`/missions/${mission.id}/claim`);

      addToast({
        type: "success",
        message: `Mission reward: +${data.tokenReward} FUN, +${data.xpReward} XP`,
      });

      await loadMissions();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : t("errors.generic");
      addToast({ type: "error", message: msg });
    } finally {
      setClaimingId(null);
    }
  };

  const grouped = {
    DAILY: missions.filter((m) => m.type === "DAILY"),
    WEEKLY: missions.filter((m) => m.type === "WEEKLY"),
    MONTHLY: missions.filter((m) => m.type === "MONTHLY"),
  };

  const renderGroup = (type: MissionType, title: string) => {
    const list = grouped[type];
    if (list.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <div className="space-y-2 text-sm text-zinc-300">
          {list.map((m) => {
            const progress = m.progress || {};
            let progressText = "";
            if (progress.betCount !== undefined && progress.target !== undefined) {
              progressText = `${progress.betCount}/${progress.target} bets`;
            } else if (progress.volume !== undefined && progress.target !== undefined) {
              progressText = `${progress.volume}/${progress.target} FUN wagered`;
            }
            const canClaim = m.status === "COMPLETED";
            return (
              <div
                key={m.id}
                className="rounded-lg px-3 py-2 flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-zinc-400">{m.description}</div>
                  <div className="text-xs text-zinc-500">
                    {progressText && <span>Progress: {progressText} • </span>}
                    Reward:{" "}
                    {m.reward.tokenAmount ? `${m.reward.tokenAmount} FUN` : ""}{" "}
                    {m.reward.xpAmount
                      ? `${m.reward.tokenAmount ? "+" : ""} ${m.reward.xpAmount} XP`
                      : ""}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Status: {m.status}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => handleClaim(m)}
                    disabled={!canClaim || claimingId === m.id}
                    className="px-3 py-1 rounded bg-accent text-black text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {m.status === "REWARDED"
                      ? t("missions.rewarded")
                      : canClaim
                      ? claimingId === m.id
                        ? "Claiming..."
                        : t("missions.claim")
                      : t("missions.completed")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("missions.title")}</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          Complete daily, weekly and monthly missions to earn extra FUN and XP.
        </p>
      </div>

      <section className="bg-card/80 rounded-xl p-4 space-y-4">
        {error && <div className="text-sm text-red-400">{error}</div>}
        {loading && (
          <div className="text-sm text-zinc-400">Loading missions...</div>
        )}
        {!loading && missions.length === 0 && (
          <div className="text-sm text-zinc-400">No active missions.</div>
        )}

        <div className="space-y-4">
          {renderGroup("DAILY", t("missions.daily"))}
          {renderGroup("WEEKLY", t("missions.weekly"))}
          {renderGroup("MONTHLY", t("missions.monthly"))}
        </div>
      </section>
      </div>
    </section>
  );
}


