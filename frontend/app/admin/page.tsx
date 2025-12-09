"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "../../src/i18n/useI18n";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalBalance: string;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const statsRes = await fetch(`${API_BASE}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!statsRes.ok) {
        const errorData = await statsRes.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load stats");
      }

      const statsData = await statsRes.json();
      
      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        bannedUsers: statsData.bannedUsers || 0,
        totalBalance: statsData.totalBalance || "0",
        totalTransactions: statsData.totalTransactions || 0,
      });
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 rounded-md p-4 text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-white mb-2">Admin Dashboard</h1>
          <p className="text-sm text-zinc-400">Manage users, races, and platform settings</p>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/80 rounded-md p-6">
          <div className="text-xs text-zinc-400 mb-1">Total Users</div>
          <div className="text-sm font-medium text-white">{stats?.totalUsers || 0}</div>
        </div>
        <div className="bg-card/80 rounded-md p-6">
          <div className="text-xs text-zinc-400 mb-1">Active Users</div>
          <div className="text-sm font-medium text-green-400">{stats?.activeUsers || 0}</div>
        </div>
        <div className="bg-card/80 rounded-md p-6">
          <div className="text-xs text-zinc-400 mb-1">Banned Users</div>
          <div className="text-sm font-medium text-red-400">{stats?.bannedUsers || 0}</div>
        </div>
        <div className="bg-card/80 rounded-md p-6">
          <div className="text-xs text-zinc-400 mb-1">Total Balance</div>
          <div className="text-sm font-semibold text-accent">{parseFloat(stats?.totalBalance || "0").toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} FUN</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="bg-card/80 rounded-md p-6 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white mb-2">👥 User Management</h3>
          <p className="text-sm text-zinc-400">Manage users, ban/unban, give tokens</p>
        </Link>
        <Link
          href="/admin/races"
          className="bg-card/80 rounded-md p-6 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white mb-2">🏁 Race Management</h3>
          <p className="text-sm text-zinc-400">Create, activate, and manage races</p>
        </Link>
        <Link
          href="/admin/config"
          className="bg-card/80 rounded-md p-6 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white mb-2">⚙️ Configuration</h3>
          <p className="text-sm text-zinc-400">Configure XP, rewards, and settings</p>
        </Link>
      </div>
      </div>
    </section>
  );
}

