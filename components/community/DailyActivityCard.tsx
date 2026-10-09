"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, MessageSquareHeart } from "lucide-react";
import { DailyActivityPrompt } from "@/services/community/types";
import { DAILY_COMMUNITY_ACTIVITIES } from "@/services/community/communityService";

interface DailyActivityCardProps {
  onSelectPrompt: (prompt: DailyActivityPrompt) => void;
  lang?: "hi" | "en";
}

export function DailyActivityCard({ onSelectPrompt, lang = "hi" }: DailyActivityCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prompt = DAILY_COMMUNITY_ACTIVITIES[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % DAILY_COMMUNITY_ACTIVITIES.length);
  };

  return (
    <div className="bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-slate-50 border border-teal-200/90 rounded-2xl p-4.5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
              {lang === "hi" ? "दैनिक सहकर्मी गतिविधि" : "Daily Community Activity"}
            </div>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5">
              {lang === "hi" ? prompt.titleHi : prompt.title}
            </h4>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 px-2 py-1 rounded-lg hover:bg-teal-100/50 transition-colors shrink-0"
        >
          {lang === "hi" ? "दूसरा देखें →" : "Next idea →"}
        </button>
      </div>

      <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
        {lang === "hi" ? prompt.descriptionHi : prompt.description}
      </p>

      <div className="mt-3.5 flex items-center justify-between gap-2 pt-2 border-t border-teal-100/80">
        <span className="text-[11px] text-slate-500 italic truncate">
          &quot;{lang === "hi" ? prompt.samplePlaceholderHi : prompt.samplePlaceholder}&quot;
        </span>
        <button
          onClick={() => onSelectPrompt(prompt)}
          className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <MessageSquareHeart className="w-3.5 h-3.5" />
          <span>{lang === "hi" ? "जवाब दें" : "Respond"}</span>
        </button>
      </div>
    </div>
  );
}
