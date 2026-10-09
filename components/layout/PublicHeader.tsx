"use client";

import Link from "next/link";
import { Activity, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
              Pulse<span className="text-teal-600 font-extrabold">Health</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              Metabolic Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-teal-700 transition-colors">
            How It Works
          </a>
          <a href="#architecture" className="hover:text-teal-700 transition-colors">
            Passive Data Flow
          </a>
          <a href="#clinical-safety" className="hover:text-teal-700 transition-colors flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Safety & Privacy
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm shadow-teal-600/20 transition-all hover:shadow hover:gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
