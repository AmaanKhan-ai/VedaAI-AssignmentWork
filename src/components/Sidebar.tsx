"use client";

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
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

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-text-strong text-white">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M4 6h16M4 12h10M4 18h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-[28px] font-bold tracking-tight text-text-strong">VedaAI</span>
    </div>
  );
}

function ToolkitButton() {
  return (
    <div className="px-3 pb-3">
      {/* border-image ignores border-radius, so the gradient stroke is
          approximated with a solid mid-gradient color instead. */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#d94a1e] bg-[#272727] px-4 py-2.5 text-sm font-medium text-white shadow-sm"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
        </svg>
        AI Teacher&rsquo;s Toolkit
      </button>
    </div>
  );
}

function NavList() {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base ${
            item.active
              ? "bg-surface-100 font-medium text-text-strong"
              : "font-normal text-text-muted"
          }`}
        >
          <NavIcon path={item.path} />
          {item.label}
        </div>
      ))}
    </nav>
  );
}

function ProfileCard({ userName }: { userName: string }) {
  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-3 mb-4 flex items-center gap-2.5 rounded-2xl bg-surface-100 px-3 py-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text-strong text-sm font-semibold text-white">
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-bold text-text-strong">{userName}</span>
        <span className="block text-sm text-text-muted">Candidate</span>
      </span>
    </div>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-white lg:flex lg:rounded-2xl lg:shadow-[0_32px_48px_0_rgba(0,0,0,0.2),0_16px_48px_0_rgba(0,0,0,0.12)]">
      <Logo />
      <ToolkitButton />
      <NavList />
      <ProfileCard userName={userName} />
    </aside>
  );
}

// The mobile top bar's hamburger button opens this as a slide-out drawer —
// mobile has no other way to reach the sidebar's nav items, since the
// sidebar itself is desktop-only (hidden below the lg breakpoint).
export function MobileNavDrawer({
  userName,
  open,
  onClose,
}: {
  userName: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 pt-2">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-100"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <NavList />
        <ProfileCard userName={userName} />
      </aside>
    </div>
  );
}
