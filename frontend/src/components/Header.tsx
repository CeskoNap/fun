"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "../store/useStore";
import { useI18n } from "../i18n/useI18n";
import { AuthModal } from "./AuthModal";

export function Header() {
  const { balance, level } = useStore();
  const { t, lang, setLang } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-black font-bold">
            F
          </div>
          <span className="text-lg font-semibold text-white tracking-wide">
            {t("header.brand")}
          </span>
          <nav className="hidden md:flex items-center gap-4 ml-6 text-sm text-zinc-300">
            <Link href="/" className="hover:text-accent transition-colors">
              {t("nav.home")}
            </Link>
            <Link href="/games/mines" className="hover:text-accent transition-colors">
              {t("nav.games")}
            </Link>
            <Link href="/rewards" className="hover:text-accent transition-colors">
              {t("nav.rewards")}
            </Link>
            <Link href="/levels" className="hover:text-accent transition-colors">
              {t("nav.levels")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-xs text-zinc-400">
            <span>Balance</span>
            <span className="text-sm font-semibold text-accent">
              {balance.toFixed(8)} FUN
            </span>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-zinc-400">
            <span>Level</span>
            <span className="text-sm font-semibold text-white">#{level}</span>
          </div>
          <button
            className="px-2 py-1 text-xs border border-zinc-700 rounded-md hover:border-accent transition-colors"
            onClick={() => setLang(lang === "en" ? "it" : "en")}
          >
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-4 py-2 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition-colors"
          >
            Login
          </button>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(userId, token) => {
          // Store token and userId
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", token);
            localStorage.setItem("user_id", userId);
          }
          // Refresh user data
          window.location.reload();
        }}
      />
    </header>
  );
}


