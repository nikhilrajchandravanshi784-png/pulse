/**
 * Project Pulse — Pulse Community Type Definitions
 * Structured, moderated peer support groups for diabetes lifestyle management.
 */

export type CommunityCategory =
  | "HABITS"
  | "DAILY_LIVING"
  | "NUTRITION"
  | "ACTIVITY"
  | "ROUTINES"
  | "MOTIVATION"
  | "JOURNEY_90"
  | "HINDI";

export type PostCategory =
  | "DAILY_WIN"
  | "CHALLENGE"
  | "ROUTINE_IDEA"
  | "MOTIVATION"
  | "QUESTION"
  | "PERSONAL_EXPERIENCE"
  | "ACTIVITY";

export type ModerationStatus = "APPROVED" | "HELD_FOR_REVIEW" | "REMOVED";

export type ReactionType = "HELPFUL" | "SUPPORTIVE" | "CELEBRATE";

export type ReportCategory =
  | "DANGEROUS_MEDICAL_ADVICE"
  | "HARASSMENT"
  | "MISINFORMATION"
  | "SPAM"
  | "PRIVACY_VIOLATION"
  | "OTHER";

export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED" | "RESOLVED";

export type ModeratorActionType =
  | "APPROVE"
  | "HOLD"
  | "REMOVE"
  | "WARN_USER"
  | "RESTRICT_USER"
  | "DISMISS_REPORT";

export interface ModerationScreeningResult {
  status: ModerationStatus;
  flagReason: string | null;
  isDangerousMedicalAdvice: boolean;
  safetyWarning: string | null;
  suggestCareTeam: boolean;
  providerUsed: string;
}

export interface GroupDTO {
  id: string;
  slug: string;
  name: string;
  nameHi?: string | null;
  description: string;
  descriptionHi?: string | null;
  purpose: string;
  rules: string[];
  language: "hi" | "en" | "bilingual";
  category: CommunityCategory;
  memberLimit: number;
  approvalRequired: boolean;
  status: "ACTIVE" | "ARCHIVED";
  isDemo: boolean;
  createdAt: string;
  memberCount: number;
  isJoined: boolean;
  userRole?: string | null;
  notificationsMuted?: boolean;
}

export interface ReactionCounts {
  HELPFUL: number;
  SUPPORTIVE: number;
  CELEBRATE: number;
}

export interface PostDTO {
  id: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  authorIsModerator?: boolean;
  content: string;
  language: string;
  category: PostCategory;
  moderationStatus: ModerationStatus;
  moderationReason?: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: ReactionCounts;
  userReaction?: ReactionType | null;
  commentCount: number;
  comments?: CommentDTO[];
  isAuthor: boolean;
}

export interface CommentDTO {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  authorIsModerator?: boolean;
  content: string;
  moderationStatus: ModerationStatus;
  isDemo: boolean;
  createdAt: string;
  isAuthor: boolean;
}

export interface ReportDTO {
  id: string;
  contentType: "POST" | "COMMENT";
  contentId: string;
  contentSnippet: string;
  authorDisplayName: string;
  category: ReportCategory;
  description?: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
}

export interface HeldContentDTO {
  id: string;
  type: "POST" | "COMMENT";
  groupName?: string;
  authorDisplayName: string;
  content: string;
  flagReason?: string | null;
  createdAt: string;
}

export interface DailyActivityPrompt {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  targetCategory: PostCategory;
  samplePlaceholder: string;
  samplePlaceholderHi: string;
}
