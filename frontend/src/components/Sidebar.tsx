"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  HomeIcon,
  BeakerIcon,
  QuestionMarkCircleIcon,
  CircleStackIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  LanguageIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "../i18n/useI18n";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { lang, setLang } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const availableLanguages: ("en" | "it")[] = ["en", "it"];

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
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
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
    };
    checkAdmin();
  }, []);

  // Auto-collapse sidebar after 20 seconds if not hovering
  useEffect(() => {
    if (!isCollapsed && !isHovering) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout to collapse after 20 seconds
      timeoutRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 20000);
    } else if (isHovering || isCollapsed) {
      // Clear timeout if hovering or already collapsed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isCollapsed, isHovering]);

  // Collapse sidebar on page navigation or clicks
  useEffect(() => {
    const handleClick = () => {
      if (!isHovering) {
        setIsCollapsed(true);
      }
    };

    const handleRouteChange = () => {
      setIsCollapsed(true);
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [isHovering]);

  const topMenuItems = [
    {
      id: "home",
      label: "Original Games",
      icon: HomeIcon,
      href: "/",
    },
    {
      id: "races",
      label: "Races",
      icon: TrophyIcon,
      href: "/races",
    },
    {
      id: "faucet",
      label: "Fun Faucet",
      icon: BeakerIcon,
      href: "/rewards",
    },
    {
      id: "quiz",
      label: "Fun Quiz",
      icon: QuestionMarkCircleIcon,
      href: "/rewards",
    },
    {
      id: "wheel",
      label: "Fun Wheel",
      icon: CircleStackIcon,
      href: "/wheel",
    },
    {
      id: "ads",
      label: "Fun Ads",
      icon: PhotoIcon,
      href: "/rewards",
    },
    {
      id: "earn",
      label: "Earn More",
      icon: CurrencyDollarIcon,
      href: "#",
    },
  ];

  const middleMenuItems = [
    {
      id: "levels",
      label: "Fun Levels",
      icon: ChartBarIcon,
      href: "/levels",
    },
    {
      id: "support",
      label: "Live Support",
      icon: ChatBubbleLeftRightIcon,
      href: "#",
    },
    {
      id: "responsible",
      label: "Responsible Gaming",
      icon: ShieldCheckIcon,
      href: "#",
    },
    {
      id: "language",
      label: "Language",
      icon: LanguageIcon,
      href: "#",
      onClick: () => {
        // Cycle through available languages
        const currentIndex = availableLanguages.indexOf(lang);
        const nextIndex = (currentIndex + 1) % availableLanguages.length;
        setLang(availableLanguages[nextIndex]);
      },
    },
  ];

  const adminMenuItems = [
    {
      id: "admin",
      label: "Admin Dashboard",
      icon: ChartBarIcon,
      href: "/admin",
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card transition-all duration-300 z-[60] flex flex-col shadow-xl ${
        isCollapsed ? "w-[60px]" : "w-[240px]"
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full h-14 flex items-center justify-center bg-background/50 hover:bg-background/60 transition-colors border-b border-card/30"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <Bars3Icon className="w-5 h-5 text-white" />
        ) : (
          <XMarkIcon className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible py-4 scrollbar-hide">
        {/* Top Menu Items */}
        <div className="flex flex-col gap-1 px-2">
          {topMenuItems.map((item) => {
            const Icon = item.icon;
            
            const handleMouseEnter = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (isCollapsed) {
                const target = e.currentTarget as HTMLElement;
                const rect = target.getBoundingClientRect();
                setTooltipPosition({
                  top: rect.top + rect.height / 2,
                  left: rect.right + 8,
                });
                setHoveredItem(item.id);
              }
            };
            
            const handleMouseLeave = () => {
              setHoveredItem(null);
              setTooltipPosition(null);
            };

            const buttonContent = (
              <div
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md
                  text-white hover:bg-background/50 hover:text-accent transition-all
                  cursor-pointer group
                  ${isCollapsed ? "justify-center" : "justify-start"}
                `}
                onClick={item.onClick}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            );

            if (item.href && item.href !== "#") {
              return (
                <div 
                  key={item.id} 
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link href={item.href} className="block" onClick={() => setIsCollapsed(true)}>
                    {buttonContent}
                  </Link>
                  {/* Tooltip quando sidebar è chiusa - renderizzato fuori dal Link */}
                  {isCollapsed && hoveredItem === item.id && tooltipPosition && (
                    <div 
                      className="fixed px-3 py-2 bg-card rounded-md shadow-xl z-[200] whitespace-nowrap pointer-events-none"
                      style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <span className="text-sm font-medium text-white">
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div 
                key={item.id}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {buttonContent}
                {/* Tooltip quando sidebar è chiusa */}
                {isCollapsed && hoveredItem === item.id && tooltipPosition && (
                  <div 
                    className="fixed px-3 py-2 bg-card rounded-md shadow-xl z-[200] whitespace-nowrap pointer-events-none"
                    style={{
                      top: `${tooltipPosition.top}px`,
                      left: `${tooltipPosition.left}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <span className="text-sm font-medium text-white">
                      {item.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Separator - più bianco */}
        <div className="px-4 py-2">
          <hr className="border-t border-white/20" />
        </div>

        {/* Middle Menu Items */}
        <div className="flex flex-col gap-1 px-2">
          {middleMenuItems.map((item) => {
            const Icon = item.icon;
            
            const handleMouseEnter = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (isCollapsed) {
                const target = e.currentTarget as HTMLElement;
                const rect = target.getBoundingClientRect();
                setTooltipPosition({
                  top: rect.top + rect.height / 2,
                  left: rect.right + 8,
                });
                setHoveredItem(item.id);
              }
            };
            
            const handleMouseLeave = () => {
              setHoveredItem(null);
              setTooltipPosition(null);
            };

            const buttonContent = (
              <div
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md
                  text-white hover:bg-background/50 hover:text-accent transition-all
                  cursor-pointer group
                  ${isCollapsed ? "justify-center" : "justify-start"}
                `}
                onClick={item.onClick}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            );

            if (item.href && item.href !== "#") {
              return (
                <div 
                  key={item.id}
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link href={item.href} className="block">
                    {buttonContent}
                  </Link>
                  {/* Tooltip quando sidebar è chiusa - renderizzato fuori dal Link */}
                  {isCollapsed && hoveredItem === item.id && tooltipPosition && (
                    <div 
                      className="fixed px-3 py-2 bg-card rounded-md shadow-xl z-[200] whitespace-nowrap pointer-events-none"
                      style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <span className="text-sm font-medium text-white">
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div 
                key={item.id}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {buttonContent}
                {/* Tooltip quando sidebar è chiusa */}
                {isCollapsed && hoveredItem === item.id && tooltipPosition && (
                  <div 
                    className="fixed px-3 py-2 bg-card rounded-md shadow-xl z-[200] whitespace-nowrap pointer-events-none"
                    style={{
                      top: `${tooltipPosition.top}px`,
                      left: `${tooltipPosition.left}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <span className="text-sm font-medium text-white">
                      {item.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Admin Separator & Menu (solo per admin) */}
        {isAdmin && (
          <>
            <div className="px-4 py-2">
              <hr className="border-t border-white/20" />
            </div>
            <div className="flex flex-col gap-1 px-2">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                
                const handleMouseEnter = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (isCollapsed) {
                    const target = e.currentTarget as HTMLElement;
                    const rect = target.getBoundingClientRect();
                    setTooltipPosition({
                      top: rect.top + rect.height / 2,
                      left: rect.right + 8,
                    });
                    setHoveredItem(item.id);
                  }
                };
                
                const handleMouseLeave = () => {
                  setHoveredItem(null);
                  setTooltipPosition(null);
                };
                
                const buttonContent = (
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-md
                      text-white hover:bg-background/50 hover:text-accent transition-all
                      cursor-pointer group
                      ${isCollapsed ? "justify-center" : "justify-start"}
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </div>
                );
                
                return (
                  <div 
                    key={item.id}
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link href={item.href} className="block" onClick={() => setIsCollapsed(true)}>
                      {buttonContent}
                    </Link>
                    {/* Tooltip quando sidebar è chiusa */}
                    {isCollapsed && hoveredItem === item.id && tooltipPosition && (
                      <div 
                        className="fixed px-3 py-2 bg-card rounded-md shadow-xl z-[200] whitespace-nowrap pointer-events-none"
                        style={{
                          top: `${tooltipPosition.top}px`,
                          left: `${tooltipPosition.left}px`,
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <span className="text-sm font-medium text-white">
                          {item.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}

