"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "../store/useStore";
import { useI18n } from "../i18n/useI18n";
import { AuthModal } from "./AuthModal";

export function Header() {
  const { balance, level } = useStore();
  const { t, lang, setLang } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is logged in and admin
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        setIsLoggedIn(!!token);
        
        // Check if user is admin
        if (token) {
          try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${API_BASE}/auth/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              setIsAdmin(data.user?.role === "ADMIN");
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
    };
    checkAuth();
    // Listen for storage changes (e.g., when login happens in another tab)
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_id");
      setIsLoggedIn(false);
      window.location.reload();
    }
  };

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
            {isAdmin && (
              <Link href="/admin" className="hover:text-accent transition-colors text-purple-400">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn && (
            <>
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
            </>
          )}
          <button
            className="px-2 py-1 text-xs border border-zinc-700 rounded-md hover:border-accent transition-colors"
            onClick={() => setLang(lang === "en" ? "it" : "en")}
          >
            {lang.toUpperCase()}
          </button>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-zinc-800 text-white font-semibold rounded-md hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition-colors"
            >
              Login
            </button>
          )}
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
            setIsLoggedIn(true);
          }
          // Refresh user data
          window.location.reload();
        }}
      />
    </header>
  );
}


