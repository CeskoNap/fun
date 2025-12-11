"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";

interface LuckyWin {
  id: string;
  gameId: string;
  gameTitle: string;
  gameImage: string;
  username: string;
  multiplier: number;
  createdAt: Date;
}

// Helper to get server day (reset at 2 AM)
function getServerDay(): Date {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 2) {
    const prevDay = new Date(now);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(2, 0, 0, 0);
    return prevDay;
  }
  
  const currentDay = new Date(now);
  currentDay.setHours(2, 0, 0, 0);
  return currentDay;
}

// Mask username: show first letter, 3 asterisks, last letter (e.g., "nFrank" -> "n***k", "antonia" -> "a***a")
function maskUsername(username: string): string {
  if (!username || username.length === 0) return "P***r";
  if (username.length === 1) return `${username}***`;
  if (username.length === 2) return `${username[0]}***${username[1]}`;
  
  const first = username[0];
  const last = username[username.length - 1];
  return `${first}***${last}`;
}

// Generate random username
function generateRandomUsername(): string {
  const prefixes = [
    "n", "a", "m", "l", "j", "k", "d", "s", "t", "r", "c", "p", "b", "g", "f", "h", "v", "w", "x", "z",
    "al", "an", "ma", "li", "jo", "da", "sa", "ch", "mi", "ro", "lu", "em", "an", "al", "be", "ca", "di", "el", "fr", "gi"
  ];
  const suffixes = [
    "k", "a", "n", "o", "i", "e", "r", "s", "t", "l", "m", "p", "b", "d", "g", "h", "y", "ia", "io", "er",
    "ank", "oni", "lia", "rio", "lia", "nia", "cio", "rio", "lia", "nio", "lio", "nio", "lia", "nio", "lio", "nio"
  ];
  const middles = [
    "Fr", "An", "Ma", "Lu", "Jo", "Da", "Sa", "Ch", "Mi", "Ro", "Lu", "Em", "Be", "Ca", "Di", "El", "Gi", "Pa", "To", "Vi",
    "ank", "oni", "lia", "rio", "lia", "nia", "cio", "rio", "lia", "nio", "lio", "nio", "lia", "nio", "lio", "nio"
  ];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const middle = middles[Math.floor(Math.random() * middles.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  // Randomly combine: prefix+suffix or prefix+middle+suffix
  if (Math.random() > 0.5) {
    return prefix + middle + suffix;
  } else {
    return prefix + suffix;
  }
}

  // Generate random lucky wins (for initial implementation)
function generateRandomLuckyWins(count: number): LuckyWin[] {
  const gameImages = [
    "https://bc.imgix.net/game/image/1932c1c9da.png?_v=4&auto=format&dpr=1&w=200", // Mines
    "https://bc.imgix.net/game/image/721df0b283.png?_v=4&auto=format&dpr=1&w=200", // Plinko
    "https://bc.imgix.net/game/image/c8464e0852.png?_v=4&auto=format&dpr=1&w=200", // BlackJack
    "https://bc.imgix.net/game/image/7be7686a74.png?_v=4&auto=format&dpr=1&w=200", // CoinFlip
    "https://bc.imgix.net/game/image/79d881f1de.png?_v=4&auto=format&dpr=1&w=200", // Roulette
    "https://bc.imgix.net/game/image/b642563645.png?_v=4&auto=format&dpr=1&w=200", // HiLo
    "https://bc.imgix.net/game/image/f0448b14ec.png?_v=4&auto=format&dpr=1&w=200", // Dice
    "https://bc.imgix.net/game/image/a016f83c71.png?_v=4&auto=format&dpr=1&w=200", // Crash
    "https://bc.imgix.net/game/image/84ab11ed13.png?_v=4&auto=format&dpr=1&w=200", // Wheel
    "https://bc.imgix.net/game/image/a09aa93f72.png?_v=4&auto=format&dpr=1&w=200", // Limbo
  ];

  const gameTitles = ["Mines", "Plinko", "BlackJack", "CoinFlip", "Roulette", "HiLo", "Dice", "Crash", "Wheel", "Limbo"];

  const wins: LuckyWin[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const gameIndex = Math.floor(Math.random() * gameImages.length);
    const multiplier = 5 + Math.random() * 95; // Between 5x and 100x
    
    wins.push({
      id: `win-${i}-${Date.now()}-${Math.random()}`,
      gameId: gameTitles[gameIndex].toLowerCase(),
      gameTitle: gameTitles[gameIndex],
      gameImage: gameImages[gameIndex],
      username: generateRandomUsername(),
      multiplier: Math.round(multiplier * 10) / 10, // Round to 1 decimal
      createdAt: new Date(now.getTime() - (count - i) * 60000 - Math.random() * 60000), // Sequential times, most recent first
    });
  }
  
  // Sort by creation date (most recent first)
  return wins.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function LuckyWinsSection() {
  const [luckyWins, setLuckyWins] = useState<LuckyWin[]>([]);
  const [currentServerDay, setCurrentServerDay] = useState<Date>(getServerDay());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  // Helper to get proxied image URL
  const getImageUrl = (originalUrl: string) => {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  };

  // Load lucky wins from API or generate random
  const loadLuckyWins = async () => {
    try {
      // TODO: Replace with actual API call when endpoint is ready
      // const res = await fetch(`${API_BASE}/lucky-wins`);
      // const data = await res.json();
      // setLuckyWins(data.wins);
      
      // For now, generate random wins
      const wins = generateRandomLuckyWins(30);
      setLuckyWins(wins);
    } catch (error) {
      console.error("Failed to load lucky wins:", error);
      // Fallback to random wins
      const wins = generateRandomLuckyWins(30);
      setLuckyWins(wins);
    }
  };

  // Add new win and maintain top 30
  const addNewWin = useCallback((winData: {
    betId: string;
    gameType: string;
    userId: string;
    username: string;
    multiplier: number;
    payout: string;
  }) => {
    setLuckyWins((prevWins) => {
      // Map game type to image
      const gameImageMap: Record<string, string> = {
        MINES: "https://bc.imgix.net/game/image/1932c1c9da.png?_v=4&auto=format&dpr=1&w=200",
        PLINKO: "https://bc.imgix.net/game/image/721df0b283.png?_v=4&auto=format&dpr=1&w=200",
        BLACKJACK: "https://bc.imgix.net/game/image/c8464e0852.png?_v=4&auto=format&dpr=1&w=200",
        COINFLIP: "https://bc.imgix.net/game/image/7be7686a74.png?_v=4&auto=format&dpr=1&w=200",
        ROULETTE: "https://bc.imgix.net/game/image/79d881f1de.png?_v=4&auto=format&dpr=1&w=200",
        HILO: "https://bc.imgix.net/game/image/b642563645.png?_v=4&auto=format&dpr=1&w=200",
        DICE: "https://bc.imgix.net/game/image/f0448b14ec.png?_v=4&auto=format&dpr=1&w=200",
        CRASH: "https://bc.imgix.net/game/image/a016f83c71.png?_v=4&auto=format&dpr=1&w=200",
        WHEEL: "https://bc.imgix.net/game/image/84ab11ed13.png?_v=4&auto=format&dpr=1&w=200",
        LIMBO: "https://bc.imgix.net/game/image/a09aa93f72.png?_v=4&auto=format&dpr=1&w=200",
      };

      const newWin: LuckyWin = {
        id: winData.betId,
        gameId: winData.gameType.toLowerCase(),
        gameTitle: winData.gameType,
        gameImage: gameImageMap[winData.gameType] || gameImageMap.MINES,
        username: winData.username,
        multiplier: winData.multiplier,
        createdAt: new Date(),
      };

      // Add new win and sort by creation date (most recent first)
      const updatedWins = [...prevWins, newWin]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 30); // Keep only most recent 30

      return updatedWins;
    });
  }, []);

  // Load initial wins and setup WebSocket
  useEffect(() => {
    loadLuckyWins();

    // Setup WebSocket for real-time updates
    socketRef.current = io(`${API_BASE}/user`, {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("[LuckyWins] WebSocket connected");
    });

    socketRef.current.on("big-win:public", (data: {
      betId: string;
      gameType: string;
      userId: string;
      username: string;
      multiplier: number;
      payout: string;
    }) => {
      console.log("[LuckyWins] Received big win:", data);
      addNewWin(data);
    });

    // Check for reset at 2 AM
    const checkReset = () => {
      const newServerDay = getServerDay();
      if (newServerDay.getTime() !== currentServerDay.getTime()) {
        setCurrentServerDay(newServerDay);
        loadLuckyWins(); // Reload on reset
      }
    };

    // Check every minute for reset
    const resetInterval = setInterval(checkReset, 60000);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearInterval(resetInterval);
    };
  }, [currentServerDay, addNewWin]);

  // Auto-scroll effect with seamless loop
  useEffect(() => {
    if (!scrollContainerRef.current || luckyWins.length === 0) return;

    const container = scrollContainerRef.current;
    const scrollSpeed = 0.5; // pixels per frame
    let animationFrameId: number;

    // Calculate the width of one set of wins (half of total width since we duplicate)
    const getSingleSetWidth = () => {
      if (container.children.length === 0) return 0;
      const firstChild = container.children[0] as HTMLElement;
      const cardWidth = firstChild.offsetWidth;
      const gap = 12; // gap-3 = 12px
      return (cardWidth + gap) * luckyWins.length;
    };

    const scroll = () => {
      // Save current scroll position when paused
      if (isPaused) {
        scrollPositionRef.current = container.scrollLeft;
        animationFrameId = requestAnimationFrame(scroll);
        return;
      }

      // Continue from saved position or current scroll position
      scrollPositionRef.current += scrollSpeed;
      const singleSetWidth = getSingleSetWidth();
      
      // When we've scrolled through one full set, reset to start (invisible reset)
      if (scrollPositionRef.current >= singleSetWidth) {
        scrollPositionRef.current = scrollPositionRef.current - singleSetWidth;
        container.scrollLeft = scrollPositionRef.current;
      } else {
        container.scrollLeft = scrollPositionRef.current;
      }
      
      animationFrameId = requestAnimationFrame(scroll);
    };

    // Initialize scroll position if not already set
    if (scrollPositionRef.current === 0) {
      scrollPositionRef.current = container.scrollLeft;
    }

    // Start scrolling
    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [luckyWins, isPaused]);

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  return (
    <section className="pt-0 pb-6 overflow-visible">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold text-white">Recent Lucky Wins</h2>
        <div className="inline-flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex gap-3 overflow-x-auto overflow-y-visible pb-4 scrollbar-hide"
        style={{ scrollBehavior: 'auto' }}
      >
        {/* Render wins twice for seamless loop */}
        {[...luckyWins, ...luckyWins].map((win, index) => (
          <Link
            key={`${win.id}-${index}`}
            href={`/games/${win.gameId}`}
            className="flex h-28 w-14 sm:h-[106px] sm:w-13 flex-none flex-col items-center text-xs hover:opacity-80 transition-opacity"
          >
            {/* Game Image */}
            <div className="relative mb-1 w-full rounded-lg pt-[133%]">
              <img
                src={getImageUrl(win.gameImage)}
                alt={win.gameTitle}
                className="absolute left-0 top-0 w-full h-full rounded-lg object-cover"
              />
            </div>
            
            {/* Username and Multiplier */}
            <div className="w-[118%] min-w-0">
              <div className="flex items-center justify-center font-extrabold text-white mb-0.5 px-0.5">
                <span className="text-[10px] sm:text-xs truncate w-full text-center" title={win.username}>
                  {maskUsername(win.username)}
                </span>
              </div>
              <div className="whitespace-nowrap text-center font-extrabold text-green-500 text-[10px] sm:text-xs">
                {win.multiplier.toFixed(1)}x
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

