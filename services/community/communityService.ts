/**
 * Project Pulse — Pulse Community Service
 * Manages small structured peer groups, posts, reactions, comments, reports, and member profiles.
 */

import { prisma } from "@/lib/db";
import {
  CommunityCategory,
  PostCategory,
  ReactionType,
  ReportCategory,
  ModeratorActionType,
  GroupDTO,
  PostDTO,
  CommentDTO,
  ReportDTO,
  HeldContentDTO,
  DailyActivityPrompt,
} from "./types";
import { screenCommunityContent, logCommunityAudit } from "./moderationService";

// Standard prompt activities for members
export const DAILY_COMMUNITY_ACTIVITIES: DailyActivityPrompt[] = [
  {
    id: "win-this-week",
    title: "Share one small win this week",
    titleHi: "इस सप्ताह की कोई एक छोटी उपलब्धि साझा करें",
    description: "Whether it was a 10-minute post-dinner walk or choosing water over soda, every step matters.",
    descriptionHi: "चाहे वह खाने के बाद 10 मिनट की सैर हो या मीठे पेय की जगह पानी पीना—हर छोटा कदम मायने रखता है।",
    targetCategory: "DAILY_WIN",
    samplePlaceholder: "I managed to take a short walk after dinner today...",
    samplePlaceholderHi: "आज मैंने रात के खाने के बाद 15 मिनट टहलने का समय निकाला...",
  },
  {
    id: "movement-routine",
    title: "How do you fit movement into a busy day?",
    titleHi: "व्यस्त दिन में आप चलने-फिरने का समय कैसे निकालते हैं?",
    description: "Share practical routines that work during work hours, household chores, or family life.",
    descriptionHi: "काम के घंटों या घरेलू जिम्मेदारियों के बीच चलने-फिरने के अपने व्यावहारिक तरीके बताएं।",
    targetCategory: "ROUTINE_IDEA",
    samplePlaceholder: "I take stairs at work and walk while taking phone calls...",
    samplePlaceholderHi: "मैं फोन पर बात करते समय टहलता हूँ...",
  },
  {
    id: "budget-meal",
    title: "Affordable and balanced home food ideas",
    titleHi: "किफायती और संतुलित घरेलू भोजन के विचार",
    description: "Exchange everyday tips for making simple daal, sabzi, and whole grains nutritious without extra expense.",
    descriptionHi: "दाल, हरी सब्ज़ियाँ और साबुत अनाज को बिना अतिरिक्त खर्च के संतुलित बनाने के अनुभव।",
    targetCategory: "ROUTINE_IDEA",
    samplePlaceholder: "Adding grated cucumber and tomatoes to curd makes a great low-cost side...",
    samplePlaceholderHi: "दही में ककड़ी और खीरा मिलाकर रायता बनाना बहुत आसान और पौष्टिक है...",
  },
  {
    id: "habit-reflection",
    title: "Reflect on a habit that was easier this week",
    titleHi: "उस आदत पर विचार करें जिसे निभाना इस हफ्ते आसान लगा",
    description: "Building sustainable habits takes time. What feels a little more natural now?",
    descriptionHi: "स्थायी आदतें बनने में समय लगता है। अब कौन सा नियम थोड़ा सहज महसूस हो रहा है?",
    targetCategory: "MOTIVATION",
    samplePlaceholder: "Drinking a glass of water first thing in the morning feels natural now...",
    samplePlaceholderHi: "सुबह उठते ही एक गिलास पानी पीना अब स्वाभाविक लगता है...",
  },
  {
    id: "journey-welcome",
    title: "Encourage someone starting their 90-day journey",
    titleHi: "अपनी 90-दिवसीय यात्रा शुरू करने वाले किसी साथी का हौसला बढ़ाएं",
    description: "A kind word can make a big difference for someone starting out today.",
    descriptionHi: "एक मददगार और सकारात्मक बात किसी नए साथी की शुरुआत को आसान बना सकती है।",
    targetCategory: "MOTIVATION",
    samplePlaceholder: "Take it one day at a time. Consistency beats perfection...",
    samplePlaceholderHi: "एक दिन में एक ही कदम उठाएं। पूर्णता से अधिक निरंतरता महत्वपूर्ण है...",
  },
];

// Seed templates for initial structured peer groups
const DEFAULT_GROUPS = [
  {
    slug: "building-healthy-habits",
    name: "Building Healthy Habits",
    nameHi: "स्वस्थ आदतें बनाना",
    description: "Focus on small, sustainable daily routines that stick for the long term.",
    descriptionHi: "छोटी और टिकाऊ दैनिक आदतों पर ध्यान केंद्रित करें जो लंबे समय तक साथ दें।",
    purpose: "Support members in making small lifestyle changes without feeling overwhelmed.",
    rules: JSON.stringify([
      "Encourage small daily steps.",
      "Celebrate consistency over perfection.",
      "No unsolicited medication advice.",
    ]),
    language: "bilingual",
    category: "HABITS" as CommunityCategory,
    memberLimit: 15,
  },
  {
    slug: "everyday-t2d",
    name: "Everyday Life With Type 2 Diabetes",
    nameHi: "टाइप 2 डायबिटीज के साथ दैनिक जीवन",
    description: "Navigating family meals, travel, work schedules, and everyday moments.",
    descriptionHi: "पारिवारिक भोजन, यात्रा, दफ्तर और दैनिक जीवन की चुनौतियों को साझा करें।",
    purpose: "A calm space to share how you handle everyday situations with diabetes.",
    rules: JSON.stringify([
      "Respect each other's individual paths.",
      "Personal experiences only, not clinical prescriptions.",
    ]),
    language: "bilingual",
    category: "DAILY_LIVING" as CommunityCategory,
    memberLimit: 15,
  },
  {
    slug: "healthy-eating-budget",
    name: "Healthy Eating on a Budget",
    nameHi: "किफायती और संतुलित खान-पान",
    description: "Simple, affordable meal ideas using local vegetables, whole pulses, and pantry staples.",
    descriptionHi: "स्थानीय सब्ज़ियों, दालों और सामान्य राशन से संतुलित भोजन के आसान उपाय।",
    purpose: "Exchange practical, budget-conscious meal ideas without expensive exotic ingredients.",
    rules: JSON.stringify([
      "Focus on accessible, everyday Indian grocery items.",
      "No extreme starvation or crash diets.",
    ]),
    language: "bilingual",
    category: "NUTRITION" as CommunityCategory,
    memberLimit: 15,
  },
  {
    slug: "walking-physical-activity",
    name: "Walking and Physical Activity",
    nameHi: "पैदल चलना और शारीरिक सक्रियता",
    description: "Encouraging daily steps, gentle post-meal walks, and staying active at your own pace.",
    descriptionHi: "रोजाना कदम बढ़ाना, भोजन के बाद हल्की सैर और अपनी गति से सक्रिय रहना।",
    purpose: "Motivate each other to move more throughout the day safely.",
    rules: JSON.stringify([
      "Listen to your body and medical restrictions.",
      "Every step counts — no competitive pressure.",
    ]),
    language: "bilingual",
    category: "ACTIVITY" as CommunityCategory,
    memberLimit: 15,
  },
  {
    slug: "sleep-daily-routines",
    name: "Sleep and Daily Routines",
    nameHi: "नींद और दैनिक दिनचर्या",
    description: "Practical habits for winding down, consistent bedtime, and morning energy.",
    descriptionHi: "समय पर सोने, शांतिपूर्ण नींद और सुबह ताजगी महसूस करने की व्यावहारिक आदतें।",
    purpose: "Discuss how sleep patterns affect daily energy and well-being.",
    rules: JSON.stringify([
      "Share wind-down routines.",
      "Be gentle and supportive.",
    ]),
    language: "bilingual",
    category: "ROUTINES" as CommunityCategory,
    memberLimit: 12,
  },
  {
    slug: "staying-motivated",
    name: "Staying Motivated",
    nameHi: "प्रेरणा और निरंतरता बनाए रखना",
    description: "Overcoming burnout, picking back up after off-track days, and mutual encouragement.",
    descriptionHi: "उदासी से उबरना, दिनचर्या छूटने पर फिर से शुरू करना और एक-दूसरे का हौसला बढ़ाना।",
    purpose: "Empathetic emotional support when habit management feels challenging.",
    rules: JSON.stringify([
      "Judgment-free zone.",
      "Off-track days are normal; encourage restarting.",
    ]),
    language: "bilingual",
    category: "MOTIVATION" as CommunityCategory,
    memberLimit: 15,
  },
  {
    slug: "starting-90-day-journey",
    name: "Starting My 90-Day Journey",
    nameHi: "मेरी 90-दिवसीय यात्रा की शुरुआत",
    description: "For members in their first few weeks of the Project Pulse program.",
    descriptionHi: "प्रोजेक्ट पल्स कार्यक्रम के अपने शुरुआती हफ्तों में शामिल सदस्यों के लिए।",
    purpose: "Ask beginner questions and celebrate getting started.",
    rules: JSON.stringify([
      "Welcoming and warm to newcomers.",
      "No clinical diagnosing.",
    ]),
    language: "bilingual",
    category: "JOURNEY_90" as CommunityCategory,
    memberLimit: 10,
  },
  {
    slug: "hindi-speaking-community",
    name: "Hindi-Speaking Community",
    nameHi: "हिंदी भाषी समुदाय",
    description: "मातृभाषा में अनुभव, खान-पान की आदतें और रोज़मर्रा की बातचीत साझा करें।",
    descriptionHi: "मातृभाषा में अनुभव, खान-पान की आदतें और रोज़मर्रा की बातचीत साझा करें।",
    purpose: "एक सहज और आत्मीय मंच जहाँ सदस्य हिंदी में बेझिझक अपने अनुभव बांट सकें।",
    rules: JSON.stringify([
      "सम्मानपूर्वक बातचीत करें।",
      "दवाइयों की सलाह न दें, केवल अनुभव साझा करें।",
    ]),
    language: "hi",
    category: "HINDI" as CommunityCategory,
    memberLimit: 15,
  },
];

/**
 * Ensure default groups and demo discussions exist.
 */
export async function ensureDefaultGroupsAndDemo(): Promise<void> {
  for (const g of DEFAULT_GROUPS) {
    const existing = await prisma.communityGroup.findUnique({
      where: { slug: g.slug },
    });
    if (!existing) {
      await prisma.communityGroup.create({
        data: {
          slug: g.slug,
          name: g.name,
          nameHi: g.nameHi,
          description: g.description,
          descriptionHi: g.descriptionHi,
          purpose: g.purpose,
          rules: g.rules,
          language: g.language,
          category: g.category,
          memberLimit: g.memberLimit,
          approvalRequired: false,
          status: "ACTIVE",
          isDemo: true,
        },
      });
    }
  }

  // Seed sample demo discussions if group is empty
  const habitGroup = await prisma.communityGroup.findUnique({
    where: { slug: "building-healthy-habits" },
  });
  if (habitGroup) {
    const postCount = await prisma.communityPost.count({
      where: { groupId: habitGroup.id },
    });
    if (postCount === 0) {
      // Find or create demo seed user
      let demoUser = await prisma.user.findFirst({
        where: { email: "demo-patient@pulse.internal" },
      });
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            email: "demo-patient@pulse.internal",
            name: "Sunita Sharma",
            passwordHash: "$2a$10$demoHashForFictionalUserOnlyDoNotUse12345",
            role: "PATIENT",
            preferredLang: "hi",
          },
        });
      }

      // Ensure demo user has CommunityProfile
      await prisma.communityProfile.upsert({
        where: { userId: demoUser.id },
        create: {
          userId: demoUser.id,
          displayName: "Sunita S.",
          bio: "Managing type 2 diabetes with small daily steps.",
          preferredLang: "hi",
          interests: JSON.stringify(["HABITS", "ACTIVITY"]),
        },
        update: {},
      });

      // Join group
      await prisma.groupMembership.upsert({
        where: {
          groupId_userId: {
            groupId: habitGroup.id,
            userId: demoUser.id,
          },
        },
        create: {
          groupId: habitGroup.id,
          userId: demoUser.id,
          role: "MEMBER",
          status: "ACTIVE",
        },
        update: {},
      });

      // Create sample demo post
      const samplePost = await prisma.communityPost.create({
        data: {
          groupId: habitGroup.id,
          authorId: demoUser.id,
          content: "I managed to go for a 15-minute walk after dinner tonight! Finding small pockets of time rather than trying to do 45 minutes at once has really helped me stay consistent.",
          language: "en",
          category: "DAILY_WIN",
          moderationStatus: "APPROVED",
          isDemo: true,
        },
      });

      // Sample comment
      await prisma.communityComment.create({
        data: {
          postId: samplePost.id,
          authorId: demoUser.id,
          content: "That is wonderful Sunita! Breaking it into smaller 10-15 minute blocks worked for me too.",
          moderationStatus: "APPROVED",
          isDemo: true,
        },
      });

      // Sample reaction
      await prisma.postReaction.create({
        data: {
          postId: samplePost.id,
          userId: demoUser.id,
          type: "CELEBRATE",
        },
      });
    }
  }
}

/**
 * Get or create patient community profile with safe display name.
 */
export async function getOrCreateCommunityProfile(userId: string, defaultName?: string) {
  let profile = await prisma.communityProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, preferredLang: true, role: true },
    });
    const displayName = defaultName || (user?.name ? `${user.name.split(" ")[0]} ${(user.name.split(" ")[1] || "")[0] || ""}.`.trim() : "Member");

    profile = await prisma.communityProfile.create({
      data: {
        userId,
        displayName: displayName || "Member",
        preferredLang: user?.preferredLang || "hi",
        isModerator: user?.role === "ADMIN",
      },
    });
  }

  return profile;
}

/**
 * List all structured groups with membership stats and join state for user.
 */
export async function listCommunityGroups(userId?: string, category?: string, language?: string): Promise<GroupDTO[]> {
  await ensureDefaultGroupsAndDemo();

  const whereClause: Record<string, unknown> = {
    status: "ACTIVE",
  };
  if (category && category !== "ALL") {
    whereClause.category = category;
  }
  if (language && language !== "ALL") {
    whereClause.language = language;
  }

  const groups = await prisma.communityGroup.findMany({
    where: whereClause,
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        select: { userId: true, role: true, notificationsMuted: true },
      },
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return groups.map((g) => {
    let rules: string[] = [];
    try {
      rules = JSON.parse(g.rules || "[]");
    } catch {
      rules = [];
    }

    const userMembership = userId ? g.memberships.find((m) => m.userId === userId) : null;

    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      nameHi: g.nameHi,
      description: g.description,
      descriptionHi: g.descriptionHi,
      purpose: g.purpose,
      rules,
      language: g.language as "hi" | "en" | "bilingual",
      category: g.category as CommunityCategory,
      memberLimit: g.memberLimit,
      approvalRequired: g.approvalRequired,
      status: g.status as "ACTIVE" | "ARCHIVED",
      isDemo: g.isDemo,
      createdAt: g.createdAt.toISOString(),
      memberCount: g._count.memberships,
      isJoined: Boolean(userMembership),
      userRole: userMembership?.role || null,
      notificationsMuted: userMembership?.notificationsMuted || false,
    };
  });
}

/**
 * Get detailed group by slug or ID with recent posts.
 */
export async function getGroupDetails(groupIdOrSlug: string, userId?: string): Promise<GroupDTO | null> {
  const group = await prisma.communityGroup.findFirst({
    where: {
      OR: [{ id: groupIdOrSlug }, { slug: groupIdOrSlug }],
    },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        select: { userId: true, role: true, notificationsMuted: true },
      },
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });

  if (!group) return null;

  let rules: string[] = [];
  try {
    rules = JSON.parse(group.rules || "[]");
  } catch {
    rules = [];
  }

  const userMembership = userId ? group.memberships.find((m) => m.userId === userId) : null;

  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    nameHi: group.nameHi,
    description: group.description,
    descriptionHi: group.descriptionHi,
    purpose: group.purpose,
    rules,
    language: group.language as "hi" | "en" | "bilingual",
    category: group.category as CommunityCategory,
    memberLimit: group.memberLimit,
    approvalRequired: group.approvalRequired,
    status: group.status as "ACTIVE" | "ARCHIVED",
    isDemo: group.isDemo,
    createdAt: group.createdAt.toISOString(),
    memberCount: group._count.memberships,
    isJoined: Boolean(userMembership),
    userRole: userMembership?.role || null,
    notificationsMuted: userMembership?.notificationsMuted || false,
  };
}

/**
 * Join a group while respecting member limit and approval requirements.
 */
export async function joinCommunityGroup(groupIdOrSlug: string, userId: string): Promise<{ success: boolean; message: string }> {
  const group = await prisma.communityGroup.findFirst({
    where: { OR: [{ id: groupIdOrSlug }, { slug: groupIdOrSlug }] },
    include: {
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  // Check group member limit
  if (group._count.memberships >= group.memberLimit) {
    throw new Error(`This peer group has reached its supportive limit of ${group.memberLimit} members. Please explore another group.`);
  }

  const existing = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId,
      },
    },
  });

  if (existing && existing.status === "ACTIVE") {
    return { success: true, message: "Already an active member" };
  }

  const newStatus = group.approvalRequired ? "PENDING_APPROVAL" : "ACTIVE";

  await prisma.groupMembership.upsert({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId,
      },
    },
    create: {
      groupId: group.id,
      userId,
      role: "MEMBER",
      status: newStatus,
    },
    update: {
      status: newStatus,
      leftAt: null,
      joinedAt: new Date(),
    },
  });

  await logCommunityAudit(userId, "GROUP_JOINED", { groupId: group.id, groupSlug: group.slug });

  return {
    success: true,
    message: newStatus === "ACTIVE" ? "Joined group successfully" : "Membership request submitted for moderator review",
  };
}

/**
 * Leave a group.
 */
export async function leaveCommunityGroup(groupIdOrSlug: string, userId: string): Promise<boolean> {
  const group = await prisma.communityGroup.findFirst({
    where: { OR: [{ id: groupIdOrSlug }, { slug: groupIdOrSlug }] },
  });
  if (!group) return false;

  await prisma.groupMembership.updateMany({
    where: { groupId: group.id, userId },
    data: {
      status: "LEFT",
      leftAt: new Date(),
    },
  });

  await logCommunityAudit(userId, "GROUP_LEFT", { groupId: group.id });
  return true;
}

/**
 * Mute / unmute notifications for a group.
 */
export async function toggleGroupNotifications(groupIdOrSlug: string, userId: string): Promise<boolean> {
  const group = await prisma.communityGroup.findFirst({
    where: { OR: [{ id: groupIdOrSlug }, { slug: groupIdOrSlug }] },
  });
  if (!group) return false;

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (!membership) return false;

  const updated = await prisma.groupMembership.update({
    where: { id: membership.id },
    data: { notificationsMuted: !membership.notificationsMuted },
  });

  return updated.notificationsMuted;
}

/**
 * List posts (from joined groups or discovery feed).
 */
export async function listPosts(options: {
  userId?: string;
  groupId?: string;
  category?: string;
  onlyJoined?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<PostDTO[]> {
  const { userId, groupId, category, onlyJoined = false, limit = 20 } = options;

  const whereClause: Record<string, unknown> = {
    deletedAt: null,
    moderationStatus: "APPROVED",
  };

  if (groupId) {
    const matchedGroup = await prisma.communityGroup.findFirst({
      where: { OR: [{ id: groupId }, { slug: groupId }] },
      select: { id: true },
    });
    whereClause.groupId = matchedGroup ? matchedGroup.id : groupId;
  } else if (onlyJoined && userId) {
    const joinedGroups = await prisma.groupMembership.findMany({
      where: { userId, status: "ACTIVE" },
      select: { groupId: true },
    });
    whereClause.groupId = { in: joinedGroups.map((g) => g.groupId) };
  }

  if (category && category !== "ALL") {
    whereClause.category = category;
  }

  const posts = await prisma.communityPost.findMany({
    where: whereClause,
    include: {
      group: { select: { id: true, name: true, slug: true } },
      author: {
        select: {
          id: true,
          communityProfile: { select: { displayName: true, avatarUrl: true, isModerator: true } },
        },
      },
      reactions: { select: { type: true, userId: true } },
      _count: { select: { comments: { where: { deletedAt: null, moderationStatus: "APPROVED" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return posts.map((p) => {
    const reactionCounts: Record<string, number> = { HELPFUL: 0, SUPPORTIVE: 0, CELEBRATE: 0 };
    let userReaction: ReactionType | null = null;

    for (const r of p.reactions) {
      if (reactionCounts[r.type] !== undefined) {
        reactionCounts[r.type]++;
      }
      if (userId && r.userId === userId) {
        userReaction = r.type as ReactionType;
      }
    }

    return {
      id: p.id,
      groupId: p.groupId,
      groupName: p.group.name,
      groupSlug: p.group.slug,
      authorId: p.authorId,
      authorDisplayName: p.author.communityProfile?.displayName || "Member",
      authorAvatarUrl: p.author.communityProfile?.avatarUrl || null,
      authorIsModerator: p.author.communityProfile?.isModerator || false,
      content: p.content,
      language: p.language,
      category: p.category as PostCategory,
      moderationStatus: p.moderationStatus as any,
      moderationReason: p.moderationReason,
      isDemo: p.isDemo,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      reactions: reactionCounts as any,
      userReaction,
      commentCount: p._count.comments,
      isAuthor: userId ? p.authorId === userId : false,
    };
  });
}

/**
 * Create a new post in a group with automated safety screening.
 */
export async function createCommunityPost(data: {
  userId: string;
  groupIdOrSlug: string;
  content: string;
  category?: PostCategory;
  language?: string;
}): Promise<{ post: PostDTO; screening: any }> {
  const { userId, groupIdOrSlug, content, category = "PERSONAL_EXPERIENCE", language = "hi" } = data;

  const group = await prisma.communityGroup.findFirst({
    where: { OR: [{ id: groupIdOrSlug }, { slug: groupIdOrSlug }] },
  });
  if (!group) {
    throw new Error("Group not found");
  }

  // Verify membership
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    // If not joined, join automatically if group is open
    if (!group.approvalRequired) {
      await joinCommunityGroup(group.id, userId);
    } else {
      throw new Error("You must be an approved member of this group to post discussions.");
    }
  }

  // Ensure user has community profile
  const profile = await getOrCreateCommunityProfile(userId);
  if (profile.isRestricted) {
    throw new Error("Your community participation is currently restricted by a moderator.");
  }

  // Run automated safety screening
  const screening = await screenCommunityContent(content);

  const post = await prisma.communityPost.create({
    data: {
      groupId: group.id,
      authorId: userId,
      content: content.trim(),
      language,
      category,
      moderationStatus: screening.status,
      moderationReason: screening.flagReason,
      isDemo: false,
    },
    include: {
      group: { select: { id: true, name: true, slug: true } },
      author: {
        select: {
          id: true,
          communityProfile: { select: { displayName: true, avatarUrl: true, isModerator: true } },
        },
      },
    },
  });

  // If held for review, create notification for user and moderation report
  if (screening.status === "HELD_FOR_REVIEW") {
    await prisma.communityNotification.create({
      data: {
        userId,
        type: "POST_HELD",
        title: "Post held for brief safety review",
        body: "To keep our community safe, your post is undergoing a quick moderator review before appearing in the group.",
        linkUrl: `/community/groups/${group.slug}`,
      },
    });

    await prisma.communityReport.create({
      data: {
        reporterId: userId,
        contentType: "POST",
        contentId: post.id,
        postId: post.id,
        category: screening.isDangerousMedicalAdvice ? "DANGEROUS_MEDICAL_ADVICE" : "OTHER",
        description: `Automated screening hold: ${screening.flagReason || "Flagged by safety engine"}`,
        status: "PENDING",
      },
    });
  }

  await logCommunityAudit(userId, "POST_CREATED", {
    postId: post.id,
    groupId: group.id,
    status: screening.status,
  });

  const postDto: PostDTO = {
    id: post.id,
    groupId: post.groupId,
    groupName: post.group.name,
    groupSlug: post.group.slug,
    authorId: post.authorId,
    authorDisplayName: post.author.communityProfile?.displayName || "Member",
    authorAvatarUrl: post.author.communityProfile?.avatarUrl || null,
    authorIsModerator: post.author.communityProfile?.isModerator || false,
    content: post.content,
    language: post.language,
    category: post.category as PostCategory,
    moderationStatus: post.moderationStatus as any,
    moderationReason: post.moderationReason,
    isDemo: post.isDemo,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    reactions: { HELPFUL: 0, SUPPORTIVE: 0, CELEBRATE: 0 },
    userReaction: null,
    commentCount: 0,
    isAuthor: true,
  };

  return { post: postDto, screening };
}

/**
 * Add a comment to an approved post.
 */
export async function addComment(data: {
  userId: string;
  postId: string;
  content: string;
}): Promise<{ comment: CommentDTO; screening: any }> {
  const { userId, postId, content } = data;

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: { group: true },
  });
  if (!post || post.deletedAt || post.moderationStatus !== "APPROVED") {
    throw new Error("Post not found or unavailable");
  }

  const profile = await getOrCreateCommunityProfile(userId);
  if (profile.isRestricted) {
    throw new Error("Your community participation is restricted.");
  }

  const screening = await screenCommunityContent(content);

  const comment = await prisma.communityComment.create({
    data: {
      postId,
      authorId: userId,
      content: content.trim(),
      moderationStatus: screening.status,
      moderationReason: screening.flagReason,
      isDemo: false,
    },
    include: {
      author: {
        select: {
          id: true,
          communityProfile: { select: { displayName: true, avatarUrl: true, isModerator: true } },
        },
      },
    },
  });

  // Notify post author if different
  if (screening.status === "APPROVED" && post.authorId !== userId) {
    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: post.groupId, userId: post.authorId } },
    });

    if (!membership?.notificationsMuted) {
      await prisma.communityNotification.create({
        data: {
          userId: post.authorId,
          type: "NEW_COMMENT",
          title: "New supportive reply",
          body: `${profile.displayName} replied to your post in ${post.group.name}.`,
          linkUrl: `/community/groups/${post.group.slug}`,
        },
      });
    }
  }

  const commentDto: CommentDTO = {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    authorDisplayName: comment.author.communityProfile?.displayName || "Member",
    authorAvatarUrl: comment.author.communityProfile?.avatarUrl || null,
    authorIsModerator: comment.author.communityProfile?.isModerator || false,
    content: comment.content,
    moderationStatus: comment.moderationStatus as any,
    isDemo: comment.isDemo,
    createdAt: comment.createdAt.toISOString(),
    isAuthor: true,
  };

  return { comment: commentDto, screening };
}

/**
 * List comments for a post.
 */
export async function listComments(postId: string, userId?: string): Promise<CommentDTO[]> {
  const comments = await prisma.communityComment.findMany({
    where: {
      postId,
      deletedAt: null,
      moderationStatus: "APPROVED",
    },
    include: {
      author: {
        select: {
          id: true,
          communityProfile: { select: { displayName: true, avatarUrl: true, isModerator: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((c) => ({
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    authorDisplayName: c.author.communityProfile?.displayName || "Member",
    authorAvatarUrl: c.author.communityProfile?.avatarUrl || null,
    authorIsModerator: c.author.communityProfile?.isModerator || false,
    content: c.content,
    moderationStatus: c.moderationStatus as any,
    isDemo: c.isDemo,
    createdAt: c.createdAt.toISOString(),
    isAuthor: userId ? c.authorId === userId : false,
  }));
}

/**
 * Toggle a reaction on a post.
 */
export async function togglePostReaction(postId: string, userId: string, type: ReactionType) {
  const existing = await prisma.postReaction.findUnique({
    where: {
      postId_userId_type: { postId, userId, type },
    },
  });

  if (existing) {
    // Remove reaction
    await prisma.postReaction.delete({ where: { id: existing.id } });
    return { reacted: false, currentType: null };
  } else {
    // Remove any other reaction by this user on this post first (single reaction per post)
    await prisma.postReaction.deleteMany({
      where: { postId, userId },
    });

    await prisma.postReaction.create({
      data: { postId, userId, type },
    });

    return { reacted: true, currentType: type };
  }
}

/**
 * Report a post or comment.
 * Reporter identity is strictly protected from other members.
 */
export async function reportContent(data: {
  reporterId: string;
  contentType: "POST" | "COMMENT";
  contentId: string;
  category: ReportCategory;
  description?: string;
}): Promise<{ success: boolean; reportId: string }> {
  const { reporterId, contentType, contentId, category, description } = data;

  const report = await prisma.communityReport.create({
    data: {
      reporterId,
      contentType,
      contentId,
      postId: contentType === "POST" ? contentId : null,
      commentId: contentType === "COMMENT" ? contentId : null,
      category,
      description: description?.trim() || null,
      status: "PENDING",
    },
  });

  await logCommunityAudit(reporterId, "REPORT_FILED", {
    reportId: report.id,
    contentType,
    contentId,
    category,
  });

  return { success: true, reportId: report.id };
}

/**
 * Get pending reports & held items for moderator dashboard.
 */
export async function getModerationQueue(): Promise<{
  reports: ReportDTO[];
  heldContent: HeldContentDTO[];
}> {
  const pendingReports = await prisma.communityReport.findMany({
    where: { status: "PENDING" },
    include: {
      post: {
        include: {
          author: { select: { communityProfile: { select: { displayName: true } } } },
        },
      },
      comment: {
        include: {
          author: { select: { communityProfile: { select: { displayName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const reports: ReportDTO[] = pendingReports.map((r) => {
    const authorName =
      r.post?.author.communityProfile?.displayName ||
      r.comment?.author.communityProfile?.displayName ||
      "Member";
    const snippet = r.post?.content || r.comment?.content || "Content unavailable";

    return {
      id: r.id,
      contentType: r.contentType as "POST" | "COMMENT",
      contentId: r.contentId,
      contentSnippet: snippet.slice(0, 150),
      authorDisplayName: authorName,
      category: r.category as ReportCategory,
      description: r.description,
      status: r.status as any,
      createdAt: r.createdAt.toISOString(),
    };
  });

  const heldPosts = await prisma.communityPost.findMany({
    where: { moderationStatus: "HELD_FOR_REVIEW", deletedAt: null },
    include: {
      group: { select: { name: true } },
      author: { select: { communityProfile: { select: { displayName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const heldContent: HeldContentDTO[] = heldPosts.map((hp) => ({
    id: hp.id,
    type: "POST",
    groupName: hp.group.name,
    authorDisplayName: hp.author.communityProfile?.displayName || "Member",
    content: hp.content,
    flagReason: hp.moderationReason,
    createdAt: hp.createdAt.toISOString(),
  }));

  return { reports, heldContent };
}

/**
 * Execute moderator action with mandatory audit logging and reason.
 */
export async function executeModeratorAction(data: {
  moderatorId: string;
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
  actionType: ModeratorActionType;
  reason: string;
  reportId?: string;
}): Promise<boolean> {
  const { moderatorId, targetType, targetId, actionType, reason, reportId } = data;

  if (!reason || reason.trim().length < 5) {
    throw new Error("A valid explanatory reason is required for moderation actions.");
  }

  // Record action
  await prisma.moderationAction.create({
    data: {
      moderatorId,
      targetType,
      targetId,
      actionType,
      reason: reason.trim(),
      reportId: reportId || null,
    },
  });

  // Apply changes to target
  if (targetType === "POST") {
    if (actionType === "APPROVE") {
      await prisma.communityPost.update({
        where: { id: targetId },
        data: { moderationStatus: "APPROVED", moderationReason: null },
      });
    } else if (actionType === "REMOVE") {
      await prisma.communityPost.update({
        where: { id: targetId },
        data: { moderationStatus: "REMOVED", deletedAt: new Date() },
      });
    }
  } else if (targetType === "COMMENT") {
    if (actionType === "APPROVE") {
      await prisma.communityComment.update({
        where: { id: targetId },
        data: { moderationStatus: "APPROVED", moderationReason: null },
      });
    } else if (actionType === "REMOVE") {
      await prisma.communityComment.update({
        where: { id: targetId },
        data: { moderationStatus: "REMOVED", deletedAt: new Date() },
      });
    }
  } else if (targetType === "USER" && actionType === "RESTRICT_USER") {
    await prisma.communityProfile.updateMany({
      where: { userId: targetId },
      data: { isRestricted: true },
    });
  }

  // If tied to report, resolve it
  if (reportId) {
    await prisma.communityReport.update({
      where: { id: reportId },
      data: {
        status: actionType === "DISMISS_REPORT" ? "DISMISSED" : "RESOLVED",
        resolvedAt: new Date(),
        resolvedById: moderatorId,
        resolutionNotes: reason.trim(),
      },
    });
  }

  await logCommunityAudit(moderatorId, "MODERATION_ACTION", {
    targetType,
    targetId,
    actionType,
    reason,
  });

  return true;
}

/**
 * Delete a post (by its author or an admin).
 */
export async function deletePost(postId: string, userId: string, isAdmin = false): Promise<boolean> {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
  });
  if (!post) return false;

  if (post.authorId !== userId && !isAdmin) {
    throw new Error("Unauthorized: You can only delete your own posts.");
  }

  await prisma.communityPost.update({
    where: { id: postId },
    data: { deletedAt: new Date(), moderationStatus: "REMOVED" },
  });

  await logCommunityAudit(userId, "POST_DELETED", { postId });
  return true;
}
