"use client";

import { create } from "zustand";

interface StoreState {
  balance: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  setBalance: (v: number) => void;
  setLevelInfo: (level: number, xp: number, xpToNextLevel: number) => void;
  fetchLevelAndBalance: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Get user ID from localStorage or fallback to demo
function getUserId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("user_id") || "demo-user-1";
  }
  return "demo-user-1";
}

// Get auth token for API calls
function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

export const useStore = create<StoreState>((set, get) => ({
  balance: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: 0,

  setBalance: (v) => set({ balance: v }),

  setLevelInfo: (level, xp, xpToNextLevel) =>
    set({
      level,
      xp,
      xpToNextLevel,
    }),

  fetchLevelAndBalance: async () => {
    const userId = getUserId();
    const token = getAuthToken();
    
    const headers: Record<string, string> = { "X-User-Id": userId };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      // Levels
      const res = await fetch(`${API_BASE}/levels/me`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        set({
          level: data.level,
          xp: parseFloat(data.xp),
          xpToNextLevel: data.xpToNextLevel ? parseFloat(data.xpToNextLevel) : 0,
        });
      } else {
        console.warn("Failed to fetch level info:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching level info:", error);
      // Don't throw - allow the app to continue with default values
    }

    try {
      // Balance
      const br = await fetch(`${API_BASE}/me/balance`, {
        headers,
      });
      if (br.ok) {
        const data = await br.json();
        const bal = parseFloat(data.balance);
        if (!isNaN(bal)) set({ balance: bal });
      } else {
        console.warn("Failed to fetch balance:", br.status, br.statusText);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      // Don't throw - allow the app to continue with default values
    }
  },
}));


