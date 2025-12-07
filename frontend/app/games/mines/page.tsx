"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "../../../src/store/useStore";
import { 
  Cog6ToothIcon, 
  Squares2X2Icon, 
  ChartBarIcon, 
  ArrowTopRightOnSquareIcon 
} from "@heroicons/react/24/outline";

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
  const [betAmount, setBetAmount] = useState<string>("0.00000000");
  const [minesCount, setMinesCount] = useState<number>(3);
  const [gemsRevealed, setGemsRevealed] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [canCashOut, setCanCashOut] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);

  const GRID_SIZE = 25; // 5x5 grid
  const ROWS = 5;
  const COLS = 5;

  // Calculate multiplier using same formula as backend
  const calculateMultiplier = (revealedGems: number, totalMines: number): number => {
    if (revealedGems <= 0) return 1.0;
    const totalCells = GRID_SIZE;
    const maxSafe = totalCells - totalMines;
    const riskFactor = 1 + totalMines / 5;
    const progress = revealedGems / maxSafe;
    const progressFactor = 1 + Math.pow(progress, 2) * 5;
    const houseEdge = 0.98;
    const raw = riskFactor * progressFactor * houseEdge;
    return Number(raw.toFixed(4));
  };

  // Initialize game grid
  const initializeGrid = (mines: number[]) => {
    const newTiles: Tile[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
      id: i,
      isMine: mines.includes(i),
      isRevealed: false,
      isFlagged: false,
    }));
    setTiles(newTiles);
  };

  // Generate random mine positions (client-side for now, will need server seed for provably fair)
  const generateMinePositions = (count: number): number[] => {
    const positions: number[] = [];
    const available = Array.from({ length: GRID_SIZE }, (_, i) => i);
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      positions.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }
    
    return positions.sort((a, b) => a - b);
  };

  // Handle bet placement
  const handleBet = async () => {
    const amount = parseFloat(betAmount);
    if (amount <= 0 || amount > balance) {
      return;
    }

    // Generate mine positions (TODO: use server seed for provably fair)
    const mines = generateMinePositions(minesCount);
    setMinePositions(mines);
    
    // Initialize grid
    initializeGrid(mines);
    
    // Reset game state
    setIsGameActive(true);
    setGemsRevealed(0);
    setCurrentMultiplier(1.0);
    setCanCashOut(false);
    setGameEnded(false);
    setHasWon(false);

    // Deduct bet amount from balance locally
    // Note: For a fully interactive Mines game, we'd need backend support for pending bets
    // For now, we handle balance updates locally and sync with backend on game end
    setBalance(balance - amount);
  };

  // Handle tile click
  const handleTileClick = (tileId: number) => {
    if (!isGameActive || gameEnded || tiles[tileId].isRevealed || tiles[tileId].isFlagged) {
      return;
    }

    const tile = tiles[tileId];
    
    if (tile.isMine) {
      // Game over - hit a mine
      const updatedTiles = [...tiles];
      updatedTiles[tileId].isRevealed = true;
      setTiles(updatedTiles);
      
      // Reveal all mines
      updatedTiles.forEach((t) => {
        if (t.isMine) t.isRevealed = true;
      });
      setTiles([...updatedTiles]);
      
      setIsGameActive(false);
      setGameEnded(true);
      setHasWon(false);
      setCanCashOut(false);
    } else {
      // Reveal gem
      const updatedTiles = [...tiles];
      updatedTiles[tileId].isRevealed = true;
      setTiles(updatedTiles);
      
      const newGemsRevealed = gemsRevealed + 1;
      setGemsRevealed(newGemsRevealed);
      
      const newMultiplier = calculateMultiplier(newGemsRevealed, minesCount);
      setCurrentMultiplier(newMultiplier);
      setCanCashOut(true);
    }
  };

  // Handle cash out
  const handleCashOut = async () => {
    if (!canCashOut || !isGameActive) return;

    const amount = parseFloat(betAmount);
    const payout = amount * currentMultiplier;
    
    // Credit winnings to balance
    setBalance(balance + payout);
    
    // Sync with backend if authenticated
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      
      if (token) {
        // TODO: Call backend endpoint to credit winnings for interactive Mines game
        // For now, sync balance
        await fetchLevelAndBalance();
      }
    } catch (error) {
      console.error("Error syncing balance:", error);
    }
    
    // Mark game as ended
    setIsGameActive(false);
    setGameEnded(true);
    setHasWon(true);
    setCanCashOut(false);
  };

  // Handle bet amount buttons
  const handleHalfBet = () => {
    const amount = parseFloat(betAmount);
    setBetAmount((amount / 2).toFixed(8));
  };

  const handleDoubleBet = () => {
    const amount = parseFloat(betAmount);
    const doubled = amount * 2;
    const maxBet = balance;
    setBetAmount((doubled > maxBet ? maxBet : doubled).toFixed(8));
  };

  useEffect(() => {
    fetchLevelAndBalance();
  }, [fetchLevelAndBalance]);

  const totalProfit = parseFloat(betAmount) * (currentMultiplier - 1);
  const betAmountNumber = parseFloat(betAmount);

  return (
    <div className="flex flex-col bg-background pt-5" style={{ marginTop: '1.25rem' }}>
      {/* Main Game Container */}
      <div className="flex shadow-lg rounded-lg overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-card border-r border-card/50 flex flex-col pb-2" style={{ minHeight: '100%' }}>
          {/* Sticky Top Section */}
          <div className="sticky top-0 bg-card z-10">
            {/* Manual/Auto Tabs */}
            <div className="p-3 border-b border-card/50">
              <div className="flex gap-1.5 rounded-full bg-background/30 p-0.5">
                <button
                  onClick={() => setMode("manual")}
                  className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                    mode === "manual"
                      ? "bg-background/50 text-white"
                      : "bg-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setMode("auto")}
                  className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                    mode === "auto"
                      ? "bg-background/50 text-white"
                      : "bg-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-3">
            {/* Bet Amount */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Bet Amount</span>
                <span className="text-xs font-normal text-zinc-400">$0.00</span>
              </label>
              <div className="flex gap-1.5">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    step="0.00000001"
                    min="0"
                    max={balance}
                    disabled={isGameActive}
                    className="w-full px-3 py-2 pr-10 bg-background/50 border border-card/50 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#F7931A"/>
                      <path fill="#fff" d="M16.932 10.669c.213-1.437-.88-2.21-2.378-2.726l.484-1.948-1.182-.296-.481 1.897c-.313-.079-.633-.151-.949-.223l.481-1.9-1.185-.296-.485 1.945a31 31 0 0 1-.756-.179l-1.636-.409L8.532 7.8s.88.203.86.213a.633.633 0 0 1 .553.69V8.7l-.553 2.22q.071.018.13.04l-.007-.002-.123-.03-.777 3.093a.43.43 0 0 1-.546.28l.003.001-.863-.213-.588 1.351 1.544.381.845.22-.491 1.97 1.185.295.485-1.948q.483.129.945.244l-.485 1.941 1.186.296.488-1.966c2.024.382 3.544.227 4.183-1.601.515-1.471-.024-2.32-1.09-2.874.777-.165 1.358-.677 1.516-1.728m-2.712 3.797c-.364 1.475-2.842.688-3.646.478l.65-2.598c.804.189 3.381.588 2.996 2.12m.368-3.818c-.344 1.34-2.406.657-3.066.492l.591-2.365c.667.165 2.822.478 2.475 1.873"/>
                    </svg>
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
              disabled={!isGameActive && (betAmountNumber <= 0 || betAmountNumber > balance)}
              className={`w-full py-2 px-4 rounded-md font-semibold text-xs transition-all ${
                isGameActive && canCashOut
                  ? "bg-accent text-black hover:bg-accent/90"
                  : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {isGameActive && canCashOut ? "Cash Out" : "Bet"}
            </button>

            {/* Random Pick Button */}
            <button
              disabled={!isGameActive || gameEnded}
              className="w-full py-2 px-4 rounded-md bg-background/50 hover:bg-background/60 text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Random Pick
            </button>

            {/* Total Profit */}
            <div className="space-y-1.5 pt-3 border-t border-card/50">
              <label className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Total Profit ({currentMultiplier.toFixed(2)}×)</span>
                <span className="text-xs font-normal text-zinc-400">$0.00</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={totalProfit.toFixed(8)}
                  readOnly
                  className="w-full px-3 py-2 pr-10 bg-background/50 border border-card/50 rounded-md text-white text-xs focus:outline-none cursor-not-allowed"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#F7931A"/>
                    <path fill="#fff" d="M16.932 10.669c.213-1.437-.88-2.21-2.378-2.726l.484-1.948-1.182-.296-.481 1.897c-.313-.079-.633-.151-.949-.223l.481-1.9-1.185-.296-.485 1.945a31 31 0 0 1-.756-.179l-1.636-.409L8.532 7.8s.88.203.86.213a.633.633 0 0 1 .553.69V8.7l-.553 2.22q.071.018.13.04l-.007-.002-.123-.03-.777 3.093a.43.43 0 0 1-.546.28l.003.001-.863-.213-.588 1.351 1.544.381.845.22-.491 1.97 1.185.295.485-1.948q.483.129.945.244l-.485 1.941 1.186.296.488-1.966c2.024.382 3.544.227 4.183-1.601.515-1.471-.024-2.32-1.09-2.874.777-.165 1.358-.677 1.516-1.728m-2.712 3.797c-.364 1.475-2.842.688-3.646.478l.65-2.598c.804.189 3.381.588 2.996 2.12m.368-3.818c-.344 1.34-2.406.657-3.066.492l.591-2.365c.667.165 2.822.478 2.475 1.873"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Grid Area */}
        <div className="flex-1 flex flex-col bg-background relative">
          {/* Game Grid */}
          <div className="flex-1 flex items-start justify-center pt-7 px-1 pb-7">
            <div className="grid grid-cols-5 gap-1.5 max-w-xl w-full" style={{ fontSize: '0.8em' }}>
              {Array.from({ length: GRID_SIZE }, (_, i) => {
                const tile = tiles[i] || { id: i, isMine: false, isRevealed: false, isFlagged: false };
                const isRevealed = tile.isRevealed;
                const isMine = tile.isMine;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleTileClick(i)}
                    disabled={!isGameActive || gameEnded}
                    className={`tile aspect-square rounded-lg transition-all duration-300 ${
                      isRevealed
                        ? isMine
                          ? "bg-red-500"
                          : "bg-green-500/20 border-2 border-green-500"
                        : "hover:opacity-80 border border-[#2F4553]"
                    } disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`}
                    style={!isRevealed ? { backgroundColor: '#2F4553' } : undefined}
                    style={{
                      boxShadow: isRevealed 
                        ? "inset 0 0 10px rgba(0,0,0,0.3)" 
                        : "0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                      '--tile-shadow-inset': '-0.15em',
                      '--shadow': '0.3em',
                      '--tile-shadow-lg': '0.45em',
                      '--small-shadow': '-0.15em',
                      '--duration': '300ms',
                      '--fetch-duration': '600ms',
                    } as React.CSSProperties}
                    data-testid={`mines-tile-${i}`}
                    data-revealed={isRevealed}
                  >
                    {!isRevealed && (
                      <div className="cover absolute inset-0 rounded-lg" style={{ backgroundColor: '#2F4553' }} />
                    )}
                    {isRevealed && (
                      <div className="w-full h-full flex items-center justify-center">
                        {isMine ? (
                          <span className="text-2xl">💣</span>
                        ) : (
                          <span className="text-2xl">💎</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-12 bg-card border-t border-card/50 flex items-center justify-between px-4 mt-2">
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

        <div className="text-white font-cream-cake text-lg">Fun</div>

        <button className="px-3 py-1.5 rounded-md bg-background/50 hover:bg-background/60 text-white text-xs font-semibold flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M20 2c1.1 0 2 .9 2 2v12l-10 7-10-7V4c0-1.1.9-2 2-2zm-1.55 4.772a.996.996 0 0 0-1.41 0l-6.79 6.79-1.79-1.79a.996.996 0 1 0-1.41 1.41l3.21 3.21 8.21-8.21h-.02a.996.996 0 0 0 0-1.41" fill="currentColor"/>
          </svg>
          Fairness
        </button>
      </div>
    </div>
  );
}
