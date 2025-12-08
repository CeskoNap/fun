"use client";

import { useEffect, useState } from "react";
import { useStore } from "../../src/store/useStore";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  CurrencyDollarIcon,
  ListBulletIcon,
  TrophyIcon,
  ChartBarIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";

interface UserData {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  avatarUrl: string | null;
}

type TabType = "profile" | "balances" | "transactions" | "levels" | "stats" | "tickets";

const tabs = [
  { id: "profile" as TabType, label: "Profile", icon: UserIcon },
  { id: "balances" as TabType, label: "Fun Balances", icon: CurrencyDollarIcon },
  { id: "transactions" as TabType, label: "Fun Transactions", icon: ListBulletIcon },
  { id: "levels" as TabType, label: "Fun Levels", icon: TrophyIcon },
  { id: "stats" as TabType, label: "Fun Stats", icon: ChartBarIcon },
  { id: "tickets" as TabType, label: "Tickets", icon: TicketIcon },
];

export default function AccountPage() {
  const { balance, level, xp, fetchLevelAndBalance } = useStore();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

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
      case "balances":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Fun Balances</h2>
            <p className="text-sm text-zinc-400">Balance information will be displayed here.</p>
          </div>
        );
      case "transactions":
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Fun Transactions</h2>
            <p className="text-sm text-zinc-400">Transaction history will be displayed here.</p>
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

