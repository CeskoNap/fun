"use client";

import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Header } from "../src/components/Header";
import { LanguageProvider } from "../src/i18n/LanguageContext";
import { StoreProvider } from "../src/store/StoreProvider";
import { SocketBridge } from "../src/components/SocketBridge";
import { ToastProvider } from "../src/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Fun",
  description: "Fun - Crypto-style gaming with play tokens only",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-gray-100`}>
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
      </body>
    </html>
  );
}


