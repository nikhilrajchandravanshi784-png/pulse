import { prisma } from "@/lib/db";

export async function getUserCareProgram(userId: string) {
  let program = await prisma.careProgram.findFirst({
    where: { userId, status: "ACTIVE" },
  });

  if (!program) {
    program = await prisma.careProgram.create({
      data: {
        userId,
        name: "Metabolic Restoration & Continuous Health Track",
        description: "12-week precision program designed to stabilize glucose fluctuations, optimize sleep architecture, and increase mitochondrial efficiency through connected wearable telemetry.",
        currentWeek: 2,
        totalWeeks: 12,
        status: "ACTIVE",
        assignedCoach: "Dr. Sarah Lin, MD (Clinical Lead) & Marcus Vance, RD",
        weeklyFocus: "Stabilizing post-breakfast glucose curves with circadian protein timing",
      },
    });
  }

  return program;
}

export async function ensureWelcomeMessages(userId: string) {
  const existingClinician = await prisma.careTeamMessage.findFirst({
    where: { userId, senderRole: "CARE_TEAM" },
  });

  if (!existingClinician) {
    await prisma.careTeamMessage.createMany({
      data: [
        {
          userId,
          senderName: "Dr. Sarah Lin, MD",
          senderRole: "CARE_TEAM",
          content: "Welcome to Pulse! I have reviewed your baseline health profile. As your connected devices stream passive glucose, sleep, and heart rate data, our clinical team will monitor your physiological trends and provide personalized guidance.",
          isCarePlanNote: true,
          read: true,
        },
        {
          userId,
          senderName: "Marcus Vance, RD",
          senderRole: "CARE_TEAM",
          content: "Hi there! I noticed your sleep baseline is over 7.5 hours—that is a great biological foundation. Feel free to message here whenever you have questions about meal timing or activity patterns.",
          isCarePlanNote: false,
          read: true,
        },
      ],
    });
  }
}

export async function getUserMessages(userId: string) {
  await ensureWelcomeMessages(userId);

  return prisma.careTeamMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendUserMessage(userId: string, content: string) {
  await ensureWelcomeMessages(userId);

  const message = await prisma.careTeamMessage.create({
    data: {
      userId,
      senderName: "You",
      senderRole: "PATIENT",
      content,
      read: true,
    },
  });

  return message;
}
