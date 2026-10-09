"use client";

import { ShieldCheck, Info } from "lucide-react";

interface SafetyBannerProps {
  compact?: boolean;
}

export function SafetyBanner({ compact = false }: SafetyBannerProps) {
  if (compact) {
    return (
      <div className="py-2 px-4 bg-[#D5F3E7]/80 border-b border-[#C9D7DE] text-[#101A45] text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <ShieldCheck className="w-4 h-4 text-[#087F8C] shrink-0" />
          <span className="truncate">
            <strong>Clinical Safety Notice:</strong> Informational & wellness platform only. Not a medical diagnosis. Compliance review required before production healthcare deployment.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 bg-white border border-[#C9D7DE] text-xs text-[#52616B] space-y-2">
      <div className="flex items-center gap-2 text-[#101A45] font-semibold">
        <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
        <span>Healthcare Safety & Advisory Standards</span>
      </div>
      <p className="leading-relaxed">
        Pulse Health integrates continuous metabolic streams and health inputs for wellness and observational purposes. It does not provide medical diagnoses, prescribe treatments, or replace direct clinical consultation with your licensed physician.
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-[#52616B]">
        <Info className="w-3.5 h-3.5 text-[#087F8C]" />
        <span>Notice: Regulatory compliance review required before production healthcare deployment.</span>
      </div>
    </div>
  );
}
