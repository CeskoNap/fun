"use client";

import { ReactNode } from "react";

// Wrapper per eventuale futura integrazione (es. React Query, ecc.)
export function StoreProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}


