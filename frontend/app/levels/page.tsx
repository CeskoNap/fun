"use client";

import { useEffect } from "react";
import { useStore } from "../../src/store/useStore";

const milestones = [10, 50, 100, 200, 300, 400, 500];

export default function LevelsPage() {
  const { level, xp, xpToNextLevel, fetchLevelAndBalance } = useStore();

  useEffect(() => {
    fetchLevelAndBalance();
  }, [fetchLevelAndBalance]);

  const totalForBar = xpToNextLevel && xpToNextLevel > 0 ? xp + xpToNextLevel : xp;
  const progress = totalForBar > 0 ? Math.min(1, xp / totalForBar) : 1;

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Levels</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          Earn XP by playing games, progress from level 1 to 500 and unlock rewards.
        </p>
      </div>

      <section className="bg-card/80 rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Current level</div>
            <div className="text-2xl font-semibold text-white">#{level}</div>
          </div>
          <div className="text-right text-sm text-zinc-400">
            <div>XP: {xp.toFixed(2)}</div>
            {xpToNextLevel > 0 ? (
              <div>XP to next level: {xpToNextLevel.toFixed(2)}</div>
            ) : (
              <div>Max level reached</div>
            )}
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Level {level}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </section>

      <section className="bg-card/80 rounded-md p-4 space-y-3">
        <h2 className="text-lg font-semibold">Milestones</h2>
        <div className="flex flex-wrap gap-3">
          {milestones.map((m) => {
            const unlocked = level >= m;
            return (
              <div
                key={m}
                className={`px-3 py-2 rounded-md text-xs ${
                  unlocked
                    ? "text-accent bg-accent/10"
                    : "text-zinc-400"
                }`}
              >
                Level {m} {unlocked ? "• unlocked" : "• locked"}
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </section>
  );
}


