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
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-faint hover:bg-surface-100 hover:text-text-strong"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M14 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
        <span className="hidden text-base font-semibold text-text-strong sm:inline">
          {userName}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-text-strong text-xs font-semibold text-white">
          {initials}
        </span>
      </div>
    </div>
  );
}
