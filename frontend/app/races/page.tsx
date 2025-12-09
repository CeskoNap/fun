"use client";

import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { useStore } from "../../src/store/useStore";
import { useToast } from "../../src/components/ToastProvider";
import { mapErrorKey } from "../../src/lib/errorMapping";
import { useI18n } from "../../src/i18n/useI18n";
import { useUserSocket } from "../../src/hooks/useUserSocket";

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
  totalVolume: string;
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

// Memoized component to prevent unnecessary re-renders
// Component that uses refs to update values directly in DOM without re-rendering
const LeaderboardRow = ({ participant, index, raceId, refsMap }: { 
  participant: LeaderboardItem; 
  index: number;
  raceId: string;
  refsMap: React.MutableRefObject<Map<string, { volumeRef: HTMLDivElement | null; prizeRef: HTMLDivElement | null }>>;
}) => {
  const volumeRef = useRef<HTMLDivElement>(null);
  const prizeRef = useRef<HTMLDivElement>(null);
  const key = `${raceId}-${participant.username}-${participant.rank}`;
  
  useLayoutEffect(() => {
    // Register refs in the map so we can update them directly
    // Use layout effect to ensure refs are set before paint
    if (volumeRef.current && prizeRef.current) {
      refsMap.current.set(key, { volumeRef: volumeRef.current, prizeRef: prizeRef.current });
    }
    
    return () => {
      refsMap.current.delete(key);
    };
  }, [key, refsMap]);
  
  const prizeValue = participant.prize && participant.prize !== "0" && participant.prize !== "null" && parseFloat(participant.prize) > 0 
    ? (parseFloat(participant.prize) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "-";
  const volumeValue = Math.round(parseFloat(participant.volume || "0") / 100).toLocaleString();
  
  return (
    <div
      className={`flex justify-between py-3 px-4 ${
        index % 2 === 0 ? "bg-[#142633]" : "bg-[#0F212E]"
      }`}
    >
      <div>
        <div className="font-semibold">
          #{participant.rank} {participant.username}
        </div>
        <div ref={volumeRef} className="text-xs text-zinc-500">
          Volume: {volumeValue} FUN
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-zinc-500">Prize</div>
        <div ref={prizeRef} className="text-sm font-semibold text-accent">
          {prizeValue !== "-" ? `${prizeValue} FUN` : "-"}
        </div>
      </div>
    </div>
  );
};

function formatTimeDiff(targetIso: string, status?: string): string {
  try {
    // Parse the ISO string (UTC) and convert to Italian timezone for display
    const target = new Date(targetIso);
    const now = new Date();
    
    if (isNaN(target.getTime())) {
      console.error("Invalid date:", targetIso);
      return "-";
    }
    
    // Both dates are in UTC, so the difference is correct
    const diffMs = target.getTime() - now.getTime();
    const future = diffMs > 0;
    const ms = Math.abs(diffMs);
    
    // If the date is in the past
    if (!future) {
      // If status is UPCOMING but date is past, it means the race should start soon or is delayed
      if (status === "UPCOMING") {
        return "starting soon";
      }
      // Otherwise it's ended
      return "ended";
    }
    
    // If less than 1 minute in the future, show "now"
    if (ms < 60000) {
      return "now";
    }
    
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return "now";
    }
  } catch (e) {
    console.error("Error in formatTimeDiff:", e, targetIso);
    return "-";
  }
}

export default function RacesPage() {
  const { balance, fetchLevelAndBalance } = useStore();
  const { addToast } = useToast();
  const { t } = useI18n();
  useUserSocket(); // Initialize websocket connection

  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [racesError, setRacesError] = useState<string | null>(null);
  const [loadingRaces, setLoadingRaces] = useState(false);

  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const leaderboardRefs = useRef<Map<string, { volumeRef: HTMLDivElement | null; prizeRef: HTMLDivElement | null }>>(new Map());
  const leaderboardDataRef = useRef<LeaderboardResponse | null>(null); // Keep data in ref to avoid re-renders

  const [joiningRaceId, setJoiningRaceId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadRaces = useCallback(async () => {
    setLoadingRaces(true);
    setRacesError(null);
    try {
      const data = await apiClient.get<RaceSummary[]>("/races/active");
      // Log dates for debugging
      data.forEach(race => {
        console.log(`Race ${race.name}: startsAt="${race.startsAt}", parsed=${new Date(race.startsAt).toLocaleString()}, now=${new Date().toLocaleString()}`);
      });
      setRaces(data);
    } catch (e: any) {
      setRacesError(t("errors.generic"));
      console.error("Error loading races:", e);
    } finally {
      setLoadingRaces(false);
    }
  }, [t]);

  const loadLeaderboard = useCallback(async (raceId: string, skipReset: boolean = false) => {
    // Only reset if it's a new race selection, not during auto-updates
    if (!skipReset && selectedRaceId !== raceId) {
      setSelectedRaceId(raceId);
      setLeaderboard(null);
      leaderboardRefs.current.clear();
      leaderboardDataRef.current = null;
    } else if (!skipReset) {
      setSelectedRaceId(raceId);
    }
    
    setLeaderboardError(null);
    try {
      const data = await apiClient.get<LeaderboardResponse>(`/races/${raceId}/leaderboard`);
      if (data) {
        const prev = leaderboardDataRef.current;
        
        // If we have previous data and it's the same race, update DOM directly without touching state
        if (prev && prev.raceId === data.raceId && skipReset) {
          // Update DOM directly for changed values
          data.participants.forEach((newP, index) => {
            const oldP = prev.participants[index];
            if (oldP) {
              const key = `${data.raceId}-${newP.username}-${newP.rank}`;
              const refs = leaderboardRefs.current.get(key);
              
              if (refs) {
                // Update volume if changed
                if (oldP.volume !== newP.volume && refs.volumeRef) {
                  const volumeValue = Math.round(parseFloat(newP.volume || "0") / 100).toLocaleString();
                  refs.volumeRef.textContent = `Volume: ${volumeValue} FUN`;
                }
                
                // Update prize if changed
                if (oldP.prize !== newP.prize && refs.prizeRef) {
                  const prizeValue = newP.prize && newP.prize !== "0" && newP.prize !== "null" && parseFloat(newP.prize) > 0 
                    ? `${(parseFloat(newP.prize) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FUN`
                    : "-";
                  refs.prizeRef.textContent = prizeValue;
                }
              }
            }
          });
          
          // Check if structure changed (new participants, removed participants, or rank changes)
          const structureChanged = prev.participants.length !== data.participants.length ||
            prev.participants.some((oldP, index) => {
              const newP = data.participants[index];
              return !newP || oldP.username !== newP.username || oldP.rank !== newP.rank;
            });
          
          // Only update state if structure changed, otherwise just update ref
          if (structureChanged || prev.status !== data.status) {
            leaderboardDataRef.current = data;
            setLeaderboard(data);
          } else {
            // Structure unchanged, just update ref without touching state
            leaderboardDataRef.current = data;
            // Don't call setLeaderboard to avoid re-render
          }
        } else {
          // New race or first load, update both state and ref
          leaderboardDataRef.current = data;
          setLeaderboard(data);
        }
      }
    } catch (e: any) {
      // Don't clear leaderboard on error if we're doing an auto-update
      if (!skipReset) {
        setLeaderboardError(t("errors.generic"));
      }
    }
  }, [t, selectedRaceId]);

  useEffect(() => {
    loadRaces();

    // Setup polling to refresh race data every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      loadRaces();
      if (selectedRaceId) {
        loadLeaderboard(selectedRaceId, true); // Skip reset to avoid visual jump
      }
    }, 5000);

    // Also listen to bet:resolved events via custom event (emitted by useUserSocket)
    const handleBetResolved = () => {
      console.log("Bet resolved, updating races...");
      loadRaces();
      if (selectedRaceId) {
        loadLeaderboard(selectedRaceId, true); // Skip reset to avoid visual jump
      }
    };

    // Listen to custom event that will be emitted when bet is resolved
    window.addEventListener('race:update', handleBetResolved);

    // Listen to race:settled WebSocket event
    const handleRaceSettled = (event: CustomEvent) => {
      console.log("Race settled, updating leaderboard...", event.detail);
      loadRaces();
      if (selectedRaceId) {
        loadLeaderboard(selectedRaceId, true); // Skip reset to avoid visual jump
      }
    };

    window.addEventListener('race:settled', handleRaceSettled as EventListener);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      window.removeEventListener('race:update', handleBetResolved);
      window.removeEventListener('race:settled', handleRaceSettled as EventListener);
    };
  }, [loadRaces, loadLeaderboard, selectedRaceId]);

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
          message: `Joined race ${race.name} (entry ${Math.round(parseFloat(data.entryFee) / 100).toLocaleString()} FUN)`,
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
              {balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
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
                className={`flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors ${
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
                    Entry fee: {Math.round(parseFloat(race.entryFee) / 100).toLocaleString()} FUN • Prize pool: {Math.round(parseFloat(race.prizePool) / 100).toLocaleString()} FUN
                    </div>
                    <div>
                      Status: {race.status} •{" "}
                      {race.status === "ACTIVE"
                        ? `Ends in ${formatTimeDiff(race.endsAt, race.status)}`
                        : `Starts in ${formatTimeDiff(race.startsAt, race.status)}`}
                    </div>
                  <div>
                    Total volume: {Math.round(parseFloat(race.totalVolume || "0") / 100).toLocaleString()} FUN
                  </div>
                  </div>
                  {race.joined && (
                    <div className="text-xs text-emerald-400">
                    Joined • Your volume: {Math.round(parseFloat(race.volume || "0") / 100).toLocaleString()} FUN
                      {race.status === "ACTIVE" && " (updating...)"}
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
                      : `Join Race (${Math.round(parseFloat(race.entryFee) / 100).toLocaleString()} FUN)`}
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

      <section className="bg-card/80 rounded-md p-4 space-y-3">
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
          <div className="text-sm text-zinc-300">
            {leaderboard.participants.length === 0 && (
              <div className="text-zinc-400">No participants yet.</div>
            )}
            {leaderboard.participants.map((p, index) => (
              <LeaderboardRow
                key={`${leaderboard.raceId}-${p.username}-${p.rank}`}
                participant={p}
                index={index}
                raceId={leaderboard.raceId}
                refsMap={leaderboardRefs}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </section>
  );
}


