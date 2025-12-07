"use client";

import { useState, useEffect, useRef } from "react";
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
  const [username, setUsername] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Check if user is logged in and fetch user info
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        setIsLoggedIn(!!token);
        
        // Fetch user info if logged in
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
              setUsername(data.user?.username || data.user?.displayName || null);
            }
          } catch (e) {
            // Ignore errors
          }
        } else {
          setUsername(null);
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
      setAccountMenuOpen(false);
      window.location.reload();
    }
  };

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-background shadow-xl border-0">
      <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-5xl font-cream-cake text-white tracking-wide font-normal" style={{ letterSpacing: '0.05em' }}>
            Fun
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
          {isLoggedIn ? (
            <>
              {/* Balance display in header */}
              <div className="hidden sm:flex flex-col items-end text-xs text-zinc-400">
                <span>Balance</span>
                <span className="text-sm font-semibold text-accent">
                  {Math.round(balance).toLocaleString()} FUN
                </span>
              </div>

              {/* Account menu with profile icon */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-black font-bold hover:bg-accent/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-zinc-950"
                  aria-label="Account menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </button>

                {/* Account Dropdown Menu */}
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-4">
                      <div className="text-sm font-semibold text-white mb-3">
                        {username || "User"}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400">Level</span>
                          <span className="text-sm font-semibold text-white">#{level}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          setLang(lang === "en" ? "it" : "en");
                          setAccountMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors flex items-center justify-between"
                      >
                        <span>Language</span>
                        <span className="text-accent font-semibold">{lang.toUpperCase()}</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
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


