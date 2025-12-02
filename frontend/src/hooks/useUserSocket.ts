"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useStore } from "../store/useStore";
import { useToast } from "../components/ToastProvider";

let socket: Socket | null = null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const USER_ID = "demo-user-1"; // MVP mock

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
      socket?.emit("join", { userId: USER_ID });
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
      }),
    ) => {
      const xp = parseFloat(payload.totalXP);
      setLevelInfo(payload.newLevel, xp, 0);
      addToast({
        type: "success",
        message: `Level up! You reached level ${payload.newLevel}.`,
      });
    };

    socket.on(
      "reward:claimed",
      (payload: { type: string; amount: string }),
    ) => {
      addToast({
        type: "success",
        message: `Reward claimed (${payload.type}): +${payload.amount} FUN`,
      });
    };

    socket.on(
      "bet:resolved",
      (payload: {
        gameType: string;
        status: string;
        payout: string;
        amount: string;
      }),
    ) => {
      if (payload.status === "WON") {
        addToast({
          type: "success",
          message: `You won ${payload.payout} FUN on ${payload.gameType}.`,
        });
      } else {
        addToast({
          type: "info",
          message: `You lost ${payload.amount} FUN on ${payload.gameType}.`,
        });
      }
    };

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [setBalance, setLevelInfo, addToast]);
}


