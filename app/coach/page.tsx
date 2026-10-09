"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import {
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  X,
  Search,
  Bookmark,
} from "lucide-react";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";

interface Article {
  id: string;
  slug: string;
  title: string;
  titleHindi?: string | null;
  content: string;
  contentHindi?: string | null;
  authorOrg: string;
  evidenceInfo?: string | null;
  reviewerName: string;
}

export default function EducationalSectionPage() {
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [viewFilter, setViewFilter] = useState<"all" | "saved">("all");
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pulse/coach");
      const data = await res.json();
      if (data.articles) {
        setArticles(data.articles);
      }
    } catch (err) {
      console.error("Educational articles fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("pulse_saved_guides") || "[]");
        setSavedIds(saved);
      } catch {
        setSavedIds([]);
      }
    }
  }, []);

  const toggleSaveArticle = (articleId: string) => {
    setSavedIds((prev) => {
      const exists = prev.includes(articleId);
      const updated = exists ? prev.filter((id) => id !== articleId) : [...prev, articleId];
      if (typeof window !== "undefined") {
        localStorage.setItem("pulse_saved_guides", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const filteredArticles = articles.filter((art) => {
    if (viewFilter === "saved" && !savedIds.includes(art.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = art.title.toLowerCase().includes(q) || (art.titleHindi && art.titleHindi.toLowerCase().includes(q));
    const contentMatch = art.content.toLowerCase().includes(q) || (art.contentHindi && art.contentHindi.toLowerCase().includes(q));
    const orgMatch = art.authorOrg.toLowerCase().includes(q);
    return titleMatch || contentMatch || orgMatch;
  });

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Learn" />
        <SafetyBanner compact />

        <div className="bg-white border-b border-[#C9D7DE] px-4 sm:px-8 py-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#087F8C] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {t.modules.coach.title}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#101A45] mt-0.5">
                {lang === "hi" ? "समीक्षित मधुमेह शिक्षा सामग्री" : "Reviewed Diabetes Guidance Library"}
              </h1>
              <p className="text-xs text-[#52616B] mt-0.5">{t.modules.coach.subtitle}</p>
            </div>

            <LanguageToggle />
          </div>
        </div>

        <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Strict Safety Disclaimer Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>{lang === "hi" ? "महत्वपूर्ण चिकित्सीय सीमा:" : "Clinical Safety Boundary:"}</strong>{" "}
              {t.modules.coach.disclaimer}
            </p>
          </div>

          {/* Filter Pills & Search bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#C9D7DE] shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  viewFilter === "all"
                    ? "bg-[#101A45] text-white shadow-xs"
                    : "bg-slate-50 text-[#52616B] hover:bg-slate-100"
                }`}
              >
                {lang === "hi" ? "सभी मार्गदर्शिकाएँ" : "All Guides"} ({articles.length})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter("saved")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  viewFilter === "saved"
                    ? "bg-[#101A45] text-white shadow-xs"
                    : "bg-slate-50 text-[#52616B] hover:bg-slate-100"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{lang === "hi" ? "सहेजी गई" : "Saved"} ({savedIds.length})</span>
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === "hi"
                    ? "शिक्षा सामग्री खोजें (उदा. थाली संतुलन, टहलना)..."
                    : "Search guides (e.g. meal plate, walking, routines)..."
                }
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Educational Articles Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              {lang === "hi" ? "शिक्षा सामग्री लोड हो रही है..." : "Loading educational library..."}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
              {viewFilter === "saved"
                ? (lang === "hi" ? "आपने अभी तक कोई लेख बुकमार्क नहीं किया है।" : "No bookmarked guides yet. Click the bookmark icon on any card to save it.")
                : (lang === "hi" ? "कोई शैक्षिक लेख नहीं मिला। कृपया भिन्न खोज शब्द आज़माएँ।" : "No educational guides matched your search.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArticles.map((art) => {
                const title = lang === "hi" && art.titleHindi ? art.titleHindi : art.title;
                const body = lang === "hi" && art.contentHindi ? art.contentHindi : art.content;
                const isSaved = savedIds.includes(art.id);

                return (
                  <div
                    key={art.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-teal-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          {art.authorOrg}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSaveArticle(art.id)}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              isSaved ? "text-teal-600 bg-teal-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            }`}
                            title={isSaved ? "Remove bookmark" : "Save guide"}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-teal-600" : ""}`} />
                          </button>
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 leading-snug">{title}</h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
                        {body}
                      </p>

                      <div className="pt-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedArticle(art)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all border border-teal-200/90 cursor-pointer shadow-2xs group"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
                          <span>{lang === "hi" ? "पूरा पढ़ें" : "Read More"}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                      <div>
                        <strong>{t.modules.coach.reviewedBy}:</strong> {art.reviewerName}
                      </div>
                      {art.evidenceInfo && (
                        <div>
                          <strong>{t.modules.coach.evidenceSource}:</strong> {art.evidenceInfo}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* FULL ARTICLE READER MODAL */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {selectedArticle.authorOrg}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {lang === "hi" ? "चिकित्सीय रूप से स्वीकृत" : "Clinically Approved"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSaveArticle(selectedArticle.id)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    savedIds.includes(selectedArticle.id) ? "text-teal-600 bg-teal-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className={`w-4 h-4 ${savedIds.includes(selectedArticle.id) ? "fill-teal-600" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                {lang === "hi" && selectedArticle.titleHindi ? selectedArticle.titleHindi : selectedArticle.title}
              </h2>

              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-3 font-normal">
                {(lang === "hi" && selectedArticle.contentHindi ? selectedArticle.contentHindi : selectedArticle.content)
                  .split("\n\n")
                  .map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
              </div>

              {/* Reviewer & Evidence Card */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 text-xs text-slate-600 space-y-1.5 mt-4">
                <div className="flex items-center gap-1.5 text-teal-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>{t.modules.coach.reviewedBy}: {selectedArticle.reviewerName}</span>
                </div>
                {selectedArticle.evidenceInfo && (
                  <div className="text-[11px] text-slate-500 pl-5.5">
                    <strong>{t.modules.coach.evidenceSource}:</strong> {selectedArticle.evidenceInfo}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 pl-5.5 pt-1">
                  {lang === "hi"
                    ? "नोट: यह शैक्षिक जानकारी है। व्यक्तिगत दवा या उपचार में बदलाव के लिए हमेशा अपने चिकित्सक से परामर्श लें।"
                    : "Note: Educational guidance only. Always consult your personal physician before modifying medication or treatment."}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSaveArticle(selectedArticle.id)}
                className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-semibold hover:underline cursor-pointer"
              >
                <Bookmark className={`w-3.5 h-3.5 ${savedIds.includes(selectedArticle.id) ? "fill-teal-600" : ""}`} />
                <span>{savedIds.includes(selectedArticle.id) ? (lang === "hi" ? "सहेजी गई सूची से हटाएं" : "Remove from Saved") : (lang === "hi" ? "बाद के लिए सहेजें" : "Bookmark for Later")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {lang === "hi" ? "पूर्ण / बंद करें" : "Done Reading"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
