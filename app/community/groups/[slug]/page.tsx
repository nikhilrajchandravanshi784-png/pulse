"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Bell,
  BellOff,
  Plus,
  Info,
  Shield,
  RefreshCw,
  HeartHandshake,
  ShieldAlert,
  Menu,
} from "lucide-react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { openMobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import { GroupDTO, PostDTO } from "@/services/community/types";
import { PostCard } from "@/components/community/PostCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";

export default function GroupDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchGroupAndPosts = useCallback(async () => {
    try {
      setLoading(true);
      const [grpRes, postsRes] = await Promise.all([
        fetch(`/api/community/groups/${slug}`),
        fetch(`/api/community/groups/${slug}/posts`),
      ]);

      if (grpRes.ok) {
        const grpData = await grpRes.json();
        setGroup(grpData.group);
      }
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }
    } catch (err) {
      console.warn("Failed to load group discussions:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGroupAndPosts();
  }, [fetchGroupAndPosts]);

  const handleJoin = async () => {
    if (!group) return;
    try {
      const endpoint = group.isJoined
        ? `/api/community/groups/${group.id}/leave`
        : `/api/community/groups/${group.id}/join`;

      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        setGroup({
          ...group,
          isJoined: !group.isJoined,
          memberCount: group.isJoined ? group.memberCount - 1 : group.memberCount + 1,
        });
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.warn("Join failed:", err);
    }
  };

  const handleMute = async () => {
    if (!group) return;
    try {
      const res = await fetch(`/api/community/groups/${group.id}/mute`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setGroup({ ...group, notificationsMuted: data.notificationsMuted });
      }
    } catch (err) {
      console.warn("Mute failed:", err);
    }
  };

  if (loading && !group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-teal-600" />
        <span>Loading discussion group...</span>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center space-y-4">
        <h2 className="text-base font-bold text-slate-800">Group not found</h2>
        <Link href="/dashboard" className="text-xs font-bold text-teal-700">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const groupName = lang === "hi" && group.nameHi ? group.nameHi : group.name;
  const groupDesc = lang === "hi" && group.descriptionHi ? group.descriptionHi : group.description;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DesktopSidebar userName="User" userRole="PATIENT" />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <header className="bg-white border-b border-[#C9D7DE] px-3 sm:px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => openMobileNavDrawer()}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5 text-[#101A45]" />
            </button>
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors shrink-0"
              title={lang === "hi" ? "डैशबोर्ड पर वापस जाएं" : "Back to Dashboard"}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-[#101A45] leading-tight flex items-center gap-1.5 truncate">
                <span className="truncate">{groupName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D5F3E7] text-[#087F8C] border border-[#087F8C]/30 shrink-0">
                  {group.category}
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[#52616B] truncate">
                {group.memberCount}/{group.memberLimit} {lang === "hi" ? "सदस्य" : "members"} • {group.language}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
          </div>
        </header>

        <main className="max-w-4xl w-full mx-auto px-4 lg:px-8 py-6 space-y-5">
          <SafetyBanner />

          {/* Group Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">{groupDesc}</p>
                <div className="text-[11px] text-slate-500 mt-2">
                  <strong className="text-slate-700">{lang === "hi" ? "उद्देश्य:" : "Purpose:"}</strong> {group.purpose}
                </div>
              </div>

              {/* Join / Leave / Mute Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleJoin}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    group.isJoined
                      ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200"
                      : "bg-teal-700 text-white hover:bg-teal-800 shadow-2xs"
                  }`}
                >
                  {group.isJoined
                    ? (lang === "hi" ? "समूह छोड़ें" : "Leave Group")
                    : (lang === "hi" ? "समूह में शामिल हों" : "Join Group")}
                </button>

                {group.isJoined && (
                  <button
                    onClick={handleMute}
                    className={`p-2 rounded-xl border text-xs transition-colors ${
                      group.notificationsMuted
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-white text-slate-400 hover:text-slate-700 border-slate-200"
                    }`}
                    title={group.notificationsMuted ? "Unmute" : "Mute"}
                  >
                    {group.notificationsMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Rules preview */}
            {group.rules && group.rules.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
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

          {/* Medical Disclaimer Banner */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3.5 text-xs text-teal-900 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span>{t.modules.community.disclaimer}</span>
          </div>

          {/* Discussions header & Create Button */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <h3 className="text-sm font-bold text-slate-900">
              {lang === "hi" ? "समूह चर्चाएं" : "Group Discussions"} ({posts.length})
            </h3>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "चर्चा शुरू करें" : "New Discussion"}</span>
            </button>
          </div>

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {lang === "hi" ? "इस समूह में अभी कोई पोस्ट नहीं है" : "No discussions in this group yet"}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lang === "hi"
                  ? "एक छोटा अनुभव या सवाल साझा करके पहली बातचीत शुरू करें।"
                  : "Be the first to share an encouraging experience or everyday reflection."}
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl"
              >
                {lang === "hi" ? "पहला पोस्ट लिखें" : "Start Conversation"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  lang={lang}
                  onDelete={(deletedId) => setPosts(posts.filter((post) => post.id !== deletedId))}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <MobileBottomNav />

      {/* Create Modal pre-assigned to this group */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        groups={[group]}
        defaultGroupId={group.id}
        onPostCreated={fetchGroupAndPosts}
        lang={lang}
      />
    </div>
  );
}
