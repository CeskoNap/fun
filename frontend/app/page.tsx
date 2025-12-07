"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "../src/store/useStore";
import { useUserSocket } from "../src/hooks/useUserSocket";
import { useI18n } from "../src/i18n/useI18n";
import { AuthModal } from "../src/components/AuthModal";

export default function HomePage() {
  const { t } = useI18n();
  const { balance, level, xp, xpToNextLevel, fetchLevelAndBalance } = useStore();
  useUserSocket();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchLevelAndBalance();
    // Check if user is logged in
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      setIsLoggedIn(!!token);
    }
  }, [fetchLevelAndBalance]);

  const games = [
    {
      id: "mines",
      title: t("home.minesTitle"),
      description: t("home.minesDesc"),
      href: "/games/mines",
      image: "https://mediumrare.imgix.net/15a51a2ae2895872ae2b600fa6fe8d7f8d32c9814766b66ddea2b288d04ba89c?w=180&h=236&fit=min&auto=format",
      color: "from-blue-500 to-cyan-500",
      available: true,
    },
    {
      id: "plinko",
      title: t("home.plinkoTitle"),
      description: t("home.plinkoDesc"),
      href: "/games/plinko",
      image: "https://mediumrare.imgix.net/5cbb2498c956527e6584c6af216489b85bbb7a909c7d3c4e131a3be9bd1cc6bf?w=180&h=236&fit=min&auto=format",
      color: "from-purple-500 to-pink-500",
      available: true,
    },
    {
      id: "coming-soon",
      title: t("home.comingSoon"),
      description: t("home.moreGamesComing"),
      href: "#",
      icon: "🚀",
      color: "from-zinc-600 to-zinc-700",
      available: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Trending Games Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg">🔥</span>
          <h2 className="text-xl font-semibold text-white">{t("home.trendingGames")}</h2>
        </div>

        {/* Horizontal Scrollable Cards */}
        <div className="flex gap-4 overflow-x-auto overflow-y-visible pb-4 pt-2 scrollbar-hide">
          {games.map((game) => (
            <Link
              key={game.id}
              href={game.available ? game.href : "#"}
              onClick={(e) => {
                if (!game.available) {
                  e.preventDefault();
                }
              }}
              className={`group relative flex-shrink-0 w-[140px] overflow-visible ${
                !game.available ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {game.image ? (
                <>
                  {/* Game Image with Gradient Background */}
                  <img
                    src={game.image}
                    alt={game.title}
                    width={140}
                    height={184}
                    loading="lazy"
                    className={`rounded-lg object-cover transition-all duration-200 ${
                      !game.available 
                        ? "" 
                        : "group-hover:-translate-y-2"
                    }`}
                    style={{
                      objectFit: 'cover',
                      background: 'radial-gradient(at 0px 0px, rgb(93, 91, 236), rgba(0, 0, 0, 0) 50%), radial-gradient(at 33% 0px, rgb(158, 68, 204), rgba(0, 0, 0, 0) 50%), radial-gradient(at 67% 0px, rgb(7, 77, 240), rgba(0, 0, 0, 0) 50%), radial-gradient(at 100% 0px, rgb(75, 71, 230), rgba(0, 0, 0, 0) 50%), radial-gradient(at 0px 50%, rgb(111, 140, 221), rgba(0, 0, 0, 0) 50%), radial-gradient(at 33% 50%, rgb(141, 125, 188), rgba(0, 0, 0, 0) 50%), radial-gradient(at 67% 50%, rgb(95, 202, 169), rgba(0, 0, 0, 0) 50%), radial-gradient(at 100% 50%, rgb(71, 201, 107), rgba(0, 0, 0, 0) 50%), radial-gradient(at 0px 100%, rgb(44, 137, 255), rgba(0, 0, 0, 0) 50%), radial-gradient(at 33% 100%, rgb(142, 163, 246), rgba(0, 0, 0, 0) 50%), radial-gradient(at 67% 100%, rgb(132, 180, 250), rgba(0, 0, 0, 0) 50%), radial-gradient(at 100% 100%, rgb(124, 173, 241), rgba(0, 0, 0, 0) 50%)',
                      width: '140px',
                      height: '184px'
                    }}
                  />
                </>
              ) : (
                <>
                  {/* Coming Soon Card */}
                  <div className="relative w-[140px] h-[184px] bg-zinc-800 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-4xl mb-3">{game.icon}</div>
                    <h3 className="text-sm font-medium text-zinc-400 text-center px-2">
                      {game.title}
                    </h3>
                  </div>
                </>
              )}
            </Link>
          ))}
        </div>
      </section>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(userId, token) => {
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", token);
            localStorage.setItem("user_id", userId);
            setIsLoggedIn(true);
          }
          window.location.reload();
        }}
      />
    </div>
  );
}
