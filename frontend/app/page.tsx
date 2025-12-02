"use client";

import { useEffect } from "react";
import { useStore } from "../src/store/useStore";
import { useUserSocket } from "../src/hooks/useUserSocket";
import { useI18n } from "../src/i18n/useI18n";

export default function HomePage() {
  const { t } = useI18n();
  const { balance, level, xp, xpToNextLevel, fetchLevelAndBalance } = useStore();
  useUserSocket();

  useEffect(() => {
    fetchLevelAndBalance();
  }, [fetchLevelAndBalance]);

  const totalForBar = xpToNextLevel && xpToNextLevel > 0 ? xp + xpToNextLevel : xp;
  const progress = totalForBar > 0 ? Math.min(1, xp / totalForBar) : 0;

  return (
    <div className="space-y-6">
      <section className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">{t("home.title")}</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            {t("home.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-zinc-400">{t("home.balance")}</div>
          <div className="text-2xl font-bold text-accent">{balance.toFixed(8)} FUN</div>
          <div className="flex items-center gap-3 mt-2">
            <div>
              <div className="text-sm text-zinc-400">
                {t("home.level")} {level}
              </div>
              <div className="w-40 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <a
          href="/games/mines"
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-accent transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">{t("home.minesTitle")}</h2>
          <p className="text-sm text-zinc-400">{t("home.minesDesc")}</p>
        </a>
        <a
          href="/games/plinko"
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-accent transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">{t("home.plinkoTitle")}</h2>
          <p className="text-sm text-zinc-400">{t("home.plinkoDesc")}</p>
        </a>
        <a
          href="/rewards"
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-accent transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">{t("home.rewardsTitle")}</h2>
          <p className="text-sm text-zinc-400">{t("home.rewardsDesc")}</p>
        </a>
        <a
          href="/levels"
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-accent transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">{t("home.levelsTitle")}</h2>
          <p className="text-sm text-zinc-400">{t("home.levelsDesc")}</p>
        </a>
      </section>
    </div>
  );
}


