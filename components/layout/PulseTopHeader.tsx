"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Activity, User, LogOut, ChevronDown, CreditCard, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { openMobileNavDrawer } from "@/components/layout/MobileNavDrawer";

export function PulseTopHeader({
  userName = "Alex Morgan",
  userRole = "PATIENT",
  activeTab,
}: {
  userName?: string;
  userRole?: string;
  activeTab?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const lang = useCurrentLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    {
      name: lang === "hi" ? "होम (Home)" : "Home",
      href: "/dashboard",
      activeMatch: (path: string) => path === "/dashboard" || path === "/",
    },
    {
      name: lang === "hi" ? "ट्रैक (Track)" : "Track",
      href: "/food",
      activeMatch: (path: string) =>
        path.startsWith("/food") || path.startsWith("/checkin") || path.startsWith("/dashboard/goals") || path.startsWith("/dashboard/timeline"),
    },
    {
      name: lang === "hi" ? "सीखें (Learn)" : "Learn",
      href: "/coach",
      activeMatch: (path: string) => path.startsWith("/coach") || path.startsWith("/dashboard/insights"),
    },
    {
      name: lang === "hi" ? "सपोर्ट (Support)" : "Support",
      href: "/support",
      activeMatch: (path: string) =>
        path.startsWith("/support") ||
        path.startsWith("/circle") ||
        path.startsWith("/community"),
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/coach?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#C9D7DE] shadow-[0_1px_3px_rgba(16,26,69,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Top Nav */}
        <div className="flex items-center gap-3 sm:gap-8">
          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => openMobileNavDrawer()}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 rounded-xl text-[#101A45] hover:bg-[#DCE8EC]/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5 text-[#101A45]" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 group">
            <svg
              className="w-7 h-7 text-[#087F8C]"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 16h6l3.5-9 5 18 4-12 3 5 4-2h4.5"
                stroke="#087F8C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-2xl font-bold text-[#101A45] tracking-tight">
              Pulse
            </span>
          </Link>

          {/* Main Top Nav Links */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = activeTab
                ? item.name.toLowerCase().includes(activeTab.toLowerCase())
                : item.activeMatch(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-[#101A45] font-semibold bg-[#DCE8EC]/50"
                      : "text-[#52616B] hover:text-[#101A45] hover:bg-slate-50"
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#087F8C] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Search, Notification & Avatar Controls */}
        <div className="flex items-center gap-3">
          {/* Rounded Search Bar */}
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search className="w-4 h-4 text-[#52616B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-48 lg:w-64 pl-9 pr-3 py-1.5 bg-white border border-[#C9D7DE] rounded-full text-xs text-[#101A45] placeholder-[#52616B] focus:outline-none focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C]"
            />
          </form>

          {/* Language Toggle */}
          <LanguageToggle />

          {/* Notification Bell */}
          <Link
            href="/dashboard/timeline"
            className="p-2 text-[#101A45] hover:bg-[#DCE8EC]/50 rounded-full transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-[#101A45]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#087F8C] rounded-full" />
          </Link>

          {/* User Avatar & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#087F8C]/40 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#101A45] text-white font-semibold text-xs flex items-center justify-center border border-[#C9D7DE]">
                {userName.charAt(0).toUpperCase()}
              </div>
            </button>

            {/* Profile Menu Popup */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#C9D7DE] rounded-2xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-[#C9D7DE]/60 mb-1">
                  <p className="text-xs font-bold text-[#101A45] truncate">{userName}</p>
                  <p className="text-[10px] text-[#52616B] capitalize">{userRole.toLowerCase()}</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#101A45] hover:bg-[#DCE8EC]/50 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>{lang === "hi" ? "प्रोफ़ाइल और प्राथमिकताएं" : "Profile & Preferences"}</span>
                </Link>
                <Link
                  href="/plan"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#101A45] hover:bg-[#DCE8EC]/50 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>{lang === "hi" ? "मेरी योजना (My Plan)" : "My Plan"}</span>
                </Link>
                <Link
                  href="/subscription"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#101A45] hover:bg-[#DCE8EC]/50 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>{lang === "hi" ? "सब्सक्रिप्शन (Subscription)" : "Subscription & Membership"}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#B4233B] hover:bg-[#FCE7EB] transition-colors mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === "hi" ? "लॉगआउट" : "Log out"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
