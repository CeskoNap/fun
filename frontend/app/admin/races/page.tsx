"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../../src/i18n/useI18n";

function ParticipantRow({ participant, index, onUpdateVolume, onRemove }: {
  participant: any;
  index: number;
  onUpdateVolume: (volume: string) => void;
  onRemove: () => void;
}) {
  const [editVolume, setEditVolume] = useState((parseFloat(participant.volume) / 100).toFixed(2));
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`flex items-center justify-between p-3 rounded-md ${
      index % 2 === 0 ? "bg-zinc-800/30" : "bg-zinc-800/50"
    }`}>
      <span className="text-xs font-semibold text-zinc-400 w-8">#{index + 1}</span>
      <span className="text-sm text-white flex-1">{participant.username}</span>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <input
              type="number"
              step="0.01"
              value={editVolume}
              onChange={(e) => setEditVolume(e.target.value)}
              className="w-24 bg-zinc-700 rounded-md px-2 py-1 text-white text-sm"
            />
            <button
              onClick={() => {
                onUpdateVolume(editVolume);
                setIsEditing(false);
              }}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditVolume((parseFloat(participant.volume) / 100).toFixed(2));
              }}
              className="px-2 py-1 bg-zinc-600 text-white text-xs rounded-md hover:bg-zinc-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-green-400 w-24 text-right">{(parseFloat(participant.volume) / 100).toFixed(2)} FUN</span>
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
          </>
        )}
        <button
          onClick={onRemove}
          className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

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
    gameTypes: [] as string[], // Array for multiple game types
    startsAt: "",
    endsAt: "",
    entryFee: "free", // "free" or a number string
    prizePool: "", // Prize pool amount as number string
  });
  const [dateErrors, setDateErrors] = useState<{ startsAt?: string; endsAt?: string; general?: string }>({});
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [editDates, setEditDates] = useState({ startsAt: "", endsAt: "", prizePool: "" });
  const [showEditPrizePoolModal, setShowEditPrizePoolModal] = useState(false);
  const [editPrizePool, setEditPrizePool] = useState("");
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ username: "", volume: "" });

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
      setDateErrors({});

      // Validation
      if (!newRace.name || !newRace.startsAt || !newRace.endsAt) {
        alert("Please fill in all required fields");
        return;
      }

      // Detailed date validation
      const startsAtDate = new Date(newRace.startsAt);
      const endsAtDate = new Date(newRace.endsAt);
      const now = new Date();

      // Check if dates are valid
      if (isNaN(startsAtDate.getTime())) {
        setDateErrors({ startsAt: "Invalid start date format" });
        return;
      }

      if (isNaN(endsAtDate.getTime())) {
        setDateErrors({ endsAt: "Invalid end date format" });
        return;
      }

      // Check if start date is in the future (at least 1 minute from now)
      const oneMinuteFromNow = new Date(now.getTime() + 60000);
      if (startsAtDate < oneMinuteFromNow) {
        setDateErrors({ 
          startsAt: "Start date must be at least 1 minute in the future",
          general: "The race must start at least 1 minute from now"
        });
        return;
      }

      // Check if end date is after start date
      if (endsAtDate <= startsAtDate) {
        setDateErrors({ 
          endsAt: "End date must be after start date",
          general: "The race end time must be after the start time"
        });
        return;
      }

      // Check minimum duration (at least 1 hour)
      const minDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      if (endsAtDate.getTime() - startsAtDate.getTime() < minDuration) {
        setDateErrors({ 
          general: "The race must last at least 1 hour"
        });
        return;
      }

      // Convert datetime-local to ISO string with Italian timezone (CET/CEST)
      // datetime-local gives us a string like "2024-01-15T20:12" in local time (Italian timezone)
      // We need to create a Date object that treats this as Italian local time
      // and then convert to ISO string (UTC) for the backend
      
      // Helper function to convert datetime-local string to ISO string
      // treating the input as Italian local time
      const convertToISO = (datetimeLocal: string): string => {
        // datetime-local format: "YYYY-MM-DDTHH:mm"
        // Create a date string that will be interpreted as local time
        // Then convert to UTC for ISO string
        const localDate = new Date(datetimeLocal);
        
        // Verify the date is valid
        if (isNaN(localDate.getTime())) {
          throw new Error(`Invalid date: ${datetimeLocal}`);
        }
        
        // toISOString() converts to UTC, which is what we need for the backend
        // The Date constructor with datetime-local string already interprets it as local time
        return localDate.toISOString();
      };
      
      const startsAtISO = convertToISO(newRace.startsAt);
      const endsAtISO = convertToISO(newRace.endsAt);
      
      console.log("Date conversion (Italian timezone):", {
        input: newRace.startsAt,
        localDate: new Date(newRace.startsAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
        isoString: startsAtISO,
        parsedBack: new Date(startsAtISO).toLocaleString("it-IT", { timeZone: "Europe/Rome" })
      });

      // Determine gameType: null if no games selected (all games), or first game type if selected
      // Note: Backend currently supports single gameType, we'll send the first one or null
      const gameType = newRace.gameTypes.length > 0 ? newRace.gameTypes[0] : null;

      // Parse entry fee: "free" = 0, otherwise convert to centesimi (multiply by 100)
      const entryFeeValue = newRace.entryFee === "free" ? 0 : parseFloat(newRace.entryFee);
      if (isNaN(entryFeeValue) || entryFeeValue < 0) {
        alert("Invalid entry fee. Must be 'free' or a positive integer.");
        return;
      }
      const entryFeeInCentesimi = Math.round(entryFeeValue * 100);

      // Parse prize pool: must be a positive number
      const prizePoolValue = parseFloat(newRace.prizePool);
      if (isNaN(prizePoolValue) || prizePoolValue < 0) {
        alert("Invalid prize pool. Must be a positive number.");
        return;
      }
      const prizePoolInCentesimi = Math.round(prizePoolValue * 100);

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
          gameType: gameType,
          startsAt: startsAtISO,
          endsAt: endsAtISO,
          entryFee: entryFeeInCentesimi,
          prizePool: prizePoolInCentesimi,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to create race";
        try {
          const error = await res.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setShowCreateModal(false);
      setNewRace({ name: "", description: "", gameTypes: [], startsAt: "", endsAt: "", entryFee: "free", prizePool: "" });
      setDateErrors({});
      loadRaces();
      alert("Race created successfully!");
    } catch (e: any) {
      console.error("Error creating race:", e);
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

  const handleDelete = async (raceId: string) => {
    if (!confirm("Are you sure you want to delete this race? This action cannot be undone.")) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${raceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete race");
      }

      loadRaces();
      alert("Race deleted successfully");
    } catch (e: any) {
      alert(e.message || "Failed to delete race");
    }
  };

  const handleViewParticipants = async (raceId: string) => {
    setSelectedRaceId(raceId);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${raceId}/participants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load participants");
      }

      const data = await res.json();
      setParticipants(data || []);
      setShowParticipantsModal(true);
    } catch (e: any) {
      alert(e.message || "Failed to load participants");
    }
  };

  const handleEditDates = (race: Race) => {
    setSelectedRaceId(race.id);
    // Convert UTC date to Italian local time for datetime-local input
    const convertUTCToLocal = (utcDateString: string): string => {
      const date = new Date(utcDateString);
      // Get local date components in Italian timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setEditDates({
      startsAt: convertUTCToLocal(race.startsAt),
      endsAt: convertUTCToLocal(race.endsAt),
      prizePool: (parseFloat(race.prizePool) / 100).toFixed(2),
    });
    setShowEditDatesModal(true);
  };

  const handleUpdateDates = async () => {
    if (!selectedRaceId) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      // Convert datetime-local (Italian time) to ISO string (UTC)
      const convertToISO = (datetimeLocal: string): string => {
        const localDate = new Date(datetimeLocal);
        if (isNaN(localDate.getTime())) {
          throw new Error(`Invalid date: ${datetimeLocal}`);
        }
        return localDate.toISOString();
      };

      const startsAtISO = convertToISO(editDates.startsAt);
      const endsAtISO = convertToISO(editDates.endsAt);

      // Parse and validate prize pool
      const prizePoolValue = parseFloat(editDates.prizePool);
      if (isNaN(prizePoolValue) || prizePoolValue < 0) {
        alert("Invalid prize pool. Must be a positive number.");
        return;
      }
      const prizePoolInCentesimi = Math.round(prizePoolValue * 100);

      const res = await fetch(`${API_BASE}/admin/races/${selectedRaceId}/dates`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startsAt: startsAtISO,
          endsAt: endsAtISO,
          prizePool: prizePoolInCentesimi,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update dates");
      }

      setShowEditDatesModal(false);
      loadRaces();
      alert("Race dates and prize pool updated successfully");
    } catch (e: any) {
      alert(e.message || "Failed to update dates");
    }
  };

  const handleEditPrizePool = (race: Race) => {
    setSelectedRaceId(race.id);
    setEditPrizePool((parseFloat(race.prizePool) / 100).toFixed(2));
    setShowEditPrizePoolModal(true);
  };

  const handleUpdatePrizePool = async () => {
    if (!selectedRaceId) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      // Parse and validate prize pool
      const prizePoolValue = parseFloat(editPrizePool);
      if (isNaN(prizePoolValue) || prizePoolValue < 0) {
        alert("Invalid prize pool. Must be a positive number.");
        return;
      }
      const prizePoolInCentesimi = Math.round(prizePoolValue * 100);

      const res = await fetch(`${API_BASE}/admin/races/${selectedRaceId}/dates`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prizePool: prizePoolInCentesimi,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update prize pool");
      }

      setShowEditPrizePoolModal(false);
      loadRaces();
      alert("Prize pool updated successfully");
    } catch (e: any) {
      alert(e.message || "Failed to update prize pool");
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedRaceId || !newParticipant.username.trim()) {
      alert("Please enter a username");
      return;
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${selectedRaceId}/participants`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newParticipant.username.trim(),
          volume: newParticipant.volume || "0",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add participant");
      }

      setNewParticipant({ username: "", volume: "" });
      handleViewParticipants(selectedRaceId);
      alert("Participant added successfully");
    } catch (e: any) {
      alert(e.message || "Failed to add participant");
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedRaceId) return;
    if (!confirm("Are you sure you want to remove this participant?")) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${selectedRaceId}/participants/${participantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to remove participant");
      }

      handleViewParticipants(selectedRaceId);
      alert("Participant removed successfully");
    } catch (e: any) {
      alert(e.message || "Failed to remove participant");
    }
  };

  const handleUpdateParticipantVolume = async (participantId: string, newVolume: string) => {
    if (!selectedRaceId) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/races/${selectedRaceId}/participants/${participantId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          volume: newVolume,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update volume");
      }

      handleViewParticipants(selectedRaceId);
      alert("Participant volume updated successfully");
    } catch (e: any) {
      alert(e.message || "Failed to update volume");
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
          className="px-4 py-2 bg-accent text-black font-semibold rounded-md hover:bg-accent/90"
        >
          Create Race
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 rounded-md p-4 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading races...</div>
      ) : (
        <div className="bg-card/80 rounded-md overflow-hidden">
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
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(race.status)}`}>
                      {race.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{race.gameType || "All"}</td>
                  <td className="px-4 py-3 text-accent">{(parseFloat(race.entryFee) / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FUN</td>
                  <td className="px-4 py-3 text-green-400">{(parseFloat(race.prizePool) / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FUN</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {new Date(race.startsAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {new Date(race.endsAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleViewParticipants(race.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                        title="View participants"
                      >
                        Participants
                      </button>
                      {(race.status === "UPCOMING" || race.status === "ACTIVE") && (
                        <>
                          <button
                            onClick={() => handleEditDates(race)}
                            className="px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700"
                            title="Edit dates"
                          >
                            Edit Dates
                          </button>
                          <button
                            onClick={() => handleEditPrizePool(race)}
                            className="px-3 py-1 bg-yellow-600 text-white text-xs rounded-md hover:bg-yellow-700"
                            title="Edit prize pool"
                          >
                            Edit Prize Pool
                          </button>
                        </>
                      )}
                      {race.status === "UPCOMING" && (
                        <button
                          onClick={() => handleActivate(race.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                        >
                          Activate
                        </button>
                      )}
                      {race.status === "UPCOMING" && (
                        <button
                          onClick={() => handleCancel(race.id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                      {race.status === "ACTIVE" && (
                        <button
                          onClick={() => handleSettle(race.id)}
                          className="px-3 py-1 bg-accent text-black text-xs rounded-md hover:bg-accent/90"
                        >
                          Settle
                        </button>
                      )}
                      {(race.status === "UPCOMING" || race.status === "CANCELLED" || race.status === "ENDED") && (
                        <button
                          onClick={() => handleDelete(race.id)}
                          className="px-3 py-1 bg-red-800 text-white text-xs rounded-md hover:bg-red-900"
                          title="Delete race"
                        >
                          Delete
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
          <div className="bg-card rounded-md w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Race</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={newRace.name}
                  onChange={(e) => setNewRace({ ...newRace, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                  style={{ backgroundColor: "#E8F0FE" }}
                  placeholder="Race name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  value={newRace.description}
                  onChange={(e) => setNewRace({ ...newRace, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                  style={{ backgroundColor: "#E8F0FE" }}
                  placeholder="Race description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Game Types</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRace.gameTypes.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRace({ ...newRace, gameTypes: [] });
                        }
                      }}
                      className="w-4 h-4 rounded text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-white">All Games</span>
                  </label>
                  {["MINES", "PLINKO", "CRASH", "DICE"].map((gameType) => (
                    <label key={gameType} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRace.gameTypes.includes(gameType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRace({ ...newRace, gameTypes: [...newRace.gameTypes, gameType] });
                          } else {
                            setNewRace({ ...newRace, gameTypes: newRace.gameTypes.filter(gt => gt !== gameType) });
                          }
                        }}
                        disabled={newRace.gameTypes.length === 0 && !newRace.gameTypes.includes(gameType)}
                        className="w-4 h-4 rounded text-accent focus:ring-accent disabled:opacity-50"
                      />
                      <span className="text-sm text-white">{gameType}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Entry Fee *</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="radio"
                      name="entryFee"
                      checked={newRace.entryFee === "free"}
                      onChange={() => setNewRace({ ...newRace, entryFee: "free" })}
                      className="w-4 h-4 text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-white">Free</span>
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="radio"
                      name="entryFee"
                      checked={newRace.entryFee !== "free"}
                      onChange={() => setNewRace({ ...newRace, entryFee: "100" })}
                      className="w-4 h-4 text-accent focus:ring-accent"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newRace.entryFee === "free" ? "" : newRace.entryFee}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && Number.isInteger(parseFloat(value)))) {
                          setNewRace({ ...newRace, entryFee: value || "free" });
                        }
                      }}
                      disabled={newRace.entryFee === "free"}
                      className="flex-1 px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#E8F0FE" }}
                      placeholder="Amount (FUN)"
                    />
                    <span className="text-sm text-white">FUN</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Prize Pool *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newRace.prizePool}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setNewRace({ ...newRace, prizePool: value });
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ backgroundColor: "#E8F0FE" }}
                    placeholder="Prize pool amount (FUN)"
                    required
                  />
                  <span className="text-sm text-white">FUN</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Distribution: 25% (1st), 15% (2nd), 10% (3rd), 20% (4th-10th), 30% (11th-50th)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Starts At * <span className="text-xs text-zinc-500">(Italian timezone - CET/CEST)</span>
                </label>
                <input
                  type="datetime-local"
                  value={newRace.startsAt}
                  onChange={(e) => {
                    setNewRace({ ...newRace, startsAt: e.target.value });
                    setDateErrors({});
                  }}
                  className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                  style={{ backgroundColor: "#E8F0FE" }}
                />
                {newRace.startsAt && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Local: {new Date(newRace.startsAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
                  </p>
                )}
                {dateErrors.startsAt && (
                  <p className="text-red-400 text-xs mt-1">{dateErrors.startsAt}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Ends At * <span className="text-xs text-zinc-500">(Italian timezone - CET/CEST)</span>
                </label>
                <input
                  type="datetime-local"
                  value={newRace.endsAt}
                  onChange={(e) => {
                    setNewRace({ ...newRace, endsAt: e.target.value });
                    setDateErrors({});
                  }}
                  className="w-full px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                  style={{ backgroundColor: "#E8F0FE" }}
                />
                {newRace.endsAt && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Local: {new Date(newRace.endsAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
                  </p>
                )}
                {dateErrors.endsAt && (
                  <p className="text-red-400 text-xs mt-1">{dateErrors.endsAt}</p>
                )}
              </div>
              {dateErrors.general && (
                <div className="p-3 bg-red-900/30 rounded-md text-red-400 text-sm">
                  {dateErrors.general}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCreateRace}
                  disabled={!newRace.name || !newRace.startsAt || !newRace.endsAt || !newRace.prizePool}
                  className="flex-1 px-4 py-2 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Race
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRace({ name: "", description: "", gameTypes: [], startsAt: "", endsAt: "", entryFee: "free", prizePool: "" });
                    setDateErrors({});
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dates Modal */}
      {showEditDatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-md w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Edit Race Dates & Prize Pool</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Starts At *</label>
                <input
                  type="datetime-local"
                  value={editDates.startsAt}
                  onChange={(e) => setEditDates({ ...editDates, startsAt: e.target.value })}
                  className="w-full bg-zinc-800 rounded-md px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Ends At *</label>
                <input
                  type="datetime-local"
                  value={editDates.endsAt}
                  onChange={(e) => setEditDates({ ...editDates, endsAt: e.target.value })}
                  className="w-full bg-zinc-800 rounded-md px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Prize Pool *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editDates.prizePool}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setEditDates({ ...editDates, prizePool: value });
                      }
                    }}
                    className="flex-1 bg-zinc-800 rounded-md px-3 py-2 text-white"
                    placeholder="Prize pool amount (FUN)"
                    required
                  />
                  <span className="text-sm text-white">FUN</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Distribution: 25% (1st), 15% (2nd), 10% (3rd), 20% (4th-10th), 30% (11th-50th)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateDates}
                  disabled={!editDates.startsAt || !editDates.endsAt || !editDates.prizePool}
                  className="flex-1 px-4 py-2 bg-accent text-black rounded-md hover:bg-accent/90 disabled:opacity-50"
                >
                  Update
                </button>
                <button
                  onClick={() => setShowEditDatesModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedRaceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-md w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Race Participants</h3>
              <button
                onClick={() => {
                  setShowParticipantsModal(false);
                  setShowAddParticipantModal(false);
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Add Participant Section */}
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-md">
              <h4 className="text-sm font-semibold text-white mb-3">Add Participant</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParticipant.username}
                  onChange={(e) => setNewParticipant({ ...newParticipant, username: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  style={{ backgroundColor: "#E8F0FE" }}
                  placeholder="Username"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newParticipant.volume}
                  onChange={(e) => setNewParticipant({ ...newParticipant, volume: e.target.value })}
                  className="w-32 px-4 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  style={{ backgroundColor: "#E8F0FE" }}
                  placeholder="Volume (FUN)"
                />
                <button
                  onClick={handleAddParticipant}
                  disabled={!newParticipant.username.trim()}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Participants List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-xs font-semibold text-zinc-400">Rank</span>
                <span className="text-xs font-semibold text-zinc-400">Username</span>
                <span className="text-xs font-semibold text-zinc-400">Volume (FUN)</span>
                <span className="text-xs font-semibold text-zinc-400">Actions</span>
              </div>
              {participants.length === 0 ? (
                <div className="text-center text-zinc-400 py-8">No participants yet</div>
              ) : (
                participants.map((p, index) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    index={index}
                    onUpdateVolume={(volume) => handleUpdateParticipantVolume(p.id, volume)}
                    onRemove={() => handleRemoveParticipant(p.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Prize Pool Modal */}
      {showEditPrizePoolModal && selectedRaceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-md w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit Prize Pool</h3>
              <button
                onClick={() => {
                  setShowEditPrizePoolModal(false);
                  setEditPrizePool("");
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Prize Pool (FUN)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrizePool}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setEditPrizePool(value);
                      }
                    }}
                    className="flex-1 bg-zinc-800 rounded-md px-3 py-2 text-white"
                    placeholder="Prize pool amount (FUN)"
                    required
                  />
                  <span className="text-sm text-white">FUN</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Distribution: 25% (1st), 15% (2nd), 10% (3rd), 20% (4th-10th), 30% (11th-50th)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdatePrizePool}
                  disabled={!editPrizePool || parseFloat(editPrizePool) < 0}
                  className="flex-1 px-4 py-2 bg-accent text-black rounded-md hover:bg-accent/90 disabled:opacity-50"
                >
                  Update Prize Pool
                </button>
                <button
                  onClick={() => {
                    setShowEditPrizePoolModal(false);
                    setEditPrizePool("");
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700"
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

