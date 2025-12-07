"use client";

import { useState } from "react";
import Link from "next/link";
import {
  StarIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  LanguageIcon,
  Bars3Icon,
  XMarkIcon,
  BeakerIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "../i18n/useI18n";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { lang, setLang } = useI18n();
  
  const availableLanguages: ("en" | "it")[] = ["en", "it"];

  const menuItems = [
    {
      id: "vip",
      label: "VIP Club",
      icon: StarIcon,
      href: "/vip-club",
    },
    {
      id: "responsible",
      label: "Responsible Gaming",
      icon: ShieldCheckIcon,
      href: "/responsible-gaming",
    },
    {
      id: "support",
      label: "Live Support",
      icon: ChatBubbleLeftRightIcon,
      href: "/support",
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

  const bottomMenuItems = [
    {
      id: "faucet",
      label: "Faucet",
      icon: BeakerIcon,
      href: "/rewards",
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: QuestionMarkCircleIcon,
      href: "/rewards",
    },
    {
      id: "earn",
      label: "Earn",
      icon: CurrencyDollarIcon,
      href: "/rewards",
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card transition-all duration-300 z-[60] flex flex-col shadow-xl ${
        isCollapsed ? "w-[60px]" : "w-[200px]"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full h-[60px] flex items-center justify-center hover:bg-background/50 transition-colors border-b border-card/30"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <Bars3Icon className="w-5 h-5 text-white" />
        ) : (
          <XMarkIcon className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const content = (
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
                <Link key={item.id} href={item.href}>
                  {content}
                </Link>
              );
            }

            return <div key={item.id}>{content}</div>;
          })}
        </div>

        {/* Separator */}
        <div className="px-4 py-2">
          <hr className="border-t border-background/30" />
        </div>

        {/* Bottom Menu Items */}
        <div className="flex flex-col gap-1 px-2">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href}>
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
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

