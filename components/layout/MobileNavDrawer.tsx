"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Target,
  CheckCircle2,
  TrendingUp,
  Stethoscope,
  User,
  CreditCard,
  Users,
  HeartHandshake,
  LogOut,
  UtensilsCrossed,
  BookOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  NavHomeIcon,
  NavTrackIcon,
  NavLearnIcon,
  NavSupportIcon,
} from "@/components/layout/PulseNavIcons";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";

export const PULSE_OPEN_DRAWER_EVENT = "pulse:open-mobile-nav";
export const PULSE_CLOSE_DRAWER_EVENT = "pulse:close-mobile-nav";

export function openMobileNavDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PULSE_OPEN_DRAWER_EVENT));
  }
}

export function closeMobileNavDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PULSE_CLOSE_DRAWER_EVENT));
  }
}

interface MobileNavDrawerProps {
  userName?: string;
  userRole?: string;
}

export function MobileNavDrawer({
  userName = "Alex Morgan",
  userRole = "PATIENT",
}: MobileNavDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  // Listen for open/close events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener(PULSE_OPEN_DRAWER_EVENT, handleOpen);
    window.addEventListener(PULSE_CLOSE_DRAWER_EVENT, handleClose);

    return () => {
      window.removeEventListener(PULSE_OPEN_DRAWER_EVENT, handleOpen);
      window.removeEventListener(PULSE_CLOSE_DRAWER_EVENT, handleClose);
    };
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    {
      label: lang === "hi" ? "होम (Home)" : "Home",
      subLabel: "Dashboard & Routine",
      href: "/dashboard",
      icon: NavHomeIcon,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: t.patientNav.myPlan,
      subLabel: "SMART Goals & Targets",
      href: "/plan",
      icon: Target,
      active: pathname.startsWith("/plan"),
    },
    {
      label: t.patientNav.dailyCheckIn,
      subLabel: "30-Second Health Log",
      href: "/checkin",
      icon: CheckCircle2,
      active: pathname.startsWith("/checkin"),
    },
    {
      label: lang === "hi" ? "फ़ूड एआई (Food AI)" : "Food AI & Nutrition",
      subLabel: "Camera & Smart Meals",
      href: "/food",
      icon: UtensilsCrossed,
      active: pathname.startsWith("/food"),
    },
    {
      label: lang === "hi" ? "सीखें (Learn / Coach)" : "Pulse Coach & Library",
      subLabel: "Evidence-Based Guidance",
      href: "/coach",
      icon: NavLearnIcon,
      active: pathname.startsWith("/coach") || pathname.startsWith("/dashboard/insights"),
    },
    {
      label: t.patientNav.community,
      subLabel: "Peer Groups & Discussions",
      href: "/community/groups/building-healthy-habits",
      icon: Users,
      active: pathname.startsWith("/community"),
    },
    {
      label: lang === "hi" ? "डॉक्टर सपोर्ट (Pulse Support)" : "Pulse Support & Video Meet",
      subLabel: "Book Doctors & Consult",
      href: "/support",
      icon: Stethoscope,
      active: pathname.startsWith("/support"),
    },
    {
      label: lang === "hi" ? "सब्सक्रिप्शन (Subscription)" : "Subscription & Membership",
      subLabel: "Pulse Premium ₹499/mo",
      href: "/subscription",
      icon: CreditCard,
      active: pathname.startsWith("/subscription"),
    },
    {
      label: t.patientNav.careCircle,
      subLabel: "Family & Caregiver Access",
      href: "/circle",
      icon: HeartHandshake,
      active: pathname.startsWith("/circle"),
    },
    {
      label: t.patientNav.progress,
      subLabel: "Metabolic Health & Trends",
      href: "/review",
      icon: TrendingUp,
      active: pathname.startsWith("/review"),
    },
    {
      label: t.patientNav.profile,
      subLabel: "Account & Health Targets",
      href: "/dashboard/profile",
      icon: User,
      active: pathname.startsWith("/dashboard/profile"),
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Drawer"
      className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-[#101A45]/60 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Slide-out Menu Panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-250 border-r border-[#C9D7DE]">
        {/* Top Header */}
        <div className="p-4 border-b border-[#C9D7DE]/70 flex items-center justify-between bg-white shrink-0">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5"
          >
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
            <div>
              <div className="font-bold text-base text-[#101A45] leading-tight">
                Pulse
              </div>
              <div className="text-[10px] uppercase font-bold text-[#087F8C] tracking-wider">
                Care & Recovery
              </div>
            </div>
          </Link>

          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-[#52616B] hover:text-[#101A45] hover:bg-[#DCE8EC]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card & Language Bar */}
        <div className="px-4 py-3 bg-[#DCE8EC]/30 border-b border-[#C9D7DE]/60 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#101A45] text-white font-bold text-xs flex items-center justify-center border border-[#C9D7DE] shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#101A45] truncate">
                  {userName}
                </div>
                <div className="text-[10px] text-[#52616B] capitalize">
                  {userRole.toLowerCase()}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <LanguageToggle />
            </div>
          </div>

          {/* 90-Day Tracker Tag */}
          <div className="px-3 py-2 bg-[#D5F3E7] border border-[#087F8C]/20 rounded-xl text-[11px] text-[#101A45] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#087F8C]" />
              <span>90-Day Journey Active</span>
            </div>
            <span className="text-[10px] text-[#52616B] font-medium">Day 14 / 90</span>
          </div>
        </div>

        {/* Navigation Links Scroll Container */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#52616B]">
            {lang === "hi" ? "सभी मॉड्यूल" : "All Modules"}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all min-h-[44px] ${
                  item.active
                    ? "bg-[#D5F3E7] text-[#101A45] font-bold border border-[#087F8C]/30 shadow-2xs"
                    : "text-[#52616B] hover:text-[#101A45] hover:bg-[#DCE8EC]/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    active={item.active}
                    className={`w-4 h-4 shrink-0 ${
                      item.active ? "text-[#087F8C]" : "text-[#52616B]"
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="truncate block font-semibold text-xs text-[#101A45]">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[#52616B] truncate block">
                      {item.subLabel}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#C9D7DE] shrink-0" />
              </Link>
            );
          })}

          {/* Clinician Workspace for authorized users */}
          {(userRole === "CLINICIAN" || userRole === "ADMIN") && (
            <div className="pt-2 border-t border-[#C9D7DE]/60 mt-2">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#087F8C]">
                {lang === "hi" ? "चिकित्सक पोर्टल" : "Clinician Portal"}
              </div>
              <Link
                href="/clinician"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#087F8C] hover:bg-[#D5F3E7] transition-all min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                  <span>{lang === "hi" ? "डॉक्टर वर्कस्पेस" : "Clinician Queue"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#087F8C]" />
              </Link>
            </div>
          )}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-[#C9D7DE]/60 bg-white shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#B4233B] hover:bg-[#FCE7EB] border border-[#FCE7EB] transition-colors min-h-[44px] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.patientNav.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
