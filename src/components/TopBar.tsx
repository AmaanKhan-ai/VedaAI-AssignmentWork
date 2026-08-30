"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconBell, IconChevron, IconMenu } from "./icons";

interface TopBarProps {
  title: string;
  userName: string;
  onBack?: () => void;
  onMenuClick?: () => void;
  onReset?: () => void;
}

export function TopBar({ title, userName, onBack, onMenuClick, onReset }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // A `fixed inset-0` click-catcher would normally handle "click outside to
  // close", but the bar above uses backdrop-blur — a backdrop-filter
  // ancestor establishes its own containing block for fixed descendants,
  // so that overlay would only ever cover the bar's own small box instead
  // of the viewport. A document-level listener sidesteps that entirely.
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  return (
    <>
      {/* Mobile bar — Figma shows a distinct layout here: brand mark + back
          arrow on the left, notification/avatar/menu on the right. No
          breadcrumb title on this breakpoint. */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-6 w-6 items-center justify-center text-text-strong"
            >
              <IconArrowLeft className="h-5 w-5" />
            </button>
          )}
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-text-strong text-white">
            <IconMenu className="h-3.5 w-3.5" />
          </span>
          <span className="text-[20px] font-bold text-text-strong">VedaAI</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface-300 text-text-strong">
            <IconBell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-text-strong text-xs font-semibold text-white">
            {initials}
          </span>
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex h-6 w-6 items-center justify-center text-text-strong"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop bar — breadcrumb-style title + user name + avatar. Figma
          renders this as a floating rounded "glass" card, not a flush bar. */}
      <div className="hidden h-14 shrink-0 items-center justify-between rounded-2xl bg-white/70 px-6 backdrop-blur-md lg:flex">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-faint hover:bg-surface-100 hover:text-text-strong"
            >
              <IconArrowLeft className="h-4 w-4" />
            </button>
          )}
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-text-faint">
            <path
              d="M9 11l2 2 4-4M7 3h8l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-semibold text-text-faint">{title}</span>
        </div>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-surface-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-text-strong text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="text-base font-semibold text-text-strong">{userName}</span>
            <IconChevron
              direction={profileOpen ? "up" : "down"}
              className="h-3.5 w-3.5 text-text-faint"
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border-default bg-white py-1.5 shadow-lg">
              <div className="border-b border-border-default px-4 py-2.5">
                <p className="truncate text-sm font-semibold text-text-strong">{userName}</p>
                <p className="text-xs text-text-faint">Candidate</p>
              </div>
              {onReset && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onReset();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-text-strong hover:bg-surface-100"
                >
                  Start new assessment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
