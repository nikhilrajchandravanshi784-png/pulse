"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ThumbsUp,
  Heart,
  PartyPopper,
  ShieldAlert,
  Trash2,
  Send,
  Shield,
  HelpCircle,
  Tag,
  Clock,
} from "lucide-react";
import { PostDTO, CommentDTO, ReactionType } from "@/services/community/types";
import { ReportModal } from "./ReportModal";
import { formatRelativeTime } from "@/lib/utils";

interface PostCardProps {
  post: PostDTO;
  lang?: "hi" | "en";
  onDelete?: (postId: string) => void;
}

const CATEGORY_LABELS: Record<string, { en: string; hi: string; color: string }> = {
  DAILY_WIN: { en: "Daily Win", hi: "दैनिक उपलब्धि", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ROUTINE_IDEA: { en: "Routine Idea", hi: "दिनचर्या विचार", color: "bg-teal-50 text-teal-700 border-teal-200" },
  MOTIVATION: { en: "Motivation", hi: "प्रोत्साहन", color: "bg-amber-50 text-amber-700 border-amber-200" },
  PERSONAL_EXPERIENCE: { en: "Experience", hi: "अनुभव", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CHALLENGE: { en: "Challenge", hi: "चुनौती", color: "bg-purple-50 text-purple-700 border-purple-200" },
  QUESTION: { en: "Question", hi: "प्रश्न", color: "bg-slate-100 text-slate-700 border-slate-200" },
  ACTIVITY: { en: "Activity", hi: "गतिविधि", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

export function PostCard({ post, lang = "hi", onDelete }: PostCardProps) {
  const [reactions, setReactions] = useState(post.reactions);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(post.userReaction || null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "POST" | "COMMENT"; id: string }>({
    type: "POST",
    id: post.id,
  });

  const handleReaction = async (type: ReactionType) => {
    try {
      // Optimistic update
      const prevReaction = userReaction;
      const nextReactions = { ...reactions };

      if (prevReaction === type) {
        // Toggle off
        nextReactions[type] = Math.max(0, nextReactions[type] - 1);
        setUserReaction(null);
      } else {
        if (prevReaction) {
          nextReactions[prevReaction] = Math.max(0, nextReactions[prevReaction] - 1);
        }
        nextReactions[type] = (nextReactions[type] || 0) + 1;
        setUserReaction(type);
      }
      setReactions(nextReactions);

      await fetch(`/api/community/posts/${post.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
    } catch (err) {
      console.warn("Failed to update reaction:", err);
    }
  };

  const loadComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/community/posts/${post.id}/comments`);
        const data = await res.json();
        if (data.comments) {
          setComments(data.comments);
        }
      } catch (err) {
        console.warn("Failed to load comments:", err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments([...comments, data.comment]);
        setCommentCount((c) => c + 1);
        setCommentText("");
      }
    } catch (err) {
      console.warn("Failed to submit comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm(lang === "hi" ? "क्या आप वाकई इस पोस्ट को हटाना चाहते हैं?" : "Are you sure you want to delete this post?")) {
      return;
    }
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, { method: "DELETE" });
      if (res.ok && onDelete) {
        onDelete(post.id);
      }
    } catch (err) {
      console.warn("Failed to delete post:", err);
    }
  };

  const categoryMeta = CATEGORY_LABELS[post.category] || CATEGORY_LABELS.PERSONAL_EXPERIENCE;

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300 space-y-4">
      {/* Post Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
            {post.authorDisplayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-slate-900">{post.authorDisplayName}</span>
              {post.authorIsModerator && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-50 text-[10px] font-bold text-teal-700 border border-teal-200">
                  <Shield className="w-2.5 h-2.5" />
                  {lang === "hi" ? "मॉडरेटर" : "Moderator"}
                </span>
              )}
              {post.isDemo && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-500 border border-slate-200">
                  {lang === "hi" ? "डेमो सामग्री" : "Demo content"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{formatRelativeTime(post.createdAt)}</span>
              <span>•</span>
              <Link
                href={`/community/groups/${post.groupSlug}`}
                className="hover:text-teal-600 font-medium transition-colors"
              >
                in {post.groupName}
              </Link>
            </div>
          </div>
        </div>

        {/* Category Tag */}
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${categoryMeta.color}`}
        >
          {lang === "hi" ? categoryMeta.hi : categoryMeta.en}
        </span>
      </div>

      {/* Post Content */}
      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-normal">
        {post.content}
      </p>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        {/* Supportive Reactions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleReaction("HELPFUL")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              userReaction === "HELPFUL"
                ? "bg-teal-50 border-teal-300 text-teal-800 font-bold"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Helpful"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-teal-600" />
            <span>{lang === "hi" ? "उपयोगी" : "Helpful"}</span>
            {reactions.HELPFUL > 0 && <span className="text-[10px] opacity-75">{reactions.HELPFUL}</span>}
          </button>

          <button
            onClick={() => handleReaction("SUPPORTIVE")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              userReaction === "SUPPORTIVE"
                ? "bg-rose-50 border-rose-300 text-rose-800 font-bold"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Supportive"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>{lang === "hi" ? "सहानुभूति" : "Supportive"}</span>
            {reactions.SUPPORTIVE > 0 && <span className="text-[10px] opacity-75">{reactions.SUPPORTIVE}</span>}
          </button>

          <button
            onClick={() => handleReaction("CELEBRATE")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              userReaction === "CELEBRATE"
                ? "bg-amber-50 border-amber-300 text-amber-800 font-bold"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Celebrate"
          >
            <PartyPopper className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === "hi" ? "शाबाशी" : "Celebrate"}</span>
            {reactions.CELEBRATE > 0 && <span className="text-[10px] opacity-75">{reactions.CELEBRATE}</span>}
          </button>
        </div>

        {/* Comments & Report / Delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadComments}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>{commentCount}</span>
          </button>

          {post.isAuthor && (
            <button
              onClick={handleDeletePost}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete post"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              setReportTarget({ type: "POST", id: post.id });
              setReportModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Report content"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Comments Thread */}
      {showComments && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
          {loadingComments ? (
            <div className="text-center py-4 text-xs text-slate-400">
              {lang === "hi" ? "टिप्पणियाँ लोड हो रही हैं..." : "Loading replies..."}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400">
              {lang === "hi" ? "अभी कोई टिप्पणी नहीं है। पहले उत्तरदाता बनें!" : "No replies yet. Be the first to share an encouraging word!"}
            </div>
          ) : (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">{c.authorDisplayName}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{formatRelativeTime(c.createdAt)}</span>
                      <button
                        onClick={() => {
                          setReportTarget({ type: "COMMENT", id: c.id });
                          setReportModalOpen(true);
                        }}
                        className="hover:text-rose-600"
                        title="Report reply"
                      >
                        <ShieldAlert className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-normal">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={lang === "hi" ? "सकारात्मक और उत्साहवर्धक जवाब लिखें..." : "Write a supportive reply..."}
              maxLength={800}
              className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>{lang === "hi" ? "भेजें" : "Reply"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        contentType={reportTarget.type}
        contentId={reportTarget.id}
        lang={lang}
      />
    </article>
  );
}
