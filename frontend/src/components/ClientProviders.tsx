"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "../i18n/LanguageContext";
import { StoreProvider } from "../store/StoreProvider";
import { ToastProvider } from "./ToastProvider";
import { SocketBridge } from "./SocketBridge";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <LanguageProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <Sidebar />
            <SocketBridge />
            <div className="flex-1 ml-[60px]">
              <div className="max-w-6xl mx-auto px-4">
                {children}
              </div>
            </div>
          </div>
        </ToastProvider>
      </LanguageProvider>
    </StoreProvider>
  );
}

