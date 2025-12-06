"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { StoreProvider } from "../store/StoreProvider";
import { ToastProvider } from "./ToastProvider";
import { SocketBridge } from "./SocketBridge";
import { Header } from "./Header";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <LanguageProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <SocketBridge />
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
              {children}
            </main>
          </div>
        </ToastProvider>
      </LanguageProvider>
    </StoreProvider>
  );
}

