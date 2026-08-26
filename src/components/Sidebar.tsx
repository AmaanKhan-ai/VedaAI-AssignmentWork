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
  {
    label: "Assignments",
    path: "M7 3h8l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4M9 12h6M9 15.5h6M9 8.5h2",
    active: true,
  },
  { label: "Dashboard", path: "M4 4h7v7H4V4zM13 4h7v4h-7V4zM13 11h7v9h-7v-9zM4 14h7v6H4v-6z" },
  { label: "Reports", path: "M5 20V10M11 20V4M17 20v-7" },
  { label: "Settings", path: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 13.5a7.4 7.4 0 000-3l2-1.4-2-3.4-2.3.8a7.6 7.6 0 00-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 00-2.6 1.5l-2.3-.8-2 3.4 2 1.4a7.4 7.4 0 000 3l-2 1.4 2 3.4 2.3-.8a7.6 7.6 0 002.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 002.6-1.5l2.3.8 2-3.4-2-1.4z" },
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
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
          V
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
          VedaAI
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
              item.active
                ? "bg-accent-tint font-medium text-accent"
                : "text-neutral-500"
            }`}
          >
            <NavIcon path={item.path} />
            {item.label}
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-4 flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-neutral-900">
            {userName}
          </span>
          <span className="block text-[11px] text-neutral-400">Candidate</span>
        </span>
      </div>
    </aside>
  );
}
