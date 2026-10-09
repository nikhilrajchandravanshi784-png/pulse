"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, AlertCircle, ShieldCheck, HeartHandshake } from "lucide-react";
import { GroupDTO, PostCategory } from "@/services/community/types";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupDTO[];
  defaultGroupId?: string;
  defaultCategory?: PostCategory;
  defaultContent?: string;
  onPostCreated: () => void;
  lang?: "hi" | "en";
}

export function CreatePostModal({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
  defaultCategory = "PERSONAL_EXPERIENCE",
  defaultContent = "",
  onPostCreated,
  lang = "hi",
}: CreatePostModalProps) {
  const [groupId, setGroupId] = useState(defaultGroupId || groups[0]?.id || "");
  const [category, setCategory] = useState<PostCategory>(defaultCategory);
  const [language, setLanguage] = useState(lang);
  const [content, setContent] = useState(defaultContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heldNotice, setHeldNotice] = useState<string | null>(null);

  // Synchronize state whenever modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      const initialGroup = defaultGroupId || (groups.length > 0 ? groups[0].id : "");
      setGroupId(initialGroup);
      if (defaultCategory) setCategory(defaultCategory);
      if (defaultContent) setContent(defaultContent);
      setError(null);
      setHeldNotice(null);
    }
  }, [isOpen, defaultGroupId, defaultCategory, defaultContent, groups]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const targetGroupId = groupId || defaultGroupId || (groups.length > 0 ? groups[0].id : "");
    if (!targetGroupId) {
      setError(lang === "hi" ? "कृपया एक समूह चुनें" : "Please select a group");
      return;
    }

    setSubmitting(true);
    setError(null);
    setHeldNotice(null);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: targetGroupId,
          content,
          category,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      if (data.screening?.status === "HELD_FOR_REVIEW") {
        setHeldNotice(
          lang === "hi"
            ? "सुरक्षा समीक्षा: समुदाय को सुरक्षित रखने के लिए आपके पोस्ट की त्वरित समीक्षा की जा रही है। स्वीकृत होने पर यह दिखाई देगा।"
            : "Safety screening: To ensure community safety, your post is undergoing a quick moderator review before appearing."
        );
        setTimeout(() => {
          onPostCreated();
          onClose();
        }, 2200);
      } else {
        onPostCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === "hi" ? "समुदाय में अनुभव साझा करें" : "Share With Peer Group"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === "hi" ? "सकारात्मक और उत्साहवर्धक चर्चा शुरू करें" : "Start a supportive and practical discussion"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {heldNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{heldNotice}</span>
            </div>
          )}

          {/* Group and Category selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "hi" ? "समूह चुनें" : "Select Group"}
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {lang === "hi" && g.nameHi ? g.nameHi : g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "hi" ? "विषय श्रेणी" : "Topic Category"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PostCategory)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="DAILY_WIN">{lang === "hi" ? "🎉 दैनिक उपलब्धि (Daily Win)" : "🎉 Daily Win"}</option>
                <option value="ROUTINE_IDEA">{lang === "hi" ? "💡 दिनचर्या का विचार (Routine Idea)" : "💡 Routine Idea"}</option>
                <option value="MOTIVATION">{lang === "hi" ? "🌟 प्रेरणा और प्रोत्साहन (Motivation)" : "🌟 Motivation"}</option>
                <option value="PERSONAL_EXPERIENCE">{lang === "hi" ? "🌿 व्यक्तिगत अनुभव (Personal Journey)" : "🌿 Personal Journey"}</option>
                <option value="CHALLENGE">{lang === "hi" ? "🌧️ रोज़मर्रा की चुनौती (Everyday Challenge)" : "🌧️ Everyday Challenge"}</option>
                <option value="QUESTION">{lang === "hi" ? "❓ सामान्य जीवनशैली प्रश्न (Question)" : "❓ Question"}</option>
              </select>
            </div>
          </div>

          {/* Post Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {lang === "hi" ? "आपका संदेश" : "Your Post"}
              </label>
              <span className={`text-[11px] ${content.length > 1800 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                {content.length}/2000
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "जैसे: आज मैंने रात के खाने के बाद 15 मिनट टहलने का समय निकाला..."
                  : "e.g., I found that taking a 10-minute walk after dinner fit my routine today..."
              }
              rows={5}
              maxLength={2000}
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
              required
            />
          </div>

          {/* Privacy & Medical Reminders */}
          <div className="space-y-2">
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5 text-[11px] text-teal-900 leading-relaxed">
              <strong>⚖️ {lang === "hi" ? "महत्वपूर्ण:" : "Important:"}</strong>{" "}
              {lang === "hi"
                ? "सदस्य केवल व्यक्तिगत अनुभव साझा करते हैं, चिकित्सकीय सलाह नहीं। दवा बदलने या इंसुलिन की मात्रा बताने की अनुमति नहीं है।"
                : "Members share personal experiences, not medical advice. Medication dosing and prescription changes are strictly prohibited."}
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 leading-relaxed">
              👁️ {lang === "hi"
                ? "यह पोस्ट चुने गए समूह के सदस्यों को दिखाई देगा। अपनी रक्त शर्करा रिपोर्ट या व्यक्तिगत संपर्क विवरण न डालें।"
                : "This post will be visible to members of the selected group. Do not post medical lab reports or private contact details."}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {lang === "hi" ? "रद्द करें" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {submitting ? (lang === "hi" ? "समीक्षा और पोस्ट..." : "Submitting...") : (lang === "hi" ? "साझा करें" : "Publish Post")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
