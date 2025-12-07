"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { useStore } from "../../src/store/useStore";
import { useToast } from "../../src/components/ToastProvider";
import { mapErrorKey } from "../../src/lib/errorMapping";
import { useI18n } from "../../src/i18n/useI18n";

interface RaceSummary {
  id: string;
  name: string;
  description?: string | null;
  gameType?: string | null;
  status: string;
  entryFee: string;
  startsAt: string;
  endsAt: string;
  prizePool: string;
  joined: boolean;
  volume: string;
}

interface LeaderboardItem {
  rank: number;
  username: string;
  volume: string;
  prize: string | null;
}

interface LeaderboardResponse {
  raceId: string;
  status: string;
  participants: LeaderboardItem[];
}

function formatTimeDiff(targetIso: string): string {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  if (isNaN(diffMs)) return "-";
  const future = diffMs > 0;
  const ms = Math.abs(diffMs);
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours <= 0 && minutes <= 0) {
    return future ? "now" : "ended";
  }
  const hPart = hours > 0 ? `${hours}h ` : "";
  const mPart = `${minutes}m`;
  return `${hPart}${mPart}`;
}

export default function RacesPage() {
  const { balance, fetchLevelAndBalance } = useStore();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [racesError, setRacesError] = useState<string | null>(null);
  const [loadingRaces, setLoadingRaces] = useState(false);

  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [joiningRaceId, setJoiningRaceId] = useState<string | null>(null);

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    setLoadingRaces(true);
    setRacesError(null);
    try {
      const data = await apiClient.get<RaceSummary[]>("/races/active");
      setRaces(data);
    } catch (e: any) {
      setRacesError(t("errors.generic"));
    } finally {
      setLoadingRaces(false);
    }
  };

  const loadLeaderboard = async (raceId: string) => {
    setSelectedRaceId(raceId);
    setLeaderboard(null);
    setLeaderboardError(null);
    try {
      const data = await apiClient.get<LeaderboardResponse>(`/races/${raceId}/leaderboard`);
      setLeaderboard(data);
    } catch (e: any) {
      setLeaderboardError(t("errors.generic"));
    }
  };

  const handleJoin = async (race: RaceSummary) => {
    if (race.joined) return;
    setJoiningRaceId(race.id);
    try {
      const data = await apiClient.post<{
        raceId: string;
        entryFee: string;
        prizePool: string;
        alreadyJoined: boolean;
      }>(`/races/${race.id}/join`);

      if (!data.alreadyJoined) {
        await fetchLevelAndBalance();
        addToast({
          type: "success",
          message: `Joined race ${race.name} (entry ${Math.round(parseFloat(data.entryFee)).toLocaleString()} FUN)`,
        });
      } else {
        addToast({
          type: "info",
          message: `Already joined race ${race.name}.`,
        });
      }

      await loadRaces();
      if (selectedRaceId === race.id) {
        await loadLeaderboard(race.id);
      }
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("races", e);
        addToast({
          type: "error",
          message: t(key),
        });
      } else {
        addToast({
          type: "error",
          message: t("errors.generic"),
        });
      }
    } finally {
      setJoiningRaceId(null);
    }
  };

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Races</h1>
        <p className="text-sm text-zinc-400 max-w-xl">
          Join races with a 100 FUN entry fee, compete on volume and win prizes for the
          top 25% of players.
        </p>
      </div>

      <section className="bg-card/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Current balance:{" "}
            <span className="text-accent font-semibold">
              {Math.round(balance).toLocaleString()} FUN
            </span>
          </div>
          <button
            onClick={loadRaces}
            className="text-xs px-2 py-1 rounded transition-colors"
          >
            Refresh
          </button>
        </div>

        {loadingRaces && <div className="text-sm text-zinc-400">Loading races...</div>}
        {racesError && <div className="text-sm text-red-400">{racesError}</div>}
        {!loadingRaces && !racesError && races.length === 0 && (
          <div className="text-sm text-zinc-400">No active races at the moment.</div>
        )}

        {races.length > 0 && (
          <div className="space-y-2 text-sm text-zinc-300">
            {races.map((race) => (
              <div
                key={race.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  selectedRaceId === race.id ? "bg-card/50" : ""
                }`}
                onClick={() => loadLeaderboard(race.id)}
              >
                <div>
                  <div className="font-semibold text-white">{race.name}</div>
                  <div className="text-xs text-zinc-400">
                    {race.description || "No description"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                    <div>
                      Entry fee: {Math.round(parseFloat(race.entryFee)).toLocaleString()} FUN • Prize pool: {Math.round(parseFloat(race.prizePool)).toLocaleString()} FUN
                    </div>
                    <div>
                      Status: {race.status} •{" "}
                      {race.status === "ACTIVE"
                        ? `Ends in ${formatTimeDiff(race.endsAt)}`
                        : `Starts in ${formatTimeDiff(race.startsAt)}`}
                    </div>
                  </div>
                  {race.joined && (
                    <div className="text-xs text-emerald-400">
                      Joined • Volume: {Math.round(parseFloat(race.volume || "0")).toLocaleString()} FUN
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoin(race);
                    }}
                    disabled={race.joined || joiningRaceId === race.id}
                    className="px-3 py-1 rounded bg-accent text-black text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {race.joined
                      ? "Joined"
                      : joiningRaceId === race.id
                      ? "Joining..."
                      : "Join Race (100 FUN)"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadLeaderboard(race.id);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-accent"
                  >
                    View leaderboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card/80 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Leaderboard</h2>
        {leaderboardError && (
          <div className="text-sm text-red-400">{leaderboardError}</div>
        )}
        {!leaderboard && !leaderboardError && (
          <div className="text-sm text-zinc-400">
            Select a race to view its leaderboard.
          </div>
        )}
        {leaderboard && (
          <div className="space-y-1 text-sm text-zinc-300">
            {leaderboard.participants.length === 0 && (
              <div className="text-zinc-400">No participants yet.</div>
            )}
            {leaderboard.participants.map((p) => (
              <div
                key={`${leaderboard.raceId}-${p.rank}`}
                className="flex justify-between py-1"
              >
                <div>
                  <div className="font-semibold">
                    #{p.rank} {p.username}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Volume: {Math.round(parseFloat(p.volume || "0")).toLocaleString()} FUN
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Prize</div>
                  <div className="text-sm font-semibold text-accent">
                    {p.prize ? `${Math.round(parseFloat(p.prize)).toLocaleString()} FUN` : "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </section>
  );
}


