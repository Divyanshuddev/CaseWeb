"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Bell,
  Clock,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { casesApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { CaseCreateModal } from "@/components/ui/CaseCreateModal";
import type { CaseItem, SearchHit } from "@/types";

export function WorkspaceShell({
  children,
  activeCaseId,
  onCaseCreated,
}: {
  children: React.ReactNode;
  activeCaseId?: string;
  onCaseCreated?: (created: CaseItem) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recentCases, setRecentCases] = useState<CaseItem[]>([]);

  useEffect(() => {
    let active = true;
    const loadCases = async () => {
      try {
        const data = user ? await casesApi.list() : await casesApi.demo();
        if (active) setRecentCases(data);
      } catch {
        // Ignore silent sidebar refresh failure
      }
    };
    loadCases();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await casesApi.search({ q: trimmed });
        setSearchResults(res.results);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const targetCaseId = useMemo(() => {
    if (activeCaseId) return activeCaseId;
    return recentCases[0]?.id;
  }, [activeCaseId, recentCases]);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Investigations", href: "/cases", icon: FolderKanban },
    {
      label: "Evidence Archive",
      href: targetCaseId ? `/cases/${targetCaseId}/evidence` : "/cases",
      icon: Archive,
    },
    {
      label: "Suspects",
      href: targetCaseId ? `/cases/${targetCaseId}/suspects` : "/cases",
      icon: Users,
    },
    {
      label: "Timeline",
      href: targetCaseId ? `/cases/${targetCaseId}/timeline` : "/cases",
      icon: Clock,
    },
    {
      label: "Connections",
      href: targetCaseId ? `/cases/${targetCaseId}` : "/cases",
      icon: GitBranch,
    },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const handleSearchNavigate = (hit: SearchHit) => {
    setSearchOpen(false);
    setSearchQuery("");
    if (hit.type === "evidence") router.push(`/cases/${hit.case_id}/evidence`);
    else if (hit.type === "suspect") router.push(`/cases/${hit.case_id}/suspects`);
    else if (hit.type === "timeline") router.push(`/cases/${hit.case_id}/timeline`);
    else router.push(`/cases/${hit.case_id}`);
  };

  return (
    <div className="min-h-screen bg-charcoal text-cream flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#11100f] border-r border-[#2e261f] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 border-b border-[#2e261f] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-3 h-3 rounded-full bg-blood-red shadow-[0_0_8px_#B3262E]" />
            <div>
              <span className="font-typewriter text-lg tracking-wider text-cream group-hover:text-paper transition">
                CASEWEB
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-gray -mt-1">
                Detective Bureau
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-muted-gray hover:text-cream"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.label === "Connections" &&
                pathname.startsWith("/cases/") &&
                !pathname.endsWith("/evidence") &&
                !pathname.endsWith("/suspects") &&
                !pathname.endsWith("/timeline"));
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-sm transition ${
                  active
                    ? "bg-blood-red/20 text-cream border-l-2 border-blood-red font-medium"
                    : "text-paper/75 hover:text-cream hover:bg-[#1d1916]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-paper/80" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2e261f] bg-[#0e0d0c]">
          <p className="text-[11px] font-typewriter uppercase tracking-widest text-muted-gray mb-1">
            Workspace Mode
          </p>
          <p className="text-xs text-paper/80">
            {user ? `Det. ${user.full_name || user.username}` : "Guest Demo Inspector"}
          </p>
          {!user && (
            <Link
              href="/login"
              className="mt-2 inline-block text-xs text-blood-red hover:underline font-medium"
            >
              Sign in to save private cases →
            </Link>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="h-16 bg-[#141210]/95 backdrop-blur border-b border-[#2e261f] px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-xl relative">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-sm border border-[#352c24] text-paper hover:text-cream"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-gray absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Search case files, suspects, clues, timeline..."
                className="w-full bg-[#1c1916] border border-[#352c24] rounded-sm pl-9 pr-8 py-1.5 text-sm text-cream placeholder:text-muted-gray focus:outline-none focus:border-paper"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-gray hover:text-cream"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {searchOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#1b1815] border border-[#42352a] rounded-sm shadow-2xl max-h-80 overflow-y-auto z-50">
                  <div className="px-3 py-2 border-b border-[#2e261f] flex items-center justify-between text-[11px] font-typewriter text-muted-gray uppercase">
                    <span>{searching ? "Searching files..." : `${searchResults.length} matches`}</span>
                    <button type="button" onClick={() => setSearchOpen(false)} className="hover:text-cream">
                      Close
                    </button>
                  </div>
                  {searchResults.length === 0 ? (
                    <p className="p-4 text-xs text-muted-gray">No matching records found.</p>
                  ) : (
                    searchResults.map((hit) => (
                      <button
                        key={`${hit.type}-${hit.id}`}
                        type="button"
                        onClick={() => handleSearchNavigate(hit)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#27211c] border-b border-[#26201a] last:border-b-0 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-paper">{hit.title}</span>
                          <span className="text-[10px] uppercase font-typewriter px-1.5 py-0.5 bg-blood-red/20 text-cream rounded-sm">
                            {hit.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-gray truncate mt-0.5">
                          {hit.case_number} · {hit.case_title}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blood-red hover:bg-[#991e25] text-cream text-xs font-semibold uppercase tracking-wider rounded-sm transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Case</span>
              </button>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blood-red hover:bg-[#991e25] text-cream text-xs font-semibold uppercase tracking-wider rounded-sm transition"
              >
                Start Investigation
              </Link>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                className="p-2 rounded-sm border border-[#352c24] bg-[#1c1916] text-paper hover:text-cream relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-blood-red absolute top-1.5 right-1.5" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#1b1815] border border-[#42352a] rounded-sm shadow-2xl p-3 z-50">
                  <p className="text-xs font-typewriter uppercase tracking-wider text-paper mb-2">
                    Bureau Dispatch
                  </p>
                  <div className="space-y-2 text-xs text-cream/85">
                    <div className="p-2 bg-[#231e19] rounded-sm border border-[#362c23]">
                      <p className="font-medium">Demo Mysteries Active</p>
                      <p className="text-[11px] text-muted-gray mt-0.5">
                        Explore Blackwood Manor & Midnight Harbor boards anytime or clone them to edit.
                      </p>
                    </div>
                    {recentCases.slice(0, 2).map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        onClick={() => setNotifOpen(false)}
                        className="block p-2 bg-[#231e19] hover:bg-[#2c251f] rounded-sm border border-[#362c23]"
                      >
                        <p className="font-medium truncate">
                          {c.case_number}: {c.title}
                        </p>
                        <p className="text-[11px] text-muted-gray">{c.status}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-[#352c24] bg-[#1c1916] hover:border-paper/60 transition"
              >
                <UserCheck className="w-4 h-4 text-paper" />
                <span className="hidden md:inline text-xs font-medium text-cream">
                  {user ? user.username : "Guest"}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#1b1815] border border-[#42352a] rounded-sm shadow-2xl py-1.5 z-50 text-xs">
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-[#2e261f]">
                        <p className="font-semibold text-cream">{user.full_name || user.username}</p>
                        <p className="text-muted-gray truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="block px-3 py-2 hover:bg-[#27211c] text-paper"
                      >
                        Investigator Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                          router.push("/login");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#27211c] text-blood-red flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setProfileOpen(false)}
                        className="block px-3 py-2 hover:bg-[#27211c] text-paper"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setProfileOpen(false)}
                        className="block px-3 py-2 hover:bg-[#27211c] text-cream"
                      >
                        Create Detective Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <CaseCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(created) => {
          setRecentCases((prev) => [created, ...prev]);
          if (onCaseCreated) onCaseCreated(created);
          else router.push(`/cases/${created.id}`);
        }}
      />
    </div>
  );
}
