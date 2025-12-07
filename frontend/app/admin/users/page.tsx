"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../../src/i18n/useI18n";

interface User {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  role: string;
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  balance: string;
  level: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE}/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load users");
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e: any) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    if (!selectedUser) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/ban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: banReason || undefined }),
      });

      if (!res.ok) {
        throw new Error("Failed to ban user");
      }

      setShowBanModal(false);
      setBanReason("");
      setSelectedUser(null);
      loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to ban user");
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${userId}/unban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to unban user");
      }

      loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to unban user");
    }
  };

  const handleGiveTokens = async () => {
    if (!selectedUser || !tokenAmount) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/give-tokens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(tokenAmount) }),
      });

      if (!res.ok) {
        throw new Error("Failed to give tokens");
      }

      setShowTokenModal(false);
      setTokenAmount("");
      setSelectedUser(null);
      loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to give tokens");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-zinc-400">Manage users, ban/unban, and give tokens</p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading users...</div>
      ) : (
        <>
          {/* Users Table */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-white">{user.username}</td>
                    <td className="px-4 py-3 text-zinc-400">{user.email || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === "ADMIN" ? "bg-purple-900 text-purple-300" :
                        user.role === "MODERATOR" ? "bg-blue-900 text-blue-300" :
                        "bg-zinc-700 text-zinc-300"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-accent font-semibold">{Math.round(parseFloat(user.balance)).toLocaleString()} FUN</td>
                    <td className="px-4 py-3 text-white">#{user.level}</td>
                    <td className="px-4 py-3">
                      {user.isBanned ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-900 text-red-300">
                          Banned
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-900 text-green-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanModal(true);
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowTokenModal(true);
                          }}
                          className="px-3 py-1 bg-accent text-black text-xs rounded hover:bg-accent/90"
                        >
                          Give Tokens
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-zinc-800 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-zinc-800 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Ban User: {selectedUser.username}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                  placeholder="Ban reason..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBan}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Ban User
                </button>
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setBanReason("");
                    setSelectedUser(null);
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

      {/* Give Tokens Modal */}
      {showTokenModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Give Tokens to: {selectedUser.username}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Amount (FUN)</label>
                <input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                  placeholder="0.00000000"
                  step="0.00000001"
                  min="0"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGiveTokens}
                  className="flex-1 px-4 py-2 bg-accent text-black rounded hover:bg-accent/90"
                >
                  Give Tokens
                </button>
                <button
                  onClick={() => {
                    setShowTokenModal(false);
                    setTokenAmount("");
                    setSelectedUser(null);
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

