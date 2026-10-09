"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, CheckCircle2, Users, Menu } from "lucide-react";
import { useCurrentLanguage } from "@/components/LanguageToggle";
import { NavHomeIcon } from "@/components/layout/PulseNavIcons";
import {
  MobileNavDrawer,
  openMobileNavDrawer,
} from "@/components/layout/MobileNavDrawer";

export function MobileBottomNav({
  userName = "Alex Morgan",
  userRole = "PATIENT",
}: {
  userName?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const lang = useCurrentLanguage();

  const navItems = [
    {
      name: lang === "hi" ? "होम" : "Home",
      href: "/dashboard",
      icon: (active: boolean) => (
        <NavHomeIcon
          active={active}
          className={`w-5 h-5 mb-0.5 ${
            active ? "text-[#087F8C]" : "text-[#101A45]"
          }`}
        />
      ),
      isActive: (path: string) => path === "/dashboard" || path === "/",
    },
    {
      name: lang === "hi" ? "योजना" : "My Plan",
      href: "/plan",
      icon: (active: boolean) => (
        <Target
          className={`w-5 h-5 mb-0.5 ${
            active ? "text-[#087F8C]" : "text-[#101A45]"
          }`}
        />
      ),
      isActive: (path: string) => path.startsWith("/plan"),
    },
    {
      name: lang === "hi" ? "चेक-इन" : "Check-In",
      href: "/checkin",
      icon: (active: boolean) => (
        <CheckCircle2
          className={`w-5 h-5 mb-0.5 ${
            active ? "text-[#087F8C]" : "text-[#101A45]"
          }`}
        />
      ),
      isActive: (path: string) => path.startsWith("/checkin"),
    },
    {
      name: lang === "hi" ? "कम्युनिटी" : "Community",
      href: "/community/groups/building-healthy-habits",
      icon: (active: boolean) => (
        <Users
          className={`w-5 h-5 mb-0.5 ${
            active ? "text-[#087F8C]" : "text-[#101A45]"
          }`}
        />
      ),
      isActive: (path: string) => path.startsWith("/community"),
    },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#C9D7DE] px-2 py-1 flex items-center justify-around shadow-[0_-2px_10px_rgba(16,26,69,0.06)]"
      >
        {navItems.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all ${
                active
                  ? "text-[#087F8C] font-bold"
                  : "text-[#101A45] hover:text-[#087F8C]"
              }`}
            >
              {item.icon(active)}
              <span
                className={`text-[10px] tracking-tight leading-tight ${
                  active ? "text-[#087F8C] font-bold" : "text-[#101A45] font-medium"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* 5th Button: More (opens slide-out navigation drawer) */}
        <button
          type="button"
          onClick={() => openMobileNavDrawer()}
          aria-label="Open More Menu"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl text-[#101A45] hover:text-[#087F8C] transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5 text-[#101A45]" />
          <span className="text-[10px] tracking-tight leading-tight text-[#101A45] font-medium">
            {lang === "hi" ? "अधिक" : "More"}
          </span>
        </button>
      </nav>

      {/* Render Slide-out Drawer */}
      <MobileNavDrawer userName={userName} userRole={userRole} />
    </>
  );
}
