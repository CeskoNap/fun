"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../../src/i18n/useI18n";

interface Race {
  id: string;
  name: string;
  description: string | null;
  status: string;
  gameType: string | null;
  entryFee: string;
  prizePool: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export default function AdminRacesPage() {
  const { t } = useI18n();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRace, setNewRace] = useState({
    name: "",
    description: "",
    gameType: "",
    startsAt: "",
    endsAt: "",
  });

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/races`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load races");
      }

      const data = await res.json();
      setRaces(data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load races");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRace = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRace.name,
          description: newRace.description || undefined,
          gameType: newRace.gameType || null,
          startsAt: newRace.startsAt,
          endsAt: newRace.endsAt,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create race");
      }

      setShowCreateModal(false);
      setNewRace({ name: "", description: "", gameType: "", startsAt: "", endsAt: "" });
      loadRaces();
    } catch (e: any) {
      alert(e.message || "Failed to create race");
    }
  };

  const handleActivate = async (raceId: string) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${raceId}/activate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to activate race");
      }

      loadRaces();
    } catch (e: any) {
      alert(e.message || "Failed to activate race");
    }
  };

  const handleCancel = async (raceId: string) => {
    if (!confirm("Are you sure you want to cancel this race?")) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${raceId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to cancel race");
      }

      loadRaces();
    } catch (e: any) {
      alert(e.message || "Failed to cancel race");
    }
  };

  const handleSettle = async (raceId: string) => {
    if (!confirm("Are you sure you want to settle this race? This will distribute prizes.")) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${raceId}/settle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to settle race");
      }

      loadRaces();
    } catch (e: any) {
      alert(e.message || "Failed to settle race");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-900 text-green-300";
      case "UPCOMING":
        return "bg-blue-900 text-blue-300";
      case "ENDED":
        return "bg-zinc-700 text-zinc-300";
      case "CANCELLED":
        return "bg-red-900 text-red-300";
      default:
        return "bg-zinc-700 text-zinc-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Race Management</h1>
          <p className="text-zinc-400">Create, activate, and manage races</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90"
        >
          Create Race
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading races...</div>
      ) : (
        <div className="bg-card/80 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Game Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Entry Fee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Prize Pool</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Starts</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Ends</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {races.map((race) => (
                <tr key={race.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-white">{race.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(race.status)}`}>
                      {race.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{race.gameType || "All"}</td>
                  <td className="px-4 py-3 text-accent">{Math.round(parseFloat(race.entryFee)).toLocaleString()} FUN</td>
                  <td className="px-4 py-3 text-green-400">{Math.round(parseFloat(race.prizePool)).toLocaleString()} FUN</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {new Date(race.startsAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {new Date(race.endsAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {race.status === "UPCOMING" && (
                        <button
                          onClick={() => handleActivate(race.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Activate
                        </button>
                      )}
                      {race.status === "UPCOMING" && (
                        <button
                          onClick={() => handleCancel(race.id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                      {race.status === "ACTIVE" && (
                        <button
                          onClick={() => handleSettle(race.id)}
                          className="px-3 py-1 bg-accent text-black text-xs rounded hover:bg-accent/90"
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Race Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Race</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={newRace.name}
                  onChange={(e) => setNewRace({ ...newRace, name: e.target.value })}
                  className="w-full bg-zinc-800 rounded px-3 py-2 text-white"
                  placeholder="Race name"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Description</label>
                <textarea
                  value={newRace.description}
                  onChange={(e) => setNewRace({ ...newRace, description: e.target.value })}
                  className="w-full bg-zinc-800 rounded px-3 py-2 text-white"
                  placeholder="Race description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Game Type</label>
                <select
                  value={newRace.gameType}
                  onChange={(e) => setNewRace({ ...newRace, gameType: e.target.value })}
                  className="w-full bg-zinc-800 rounded px-3 py-2 text-white"
                >
                  <option value="">All Games</option>
                  <option value="MINES">Mines</option>
                  <option value="PLINKO">Plinko</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Starts At *</label>
                <input
                  type="datetime-local"
                  value={newRace.startsAt}
                  onChange={(e) => setNewRace({ ...newRace, startsAt: e.target.value })}
                  className="w-full bg-zinc-800 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Ends At *</label>
                <input
                  type="datetime-local"
                  value={newRace.endsAt}
                  onChange={(e) => setNewRace({ ...newRace, endsAt: e.target.value })}
                  className="w-full bg-zinc-800 rounded px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateRace}
                  disabled={!newRace.name || !newRace.startsAt || !newRace.endsAt}
                  className="flex-1 px-4 py-2 bg-accent text-black rounded hover:bg-accent/90 disabled:opacity-50"
                >
                  Create Race
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRace({ name: "", description: "", gameType: "", startsAt: "", endsAt: "" });
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

