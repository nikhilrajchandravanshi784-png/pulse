/**
 * Project Pulse — Proactive Care Authentication Helper
 * Resolves current authenticated session or demo patient user.
 */

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function resolveProactiveUser() {
  const session = await getSession();
  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        patientProfile: true,
        proactivePreference: true,
      },
    });
    if (user) {
      return {
        user,
        userId: user.id,
        role: user.role,
        isGuest: false,
      };
    }
  }

  // Demo mode fallback
  if (env.DEMO_MODE === "true") {
    let demo = await prisma.user.findFirst({
      where: { email: "demo-patient@pulse.internal" },
      include: {
        patientProfile: true,
        proactivePreference: true,
      },
    });

    if (!demo) {
      demo = await prisma.user.findFirst({
        where: { role: "PATIENT" },
        include: {
          patientProfile: true,
          proactivePreference: true,
        },
      });
    }

    if (demo) {
      return {
        user: demo,
        userId: demo.id,
        role: demo.role,
        isGuest: true,
      };
    }
  }

  return null;
}
