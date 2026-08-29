function NavIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <path d={path} />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Home", path: "M4 11.5L12 4l8 7.5M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9" },
  { label: "My Classroom", path: "M4 4h7v7H4V4zM13 4h7v4h-7V4zM13 11h7v9h-7v-9zM4 14h7v6H4v-6z" },
  {
    label: "Assignments",
    path: "M7 3h8l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4M9 12h6M9 15.5h6M9 8.5h2",
  },
  {
    label: "Exams",
    path: "M9 11l2 2 4-4M7 3h8l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z",
    active: true,
  },
  { label: "My Library", path: "M6 4h4v16H6a1 1 0 01-1-1V5a1 1 0 011-1zM12 4h6a1 1 0 011 1v14a1 1 0 01-1 1h-6V4z" },
  { label: "Review", path: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM12 4v1M12 19v1M4 12h1M19 12h1" },
  { label: "Analytics", path: "M5 20V10M11 20V4M17 20v-7" },
];

export function Sidebar({ userName }: { userName: string }) {
  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200/70 bg-white lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-text-strong text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M4 6h16M4 12h10M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-text-strong">
          VedaAI
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
              item.active
                ? "bg-surface-100 font-medium text-text-strong"
                : "text-text-muted"
            }`}
          >
            <NavIcon path={item.path} />
            {item.label}
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-4 flex items-center gap-2.5 rounded-lg border border-border-default px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-strong text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-text-strong">
            {userName}
          </span>
          <span className="block text-[11px] text-text-faint">Candidate</span>
        </span>
      </div>
    </aside>
  );
}
