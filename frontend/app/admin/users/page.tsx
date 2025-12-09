"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

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


  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-zinc-400" style={{ color: '#122431' }}>Manage users, ban/unban, and give tokens</p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-md px-4 py-2 text-black placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
          style={{ backgroundColor: "#E8F0FE" }}
        />
      </div>

      {error && (
        <div className="bg-red-900/30 rounded-md p-4 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading users...</div>
      ) : (
        <>
          {/* Group users by role and sort by balance */}
          {(() => {
            const groupedUsers = {
              ADMIN: users.filter(u => u.role === "ADMIN").sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)),
              MODERATOR: users.filter(u => u.role === "MODERATOR").sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)),
              USER: users.filter(u => u.role === "USER").sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)),
            };

            const roleOrder = ["ADMIN", "MODERATOR", "USER"];
            let globalIndex = 0;

            return (
              <div className="space-y-6">
                {roleOrder.map((role) => {
                  const roleUsers = groupedUsers[role as keyof typeof groupedUsers];
                  if (roleUsers.length === 0) return null;
                  
                  const startIndex = globalIndex;
                  
                  return (
                    <div key={role} className="bg-card/80 rounded-md overflow-hidden">
                      <div className="px-4 py-2 border-b border-zinc-700" style={{ backgroundColor: "#0F212E" }}>
                        <h2 className="text-lg font-semibold text-white">
                          {role === "ADMIN" ? "Administrators" : role === "MODERATOR" ? "Moderators" : "Users"} 
                          <span className="text-sm text-zinc-400 ml-2">
                            ({roleUsers.length})
                          </span>
                        </h2>
                      </div>
                      <table className="w-full table-fixed">
                        <thead style={{ backgroundColor: "#0F212E" }}>
                          <tr>
                            <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-zinc-300">Username</th>
                            <th className="w-[25%] px-4 py-3 text-left text-sm font-semibold text-zinc-300">Email</th>
                            <th className="w-[15%] px-4 py-3 text-left text-sm font-semibold text-zinc-300">Balance</th>
                            <th className="w-[10%] px-4 py-3 text-left text-sm font-semibold text-zinc-300">Level</th>
                            <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-zinc-300">Status</th>
                            <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-zinc-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roleUsers.map((user, index) => {
                            const rowIndex = startIndex + index;
                            globalIndex++;
                            return (
                              <tr 
                                key={user.id} 
                                className={`border-t border-zinc-800 whitespace-nowrap ${
                                  rowIndex % 2 === 0 ? "bg-[#142633]" : "bg-[#0F212E]"
                                }`}
                              >
                                <td className="px-4 py-3 text-white text-sm">{user.username}</td>
                                <td className="px-4 py-3 text-zinc-400 text-sm">{user.email || "-"}</td>
                                <td className="px-4 py-3 text-accent font-semibold text-sm">{parseFloat(user.balance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN</td>
                                <td className="px-4 py-3 text-white text-sm">#{user.level}</td>
                                <td className="px-4 py-3">
                                  {user.isBanned ? (
                                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-900 text-red-300">
                                      Banned
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-900 text-green-300">
                                      Active
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        router.push(`/admin/users/${user.id}`);
                                      }}
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 whitespace-nowrap"
                                    >
                                      Edit
                                    </button>
                                    {user.isBanned ? (
                                      <button
                                        onClick={() => {
                                          router.push(`/admin/users/${user.id}?tab=ban`);
                                        }}
                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 whitespace-nowrap"
                                      >
                                        Unban
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          router.push(`/admin/users/${user.id}?tab=ban`);
                                        }}
                                        className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 whitespace-nowrap"
                                      >
                                        Ban
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-zinc-800 text-white rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-zinc-800 text-white rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </section>
  );
}

