"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { useI18n } from "../../src/i18n/useI18n";

interface AchievementDto {
  code: string;
  name: string;
  description: string;
  icon?: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
}

export default function AchievementsPage() {
  const { t } = useI18n();

  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<AchievementDto[]>("/achievements");
      setAchievements(data);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : t("errors.generic");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("achievements.title")}</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          Collect achievements by reaching level milestones and playing consistently.
        </p>
      </div>

      <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-4">
        {error && <div className="text-sm text-red-400">{error}</div>}
        {loading && (
          <div className="text-sm text-zinc-400">Loading achievements...</div>
        )}

        <div className="text-sm text-zinc-400">
          {t("achievements.progress")}:{" "}
          <span className="text-accent font-semibold">
            {unlockedCount}/{achievements.length}
          </span>
        </div>

        {achievements.length === 0 && !loading && (
          <div className="text-sm text-zinc-400">No achievements defined yet.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((a) => (
            <div
              key={a.code}
              className={`border rounded-lg p-3 text-sm ${
                a.unlocked ? "border-emerald-500/60" : "border-zinc-800"
              } ${a.unlocked ? "" : "opacity-60"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-white">{a.name}</div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    a.unlocked
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-zinc-700/40 text-zinc-300"
                  }`}
                >
                  {a.unlocked ? t("achievements.unlocked") : t("achievements.locked")}
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-1">{a.description}</div>
              {a.unlockedAt && (
                <div className="text-[11px] text-zinc-500">
                  Unlocked at: {new Date(a.unlockedAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


