"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Stethoscope,
  User,
  CreditCard,
  Users,
  HeartHandshake,
  LogOut,
} from "lucide-react";
import {
  NavHomeIcon,
  NavTrackIcon,
  NavLearnIcon,
  NavSupportIcon,
} from "@/components/layout/PulseNavIcons";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";

export function DesktopSidebar({
  userName = "User",
  userRole = "PATIENT",
}: {
  userName?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  // Core 4 Sections matching the reference image
  const primaryNavItems = [
    {
      name: lang === "hi" ? "होम (Home)" : "Home",
      href: "/dashboard",
      icon: NavHomeIcon,
      isActive: (path: string) => path === "/dashboard" || path === "/",
    },
    {
      name: lang === "hi" ? "ट्रैक (Track)" : "Track",
      href: "/food",
      icon: NavTrackIcon,
      isActive: (path: string) =>
        path.startsWith("/food") ||
        path.startsWith("/checkin") ||
        path.startsWith("/plan") ||
        path.startsWith("/review"),
    },
    {
      name: lang === "hi" ? "सीखें (Learn)" : "Learn",
      href: "/coach",
      icon: NavLearnIcon,
      isActive: (path: string) => path.startsWith("/coach"),
    },
    {
      name: lang === "hi" ? "सपोर्ट (Support)" : "Support",
      href: "/support",
      icon: NavSupportIcon,
      isActive: (path: string) =>
        path.startsWith("/support") ||
        path.startsWith("/circle") ||
        path.startsWith("/community"),
    },
  ];

  // Specific Patient Modules (Education Section and Food AI reside in Core Navigation)
  const patientModuleItems: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<any>;
  }> = [
    { name: lang === "hi" ? "सब्सक्रिप्शन (Subscription)" : "Subscription", href: "/subscription", icon: CreditCard },
    { name: lang === "hi" ? "डॉक्टर सपोर्ट (Support)" : "Doctor Support", href: "/support", icon: Stethoscope },
    { name: t.patientNav.dailyCheckIn, href: "/checkin", icon: CheckCircle2 },
    { name: t.patientNav.myPlan, href: "/plan", icon: Target },
    { name: t.patientNav.community, href: "/community/groups/building-healthy-habits", icon: Users },
    { name: t.patientNav.careCircle, href: "/circle", icon: HeartHandshake },
    { name: t.patientNav.progress, href: "/review", icon: TrendingUp },
    { name: t.patientNav.profile, href: "/dashboard/profile", icon: User },
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

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-[#C9D7DE] sticky top-0 h-screen overflow-y-auto p-4 justify-between shrink-0 shadow-[1px_0_3px_rgba(16,26,69,0.02)]">
      <div className="space-y-5">
        {/* Brand header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link href="/dashboard" className="flex items-center gap-2.5">
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
              <div className="font-bold text-lg text-[#101A45] leading-tight">
                Pulse
              </div>
              <div className="text-[10px] uppercase font-bold text-[#087F8C] tracking-wider">
                Care & Recovery
              </div>
            </div>
          </Link>
        </div>

        {/* Bilingual Selector */}
        <div className="px-2">
          <LanguageToggle />
        </div>

        {/* Core Primary Navigation matching reference image */}
        <nav className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#52616B]">
            {lang === "hi" ? "मुख्य नेविगेशन" : "Core Navigation"}
          </div>
          {primaryNavItems.map((item) => {
            const isActive = item.isActive(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#D5F3E7] text-[#101A45] font-bold border border-[#C9D7DE]/60 shadow-2xs"
                    : "text-[#52616B] hover:text-[#101A45] hover:bg-[#DCE8EC]/40"
                }`}
              >
                <Icon
                  active={isActive}
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-[#087F8C]" : "text-[#101A45]"
                  }`}
                />
                <span className="text-[13px]">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Patient Modules List */}
        <nav className="space-y-1 pt-2 border-t border-[#C9D7DE]/60">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#52616B]">
            {lang === "hi" ? "रोगी देखभाल मॉड्यूल" : "Patient Modules"}
          </div>
          {patientModuleItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href.startsWith("/community")
                ? pathname.startsWith("/community")
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#D5F3E7] text-[#101A45] font-bold"
                    : "text-[#52616B] hover:text-[#101A45] hover:bg-[#DCE8EC]/30"
                }`}
              >
                <Icon
                  active={isActive}
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-[#087F8C]" : "text-[#52616B]"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          {/* Clinician Portal Link if Clinician or Admin */}
          {(userRole === "CLINICIAN" || userRole === "ADMIN") && (
            <div className="pt-2 border-t border-[#C9D7DE]/60 mt-2">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#087F8C]">
                {lang === "hi" ? "चिकित्सक पोर्टल" : "Clinician Portal"}
              </div>
              <Link
                href="/clinician"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  pathname.startsWith("/clinician")
                    ? "bg-[#D5F3E7] text-[#101A45] font-bold"
                    : "text-[#087F8C] hover:bg-[#DCE8EC]/40"
                }`}
              >
                <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                <span>{lang === "hi" ? "डॉक्टर वर्कस्पेस" : "Clinician Queue"}</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Footer User & Safety Info */}
      <div className="pt-4 border-t border-[#C9D7DE]/60 space-y-3">
        {/* 90-Day Follow-through tracker tag */}
        <div className="px-3 py-2.5 bg-[#D5F3E7] border border-[#C9D7DE] rounded-xl text-[11px] text-[#101A45] space-y-0.5">
          <div className="font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#087F8C]" />
            <span>90-Day Journey Active</span>
          </div>
          <p className="text-[10px] text-[#52616B]">
            {lang === "hi" ? "दिन 14 / 90 • निरंतर साथ" : "Day 14 of 90 • Continuous Support"}
          </p>
        </div>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#101A45] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#C9D7DE]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-[#101A45] truncate">{userName}</div>
              <div className="text-[10px] text-[#52616B] capitalize">{userRole.toLowerCase()}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t.patientNav.logout}
            className="p-1.5 text-[#52616B] hover:text-[#B4233B] hover:bg-[#FCE7EB] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
