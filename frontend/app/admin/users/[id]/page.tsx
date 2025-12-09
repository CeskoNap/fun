"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  UserIcon,
  NoSymbolIcon,
  CurrencyDollarIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

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

type TabType = "edit" | "ban" | "tokens" | "transactions";

const tabs = [
  { id: "edit" as TabType, label: "Edit Info", icon: UserIcon },
  { id: "ban" as TabType, label: "Ban/Unban", icon: NoSymbolIcon },
  { id: "tokens" as TabType, label: "Balance", icon: CurrencyDollarIcon },
  { id: "transactions" as TabType, label: "Transactions", icon: ListBulletIcon },
];

export default function AdminUserEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("edit");
  
  // Check URL parameter for tab
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);
  
  // Edit form data
  const [editData, setEditData] = useState({
    username: "",
    email: "",
    role: "",
    level: "",
  });
  
  // Ban form data
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState("");
  const [banPermanent, setBanPermanent] = useState(false);
  
  // Balance form data
  const [giveAmount, setGiveAmount] = useState("");
  const [deductAmount, setDeductAmount] = useState("");
  const [giveReason, setGiveReason] = useState("");
  const [deductReason, setDeductReason] = useState("");
  const [sendGiveNotification, setSendGiveNotification] = useState(false);
  const [sendDeductNotification, setSendDeductNotification] = useState(false);
  
  // Transactions
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  useEffect(() => {
    if (activeTab === "transactions" && user) {
      loadTransactions();
    }
  }, [activeTab, user?.id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/admin/users");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load user");
      }

      const userData = await res.json();
      setUser(userData);
      setEditData({
        username: userData.username,
        email: userData.email || "",
        role: userData.role,
        level: userData.level.toString(),
      });
    } catch (e: any) {
      alert(e.message || "Failed to load user");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    setTransactionsLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${user.id}/transactions?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to load transactions");
      }

      setTransactions(data.transactions || []);
    } catch (e: any) {
      alert(e.message || "Failed to load transactions");
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!user) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const updateData: any = {};
      if (editData.username && editData.username !== user.username) {
        updateData.username = editData.username;
      }
      if (editData.email !== undefined && editData.email !== user.email) {
        updateData.email = editData.email || null;
      }
      if (editData.role && editData.role !== user.role) {
        updateData.role = editData.role;
      }
      if (editData.level && parseInt(editData.level) !== user.level) {
        updateData.level = parseInt(editData.level);
      }

      if (Object.keys(updateData).length === 0) {
        alert("No changes to save");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update user");
      }

      // Refresh user data
      const userRes = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser({ ...user, ...userData });
        setEditData({
          username: userData.username,
          email: userData.email || "",
          role: userData.role,
          level: userData.level.toString(),
        });
      }
      alert("User updated successfully");
    } catch (e: any) {
      alert(e.message || "Failed to update user");
    }
  };

  const handleBan = async () => {
    if (!user) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const body: any = {
        reason: banReason || undefined,
        permanent: banPermanent,
      };
      
      if (!banPermanent && banUntil) {
        body.until = banUntil;
      }

      const res = await fetch(`${API_BASE}/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to ban user");
      }

      setBanReason("");
      setBanUntil("");
      setBanPermanent(false);
      loadUser();
      alert("User banned successfully");
    } catch (e: any) {
      alert(e.message || "Failed to ban user");
    }
  };

  const handleUnban = async () => {
    if (!user) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${user.id}/unban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to unban user");
      }

      loadUser();
      alert("User unbanned successfully");
    } catch (e: any) {
      alert(e.message || "Failed to unban user");
    }
  };

  const handleGiveTokens = async () => {
    if (!user || !giveAmount) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${user.id}/give-tokens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          amount: parseFloat(giveAmount),
          reason: giveReason || undefined,
          sendNotification: sendGiveNotification,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to give tokens");
      }

      setGiveAmount("");
      setGiveReason("");
      setSendGiveNotification(false);
      loadUser();
      alert("Tokens given successfully");
    } catch (e: any) {
      alert(e.message || "Failed to give tokens");
    }
  };

  const handleDeductTokens = async () => {
    if (!user || !deductAmount) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/admin/users/${user.id}/deduct-tokens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          amount: parseFloat(deductAmount),
          reason: deductReason || undefined,
          sendNotification: sendDeductNotification,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to deduct tokens");
      }

      setDeductAmount("");
      setDeductReason("");
      setSendDeductNotification(false);
      loadUser();
      alert("Tokens deducted successfully");
    } catch (e: any) {
      alert(e.message || "Failed to deduct tokens");
    }
  };

  const renderContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case "edit":
        return (
          <div className="space-y-4 max-w-2xl">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Username</label>
                      <input
                        type="text"
                        value={editData.username}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ backgroundColor: "#E8F0FE" }}
                        placeholder="Username"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ backgroundColor: "#E8F0FE" }}
                        placeholder="Email (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Role</label>
                      <select
                        value={editData.role}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ backgroundColor: "#E8F0FE" }}
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Level</label>
                      <input
                        type="number"
                        value={editData.level}
                        onChange={(e) => setEditData({ ...editData, level: e.target.value })}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ backgroundColor: "#E8F0FE" }}
                        placeholder="Level"
                        min="1"
                      />
                    </div>
            <div className="flex gap-3">
              <button
                onClick={handleEditUser}
                className="px-6 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        );

      case "ban":
        return (
          <div className="space-y-4 max-w-2xl">
            {user.isBanned ? (
              <div>
                <p className="text-sm text-zinc-300 mb-4">
                  User is currently banned{user.bannedUntil ? ` until ${new Date(user.bannedUntil).toLocaleString()}` : " permanently"}.
                  {user.banReason && (
                    <span className="block mt-2">Reason: {user.banReason}</span>
                  )}
                </p>
                <button
                  onClick={handleUnban}
                  className="px-6 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Unban User
                </button>
              </div>
            ) : (
              <>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Reason (optional)</label>
                          <input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                            style={{ backgroundColor: "#E8F0FE" }}
                            placeholder="Ban reason..."
                          />
                        </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <input
                      type="checkbox"
                      checked={banPermanent}
                      onChange={(e) => {
                        setBanPermanent(e.target.checked);
                        if (e.target.checked) {
                          setBanUntil("");
                        }
                      }}
                      className="w-4 h-4"
                    />
                    Permanent ban
                  </label>
                </div>
                {!banPermanent && (
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Ban until (optional, leave empty for permanent)</label>
                            <input
                              type="datetime-local"
                              value={banUntil}
                              onChange={(e) => setBanUntil(e.target.value)}
                              className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                              style={{ backgroundColor: "#E8F0FE" }}
                            />
                          </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleBan}
                    className="px-6 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    {banPermanent ? "Ban Permanently" : "Ban User"}
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case "tokens":
        return (
          <div className="space-y-6 max-w-4xl">
            {/* Current Balance */}
            <div className="bg-zinc-800 rounded-md p-4">
              <div className="text-xs text-zinc-400 mb-1">Current Balance</div>
              <div className="text-sm font-semibold text-accent">
                {parseFloat(user.balance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
              </div>
            </div>

            {/* Give and Deduct on same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Give Tokens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Give FUN</h3>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Amount (FUN)</label>
                  <input
                    type="number"
                    value={giveAmount}
                    onChange={(e) => setGiveAmount(e.target.value)}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ backgroundColor: "#E8F0FE" }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={giveReason}
                    onChange={(e) => setGiveReason(e.target.value)}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ backgroundColor: "#E8F0FE" }}
                    placeholder="Reason for giving tokens..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={sendGiveNotification}
                      onChange={(e) => setSendGiveNotification(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Send notification to user
                  </label>
                </div>
                <div>
                  <button
                    onClick={handleGiveTokens}
                    className="px-6 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    Give FUN
                  </button>
                </div>
              </div>

              {/* Deduct Tokens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Deduct FUN</h3>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Amount (FUN)</label>
                  <input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ backgroundColor: "#E8F0FE" }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={deductReason}
                    onChange={(e) => setDeductReason(e.target.value)}
                        className="w-full px-4 py-1.5 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ backgroundColor: "#E8F0FE" }}
                    placeholder="Reason for deducting tokens..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={sendDeductNotification}
                      onChange={(e) => setSendDeductNotification(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Send notification to user
                  </label>
                </div>
                <div>
                  <button
                    onClick={handleDeductTokens}
                    className="px-6 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Deduct FUN
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "transactions":
        return (
          <div>
            {transactionsLoading ? (
              <div className="text-center text-sm text-zinc-400 py-8">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-sm text-zinc-400 py-8">No transactions found</div>
            ) : (
              <div className="bg-zinc-800 rounded-md overflow-hidden">
                <table className="w-full">
                  <thead style={{ backgroundColor: "#0F212E" }}>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap">Type</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap">Game</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap">Amount</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap">Before</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap">After</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, index) => {
                      const date = new Date(tx.createdAt);
                      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <tr 
                          key={tx.id} 
                          className={`border-b border-card/30 whitespace-nowrap ${
                            index % 2 === 0 ? "bg-[#142633]" : "bg-[#0F212E]"
                          }`}
                        >
                          <td className="px-2 py-2 text-white text-xs">{tx.type}</td>
                          <td className="px-2 py-2 text-zinc-400 text-xs">
                            {tx.gameType || "-"}
                          </td>
                          <td className={`px-2 py-2 text-xs font-semibold ${
                            parseFloat(tx.amount) >= 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {parseFloat(tx.amount) >= 0 ? "+" : ""}{parseFloat(tx.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
                          </td>
                          <td className="px-2 py-2 text-zinc-400 text-xs">
                            {parseFloat(tx.balanceBefore).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
                          </td>
                          <td className="px-2 py-2 text-zinc-400 text-xs">
                            {parseFloat(tx.balanceAfter).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
                          </td>
                          <td className="px-2 py-2 text-zinc-400 text-xs">
                            {dateStr} {timeStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <section className="py-12 overflow-visible">
        <div className="text-center text-sm text-zinc-400 py-8">Loading user...</div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <section className="py-12 overflow-visible">
      <div className="flex gap-6 items-start">
        {/* Left Sidebar */}
        <div className="w-64 bg-card rounded-md p-4 space-y-1 flex-shrink-0 self-start">
          <div className="mb-4 pb-4 border-b border-zinc-800">
            <button
              onClick={() => router.push("/admin/users")}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ← Back to Users
            </button>
            <h2 className="text-lg font-semibold text-white mt-2">{user.username}</h2>
            <p className="text-xs text-zinc-400">{user.email || "No email"}</p>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                  isActive
                    ? "bg-background/50 text-white"
                    : "text-white hover:bg-background/30"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-card rounded-md p-6">
          {activeTabData && (
            <h1 className="text-lg font-semibold text-zinc-300 mb-6">
              {activeTabData.label}
            </h1>
          )}
          {renderContent()}
        </div>
      </div>
    </section>
  );
}

