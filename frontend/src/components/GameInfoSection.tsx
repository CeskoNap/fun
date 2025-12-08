"use client";

import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { GameType } from "@prisma/client";

const getImageUrl = (originalUrl: string) => {
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
};

interface GlobalRecord {
  multiplier: number | null;
  username: string | null;
  userId: string | null;
}

interface WinEntry {
  rank: number;
  userId: string;
  username: string;
  date: string;
  bet: number;
  multiplier: number;
  payout: number;
}

interface GameInfo {
  type: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface GameInfoSectionProps {
  gameType: GameType;
  gameName: string;
}

const getGameImage = (gameType: GameType): string => {
  const gameImages: Record<GameType, string> = {
    MINES: "https://bc.imgix.net/game/image/1932c1c9da.png?_v=4&auto=format&dpr=0.8999999761581421&w=200",
    PLINKO: "https://bc.imgix.net/game/image/721df0b283.png?_v=4&auto=format&dpr=0.8999999761581421&w=200",
    CRASH: "",
    DICE: "",
  };
  return gameImages[gameType] || "";
};

const getGameTags = (gameType: GameType): string[] => {
  const tags: Record<GameType, string[]> = {
    MINES: ["Edge: 1.00%", "Mines", "Provably Fair", "Fun Originals", "Volatility Switch"],
    PLINKO: ["Edge: 1.00%", "Plinko", "Provably Fair", "Fun Originals", "Risk Levels"],
    CRASH: ["Edge: 1.00%", "Crash", "Provably Fair", "Fun Originals"],
    DICE: ["Edge: 1.00%", "Dice", "Provably Fair", "Fun Originals"],
  };
  return tags[gameType] || [];
};

type TabType = "description" | "big-wins" | "lucky-wins" | "challenges";

export function GameInfoSection({ gameType, gameName }: GameInfoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [globalRecord, setGlobalRecord] = useState<GlobalRecord | null>(null);
  const [bigWins, setBigWins] = useState<WinEntry[]>([]);
  const [luckyWins, setLuckyWins] = useState<WinEntry[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [gameType]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [record, info] = await Promise.all([
        apiClient.get<GlobalRecord>("/games/global-record"),
        apiClient.get<GameInfo>(`/games/${gameType}/info`),
      ]);
      setGlobalRecord(record);
      setGameInfo(info);

      // Load tab-specific data
      if (activeTab === "big-wins") {
        const wins = await apiClient.get<WinEntry[]>(`/games/${gameType}/big-wins`);
        setBigWins(wins);
      } else if (activeTab === "lucky-wins") {
        const wins = await apiClient.get<WinEntry[]>(`/games/${gameType}/lucky-wins`);
        setLuckyWins(wins);
      }
    } catch (e: any) {
      setError("Failed to load game information");
      console.error("Error loading game info:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "big-wins" && bigWins.length === 0) {
      loadBigWins();
    } else if (activeTab === "lucky-wins" && luckyWins.length === 0) {
      loadLuckyWins();
    }
  }, [activeTab]);

  const loadBigWins = async () => {
    try {
      const wins = await apiClient.get<WinEntry[]>(`/games/${gameType}/big-wins`);
      setBigWins(wins);
    } catch (e: any) {
      console.error("Error loading big wins:", e);
    }
  };

  const loadLuckyWins = async () => {
    try {
      const wins = await apiClient.get<WinEntry[]>(`/games/${gameType}/lucky-wins`);
      setLuckyWins(wins);
    } catch (e: any) {
      console.error("Error loading lucky wins:", e);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatMultiplier = (multiplier: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(multiplier);
  };

  const renderWinsTable = (wins: WinEntry[], emptyMessage: string) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card/50">
              <th className="text-left py-3 px-4 text-sm font-semibold text-white">Rank</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white">User</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white">Bet</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white">Multiplier</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white">Payout</th>
            </tr>
          </thead>
          <tbody>
            {wins.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              wins.map((win, index) => (
                <tr
                  key={index}
                  className={`border-b border-card/30 ${
                    index % 2 === 0 ? "bg-[#142633]" : "bg-[#0F212E]"
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      {getRankIcon(win.rank)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors">
                      {win.username}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{formatDate(win.date)}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">
                    {formatCurrency(win.bet)} FUN
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {formatMultiplier(win.multiplier)}×
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-300">
                    {formatCurrency(win.payout)} FUN
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M17 6.33334L10 2.16667L3 6.33334V14.6667L10 18.8333L17 14.6667V6.33334Z" fill="#5D6559"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M10 2.16667L3 6.33334V14.6667L10 18.8333L17 14.6667V6.33334L10 2.16667ZM16.5833 6.57022L10 2.65157L3.41667 6.57022V14.4298L10 18.3484L16.5833 14.4298V6.57022Z" fill="#E9D18C"/>
          <path d="M9.25829 14.2765C9.25829 14.3941 9.35244 14.5 9.48189 14.5H10.7882C10.9059 14.5 11 14.3941 11 14.2765V6.72353C11 6.60588 10.9059 6.5 10.7882 6.5H9.70549L7.9873 7.84118C7.95199 7.87647 7.91669 7.97059 7.91669 8.01765V8.75882C7.91669 8.87647 8.01083 8.98235 8.12852 8.98235H9.25829V14.2765Z" fill="#E9D18C"/>
        </svg>
      );
    } else if (rank === 2) {
      return (
        <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M17 6.33334L10 2.16667L3 6.33334V14.6667L10 18.8333L17 14.6667V6.33334Z" fill="#55626F"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M10 2.16667L3 6.33334V14.6667L10 18.8333L17 14.6667V6.33334L10 2.16667ZM16.5833 6.57022L10 2.65157L3.41667 6.57022V14.4298L10 18.3484L16.5833 14.4298V6.57022Z" fill="#DEE1EF"/>
          <path d="M7.41669 14.2797C7.41669 14.3957 7.50999 14.5 7.63828 14.5H12.3034C12.4201 14.5 12.525 14.3957 12.525 14.2797V13.2362C12.525 13.1203 12.4201 13.0159 12.3034 13.0159H10.2508C10.7989 12.2507 11.7553 11.0101 12.1285 10.3493C12.4084 9.80435 12.5834 9.45652 12.5834 8.84203C12.5834 7.55507 11.6037 6.5 9.93587 6.5C8.54799 6.5 7.60329 7.63623 7.60329 7.63623C7.52165 7.72899 7.53332 7.86812 7.61496 7.93768L8.32639 8.65652C8.4197 8.74928 8.55965 8.74928 8.65295 8.65652C8.87455 8.41304 9.30608 8.07681 9.78426 8.07681C10.4374 8.07681 10.8106 8.47101 10.8106 8.91159C10.8106 9.23623 10.659 9.56087 10.5074 9.79275C9.81925 10.8362 8.09314 13.1667 7.41669 14.0478V14.2797Z" fill="#DEE1EF"/>
        </svg>
      );
    } else if (rank === 3) {
      return (
        <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M17 6.33332L10 2.16666L3 6.33332V14.6667L10 18.8333L17 14.6667V6.33332Z" fill="#636B6B"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M10 2.16666L3 6.33332V14.6667L10 18.8333L17 14.6667V6.33332L10 2.16666ZM16.5833 6.5702L10 2.65155L3.41667 6.5702V14.4298L10 18.3484L16.5833 14.4298V6.5702Z" fill="#FDE6CA"/>
          <path d="M10 14.5C11.8758 14.5 13.0834 13.5595 13.0834 12.2242C13.0834 11.0631 12.0517 10.4478 11.2545 10.3665C12.122 10.2155 12.9661 9.57692 12.9661 8.6016C12.9661 7.31277 11.8406 6.5 10.0117 6.5C8.64007 6.5 7.65528 7.0225 7.0222 7.73077L7.85458 8.76415C8.4056 8.24165 9.08557 7.96299 9.83589 7.96299C10.6565 7.96299 11.2896 8.26488 11.2896 8.88026C11.2896 9.4492 10.7152 9.70464 9.84761 9.70464C9.55452 9.70464 9.01523 9.70464 8.87455 9.69303V11.1792C8.99178 11.1676 9.51935 11.156 9.84761 11.156C10.9379 11.156 11.4186 11.4347 11.4186 12.0501C11.4186 12.6306 10.891 13.037 9.9414 13.037C9.17936 13.037 8.32353 12.7119 7.78424 12.1546L6.91669 13.2576C7.49115 13.9543 8.55801 14.5 10 14.5Z" fill="#FDE6CA"/>
        </svg>
      );
    }
    return null;
  };

  if (loading && !gameInfo) {
    return (
      <div className="bg-card rounded-md p-6 border border-card/50 mt-4">
        <div className="text-zinc-400">Loading game information...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-md border border-card/50 mt-6 mb-6 overflow-hidden">
      {/* Header with Game Title and Global Record - Clickable */}
      <div 
        className="p-5 border-b border-card/50 cursor-pointer hover:bg-background/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white" style={{ fontSize: 'calc(1.25rem - 1px)' }}>{gameName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {globalRecord && globalRecord.multiplier && (
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background/50 hover:bg-background/60 text-white text-xs font-semibold transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" className="shrink-0">
                  <path fill="#FFB947" d="M21 4h-2.08c0-1.1-.9-2-2-2h-10c-1.1 0-2 .9-2 2H2.84c-1.12 0-2.02.91-2 2.03.04 2.48.69 6.41 4.35 6.86a6.98 6.98 0 0 0 5.73 5.01v1.08h-1c-2.21 0-4 1.79-4 4h12c0-2.21-1.79-4-4-4h-1V17.9c2.76-.4 4.99-2.39 5.73-5.02 3.65-.46 4.31-4.38 4.35-6.86.02-1.12-.88-2.03-2-2.03zM3.92 10.11c-.57-.68-1.04-1.9-1.08-4.1h1.08zm16-.01V6H21c-.04 2.21-.51 3.43-1.08 4.1"></path>
                  <path fill="#000" d="M14.01 14h-2.83V8.26L9.6 9.83 8 8.16l3.57-3.5h2.44z"></path>
                </svg>
                <span className="text-xs font-semibold text-white whitespace-nowrap">
                  {formatMultiplier(globalRecord.multiplier)}×
                </span>
                {globalRecord.username && (
                  <button className="text-xs font-semibold text-white whitespace-nowrap">
                    {globalRecord.username}
                  </button>
                )}
              </div>
            )}
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              className={`shrink-0 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path fill="currentColor" d="M17.293 8.293a1 1 0 1 1 1.414 1.414l-6 6a1 1 0 0 1-1.414 0l-6-6-.068-.076A1 1 0 0 1 6.63 8.225l.076.068L12 13.586z"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs - Only show when expanded */}
      {isExpanded && (
        <>
          <div className="px-5 pt-5 border-b border-card/50">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(["description", "big-wins", "lucky-wins", "challenges"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tab);
                  }}
                  className={`px-5 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? "text-white"
                      : "bg-transparent text-white hover:text-white"
                  }`}
                  style={{
                    backgroundColor: activeTab === tab ? "#142633" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.backgroundColor = "#142633";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {tab === "description" && "Description"}
                  {tab === "big-wins" && "Big Wins"}
                  {tab === "lucky-wins" && "Lucky Wins"}
                  {tab === "challenges" && "Challenges"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-5">
        {activeTab === "description" && (
          <div className="flex gap-6 items-start">
            {/* Game Icon */}
            <div className="flex-shrink-0">
              {getGameImage(gameType) ? (
                <img
                  src={getImageUrl(getGameImage(gameType))}
                  alt={gameName}
                  className="w-32 h-44 rounded-md object-cover"
                />
              ) : (
                <div className="w-32 h-44 rounded-md overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex flex-col items-center justify-center p-4 relative">
                  <div className="absolute top-2 left-2 text-2xl">💣</div>
                  <div className="text-4xl mb-2">💎</div>
                  <div className="text-white font-bold text-lg uppercase mt-auto">{gameName}</div>
                  <div className="text-white/80 text-xs uppercase">Fun Originals</div>
                </div>
              )}
            </div>

            {/* Description Content */}
            <div className="flex-1 space-y-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {getGameTags(gameType).map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-md bg-zinc-700/50 text-zinc-300 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description Text */}
              <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
                {gameType === "MINES" && (
                  <>
                    <p>
                      Join in on the Mines fever with one of our most popular and beloved games at <span className="underline">Fun Gaming Platform</span>! Inspired by the classic Minesweeper, Mines will simply reveal the gems and avoid the bombs to increase your payout multiplier.
                    </p>
                    <p>
                      Mines is a grid-based gambling game of chance developed by <span className="underline">Fun Originals</span>, where players navigate the grid to reveal gems while avoiding bombs! This Mines betting game is played on a 5x5 grid in which players can flip the tiles over to show either a gem or a bomb.
                    </p>
                  </>
                )}
                {gameType === "PLINKO" && (
                  <>
                    <p>
                      Experience the excitement of Plinko, one of our most thrilling games at <span className="underline">Fun Gaming Platform</span>! Watch the ball drop through pegs and land in multiplier slots to win big rewards.
                    </p>
                    <p>
                      Plinko is a classic arcade-style game developed by <span className="underline">Fun Originals</span>, where players drop a ball from the top and watch it bounce through rows of pegs. The final slot determines your multiplier, with higher risk levels offering greater potential rewards!
                    </p>
                  </>
                )}
                {gameType !== "MINES" && gameType !== "PLINKO" && (
                  <p>{gameInfo?.description || "No description available."}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "big-wins" && renderWinsTable(bigWins, "No big wins yet")}

        {activeTab === "lucky-wins" && renderWinsTable(luckyWins, "No lucky wins yet")}

        {activeTab === "challenges" && (
          <div className="text-center py-8">
            <div className="text-zinc-400 text-sm">
              Challenges will be available soon. Connect with Races to compete for prizes!
            </div>
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}


