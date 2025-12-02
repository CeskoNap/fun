"use client";

import { useUserSocket } from "../hooks/useUserSocket";

export function SocketBridge() {
  useUserSocket();
  return null;
}


