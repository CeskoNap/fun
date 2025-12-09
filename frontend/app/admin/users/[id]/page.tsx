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
  { id: "tokens" as TabType, label: "Fun Balances", icon: CurrencyDollarIcon },
  { id: "transactions" as TabType, label: "Fun Transactions", icon: ListBulletIcon },
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
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("ALL");
  const [searchId, setSearchId] = useState<string>("");

  useEffect(() => {
    loadUser();
  }, [userId]);

  useEffect(() => {
    if (activeTab === "transactions" && user) {
      loadTransactions();
    }
  }, [activeTab, user?.id]);

  // Reset game filter when switching away from transactions tab
  useEffect(() => {
    if (activeTab !== "transactions") {
      setSelectedGameFilter("ALL");
      setSearchId("");
    }
  }, [activeTab]);

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

      const res = await fetch(`${API_BASE}/admin/users/${user.id}/transactions?limit=1000`, {
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
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Info</h2>
            <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Username</label>
                      <input
                        type="text"
                        value={editData.username}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ backgroundColor: "#E8F0FE" }}
                        placeholder="Email (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Role</label>
                      <select
                        value={editData.role}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ backgroundColor: "#E8F0FE" }}
                        placeholder="Level"
                        min="1"
                      />
                    </div>
            <div className="flex gap-3">
              <button
                onClick={handleEditUser}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
            </div>
          </div>
        );

      case "ban":
        return (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Ban/Unban</h2>
            <div className="space-y-3">
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
                  className="px-4 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
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
                            className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                              className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
                              style={{ backgroundColor: "#E8F0FE" }}
                            />
                          </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleBan}
                    className="px-4 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                  >
                    {banPermanent ? "Ban Permanently" : "Ban User"}
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        );

      case "tokens":
        return (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-lg font-semibold text-white mb-4">Fun Balances</h2>
            {/* Current Balance */}
            <div className="bg-zinc-800 rounded-md p-4">
              <div className="text-xs text-zinc-400 mb-1">{user.username} Balance</div>
              <div className="text-sm font-semibold text-accent">
                {parseFloat(user.balance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
              </div>
            </div>

            {/* Give and Deduct on same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Give Tokens */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Give FUN</h3>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Amount (FUN)</label>
                  <input
                    type="number"
                    value={giveAmount}
                    onChange={(e) => setGiveAmount(e.target.value)}
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                    className="px-4 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Give FUN
                  </button>
                </div>
              </div>

              {/* Deduct Tokens */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Deduct FUN</h3>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Amount (FUN)</label>
                  <input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                        className="w-full px-3 py-1 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
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
                    className="px-4 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                  >
                    Deduct FUN
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "transactions":
        // Get unique game types from transactions
        const gameTypes = Array.from(
          new Set(
            transactions
              .map(tx => tx.gameType)
              .filter(gt => gt !== null && gt !== undefined && gt !== "")
          )
        ).sort() as string[];

        // Filter transactions based on selected game filter and ID search
        let filteredTransactions = selectedGameFilter === "ALL"
          ? transactions
          : transactions.filter(tx => tx.gameType === selectedGameFilter);
        
        // Apply ID search filter
        if (searchId.trim() !== "") {
          filteredTransactions = filteredTransactions.filter(tx => 
            tx.sequentialId && tx.sequentialId.toUpperCase().includes(searchId.trim().toUpperCase())
          );
        }

        // Create filter tabs: ALL + game types
        const filterTabs = ["ALL", ...gameTypes];

        return (
          <div className="w-full space-y-4">
            <h2 className="text-lg font-semibold text-white">Fun Transactions</h2>
            
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-zinc-500">
                Total: {transactions.length} | Filtered: {filteredTransactions.length} | Filter: {selectedGameFilter}
              </div>
            )}
            
            {/* Game Filter Tabs */}
            {transactions.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {filterTabs.map((gameType) => (
                  <button
                    key={gameType}
                    onClick={() => setSelectedGameFilter(gameType)}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedGameFilter === gameType
                        ? "bg-accent text-black"
                        : "text-zinc-300 hover:bg-zinc-700"
                    }`}
                    style={selectedGameFilter !== gameType ? { backgroundColor: "#27303A" } : undefined}
                  >
                    {gameType}
                  </button>
                ))}
              </div>
            )}

            {/* ID Search */}
            <div className="w-full">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Search by ID..."
                className="w-full px-4 py-1.5 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ backgroundColor: "#E8F0FE" }}
              />
            </div>

            {transactionsLoading ? (
              <div className="text-center text-sm text-zinc-400 py-8">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center text-sm text-zinc-400 py-8">
                {transactions.length === 0 
                  ? "No transactions found" 
                  : `No transactions found for ${selectedGameFilter}`}
              </div>
            ) : (
              <div className="bg-zinc-800 rounded-md overflow-hidden">
                <div 
                  className="overflow-x-auto max-h-[480px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <table className="w-full table-fixed">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: "#0F212E" }}>
                    <tr>
                      <th className="px-1.5 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap w-[15%]">ID</th>
                      <th className="px-1.5 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap w-[5%]">Type</th>
                      <th className="px-1.5 py-2 text-left text-xs font-semibold text-zinc-300 whitespace-nowrap w-[10%]">Game</th>
                      <th className="px-1.5 py-2 text-center text-xs font-semibold text-zinc-300 whitespace-nowrap w-[17%]">Amount</th>
                      <th className="px-1.5 py-2 text-center text-xs font-semibold text-zinc-300 whitespace-nowrap w-[17%]">Before</th>
                      <th className="px-1.5 py-2 text-center text-xs font-semibold text-zinc-300 whitespace-nowrap w-[17%]">After</th>
                      <th className="px-1.5 py-2 text-center text-xs font-semibold text-zinc-300 whitespace-nowrap w-[19%]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, index) => {
                      const date = new Date(tx.createdAt);
                      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <tr 
                          key={tx.id} 
                          className={`whitespace-nowrap ${
                            index % 2 === 0 ? "bg-[#142633]" : "bg-[#0F212E]"
                          }`}
                        >
                          <td className="px-1.5 py-2 text-zinc-400 text-xs font-mono text-left">{tx.sequentialId || '-'}</td>
                          <td className="px-1.5 py-2 text-white text-xs text-left">{tx.type === "RACE_ENTRY" ? "FEE" : tx.type}</td>
                          <td className="px-1.5 py-2 text-zinc-400 text-xs text-left">
                            {tx.gameType || (tx.type === "RACE_ENTRY" ? "RACE" : "-")}
                          </td>
                          <td className={`px-1.5 py-2 text-xs font-semibold text-center ${
                            parseFloat(tx.amount) >= 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {parseFloat(tx.amount) >= 0 ? "+" : ""}{parseFloat(tx.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </td>
                          <td className="px-1.5 py-2 text-zinc-400 text-xs text-center">
                            {parseFloat(tx.balanceBefore).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </td>
                          <td className="px-1.5 py-2 text-zinc-400 text-xs text-center">
                            {parseFloat(tx.balanceAfter).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </td>
                          <td className="px-1.5 py-2 text-zinc-400 text-xs text-center">
                            {dateStr} {timeStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
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
    <section className="py-12 overflow-visible" style={{ scrollbarGutter: 'stable' }}>
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
          {renderContent()}
        </div>
      </div>
    </section>
  );
}

