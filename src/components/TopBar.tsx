import { IconArrowLeft, IconBell, IconMenu } from "./icons";

interface TopBarProps {
  title: string;
  userName: string;
  onBack?: () => void;
}

export function TopBar({ title, userName, onBack }: TopBarProps) {
  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            aria-label="Menu"
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

        <div className="flex items-center gap-2.5">
          <span className="text-base font-semibold text-text-strong">{userName}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-text-strong text-xs font-semibold text-white">
            {initials}
          </span>
        </div>
      </div>
    </>
  );
}
