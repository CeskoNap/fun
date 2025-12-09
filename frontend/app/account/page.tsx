"use client";

import { useEffect, useState } from "react";
import { useStore } from "../../src/store/useStore";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserIcon,
  BellIcon,
  CurrencyDollarIcon,
  ListBulletIcon,
  TrophyIcon,
  ChartBarIcon,
  TicketIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../src/lib/apiClient";

interface UserData {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  avatarUrl: string | null;
}

type TabType = "profile" | "notifications" | "balances" | "transactions" | "levels" | "stats" | "tickets";

const tabs = [
  { id: "profile" as TabType, label: "Profile", icon: UserIcon },
  { id: "notifications" as TabType, label: "Notifications", icon: BellIcon },
  { id: "balances" as TabType, label: "Fun Balances", icon: CurrencyDollarIcon },
  { id: "transactions" as TabType, label: "Fun Transactions", icon: ListBulletIcon },
  { id: "levels" as TabType, label: "Fun Levels", icon: TrophyIcon },
  { id: "stats" as TabType, label: "Fun Stats", icon: ChartBarIcon },
  { id: "tickets" as TabType, label: "Tickets", icon: TicketIcon },
];

export default function AccountPage() {
  const { balance, level, xp, fetchLevelAndBalance } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("ALL");
  const [searchId, setSearchId] = useState<string>("");

  // Check URL parameter for tab
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  // Reset game filter when switching away from transactions tab
  useEffect(() => {
    if (activeTab !== "transactions") {
      setSelectedGameFilter("ALL");
      setSearchId("");
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLevelAndBalance();
    
    // Check authentication and fetch user data
    const fetchUserData = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          router.push("/");
          return;
        }

        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setUserData(data.user);
          } else {
            router.push("/");
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          router.push("/");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [fetchLevelAndBalance, router]);

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    const fetchTransactions = async () => {
      if (activeTab !== "transactions") return;
      
      setTransactionsLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          console.error("No auth token found");
          setTransactionsLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/me/transactions?limit=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Failed to fetch transactions:", res.status, errorData);
          setTransactions([]);
          setTransactionsLoading(false);
          return;
        }

        const data = await res.json();
        console.log("Transactions loaded:", data);
        setTransactions(data.transactions || []);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [activeTab]);

  // Fetch notifications when notifications tab is active
  useEffect(() => {
    const fetchNotifications = async () => {
      if (activeTab !== "notifications") return;

      setNotificationsLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const data = await apiClient.get<any[]>("/notifications");
        setNotifications(data || []);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
  }, [activeTab]);

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  if (loading) {
    return (
      <section className="py-12 overflow-visible">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </section>
    );
  }

  if (!userData) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Username</label>
                  <div className="text-sm font-medium text-white">{userData.displayName || userData.username}</div>
                </div>

                {userData.email && (
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Email</label>
                    <div className="text-sm font-medium text-white">{userData.email}</div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Level</label>
                  <div className="text-sm font-medium text-white">#{level}</div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Balance</label>
                  <div className="text-sm font-semibold text-accent">
                    {balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">XP</label>
                  <div className="text-sm font-medium text-white">{Math.round(xp).toLocaleString()}</div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Member Since</label>
                  <div className="text-sm font-medium text-white">
                    {new Date(userData.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              {notifications.filter(n => !n.read).length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await apiClient.patch("/notifications/mark-all-read");
                      setNotifications(notifications.map(n => ({ ...n, read: true })));
                    } catch (error) {
                      console.error("Failed to mark all as read:", error);
                    }
                  }}
                  className="text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            {notificationsLoading ? (
              <div className="text-center py-8 text-zinc-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">No notifications yet.</div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    className={`p-4 rounded-md border ${
                      notification.read
                        ? "bg-background/30 border-card/50"
                        : "bg-background/50 border-card/70 cursor-pointer hover:bg-background/60 transition-colors"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-semibold ${
                            notification.read ? "text-zinc-400" : "text-white"
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-accent rounded-full"></span>
                          )}
                        </div>
                        <p className={`text-sm ${
                          notification.read ? "text-zinc-500" : "text-zinc-300"
                        }`}>
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          aria-label="Delete notification"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "balances":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Fun Balances</h2>
            <p className="text-sm text-zinc-400">Balance information will be displayed here.</p>
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
          <div className="space-y-4">
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

            {/* Transactions Table */}
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
      case "levels":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Fun Levels</h2>
            <p className="text-sm text-zinc-400">Level information will be displayed here.</p>
          </div>
        );
      case "stats":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Fun Stats</h2>
            <p className="text-sm text-zinc-400">Statistics will be displayed here.</p>
          </div>
        );
      case "tickets":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Tickets</h2>
            <p className="text-sm text-zinc-400">Support tickets will be displayed here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <section className="py-12 overflow-visible">
      <div className="flex gap-6 items-start">
        {/* Left Sidebar */}
        <div className="w-64 bg-card rounded-md p-4 space-y-1 flex-shrink-0 self-start">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const unreadCount = tab.id === "notifications" 
              ? notifications.filter(n => !n.read).length 
              : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all relative ${
                  isActive
                    ? "bg-background/50 text-white"
                    : "text-white hover:bg-background/30"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{tab.label}</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
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

