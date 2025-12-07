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
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchLevelAndBalance();
    // Check if user is logged in
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      setIsLoggedIn(!!token);
    }
  }, [fetchLevelAndBalance]);

  // Helper to get proxied image URL - always use proxy to avoid hydration mismatch
  const getImageUrl = (originalUrl: string) => {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  const games = [
    {
      id: "mines",
      title: t("home.minesTitle"),
      description: t("home.minesDesc"),
      href: "/games/mines",
      image: "https://bc.imgix.net/game/image/1932c1c9da.png?_v=4&auto=format&dpr=0.8999999761581421&w=200",
      color: "from-blue-500 to-cyan-500",
      available: true,
    },
    {
      id: "plinko",
      title: t("home.plinkoTitle"),
      description: t("home.plinkoDesc"),
      href: "/games/plinko",
      image: "https://bc.imgix.net/game/image/721df0b283.png?_v=4&auto=format&dpr=0.8999999761581421&w=200",
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
    <div>
      {/* Trending Games Section */}
      <section className="py-12 overflow-visible">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-white">{t("home.trendingGames")}</h2>
        </div>

        {/* Horizontal Scrollable Cards */}
        <div className="flex gap-4 overflow-x-auto overflow-y-visible pb-6 pt-4 scrollbar-hide" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
          {games.map((game) => (
            <Link
              key={game.id}
              href={game.available ? game.href : "#"}
              onClick={(e) => {
                if (!game.available) {
                  e.preventDefault();
                }
              }}
              className={`group relative flex-shrink-0 w-[140px] overflow-visible z-0 ${
                !game.available ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{ marginTop: '0', paddingTop: '0' }}
            >
              {game.image && !imageErrors[game.id] ? (
                <>
                  {/* Game Image with Gradient Background */}
                  <div className="relative w-[140px] h-[184px] rounded-lg overflow-visible">
                    <div className={`relative rounded-lg transition-all duration-200 ${
                      !game.available 
                        ? "" 
                        : "group-hover:-translate-y-2 group-hover:shadow-2xl"
                    }`}
                    style={{
                      width: '140px',
                      height: '184px',
                      zIndex: 10
                    }}>
                      <img
                        src={getImageUrl(game.image)}
                        alt={game.title}
                        width={140}
                        height={184}
                        className="rounded-lg object-cover w-full h-full"
                        style={{
                          objectFit: 'cover',
                          width: '100%',
                          height: '100%'
                        }}
                        onError={() => {
                          // Fallback se l'immagine non carica
                          setImageErrors(prev => ({ ...prev, [game.id]: true }));
                        }}
                      />
                      {/* Gradient overlay */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          background: 'radial-gradient(at 0px 0px, rgb(93, 91, 236), rgba(0, 0, 0, 0) 50%), radial-gradient(at 33% 0px, rgb(158, 68, 204), rgba(0, 0, 0, 0) 50%), radial-gradient(at 67% 0px, rgb(7, 77, 240), rgba(0, 0, 0, 0) 50%), radial-gradient(at 100% 0px, rgb(75, 71, 230), rgba(0, 0, 0, 0) 50%), radial-gradient(at 0px 50%, rgb(111, 140, 221), rgba(0, 0, 0, 0) 50%), radial-gradient(at 33% 50%, rgb(141, 125, 188), rgba(0, 0, 0, 0) 50%), radial-gradient(at 67% 50%, rgb(95, 202, 169), rgba(0, 0, 0, 0) 50%), radial-gradient(at 100% 50%, rgb(71, 201, 107), rgba(0, 0, 0, 0) 50%), radial-gradient(at 0px 100%, rgb(44, 137, 255), rgba(0, 0, 0, 0) 50%), radial-gradient(at 33% 100%, rgb(142, 163, 246), rgba(0, 0, 0, 0) 50%), radial-gradient(at 67% 100%, rgb(132, 180, 250), rgba(0, 0, 0, 0) 50%), radial-gradient(at 100% 100%, rgb(124, 173, 241), rgba(0, 0, 0, 0) 50%)',
                          mixBlendMode: 'overlay',
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Placeholder Card (for failed images or coming soon) */}
                  <div className={`relative w-[140px] h-[184px] bg-card rounded-lg flex flex-col items-center justify-center ${
                    !game.available ? "" : "group-hover:-translate-y-2 group-hover:shadow-2xl transition-transform duration-200"
                  }`}
                  style={{ zIndex: 10 }}
                  >
                    <div className="text-4xl mb-3">{game.icon || "🎮"}</div>
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
