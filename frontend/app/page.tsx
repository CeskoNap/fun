"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useStore } from "../src/store/useStore";
import { useUserSocket } from "../src/hooks/useUserSocket";
import { useI18n } from "../src/i18n/useI18n";
import { AuthModal } from "../src/components/AuthModal";
import { HomeStatsSection } from "../src/components/HomeStatsSection";
import { LuckyWinsSection } from "../src/components/LuckyWinsSection";

export default function HomePage() {
  const { t } = useI18n();
  const { balance, level, xp, xpToNextLevel, fetchLevelAndBalance } = useStore();
  useUserSocket();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [gameSearch, setGameSearch] = useState("");

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
      id: "blackjack",
      title: "BlackJack",
      description: "Classic 21 experience",
      href: "#",
      image: "https://bc.imgix.net/game/image/c8464e0852.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-emerald-500 to-green-600",
      available: false,
    },
    {
      id: "coinflip",
      title: "CoinFlip",
      description: "Testa o croce immediato",
      href: "#",
      image: "https://bc.imgix.net/game/image/7be7686a74.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-amber-400 to-orange-500",
      available: false,
    },
    {
      id: "roulette",
      title: "Roulette",
      description: "Rosso/Nero, numeri e puntate",
      href: "#",
      image: "https://bc.imgix.net/game/image/79d881f1de.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-red-500 to-rose-600",
      available: false,
    },
    {
      id: "hilo",
      title: "HiLo",
      description: "Carta più alta o più bassa",
      href: "#",
      image: "https://bc.imgix.net/game/image/b642563645.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-sky-500 to-cyan-500",
      available: false,
    },
    {
      id: "dice",
      title: "Dice",
      description: "Lancia i dadi e scegli il rischio",
      href: "#",
      image: "https://bc.imgix.net/game/image/f0448b14ec.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-indigo-500 to-blue-600",
      available: false,
    },
    {
      id: "crash",
      title: "Crash",
      description: "Esci prima che il moltiplicatore esploda",
      href: "#",
      image: "https://bc.imgix.net/game/image/a016f83c71.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-orange-500 to-red-500",
      available: false,
    },
    {
      id: "wheel",
      title: "Wheel",
      description: "Gira la ruota della fortuna",
      href: "#",
      image: "https://bc.imgix.net/game/image/84ab11ed13.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-fuchsia-500 to-purple-600",
      available: false,
    },
    {
      id: "limbo",
      title: "Limbo",
      description: "Scegli il target e punta al moltiplicatore",
      href: "#",
      image: "https://bc.imgix.net/game/image/a09aa93f72.png?_v=4&auto=format&dpr=1&w=200",
      color: "from-teal-500 to-emerald-500",
      available: false,
    },
    {
      id: "mystery",
      title: "",
      description: "",
      href: "#",
      placeholder: true,
      available: false,
    },
  ];

  const filteredGames = games.filter((game) => {
    if (!gameSearch.trim()) return true;
    return game.title.toLowerCase().includes(gameSearch.trim().toLowerCase());
  });

  return (
    <div>
      {/* Home Stats Section - RTP Live & Races */}
      <section className="py-6 overflow-visible">
        <HomeStatsSection />
      </section>

      {/* Lucky Wins Section */}
      <LuckyWinsSection />

      {/* Original Games Section */}
      <section className="pt-5 pb-12 overflow-visible">
        <div className="flex flex-col gap-3 mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Original Games</h2>
          </div>
          <div className="w-full relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              placeholder="Search a Game..."
              className="w-full pl-10 pr-3 py-2 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ backgroundColor: "#E8F0FE" }}
            />
          </div>
        </div>

        {/* Grid Cards - 8 per row on large screens, wrap below */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pb-6 pt-4" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              href={game.available ? game.href : "#"}
              onClick={(e) => {
                if (!game.available) {
                  e.preventDefault();
                }
              }}
              className={`group relative w-full overflow-visible z-0 ${
                !game.available ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{ marginTop: '0', paddingTop: '0' }}
            >
              {game.image && !imageErrors[game.id] ? (
                <>
                  {/* Game Image with Gradient Background */}
                  <div className="relative w-full h-[184px] rounded-md overflow-visible">
                    <div className={`relative rounded-md transition-all duration-200 ${
                      !game.available 
                        ? "" 
                        : "group-hover:-translate-y-2 group-hover:shadow-2xl"
                    }`}
                    style={{
                      width: '100%',
                      height: '184px',
                      zIndex: 10
                    }}>
                      <img
                        src={getImageUrl(game.image)}
                        alt={game.title}
                        width={140}
                        height={184}
                        className="rounded-md object-cover w-full h-full"
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
                        className="absolute inset-0 rounded-md pointer-events-none"
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
                  {/* Placeholder Card (fallback or blurred placeholder) */}
                  <div
                    className={`relative w-full h-[184px] rounded-md flex flex-col items-center justify-center ${
                      game.placeholder
                        ? "bg-gradient-to-br from-purple-500/60 via-cyan-400/50 to-amber-400/60 blur-sm"
                        : "bg-card"
                    } ${!game.available ? "" : "group-hover:-translate-y-2 group-hover:shadow-2xl transition-transform duration-200"}`}
                  style={{ zIndex: 10 }}
                  >
                    {!game.placeholder && (
                      <>
                    <div className="text-4xl mb-3">{game.icon || "🎮"}</div>
                    <h3 className="text-sm font-medium text-zinc-400 text-center px-2">
                      {game.title}
                    </h3>
                      </>
                    )}
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
