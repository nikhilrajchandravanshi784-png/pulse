"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Bell, BellOff, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { GroupDTO } from "@/services/community/types";

interface GroupCardProps {
  group: GroupDTO;
  lang?: "hi" | "en";
  onJoinToggle: (groupId: string, isJoined: boolean) => void;
  onMuteToggle?: (groupId: string) => void;
}

export function GroupCard({ group, lang = "hi", onJoinToggle, onMuteToggle }: GroupCardProps) {
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const endpoint = group.isJoined
        ? `/api/community/groups/${group.id}/leave`
        : `/api/community/groups/${group.id}/join`;

      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        onJoinToggle(group.id, !group.isJoined);
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.warn("Failed group toggle:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMute = async () => {
    try {
      const res = await fetch(`/api/community/groups/${group.id}/mute`, { method: "POST" });
      if (res.ok && onMuteToggle) {
        onMuteToggle(group.id);
      }
    } catch (err) {
      console.warn("Failed mute toggle:", err);
    }
  };

  const displayName = lang === "hi" && group.nameHi ? group.nameHi : group.name;
  const displayDesc = lang === "hi" && group.descriptionHi ? group.descriptionHi : group.description;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {group.category}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {group.memberCount}/{group.memberLimit} {lang === "hi" ? "सदस्य" : "members"}
            </span>
          </div>
        </div>

        {/* Group Name & Desc */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">
            <Link href={`/community/groups/${group.slug}`} className="hover:text-teal-700 transition-colors">
              {displayName}
            </Link>
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
            {displayDesc}
          </p>
        </div>

        {/* Group Purpose & Rules Snippet */}
        <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
          <strong className="text-slate-700">{lang === "hi" ? "उद्देश्य:" : "Purpose:"}</strong> {group.purpose}
        </div>

        {/* Rules Collapsible */}
        {group.rules && group.rules.length > 0 && (
          <div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-900"
            >
              {showRules ? (lang === "hi" ? "नियम छुपाएं ▲" : "Hide rules ▲") : (lang === "hi" ? "समूह नियम देखें ▼" : "View group rules ▼")}
            </button>
            {showRules && (
              <ul className="mt-2 text-[11px] text-slate-600 space-y-1 pl-4 list-disc animate-in fade-in">
                {group.rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleJoin}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              group.isJoined
                ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200"
                : "bg-teal-700 text-white hover:bg-teal-800 shadow-2xs"
            }`}
          >
            {group.isJoined
              ? (lang === "hi" ? "छोड़ें (Leave)" : "Leave")
              : (lang === "hi" ? "शामिल हों" : "Join")}
          </button>

          {group.isJoined && onMuteToggle && (
            <button
              onClick={handleMute}
              className={`p-1.5 rounded-xl border text-xs transition-colors ${
                group.notificationsMuted
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-white text-slate-400 hover:text-slate-700 border-slate-200"
              }`}
              title={group.notificationsMuted ? "Unmute notifications" : "Mute notifications"}
            >
              {group.notificationsMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <Link
          href={`/community/groups/${group.slug}`}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 group"
        >
          <span>{lang === "hi" ? "चर्चाएं देखें" : "Discussions"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
