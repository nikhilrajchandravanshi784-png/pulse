"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquareHeart,
  Users,
  Compass,
  BookmarkCheck,
  ShieldAlert,
  Settings,
  Plus,
  Filter,
  Sparkles,
  Info,
  Shield,
  Bell,
  RefreshCw,
  HeartHandshake,
} from "lucide-react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import { GroupDTO, PostDTO, DailyActivityPrompt, PostCategory } from "@/services/community/types";
import { PostCard } from "@/components/community/PostCard";
import { GroupCard } from "@/components/community/GroupCard";
import { DailyActivityCard } from "@/components/community/DailyActivityCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";

type TabType = "feed" | "discover" | "my_groups" | "guidelines" | "privacy";

export default function CommunityPage() {
  const router = useRouter();
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [postCategoryFilter, setPostCategoryFilter] = useState<string>("ALL");
  const [onlyJoinedFilter, setOnlyJoinedFilter] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create post modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<{
    category: PostCategory;
    content: string;
  } | null>(null);

  // Privacy settings state
  const [displayName, setDisplayName] = useState("");
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("07:00");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySavedNotice, setPrivacySavedNotice] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/community/groups");
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
      }
      if (data.currentUserId) {
        setCurrentUserId(data.currentUserId);
      }
    } catch (err) {
      console.warn("Failed to fetch groups:", err);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/community/posts", window.location.origin);
      if (postCategoryFilter !== "ALL") {
        url.searchParams.set("category", postCategoryFilter);
      }
      if (onlyJoinedFilter) {
        url.searchParams.set("onlyJoined", "true");
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.warn("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [postCategoryFilter, onlyJoinedFilter]);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/community/preferences");
      const data = await res.json();
      if (data.profile) {
        setDisplayName(data.profile.displayName || "");
        setIsModerator(Boolean(data.profile.isModerator));
      }
      if (data.preference) {
        setQuietHoursStart(data.preference.quietHoursStart || "22:00");
        setQuietHoursEnd(data.preference.quietHoursEnd || "07:00");
        setNotificationsEnabled(data.preference.notificationsEnabled !== false);
      }
    } catch (err) {
      console.warn("Failed to load preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchPosts();
    fetchPreferences();
  }, [fetchGroups, fetchPosts, fetchPreferences]);

  const handleJoinToggle = (groupId: string, isJoined: boolean) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              isJoined,
              memberCount: isJoined ? g.memberCount + 1 : Math.max(0, g.memberCount - 1),
            }
          : g
      )
    );
    fetchPosts();
  };

  const handleMuteToggle = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, notificationsMuted: !g.notificationsMuted } : g
      )
    );
  };

  const handleSelectPrompt = (prompt: DailyActivityPrompt) => {
    setPrefilledPrompt({
      category: prompt.targetCategory,
      content: lang === "hi" ? prompt.samplePlaceholderHi : prompt.samplePlaceholder,
    });
    setCreateModalOpen(true);
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrivacy(true);
    setPrivacySavedNotice(false);

    try {
      const res = await fetch("/api/community/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          quietHoursStart,
          quietHoursEnd,
          notificationsEnabled,
        }),
      });

      if (res.ok) {
        setPrivacySavedNotice(true);
        setTimeout(() => setPrivacySavedNotice(false), 2500);
      }
    } catch (err) {
      console.warn("Failed to save privacy:", err);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleDeleteCommunityData = async () => {
    if (
      !confirm(
        lang === "hi"
          ? "क्या आप वाकई अपना सारा समुदाय डेटा (पोस्ट, टिप्पणियां, प्रतिक्रियाएं) हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।"
          : "Are you sure you want to delete all your community posts, comments, and reactions? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/community/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_data" }),
      });
      if (res.ok) {
        alert(lang === "hi" ? "समुदाय डेटा सफलतापूर्वक हटा दिया गया है।" : "Community data deleted successfully.");
        fetchPosts();
        fetchGroups();
      }
    } catch (err) {
      console.warn("Failed to delete data:", err);
    }
  };

  const myGroups = groups.filter((g) => g.isJoined);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <DesktopSidebar userName={displayName || "Alex"} userRole={isModerator ? "ADMIN" : "PATIENT"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <header className="bg-white border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-2xs">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {t.modules.community.title}
              </h1>
              <p className="text-[11px] text-slate-500">
                {t.modules.community.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isModerator && (
              <Link
                href="/community/moderator"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
              >
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                <span>{lang === "hi" ? "मॉडरेटर पैनल" : "Moderator Queue"}</span>
              </Link>
            )}
            <LanguageToggle />
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Clinical Emergency Banner */}
          <SafetyBanner />

          {/* Peer Community Principle & Medical Disclaimer Banner */}
          <div className="bg-white border border-teal-200/90 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4.5 h-4.5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <span>{lang === "hi" ? "सहकर्मी सहायता — चिकित्सकीय सलाह नहीं" : "Peer Support — Not Medical Advice"}</span>
                <span className="text-[10px] bg-teal-100/70 text-teal-800 px-2 py-0.5 rounded-md font-semibold">
                  {lang === "hi" ? "सुरक्षित मंच" : "Moderated"}
                </span>
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {t.modules.community.disclaimer}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200/80 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all shrink-0 ${
                activeTab === "feed"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>{t.modules.community.tabFeed}</span>
            </button>

            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all shrink-0 ${
                activeTab === "discover"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.modules.community.tabGroups}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {groups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("my_groups")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all shrink-0 ${
                activeTab === "my_groups"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{t.modules.community.tabMyGroups}</span>
              {myGroups.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800">
                  {myGroups.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("guidelines")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all shrink-0 ${
                activeTab === "guidelines"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t.modules.community.tabGuidelines}</span>
            </button>

            <button
              onClick={() => setActiveTab("privacy")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all shrink-0 ${
                activeTab === "privacy"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t.modules.community.tabPrivacy}</span>
            </button>
          </div>

          {/* TAB 1: FEED / DISCUSSIONS */}
          {activeTab === "feed" && (
            <div className="space-y-5">
              {/* Daily Encouragement Activity */}
              <DailyActivityCard onSelectPrompt={handleSelectPrompt} lang={lang} />

              {/* Toolbar & Filter */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Filter className="w-3.5 h-3.5" />
                    <span>{lang === "hi" ? "श्रेणी:" : "Filter:"}</span>
                  </div>
                  <select
                    value={postCategoryFilter}
                    onChange={(e) => setPostCategoryFilter(e.target.value)}
                    className="text-xs rounded-xl border border-slate-200 px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">{lang === "hi" ? "सभी विषय (All Topics)" : "All Topics"}</option>
                    <option value="DAILY_WIN">{lang === "hi" ? "दैनिक उपलब्धियां" : "Daily Wins"}</option>
                    <option value="ROUTINE_IDEA">{lang === "hi" ? "दिनचर्या के विचार" : "Routine Ideas"}</option>
                    <option value="MOTIVATION">{lang === "hi" ? "प्रेरणा और प्रोत्साहन" : "Motivation"}</option>
                    <option value="PERSONAL_EXPERIENCE">{lang === "hi" ? "व्यक्तिगत अनुभव" : "Personal Experiences"}</option>
                    <option value="CHALLENGE">{lang === "hi" ? "चुनौतियां" : "Challenges"}</option>
                    <option value="QUESTION">{lang === "hi" ? "प्रश्न" : "Questions"}</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={onlyJoinedFilter}
                      onChange={(e) => setOnlyJoinedFilter(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{lang === "hi" ? "केवल मेरे समूह" : "Joined groups only"}</span>
                  </label>
                </div>

                <button
                  onClick={() => {
                    setPrefilledPrompt(null);
                    setCreateModalOpen(true);
                  }}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.modules.community.createPost}</span>
                </button>
              </div>

              {/* Feed Content */}
              {loading ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  <span>{lang === "hi" ? "चर्चाएं लोड हो रही हैं..." : "Loading supportive discussions..."}</span>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {lang === "hi" ? "आपका समुदाय शुरू हो रहा है" : "Your community is getting started"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {lang === "hi"
                      ? "किसी समूह में शामिल हों या एक नई उत्साहवर्धक चर्चा शुरू करें।"
                      : "Join a peer group or start a supportive conversation with your peers."}
                  </p>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {t.modules.community.createPost}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      lang={lang}
                      onDelete={(deletedId) => setPosts(posts.filter((p) => p.id !== deletedId))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISCOVER GROUPS */}
          {activeTab === "discover" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === "hi" ? "छोटे, संरचित सहकर्मी समूह खोजें" : "Discover Small, Structured Peer Groups"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === "hi"
                    ? "प्रत्येक समूह 8–15 सदस्यों का छोटा समूह होता है ताकि बातचीत सहज, व्यक्तिगत और शांत रहे।"
                    : "Each peer group is kept small (8–15 members) so conversations remain calm, respectful, and supportive."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    lang={lang}
                    onJoinToggle={handleJoinToggle}
                    onMuteToggle={handleMuteToggle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MY GROUPS */}
          {activeTab === "my_groups" && (
            <div className="space-y-4">
              {myGroups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <BookmarkCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {lang === "hi" ? "आपने अभी तक कोई समूह ज्वाइन नहीं किया है" : "You have not joined any groups yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {lang === "hi"
                      ? "अपनी रुचियों के अनुसार 8–15 सदस्यों के छोटे समूह खोजें और अनुभव साझा करें।"
                      : "Explore structured topic groups and connect with members on a similar path."}
                  </p>
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl"
                  >
                    {lang === "hi" ? "समूह खोजें" : "Discover Groups"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myGroups.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      lang={lang}
                      onJoinToggle={handleJoinToggle}
                      onMuteToggle={handleMuteToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMMUNITY GUIDELINES */}
          {activeTab === "guidelines" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "hi" ? "पल्स समुदाय दिशानिर्देश एवं सुरक्षा मानक" : "Pulse Community Guidelines & Safety Standards"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === "hi"
                    ? "हमारा उद्देश्य एक शांत, सहयोगात्मक और सुरक्षित स्थान प्रदान करना है।"
                    : "Our purpose is to provide a calm, respectful, and evidence-grounded environment."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900">
                    ✅ {lang === "hi" ? "हम क्या प्रोत्साहित करते हैं" : "What We Encourage"}
                  </h4>
                  <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4">
                    <li>{lang === "hi" ? "छोटी दैनिक उपलब्धियों को साझा करना और मनाना।" : "Sharing and celebrating small daily habit wins."}</li>
                    <li>{lang === "hi" ? "किफायती भोजन और चलने-फिरने के व्यावहारिक सुझाव।" : "Practical tips for affordable meals and walking routines."}</li>
                    <li>{lang === "hi" ? "सहानुभूति, आदर और दूसरों का मनोबल बढ़ाना।" : "Empathetic encouragement during off-track days."}</li>
                    <li>{lang === "hi" ? "हिंदी और अंग्रेज़ी दोनों में सहज बातचीत।" : "Respectful dialogue in Hindi and English."}</li>
                  </ul>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-rose-900">
                    🚫 {lang === "hi" ? "सख्त रूप से प्रतिबंधित" : "Strictly Prohibited"}
                  </h4>
                  <ul className="text-xs text-rose-950 space-y-1.5 list-disc pl-4">
                    <li>{lang === "hi" ? "दवाइयों या इंसुलिन की मात्रा (Dose) में फेरबदल की सलाह देना।" : "Medication or insulin dosing adjustments for peers."}</li>
                    <li>{lang === "hi" ? "डॉक्टर की सलाह या दवा बंद करने का सुझाव देना।" : "Encouraging peers to abandon prescribed treatment."}</li>
                    <li>{lang === "hi" ? "डायबिटीज को 100% जड़ से खत्म करने के चमत्कारिक दावे।" : "Claims of guaranteed permanent cures or miracle herbs."}</li>
                    <li>{lang === "hi" ? "अत्यधिक भूखे रहना या खतरनाक क्रैश डाइट।" : "Dangerous extreme fasting or starvation diets."}</li>
                    <li>{lang === "hi" ? "उत्पीड़न, गाली-गलौज, या व्यावसायिक विज्ञापन।" : "Harassment, abuse, bullying, or commercial promotions."}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <h4 className="font-bold text-slate-800">
                  {lang === "hi" ? "सामग्री समीक्षा और रिपोर्टिंग" : "Moderation & Reporting Process"}
                </h4>
                <p className="leading-relaxed">
                  {lang === "hi"
                    ? "सभी प्रस्तुतियाँ स्वचालित सुरक्षा प्रणाली और प्रशिक्षित मॉडरेटरों द्वारा जांची जाती हैं। यदि आप कोई असुरक्षित पोस्ट देखते हैं, तो पोस्ट के नीचे दिए गए शील्ड आइकन पर क्लिक करके तुरंत रिपोर्ट कर सकते हैं।"
                    : "All submissions pass through our automated clinical screening pipeline. If you notice unsafe advice, click the shield icon on any post or comment to file an anonymous report."}
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY SETTINGS */}
          {activeTab === "privacy" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "hi" ? "समुदाय गोपनीयता एवं खाता नियंत्रण" : "Community Privacy & Account Controls"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === "hi"
                    ? "आपकी चिकित्सा जानकारी (ग्लूकोज, दवाएं, डॉक्टर रिपोर्ट) समुदाय के सदस्यों से पूरी तरह सुरक्षित और छिपी रहती है।"
                    : "Your medical telemetry (glucose, meds, clinician notes) is NEVER exposed to community members."}
                </p>
              </div>

              <form onSubmit={handleSavePrivacy} className="space-y-4 max-w-lg">
                {privacySavedNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                    ✓ {lang === "hi" ? "गोपनीयता सेटिंग्स सहेजी गईं" : "Privacy preferences saved"}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === "hi" ? "समुदाय प्रदर्शन नाम (Display Name)" : "Community Display Name"}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Ramesh K."
                    maxLength={30}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {lang === "hi"
                      ? "यह नाम समूह चर्चाओं में दिखाई देता है। आप उपनाम का उपयोग कर सकते हैं।"
                      : "This name appears on your discussions. You may use a friendly first name or nickname."}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{lang === "hi" ? "समुदाय सूचनाएं सक्षम करें" : "Enable Community Notifications"}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {lang === "hi" ? "शांत घंटे (शुरू)" : "Quiet Hours Start"}
                    </label>
                    <input
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {lang === "hi" ? "शांत घंटे (समाप्त)" : "Quiet Hours End"}
                    </label>
                    <input
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 p-2"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingPrivacy}
                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
                  >
                    {savingPrivacy ? (lang === "hi" ? "सहेज रहे हैं..." : "Saving...") : (lang === "hi" ? "सेटिंग्स सहेजें" : "Save Preferences")}
                  </button>
                </div>
              </form>

              {/* Data Deletion Control */}
              <div className="pt-6 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-rose-700">
                  {lang === "hi" ? "समुदाय डेटा हटाने का अनुरोध" : "Request Community Data Deletion"}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === "hi"
                    ? "आप किसी भी समय अपने सभी समुदाय पोस्ट, टिप्पणियां और प्रतिक्रियाएं हटा सकते हैं। आपका क्लिनिकल रिकॉर्ड इससे प्रभावित नहीं होगा।"
                    : "Remove all your posts, replies, and reactions from community groups. Your clinical care plan remains unaffected."}
                </p>
                <button
                  onClick={handleDeleteCommunityData}
                  className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                >
                  {lang === "hi" ? "मेरी समुदाय गतिविधि हटाएं" : "Delete My Community Activity"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        groups={groups}
        defaultCategory={prefilledPrompt?.category}
        defaultContent={prefilledPrompt?.content}
        onPostCreated={() => {
          fetchPosts();
          setActiveTab("feed");
        }}
        lang={lang}
      />
    </div>
  );
}
