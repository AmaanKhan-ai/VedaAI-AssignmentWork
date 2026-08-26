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
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/70 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
        <span className="text-sm font-medium text-neutral-800">{title}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="hidden text-sm text-neutral-600 sm:inline">
          {userName}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
          {initials}
        </span>
      </div>
    </div>
  );
}
