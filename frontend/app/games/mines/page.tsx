"use client";

import { useState, useEffect } from "react";
import { useStore } from "../../../src/store/useStore";
import { apiClient, ApiError } from "../../../src/lib/apiClient";
import { 
  Cog6ToothIcon, 
  Squares2X2Icon, 
  ChartBarIcon, 
  ArrowTopRightOnSquareIcon 
} from "@heroicons/react/24/outline";
import { GameInfoSection } from "../../../src/components/GameInfoSection";

type GameMode = "manual" | "auto";

interface Tile {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
}

export default function MinesPage() {
  const { balance, setBalance, fetchLevelAndBalance } = useStore();
  
  // Game state
  const [mode, setMode] = useState<GameMode>("manual");
  const [betAmount, setBetAmount] = useState<string>("0.00");
  const [minesCount, setMinesCount] = useState<number>(3);
  const [gemsRevealed, setGemsRevealed] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [canCashOut, setCanCashOut] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [betId, setBetId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentBets, setRecentBets] = useState<Array<{
    id: string;
    createdAt: string;
    multiplier: number;
    payout: number;
    status: string;
  }>>([]);

  const GRID_SIZE = 25; // 5x5 grid
  const ROWS = 5;
  const COLS = 5;

  // Initialize game grid from backend data
  const initializeGrid = (minePositionsList: number[], revealedTiles: number[] = []) => {
    const newTiles: Tile[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
      id: i,
      isMine: minePositionsList.includes(i),
      isRevealed: revealedTiles.includes(i),
      isFlagged: false,
    }));
    setTiles(newTiles);
    setMinePositions(minePositionsList);
  };

  // Handle bet placement
  const handleBet = async () => {
    const amount = parseFloat(betAmount) || 0;
    if (amount <= 0 || amount > balance) {
      setError("Invalid bet amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        betId: string;
        gameType: string;
        status: string;
        balance: string;
        gameData: {
          rows: number;
          cols: number;
          minesCount: number;
          minePositions: number[];
          revealedTiles: number[];
          gemsRevealed: number;
          gameEnded: boolean;
        };
      }>("/bets/mines/start", {
        amount,
        rows: ROWS,
        cols: COLS,
        minesCount,
      });

      // Initialize grid with mine positions from backend
      initializeGrid(response.gameData.minePositions, response.gameData.revealedTiles);
      
      // Update state
      setBetId(response.betId);
      setIsGameActive(true);
      setGemsRevealed(response.gameData.gemsRevealed || 0);
      setCurrentMultiplier(1.0);
      setCanCashOut(false);
      setGameEnded(false);
      setHasWon(false);

      // Update balance from backend
      const newBalance = parseFloat(response.balance);
      if (!isNaN(newBalance)) {
        setBalance(newBalance);
      }
      await fetchLevelAndBalance();
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.message || "Failed to place bet");
      } else {
        setError("An error occurred");
      }
      console.error("Error placing bet:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle tile click
  const handleTileClick = async (tileId: number) => {
    if (!isGameActive || gameEnded || !betId || tiles[tileId].isRevealed || tiles[tileId].isFlagged) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        betId: string;
        isMine: boolean;
        gameEnded: boolean;
        gemsRevealed?: number;
        currentMultiplier?: number;
        gameData: {
          revealedTiles: number[];
          gemsRevealed: number;
          currentMultiplier: number;
          gameEnded: boolean;
          minePositions: number[];
        };
      }>("/bets/mines/reveal-tile", {
        betId,
        tileIndex: tileId,
      });

      // Update tiles
      const updatedTiles = [...tiles];
      updatedTiles[tileId].isRevealed = true;
      
      if (response.isMine) {
        // Reveal all mines
        minePositions.forEach((mineIdx) => {
          updatedTiles[mineIdx].isRevealed = true;
        });
        // Immediately disable game to prevent further clicks
        setIsGameActive(false);
        setGameEnded(true);
        setHasWon(false);
        setCanCashOut(false);
      }
      setTiles(updatedTiles);

      if (response.isMine || response.gameEnded) {
        // Game over
        setIsGameActive(false);
        setGameEnded(true);
        setHasWon(false);
        setCanCashOut(false);
        await fetchLevelAndBalance();
        await loadRecentBets();
      } else {
        // Update state from backend
        setGemsRevealed(response.gemsRevealed || 0);
        setCurrentMultiplier(response.currentMultiplier || 1.0);
        setCanCashOut(true);
      }
    } catch (e: any) {
      if (e instanceof ApiError) {
        // If bet is not active, it means the game already ended - don't show error
        if (e.message.includes("Bet is not active") || e.message.includes("already ended")) {
          // Game already ended, just disable it
          setIsGameActive(false);
          setGameEnded(true);
          setCanCashOut(false);
          await fetchLevelAndBalance();
        } else {
          setError(e.message || "Failed to reveal tile");
        }
      } else {
        setError("An error occurred");
      }
      console.error("Error revealing tile:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle cash out
  const handleCashOut = async () => {
    if (!canCashOut || !isGameActive || !betId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        betId: string;
        status: string;
        payout: string;
        multiplier: number;
        xpEarned: string;
        newLevel: number;
        levelsGained: number;
        balance: string;
        gameData: any;
      }>("/bets/mines/cash-out", {
        betId,
      });

      // Update balance from backend
      const newBalance = parseFloat(response.balance);
      if (!isNaN(newBalance)) {
        setBalance(newBalance);
      }

      // Mark game as ended
      setIsGameActive(false);
      setGameEnded(true);
      setHasWon(true);
      setCanCashOut(false);

      await fetchLevelAndBalance();
      await loadRecentBets();
    } catch (e: any) {
      if (e instanceof ApiError) {
        // If bet is not active, it means the game already ended - don't show error
        if (e.message.includes("Bet is not active") || e.message.includes("already ended")) {
          // Game already ended, just disable it
          setIsGameActive(false);
          setGameEnded(true);
          setCanCashOut(false);
          await fetchLevelAndBalance();
        } else {
          setError(e.message || "Failed to cash out");
        }
      } else {
        setError("An error occurred");
      }
      console.error("Error cashing out:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle bet amount buttons
  const handleHalfBet = () => {
    const amount = parseFloat(betAmount) || 0;
    const half = amount / 2;
    setBetAmount(half.toFixed(2));
  };

  const handleDoubleBet = () => {
    const amount = parseFloat(betAmount) || 0;
    const doubled = amount * 2;
    const maxBet = balance;
    setBetAmount((doubled > maxBet ? maxBet.toFixed(2) : doubled.toFixed(2)));
  };

  // Handle random pick
  const handleRandomPick = () => {
    if (!isGameActive || gameEnded || loading) {
      return;
    }

    // Find all unrevealed tiles
    const unrevealedTiles = tiles
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile }) => !tile.isRevealed && !tile.isFlagged);

    if (unrevealedTiles.length === 0) {
      return; // No tiles available
    }

    // Pick a random tile
    const randomIndex = Math.floor(Math.random() * unrevealedTiles.length);
    const selectedTile = unrevealedTiles[randomIndex];

    // Click the randomly selected tile
    handleTileClick(selectedTile.index);
  };

  useEffect(() => {
    fetchLevelAndBalance();
    loadRecentBets();
  }, [fetchLevelAndBalance]);

  const loadRecentBets = async () => {
    try {
      const data = await apiClient.get<Array<{
        id: string;
        createdAt: string;
        multiplier: number;
        payout: number;
        status: string;
      }>>("/games/MINES/recent-bets");
      setRecentBets(data);
    } catch (e: any) {
      console.error("Error loading recent bets:", e);
    }
  };

  const betAmountNumber = parseFloat(betAmount) || 0;
  const totalProfit = betAmountNumber * (currentMultiplier - 1);

  return (
    <div className="flex flex-col bg-background pt-5" style={{ marginTop: '1.25rem' }}>
      {/* Main Game Container */}
      <div className="flex shadow-lg rounded-md overflow-hidden border border-card/50" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        {/* Left Sidebar */}
        <div className="w-72 bg-card border-r border-card/50 flex flex-col pb-2" style={{ minHeight: '100%' }}>
          {/* Sticky Top Section */}
          <div className="sticky top-0 bg-card z-10">
            {/* Manual/Auto Tabs */}
            <div className="p-4 border-b border-card/50">
              <div className="flex gap-1.5 rounded-md bg-background/30 p-0.5">
                <button
                  onClick={() => setMode("manual")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    mode === "manual"
                      ? "bg-background/50 text-white"
                      : "bg-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setMode("auto")}
                  disabled
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all opacity-50 cursor-not-allowed ${
                    mode === "auto"
                      ? "bg-background/50 text-white"
                      : "bg-transparent text-zinc-400"
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
            {/* Bet Amount */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Bet Amount</span>
              </label>
              <div className="flex gap-1.5">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty string, numbers with up to 2 decimal places
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        setBetAmount(val);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setBetAmount(val.toFixed(2));
                      } else if (e.target.value === '') {
                        setBetAmount('0.00');
                      }
                    }}
                    step="0.01"
                    min="0"
                    max={balance}
                    disabled={isGameActive}
                    className="w-full px-3 py-2 pr-10 bg-background/50 border border-card/50 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="text-xs font-semibold text-accent">FUN</span>
                  </div>
                </div>
                <button
                  onClick={handleHalfBet}
                  disabled={isGameActive}
                  className="px-2.5 py-2 bg-background/50 hover:bg-background/60 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  ½
                </button>
                <button
                  onClick={handleDoubleBet}
                  disabled={isGameActive}
                  className="px-2.5 py-2 bg-background/50 hover:bg-background/60 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Mines Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Mines</label>
              <select
                value={minesCount}
                onChange={(e) => setMinesCount(parseInt(e.target.value))}
                disabled={isGameActive}
                className="w-full px-3 py-2 bg-background/50 border border-card/50 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent appearance-none disabled:opacity-50 cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num} className="bg-card">
                    {num}
                  </option>
                ))}
              </select>
            </div>

            {/* Gems Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Gems</label>
              <input
                type="text"
                value={gemsRevealed}
                readOnly
                className="w-full px-3 py-2 bg-background/50 border border-card/50 rounded-md text-white text-xs focus:outline-none cursor-not-allowed"
              />
            </div>

            {/* Bet / Cash Out Button */}
            <button
              onClick={isGameActive && canCashOut ? handleCashOut : handleBet}
              disabled={loading || (!isGameActive && (betAmountNumber <= 0 || betAmountNumber > balance))}
              className={`w-full py-2 px-4 rounded-md font-semibold text-xs transition-all ${
                isGameActive && canCashOut
                  ? "bg-accent text-black hover:bg-accent/90"
                  : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {loading ? "Loading..." : isGameActive && canCashOut ? "Cash Out" : "Bet"}
            </button>

            {/* Error message */}
            {error && (
              <div className="text-red-400 text-xs mt-2">
                {error}
              </div>
            )}

            {/* Random Pick Button */}
            <button
              onClick={handleRandomPick}
              disabled={loading || !isGameActive || gameEnded || tiles.filter(t => !t.isRevealed && !t.isFlagged).length === 0}
              className="w-full py-2 px-4 rounded-md bg-background/50 hover:bg-background/60 text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Random Pick
            </button>

            {/* Total Profit */}
            <div className="space-y-1.5 pt-3 border-t border-card/50">
              <label className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Total Profit ({currentMultiplier.toFixed(2)}×)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={totalProfit.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 pr-10 bg-background/50 border border-card/50 rounded-md text-white text-xs focus:outline-none cursor-not-allowed"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-xs font-semibold text-accent">FUN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Grid Area */}
        <div className="flex-1 flex flex-col bg-background relative">
          {/* Game Grid */}
          <div className="flex-1 flex items-start justify-center pt-8 px-4 pb-8">
            <div className="grid grid-cols-5 gap-1.5 max-w-md w-full" style={{ fontSize: '0.75em' }}>
              {Array.from({ length: GRID_SIZE }, (_, i) => {
                const tile = tiles[i] || { id: i, isMine: false, isRevealed: false, isFlagged: false };
                const isRevealed = tile.isRevealed;
                const isMine = tile.isMine;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleTileClick(i)}
                    disabled={loading || !isGameActive || gameEnded}
                    className={`tile aspect-square rounded-md transition-all duration-300 ${
                      isRevealed
                        ? isMine
                          ? "bg-red-500"
                          : "bg-green-500/20 border-2 border-green-500"
                        : "hover:opacity-80 border border-[#2F4553]"
                    } disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`}
                    style={!isRevealed ? { backgroundColor: '#2F4553' } : undefined}
                    data-testid={`mines-tile-${i}`}
                    data-revealed={isRevealed}
                  >
                    {!isRevealed && (
                      <div className="cover absolute inset-0 rounded-md" style={{ backgroundColor: '#2F4553' }} />
                    )}
                    {isRevealed && (
                      <div className="w-full h-full flex items-center justify-center">
                        {isMine ? (
                          <span className="text-2xl" style={{ fontSize: 'calc(1.5rem + 2px)' }}>💣</span>
                        ) : (
                          <span className="text-2xl" style={{ fontSize: 'calc(1.5rem + 2px)' }}>💎</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Recent Bets */}
        <div className="w-72 bg-card border-l border-card/50 flex flex-col pb-2" style={{ maxHeight: '514px' }}>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 min-h-0">
            {recentBets.length > 0 && recentBets.map((bet, index) => {
                const date = new Date(bet.createdAt);
                const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const bgColor = index % 2 === 0 ? "#142633" : "#0F212E";
                
                return (
                  <div
                    key={bet.id}
                    className="px-2.5 py-1.5 border border-card/30 hover:bg-background/40 transition-colors"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[10px] text-zinc-400">{dateStr}</div>
                      <div className="text-[10px] text-zinc-400">{timeStr}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white">
                        {bet.multiplier > 0 ? `${bet.multiplier.toFixed(2)}×` : "-"}
                      </div>
                      <div className={`text-xs font-semibold ${
                        bet.status === "WON" ? "text-green-400" : "text-red-400"
                      }`}>
                        {bet.payout > 0 ? `${bet.payout.toFixed(2)}` : "0.00"} FUN
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-12 bg-card border-t border-card/50 flex items-center px-4 mt-2 rounded-md relative">
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            <ChartBarIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 text-white font-cream-cake" style={{ fontSize: 'calc(1.125rem + 2px)' }}>Fun</div>

        <div className="ml-auto">
        <button className="px-3 py-1.5 rounded-md bg-background/50 hover:bg-background/60 text-white text-xs font-semibold flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M20 2c1.1 0 2 .9 2 2v12l-10 7-10-7V4c0-1.1.9-2 2-2zm-1.55 4.772a.996.996 0 0 0-1.41 0l-6.79 6.79-1.79-1.79a.996.996 0 1 0-1.41 1.41l3.21 3.21 8.21-8.21h-.02a.996.996 0 0 0 0-1.41" fill="currentColor"/>
          </svg>
          Fairness
        </button>
      </div>
      </div>

      {/* Game Info Section */}
      <GameInfoSection gameType="MINES" gameName="Mines" />
    </div>
  );
}
