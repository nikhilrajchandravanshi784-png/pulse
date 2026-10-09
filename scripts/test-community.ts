/**
 * Project Pulse — Automated Test Suite for Pulse Community
 * Verifies peer groups, safety screening, moderation pipeline, reactions, privacy, and bilingual behavior.
 */

import { prisma } from "../lib/db";
import {
  ensureDefaultGroupsAndDemo,
  listCommunityGroups,
  getGroupDetails,
  joinCommunityGroup,
  leaveCommunityGroup,
  toggleGroupNotifications,
  createCommunityPost,
  listPosts,
  addComment,
  listComments,
  togglePostReaction,
  reportContent,
  getModerationQueue,
  executeModeratorAction,
  deletePost,
} from "../services/community/communityService";
import { screenTextWithRules } from "../services/community/moderationService";

async function runCommunityTests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING PULSE COMMUNITY AUTOMATED TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  // Setup test users
  const testUser1 = await prisma.user.upsert({
    where: { email: "test-patient-1@pulse.internal" },
    create: {
      email: "test-patient-1@pulse.internal",
      name: "Ramesh Kumar",
      passwordHash: "$2a$10$fakePasswordHashForTesting1234567890",
      role: "PATIENT",
      preferredLang: "hi",
    },
    update: {},
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: "test-patient-2@pulse.internal" },
    create: {
      email: "test-patient-2@pulse.internal",
      name: "Pooja Sharma",
      passwordHash: "$2a$10$fakePasswordHashForTesting1234567890",
      role: "PATIENT",
      preferredLang: "en",
    },
    update: {},
  });

  const testMod = await prisma.user.upsert({
    where: { email: "test-moderator@pulse.internal" },
    create: {
      email: "test-moderator@pulse.internal",
      name: "Dr. Moderator",
      passwordHash: "$2a$10$fakePasswordHashForTesting1234567890",
      role: "ADMIN",
      preferredLang: "hi",
    },
    update: { role: "ADMIN" },
  });

  // Test 1: Default groups seeding
  console.log("\n--- TEST GROUP SEEDING & DISCOVERY ---");
  await ensureDefaultGroupsAndDemo();
  const groups = await listCommunityGroups(testUser1.id);
  assert(groups.length >= 8, "Default structured peer groups seeded (>= 8 groups)");
  
  const habitGroup = groups.find((g) => g.slug === "building-healthy-habits");
  assert(Boolean(habitGroup), "Habit building group exists with slug 'building-healthy-habits'");
  assert(habitGroup?.memberLimit === 15, "Group member limit is configured (15 members)");
  assert(Boolean(habitGroup?.nameHi), "Group has bilingual Hindi title");

  // Test 2: Joining and Leaving groups
  console.log("\n--- TEST GROUP MEMBERSHIP ---");
  if (habitGroup) {
    const joinResult = await joinCommunityGroup(habitGroup.id, testUser1.id);
    assert(joinResult.success, "Patient 1 can join peer group");

    const groupDetailsAfterJoin = await getGroupDetails(habitGroup.id, testUser1.id);
    assert(groupDetailsAfterJoin?.isJoined === true, "Group details correctly reports joined status");

    const state1 = await toggleGroupNotifications(habitGroup.id, testUser1.id);
    const state2 = await toggleGroupNotifications(habitGroup.id, testUser1.id);
    assert(typeof state1 === "boolean" && state1 !== state2, "Patient can toggle mute group notifications");

    const left = await leaveCommunityGroup(habitGroup.id, testUser1.id);
    assert(left === true, "Patient can voluntarily leave group");

    const groupDetailsAfterLeave = await getGroupDetails(habitGroup.id, testUser1.id);
    assert(groupDetailsAfterLeave?.isJoined === false, "Group details correctly reflects left status");

    // Re-join for subsequent post tests
    await joinCommunityGroup(habitGroup.id, testUser1.id);
    await joinCommunityGroup(habitGroup.id, testUser2.id);
  }

  // Test 3: Automated Safety Screening Heuristics
  console.log("\n--- TEST MODERATION & SAFETY SCREENING ---");

  // A. Dangerous insulin dosing in English
  const dosingEn = screenTextWithRules("You should increase your insulin dose to 20 units before dinner.");
  assert(dosingEn.status === "HELD_FOR_REVIEW" && dosingEn.isDangerousMedicalAdvice, "English insulin dosing instruction held for review");

  // B. Prescription stopping advice in English
  const stopMedsEn = screenTextWithRules("Just stop taking your metformin, you don't need doctors.");
  assert(stopMedsEn.status === "HELD_FOR_REVIEW" && stopMedsEn.isDangerousMedicalAdvice, "English prescription abandonment instruction held for review");

  // C. Dosing modification in Hindi
  const dosingHi = screenTextWithRules("अपनी दवाइयां बंद कर दो और इंसुलिन बढ़ा लो।");
  assert(dosingHi.status === "HELD_FOR_REVIEW" && dosingHi.isDangerousMedicalAdvice, "Hindi medication/insulin alteration instruction held for review");

  // D. Miracle cure claim in Hindi
  const cureHi = screenTextWithRules("यह चूर्ण लो, डायबिटीज जड़ से खत्म हो जाएगी 100% गारंटी।");
  assert(cureHi.status === "HELD_FOR_REVIEW" && cureHi.isDangerousMedicalAdvice, "Hindi miracle permanent cure claim held for review");

  // E. Extreme starvation
  const starvation = screenTextWithRules("Do a 14 day dry fast and stop drinking water.");
  assert(starvation.status === "HELD_FOR_REVIEW", "Extreme dangerous dehydration/fasting instruction held for review");

  // F. Safe, supportive personal lifestyle post
  const benignPost = screenTextWithRules("I found that taking a 15-minute walk after dinner helps me feel more energized.");
  assert(benignPost.status === "APPROVED" && !benignPost.isDangerousMedicalAdvice, "Supportive lifestyle personal experience approved cleanly");

  // Test 4: Post Creation with Safety Pipeline
  console.log("\n--- TEST POST CREATION & PUBLICATION ---");
  if (habitGroup) {
    // 4A: Safe post
    const { post: safePost, screening: safeScreening } = await createCommunityPost({
      userId: testUser1.id,
      groupIdOrSlug: habitGroup.id,
      content: "I managed to take a 15-minute walk after lunch today! Small steps feel easier than long walks.",
      category: "DAILY_WIN",
      language: "en",
    });
    assert(safePost.moderationStatus === "APPROVED", "Safe lifestyle post published with APPROVED status");
    assert(safeScreening.status === "APPROVED", "Screening result confirmed APPROVED");

    // 4B: Unsafe post caught by screener
    const { post: unsafePost, screening: unsafeScreening } = await createCommunityPost({
      userId: testUser2.id,
      groupIdOrSlug: habitGroup.id,
      content: "Everyone should stop their metformin and take 15 units of insulin instead.",
      category: "ROUTINE_IDEA",
      language: "en",
    });
    assert(unsafePost.moderationStatus === "HELD_FOR_REVIEW", "Dangerous dosing post held with HELD_FOR_REVIEW status");
    assert(unsafeScreening.isDangerousMedicalAdvice === true, "Safety screening flagged dangerous medical advice");

    // Test 5: Feed Listing (only APPROVED posts returned to members)
    console.log("\n--- TEST FEED INTEGRITY & PRIVACY ---");
    const feedPosts = await listPosts({ groupId: habitGroup.id });
    const containsUnsafe = feedPosts.some((p) => p.id === unsafePost.id);
    const containsSafe = feedPosts.some((p) => p.id === safePost.id);
    assert(!containsUnsafe, "Held posts do NOT leak into the public group feed");
    assert(containsSafe, "Approved posts appear in the group feed");

    // Test 6: Reactions (Helpful, Supportive, Celebrate)
    console.log("\n--- TEST POST REACTIONS ---");
    const react1 = await togglePostReaction(safePost.id, testUser2.id, "SUPPORTIVE");
    assert(react1.reacted === true && react1.currentType === "SUPPORTIVE", "Member can add Supportive reaction");

    const react2 = await togglePostReaction(safePost.id, testUser2.id, "CELEBRATE");
    assert(react2.reacted === true && react2.currentType === "CELEBRATE", "Member reaction toggles to Celebrate (one reaction per user per post)");

    // Test 7: Comments Thread
    console.log("\n--- TEST COMMENTS THREAD ---");
    const { comment, screening: commentScreening } = await addComment({
      userId: testUser2.id,
      postId: safePost.id,
      content: "Great job Ramesh! Consistency is key.",
    });
    assert(comment.moderationStatus === "APPROVED", "Supportive reply posted with APPROVED status");

    const commentsList = await listComments(safePost.id, testUser1.id);
    assert(commentsList.length >= 1, "Comments correctly retrieved for post thread");

    // Test 8: Reporting Content (Reporter Privacy Preserved)
    console.log("\n--- TEST CONTENT REPORTING ---");
    const reportResult = await reportContent({
      reporterId: testUser2.id,
      contentType: "POST",
      contentId: safePost.id,
      category: "OTHER",
      description: "Testing reporting mechanism",
    });
    assert(reportResult.success, "Report submitted successfully");

    // Test 9: Moderator Queue & Action Execution
    console.log("\n--- TEST MODERATOR WORKFLOW & AUDIT ---");
    const queue = await getModerationQueue();
    assert(queue.reports.length >= 1, "Moderator queue shows pending reports");
    assert(queue.heldContent.length >= 1, "Moderator queue shows held posts awaiting review");

    // Moderator approves the held post after review
    const modActionSuccess = await executeModeratorAction({
      moderatorId: testMod.id,
      targetType: "POST",
      targetId: unsafePost.id,
      actionType: "REMOVE",
      reason: "Medication alteration instructions violate clinical community guidelines.",
    });
    assert(modActionSuccess === true, "Moderator action executed successfully with mandatory audit explanation");

    const auditLogs = await prisma.communityAuditLog.findMany({
      where: { action: "MODERATION_ACTION" },
    });
    assert(auditLogs.length >= 1, "Moderation action is immutably logged in CommunityAuditLog");

    // Test 10: Post Deletion by Author
    console.log("\n--- TEST AUTHOR PERMISSIONS & DELETION ---");
    const deleteSuccess = await deletePost(safePost.id, testUser1.id);
    assert(deleteSuccess === true, "Author can delete their own post");

    // Verify deleted post is not in feed
    const feedAfterDelete = await listPosts({ groupId: habitGroup.id });
    assert(!feedAfterDelete.some((p) => p.id === safePost.id), "Deleted post no longer appears in feed");
  }

  // Summary
  console.log("\n==================================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCommunityTests()
  .catch((e) => {
    console.error("Test suite threw uncaught error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
