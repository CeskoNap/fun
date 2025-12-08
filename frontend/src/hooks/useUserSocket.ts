"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useStore } from "../store/useStore";
import { useToast } from "../components/ToastProvider";

let socket: Socket | null = null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Get user ID from localStorage
function getUserId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("user_id") || "demo-user-1";
  }
  return "demo-user-1";
}

export function useUserSocket() {
  const { setBalance, setLevelInfo } = useStore();
  const { addToast } = useToast();

  useEffect(() => {
    if (socket) return;

    socket = io(`${API_BASE}/user`, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      // Join user room
      const userId = getUserId();
      socket?.emit("join", { userId });
    });

    socket.on("balance:update", (payload: { balance: string }) => {
      const val = parseFloat(payload.balance);
      if (!isNaN(val)) {
        setBalance(val);
      }
    });

    socket.on(
      "level:up",
      (payload: {
        newLevel: number;
        totalXP: string;
      }) => {
        const xp = parseFloat(payload.totalXP);
        setLevelInfo(payload.newLevel, xp, 0);
        addToast({
          type: "success",
          message: `Level up! You reached level ${payload.newLevel}.`,
        });
      }
    );

    socket.on(
      "reward:claimed",
      (payload: { type: string; amount: string }) => {
        addToast({
          type: "success",
          message: `Reward claimed (${payload.type}): +${Math.round(parseFloat(payload.amount)).toLocaleString()} FUN`,
        });
      }
    );

    socket.on(
      "bet:resolved",
      (payload: {
        gameType: string;
        status: string;
        payout: string;
        amount: string;
      }) => {
        if (payload.status === "WON") {
          addToast({
            type: "success",
            message: `You won ${Math.round(parseFloat(payload.payout)).toLocaleString()} FUN on ${payload.gameType}.`,
          });
        } else {
          addToast({
            type: "info",
            message: `You lost ${Math.round(parseFloat(payload.amount)).toLocaleString()} FUN on ${payload.gameType}.`,
          });
        }
        
        // Emit custom event for race page to update volume
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent('race:update'));
        }
      }
    );

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [setBalance, setLevelInfo, addToast]);
}


