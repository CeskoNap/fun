"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient } from "../lib/apiClient";
import Link from "next/link";

interface RtpData {
  rtp: number;
  change: number;
  history: Array<{ time: string; rtp: number }>;
}

interface RaceData {
  id: string;
  name: string;
  prizePool: number;
  startsAt: string;
  endsAt: string;
  status: string;
  topPlayers: Array<{
    rank: number;
    username: string;
    prize: number;
  }>;
}

export function HomeStatsSection() {
  const [rtpData, setRtpData] = useState<RtpData | null>(null);
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Small delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        if (rtpData && rtpData.history && rtpData.history.length > 0) {
          drawChart();
        } else {
          // Draw empty chart if no data
          drawEmptyChart();
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [rtpData]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        if (rtpData && rtpData.history && rtpData.history.length > 0) {
          drawChart();
        } else {
          drawEmptyChart();
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rtpData]);

  const loadData = async () => {
    try {
      const [rtp, race] = await Promise.all([
        apiClient.get<RtpData>("/games/rtp-live").catch((e) => {
          console.error("Error loading RTP:", e);
          return { rtp: 100.0, change: 0, history: [] } as RtpData;
        }),
        apiClient.get<RaceData | null>("/races/homepage/active").catch((e) => {
          console.error("Error loading race:", e);
          return null;
        }),
      ]);
      setRtpData(rtp);
      setRaceData(race);
    } catch (e: any) {
      console.error("Error loading stats:", e);
      // Set default RTP data if all fails
      if (!rtpData) {
        setRtpData({ rtp: 100.0, change: 0, history: [] });
      }
    } finally {
      setLoading(false);
    }
  };

  const drawEmptyChart = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const width = displayWidth * dpr;
    const height = displayHeight * dpr;

    canvas.width = width;
    canvas.height = height;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // Draw a flat line at 100%
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, displayHeight * 0.5);
    ctx.lineTo(displayWidth, displayHeight * 0.5);
    ctx.stroke();
  };

  const drawChart = () => {
    if (!rtpData || !canvasRef.current || !rtpData.history || rtpData.history.length === 0) {
      drawEmptyChart();
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get actual display size
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Canvas not yet visible, retry later
      setTimeout(drawChart, 100);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = rect.width * dpr;
    const height = rect.height * dpr;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Scale context
    ctx.scale(dpr, dpr);
    
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const padding = 0;
    const chartWidth = displayWidth - padding * 2;
    const chartHeight = displayHeight - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Find min/max RTP values
    const rtpValues = rtpData.history.map((h) => h.rtp);
    const minRtp = Math.min(...rtpValues);
    const maxRtp = Math.max(...rtpValues);
    const range = maxRtp - minRtp || 1;
    const paddingY = range * 0.1;

    // Draw gradient area
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.3)");
    gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // Draw line and area
    const stepX = chartWidth / (rtpData.history.length - 1 || 1);
    rtpData.history.forEach((point, index) => {
      const x = padding + index * stepX;
      const normalizedRtp = (point.rtp - minRtp + paddingY) / (range + paddingY * 2);
      const y = padding + chartHeight - normalizedRtp * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Close path for area fill
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    rtpData.history.forEach((point, index) => {
      const x = padding + index * stepX;
      const normalizedRtp = (point.rtp - minRtp + paddingY) / (range + paddingY * 2);
      const y = padding + chartHeight - normalizedRtp * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = "#22c55e";
    rtpData.history.forEach((point, index) => {
      const x = padding + index * stepX;
      const normalizedRtp = (point.rtp - minRtp + paddingY) / (range + paddingY * 2);
      const y = padding + chartHeight - normalizedRtp * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const formatTimeRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) return "Terminata";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const maskUsername = (username: string) => {
    if (username.length <= 4) return username;
    return `${username.slice(0, 2)}***${username.slice(-2)}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "rgb(255, 215, 0)"; // Gold
    if (rank === 2) return "rgb(192, 192, 192)"; // Silver
    return "rgb(205, 127, 50)"; // Bronze
  };

  const formatNumber = (amount: number, decimals: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const formatPrizePool = (amount: number): string => {
    // If has cents (non-zero decimal part), show 2 decimals, otherwise no decimals
    const hasCents = amount % 1 !== 0;
    return formatNumber(amount, hasCents ? 2 : 0);
  };

  const formatPrizes = (prizes: Array<{ prize: number }>): string => {
    // Check if at least one prize has non-zero cents
    const hasAnyCents = prizes.some(p => p.prize % 1 !== 0);
    // If any has cents, all show 2 decimals, otherwise all show no decimals
    return hasAnyCents ? '2' : '0';
  };

  return (
    <div className="mb-0 flex flex-col lg:flex-row gap-4 items-stretch p-2 md:p-0">
      {/* Left Panel - RTP Live */}
      <div className="w-full lg:w-[70%] h-full min-h-[270px] max-h-[270px] border border-card/50 rounded-md shadow-md overflow-hidden relative flex flex-col" style={{ backgroundColor: '#0F212E' }}>
        <div className="md:p-2 pb-0 md:p-4 flex flex-col h-full min-h-[270px] max-h-[270px] relative z-10">
          <div className="flex p-3 md:p-2 flex-col md:flex-row md:items-center justify-between gap-6 p-2">
            <div>
              <div className="flex flex-wrap">
                <div className="text-center sm:text-2xl tracking-tighter pr-2 capitalize text-lg md:text-xl font-bold text-white justify-left">
                  Fun Original Game
                </div>
              </div>
              <p className="text-zinc-400 text-[10px] md:text-xs mt-1">
                Experience our Original Games powered by Provably Fair guarantees and thrills that never fold!
              </p>
            </div>
          </div>

          <div className="grid grid-row w-full">
            <div className="min-h-[128px]">
              <div className="relative">
                {loading ? (
                  <div className="text-card-foreground rounded-lg border-card-border border-0 bg-transparent shadow-none overflow-hidden h-full lg:h-[124px]">
                    <div className="p-3 px-1 md:p-0 md:pt-3 pb-0 md:pb-0 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2 p-2 animate-pulse">
                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 space-x-2">
                              <div className="h-3 w-16 bg-card/30 rounded-md"></div>
                              <div className="h-1.5 w-1.5 bg-card/30 rounded-full"></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 md:h-6 w-12 md:w-20 bg-card/30 rounded-md"></div>
                              <div className="flex items-center bg-card/30 rounded-lg px-1 py-0">
                                <div className="h-3 w-3 bg-card/30 rounded mr-1"></div>
                                <div className="h-[10px] w-8 bg-card/30 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="h-16 md:h-[6.3rem] mt-0 md:mt-auto bg-transparent rounded-md animate-pulse -mx-2 md:-mx-5 -mb-1"></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-card-foreground rounded-lg border border-card-border bg-transparent md:bg-transparent border-none md:border-none md:h-full shadow-none">
                    <div className="p-3 px-1 md:p-0 pt-1 md:pt-3 pb-0 md:pb-0 flex flex-col md:h-full h-full shadow-none">
                      <div className="flex items-center justify-between mb-2 p-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-[10px] md:text-xs font-medium text-zinc-400">RTP Live (24H)</h3>
                              <div className="inline-flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm md:text-base font-bold text-green-500">
                                {rtpData && typeof rtpData.rtp === 'number' ? rtpData.rtp.toFixed(2) : '100.00'}%
                              </div>
                              {rtpData && rtpData.change !== 0 && (
                                <div className="flex items-center bg-card/30 rounded-lg px-1 py-0">
                                  {rtpData.change > 0 ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up h-3 w-3 text-green-400 mr-1">
                                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                                      <polyline points="16 7 22 7 22 13"></polyline>
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-down h-3 w-3 text-red-400 mr-1">
                                      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                                      <polyline points="16 17 22 17 22 11"></polyline>
                                    </svg>
                                  )}
                                  <p className={`text-[10px] md:text-xs ${rtpData.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {Math.abs(rtpData.change).toFixed(1)}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="h-16 md:h-[6.3rem] mt-0 bg-none rounded-md p-0 relative -mx-2 md:-mx-5 -mb-1">
                        <canvas
                          ref={canvasRef}
                          className="transition-opacity duration-500 opacity-100"
                          style={{ display: 'block', boxSizing: 'border-box', height: '100px', width: '100%' }}
                        ></canvas>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Races */}
      <div className="overflow-hidden rounded-md border border-card/50 shadow-lg h-full min-h-[270px] max-h-[270px] w-full lg:w-[30%] relative z-[1] flex flex-col" style={{ backgroundColor: '#0F212E' }}>
          {raceData ? (
            <div className="p-4 relative md:z-10 h-full min-h-[270px] max-h-[270px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hexagon h-8 w-8 text-card fill-card stroke-green-500">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy h-3 w-3 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                      <path d="M4 22h16"></path>
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Races</h3>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 text-right">Prize Pool</div>
                  <div className="text-green-500 text-lg text-right font-semibold">
                    {formatPrizePool(raceData.prizePool)} FUN
                  </div>
                </div>
              </div>

              <>
                {raceData.status === 'ACTIVE' && (
                  <div className="border border-card/50 p-2 rounded-md mb-3 hidden md:block min-h-[120px]">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-white text-sm pl-1">Top Players</h3>
                      <span className="text-xs text-zinc-400 pr-1">Prize</span>
                    </div>
                    {raceData.topPlayers.length > 0 ? (
                      <div>
                        {(() => {
                          const decimals = formatPrizes(raceData.topPlayers);
                          return raceData.topPlayers.map((player, index) => (
                            <div 
                              key={player.rank} 
                              className={`flex items-center p-1 px-2 ${
                                index % 2 === 0 ? "bg-[#142633]" : "bg-[#0F212E]"
                              }`}
                            >
                              <div className="w-7 flex items-center justify-center">
                                <div className="relative flex items-center justify-center w-6 h-6">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hexagon absolute w-6 h-6 text-card fill-card stroke-green-500/50">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                  </svg>
                                  <span className="text-xs font-bold relative z-1 font-[system-ui]" style={{ color: getRankColor(player.rank) }}>
                                    {player.rank}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-1 flex-1">
                                <p className="font-medium text-white text-sm">{maskUsername(player.username)}</p>
                              </div>
                              <div className="text-green-500 font-semibold text-sm">
                                {formatNumber(player.prize, parseInt(decimals))} FUN
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-zinc-400">No players yet</p>
                        <p className="text-xs text-zinc-500 mt-1">Top players will appear here as they play</p>
                      </div>
                    )}
                  </div>
                )}
                {raceData.status === 'UPCOMING' && (
                  <div className="border border-card/50 p-2 rounded-md mb-3 hidden md:block min-h-[120px] flex flex-col justify-center">
                    <div className="text-center py-4">
                      <p className="text-sm text-zinc-400">The race will start soon!</p>
                      <p className="text-xs text-zinc-500 mt-1">Top players will appear here after the start</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1 px-0 md:px-2 py-1 rounded-md">
                    <span className="text-zinc-400 text-xs mr-1 inline">
                      {raceData.status === 'UPCOMING' ? 'Starts in:' : 'Ends in:'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-400">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <div className="text-xs sm:text-sm text-white font-medium whitespace-nowrap">
                      {raceData.status === 'UPCOMING' 
                        ? formatTimeRemaining(raceData.startsAt)
                        : formatTimeRemaining(raceData.endsAt)}
                    </div>
                  </div>
                  <div>
                    <Link href="/races">
                      <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 !text-xs lg:!text-sm h-8 text-base text-black font-semibold bg-accent hover:bg-accent/90 transition-colors">
                        View Race
                      </button>
                    </Link>
                  </div>
                </div>
              </>
            </div>
          ) : (
            <div className="p-4 relative md:z-10 h-full min-h-[270px] max-h-[270px] flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3 opacity-50">🏁</div>
              <div className="text-sm text-zinc-400 font-medium mb-1">No Active Race</div>
              <div className="text-xs text-zinc-500">Check back later for new Races!</div>
            </div>
          )}
        </div>
    </div>
  );
}


