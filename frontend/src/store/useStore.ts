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
const USER_ID = "demo-user-1"; // MVP: mock user id

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
    // Levels
    const res = await fetch(`${API_BASE}/levels/me`, {
      headers: { "X-User-Id": USER_ID },
    });
    if (res.ok) {
      const data = await res.json();
      set({
        level: data.level,
        xp: parseFloat(data.xp),
        xpToNextLevel: data.xpToNextLevel ? parseFloat(data.xpToNextLevel) : 0,
      });
    }

    // Balance
    const br = await fetch(`${API_BASE}/me/balance`, {
      headers: { "X-User-Id": USER_ID },
    });
    if (br.ok) {
      const data = await br.json();
      const bal = parseFloat(data.balance);
      if (!isNaN(bal)) set({ balance: bal });
    }
  },
}));


