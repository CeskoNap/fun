"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useStore } from "../store/useStore";
import { useI18n } from "../i18n/useI18n";
import { AuthModal } from "./AuthModal";
import { UserIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export function Header() {
  const { balance, level } = useStore();
  const { t, lang, setLang } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
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
              setUsername(data.user?.displayName || data.user?.username || null);
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
    <header className="sticky top-0 z-50 bg-background shadow-xl border-0 pl-[60px]">
      <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="text-5xl font-cream-cake text-white tracking-wide font-normal hover:text-accent transition-colors cursor-pointer" style={{ letterSpacing: '0.05em' }}>
                  Fun
                </span>
              </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              {/* Username and Balance display in header */}
              <div className="hidden sm:flex flex-col items-end justify-center text-xs text-zinc-400">
                <span className="font-medium text-white" style={{ fontSize: '13px' }}>{username || "User"}</span>
                <span className="text-sm font-semibold text-accent">
                  {Math.round(balance).toLocaleString()} FUN
                </span>
              </div>

              {/* Account menu with profile icon */}
              <div className="relative flex items-center justify-center" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center justify-center text-accent hover:text-accent/80 transition-colors focus:outline-none"
                  aria-label="Account menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    className="w-10 h-10"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </button>

                {/* Account Dropdown Menu */}
                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-lg shadow-xl z-[100] overflow-hidden">
                    <div className="p-4 shadow-md" style={{ backgroundColor: "#162734" }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">
                          {username || "User"}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {level}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        href="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white hover:bg-background/50 hover:text-accent transition-all cursor-pointer"
                      >
                        <UserIcon className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium">Profile</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-white hover:bg-background/50 hover:text-accent transition-all cursor-pointer"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthModalMode("login");
                  setAuthModalOpen(true);
                }}
                className="px-3 py-1.5 text-white font-semibold rounded-md hover:opacity-90 transition-opacity text-sm"
                style={{ backgroundColor: "#213743" }}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthModalMode("register");
                  setAuthModalOpen(true);
                }}
                className="px-3 py-1.5 bg-accent text-black font-semibold rounded-md hover:bg-accent/90 transition-colors text-sm"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
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


