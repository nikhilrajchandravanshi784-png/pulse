import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function resolveCommunityUser() {
  const session = await getSession();
  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { communityProfile: true },
    });
    if (user) {
      return {
        user,
        userId: user.id,
        isGuest: false,
        isModerator: user.role === "ADMIN" || Boolean(user.communityProfile?.isModerator),
      };
    }
  }

  // If unauthenticated and DEMO_MODE is true, find or fallback to demo patient
  if (env.DEMO_MODE === "true") {
    let demo = await prisma.user.findFirst({
      where: { email: "demo-patient@pulse.internal" },
      include: { communityProfile: true },
    });
    if (!demo) {
      demo = await prisma.user.findFirst({
        where: { role: "PATIENT" },
        include: { communityProfile: true },
      });
    }
    if (demo) {
      return {
        user: demo,
        userId: demo.id,
        isGuest: true,
        isModerator: demo.role === "ADMIN" || Boolean(demo.communityProfile?.isModerator),
      };
    }
  }

  return null;
}
