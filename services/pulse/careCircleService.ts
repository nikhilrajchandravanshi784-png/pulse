import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface CaregiverInvitePayload {
  caregiverName: string;
  caregiverEmail: string;
  relationship: string;
  shareGoals: boolean;
  shareCompletedActions: boolean;
  shareReminders: boolean;
  shareEducation: boolean;
  shareWeeklySummary: boolean;
  shareGlucose: boolean; // default false, explicit opt-in
}

export async function inviteCaregiver(patientId: string, payload: CaregiverInvitePayload) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000); // 14 days expiration

  const invitation = await prisma.careCircleInvitation.create({
    data: {
      patientId,
      caregiverName: payload.caregiverName,
      caregiverEmail: payload.caregiverEmail.toLowerCase(),
      relationship: payload.relationship,
      invitationToken: token,
      expiresAt,
      status: "PENDING",
      shareGoals: payload.shareGoals,
      shareCompletedActions: payload.shareCompletedActions,
      shareReminders: payload.shareReminders,
      shareEducation: payload.shareEducation,
      shareWeeklySummary: payload.shareWeeklySummary,
      shareGlucose: payload.shareGlucose,
    },
  });

  // Record consent audit entry
  await prisma.sharingConsent.create({
    data: {
      userId: patientId,
      invitationId: invitation.id,
      permissionScope: JSON.stringify({
        shareGoals: payload.shareGoals,
        shareCompletedActions: payload.shareCompletedActions,
        shareReminders: payload.shareReminders,
        shareEducation: payload.shareEducation,
        shareWeeklySummary: payload.shareWeeklySummary,
        shareGlucose: payload.shareGlucose,
      }),
    },
  });

  return invitation;
}

export async function revokeCaregiverAccess(patientId: string, invitationId: string) {
  const invitation = await prisma.careCircleInvitation.findFirst({
    where: { id: invitationId, patientId },
  });

  if (!invitation) {
    throw new Error("Caregiver invitation not found or unauthorized");
  }

  // Update status to REVOKED
  await prisma.careCircleInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });

  // Mark all related sharing consents as revoked
  await prisma.sharingConsent.updateMany({
    where: { invitationId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  return true;
}

export async function updateCaregiverPermissions(
  patientId: string,
  invitationId: string,
  permissions: {
    shareGoals?: boolean;
    shareCompletedActions?: boolean;
    shareReminders?: boolean;
    shareEducation?: boolean;
    shareWeeklySummary?: boolean;
    shareGlucose?: boolean;
  }
) {
  const invitation = await prisma.careCircleInvitation.findFirst({
    where: { id: invitationId, patientId },
  });

  if (!invitation || invitation.status === "REVOKED") {
    throw new Error("Caregiver invitation not found or revoked");
  }

  const updated = await prisma.careCircleInvitation.update({
    where: { id: invitationId },
    data: permissions,
  });

  // Record sharing consent update
  await prisma.sharingConsent.create({
    data: {
      userId: patientId,
      invitationId,
      permissionScope: JSON.stringify(permissions),
    },
  });

  return updated;
}

export async function getCaregiverViewData(token: string) {
  const invitation = await prisma.careCircleInvitation.findUnique({
    where: { invitationToken: token },
    include: { patient: { include: { profile: true } } },
  });

  if (!invitation) {
    return { valid: false, error: "Invalid caregiver link" };
  }

  if (invitation.status === "REVOKED") {
    return { valid: false, error: "This sharing permission has been revoked by the patient." };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, error: "This invitation link has expired." };
  }

  const patientId = invitation.patientId;
  const result: Record<string, unknown> = {
    valid: true,
    patientName: invitation.patient.name,
    relationship: invitation.relationship,
    caregiverName: invitation.caregiverName,
    permissions: {
      shareGoals: invitation.shareGoals,
      shareCompletedActions: invitation.shareCompletedActions,
      shareReminders: invitation.shareReminders,
      shareEducation: invitation.shareEducation,
      shareWeeklySummary: invitation.shareWeeklySummary,
      shareGlucose: invitation.shareGlucose,
    },
  };

  // Only attach data permitted by patient
  if (invitation.shareGoals) {
    result.goals = await prisma.healthGoal.findMany({
      where: { userId: patientId, status: "ACTIVE" },
      select: { id: true, title: true, titleHindi: true, frequency: true, preferredTime: true },
    });
  }

  if (invitation.shareCompletedActions) {
    result.recentCheckIns = await prisma.dailyCheckIn.findMany({
      where: { userId: patientId },
      orderBy: { date: "desc" },
      take: 5,
      select: { date: true, mood: true, routineStatus: true },
    });
  }

  if (invitation.shareGlucose) {
    result.recentGlucose = await prisma.glucoseEntry.findMany({
      where: { userId: patientId },
      orderBy: { measuredAt: "desc" },
      take: 3,
      select: { value: true, unit: true, context: true, measuredAt: true },
    });
  }

  return result;
}
