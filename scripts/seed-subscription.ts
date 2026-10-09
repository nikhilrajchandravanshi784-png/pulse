import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const PULSE_PREMIUM_FEATURES = [
  {
    category: "Personalized Health Dashboard",
    icon: "LayoutDashboard",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "View a consolidated overview of your health-support activities.",
      "See your active goals, check-in status, and relevant progress summaries.",
      "Access connected modules from one place.",
      "Review relevant upcoming activities and appointments where available.",
    ],
  },
  {
    category: "Pulse Plan — Personalized Goals",
    icon: "Target",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Create manageable daily and weekly wellness goals.",
      "Organize goals around the patient's existing care plan.",
      "Track goal status and completion.",
      "Request suitable adjustments to nonmedical goals.",
      "View active, paused, and completed goals.",
    ],
  },
  {
    category: "Pulse Check-In",
    icon: "CheckCircle2",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Complete lightweight daily health check-ins.",
      "Record progress on planned routines.",
      "Report common barriers to maintaining habits.",
      "Optionally enter glucose measurements where the feature is implemented.",
      "Review check-in history.",
    ],
  },
  {
    category: "Pulse Food AI",
    icon: "Camera",
    status: "ACTIVE",
    statusLabel: "Active (Groq Vision / Manual Fallback)",
    bullets: [
      "Upload a meal photograph where image recognition is enabled.",
      "Review possible food-recognition results.",
      "Correct detected food items and portion estimates.",
      "View approximate nutrition information when a suitable nutrition source is available.",
      "Save confirmed meals to the food diary.",
      "Review logged meal history and nutrition summaries.",
      "Access manual food logging when image recognition is unavailable.",
    ],
  },
  {
    category: "Pulse Meal Coach",
    icon: "Utensils",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Explore possible meal additions and substitutions.",
      "View practical food-preparation ideas.",
      "Receive suggestions informed by available food preferences and approved educational guidance.",
      "Review explanations and dismiss unsuitable suggestions.",
      "Retain control over all food choices.",
    ],
  },
  {
    category: "Pulse Proactive Care",
    icon: "HeartHandshake",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Receive context-sensitive support for eligible missed routines.",
      "Identify barriers to maintaining goals.",
      "Explore practical recovery suggestions.",
      "Request assistance when needed.",
      "Track recorded routine recovery where the feature is enabled.",
      "Manage notification preferences.",
    ],
  },
  {
    category: "Pulse Coach / Educational Library",
    icon: "BookOpen",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Access available reviewed diabetes education.",
      "Read educational articles in supported languages.",
      "View available source references and review information.",
      "Learn about general food, activity, sleep, and self-management concepts.",
      "Access approved content without treating it as individualized medical advice.",
    ],
  },
  {
    category: "Pulse Community",
    icon: "Users",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Discover available peer-support groups.",
      "Share everyday experiences in eligible groups.",
      "Exchange supportive comments and reactions.",
      "Participate in moderated discussions.",
      "Access community safety controls and reporting features.",
    ],
  },
  {
    category: "Pulse Care Circle",
    icon: "Share2",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Invite eligible family members or caregivers where supported.",
      "Choose which information may be shared.",
      "Review sharing permissions.",
      "Revoke permissions when needed.",
      "Access patient-controlled support features.",
    ],
  },
  {
    category: "Pulse Review and Progress",
    icon: "TrendingUp",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Review saved goal and check-in history.",
      "View available progress trends.",
      "Access weekly summaries where implemented.",
      "Review recorded routine recovery.",
      "Access eligible 90-day progress summaries.",
      "Review valid clinical measurements only when recorded and authorized.",
    ],
  },
  {
    category: "Pulse Learn — Specialist Education",
    icon: "GraduationCap",
    status: "AVAILABLE_WHEN_ENABLED",
    statusLabel: "Available When Enabled",
    bullets: [
      "Browse available education sessions.",
      "View qualified professional profiles where available.",
      "Register for available sessions where scheduling is enabled.",
      "Access assigned educational resources.",
      "Review eligible past-session information.",
    ],
  },
  {
    category: "Pulse Support — Doctor Appointments",
    icon: "Stethoscope",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Browse available verified professionals where configured.",
      "View appointment availability.",
      "Schedule eligible consultations.",
      "Manage upcoming appointments.",
      "Reschedule or cancel appointments under the applicable rules.",
      "Access private meeting information when an eligible appointment and meeting provider are configured.",
      "Review available appointment history.",
    ],
  },
  {
    category: "Patient Profile and Preferences",
    icon: "User",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Manage permitted personal profile information.",
      "Select the preferred language.",
      "Configure available notification settings.",
      "Maintain supported dietary and lifestyle preferences.",
      "Manage account-related settings.",
    ],
  },
  {
    category: "Privacy and Account Controls",
    icon: "ShieldCheck",
    status: "ACTIVE",
    statusLabel: "Fully Active",
    bullets: [
      "Review available consent and sharing controls.",
      "Manage eligible Care Circle permissions.",
      "Access available account privacy settings.",
      "Use available account data-management options.",
    ],
  },
];

async function main() {
  console.log("Seeding Pulse Premium Subscription Plan (₹499 / month INR)...");

  const existingPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Pulse Premium" },
  });

  const planData = {
    name: "Pulse Premium",
    price: 499.0,
    currency: "INR",
    billingInterval: "monthly",
    providerPlanId: "plan_pulse_premium_499",
    active: true,
    description:
      "Access the Project Pulse health-support experience through personalized health goals, daily tracking, food education, peer encouragement, proactive habit support, and healthcare consultation features that are available and enabled on your account.",
    features: JSON.stringify(PULSE_PREMIUM_FEATURES),
  };

  const plan = existingPlan
    ? await prisma.subscriptionPlan.update({
        where: { id: existingPlan.id },
        data: planData,
      })
    : await prisma.subscriptionPlan.create({
        data: planData,
      });

  console.log(`Plan configured: ${plan.name} at ₹${plan.price}/${plan.billingInterval} (${plan.id})`);

  // Ensure demo user Alex Morgan starts as NOT_SUBSCRIBED initially, so the complete checkout flow can be experienced and verified
  const alex = await prisma.user.findFirst({
    where: { email: "alex.morgan@pulsehealth.demo" },
  });

  if (alex) {
    const existingSub = await prisma.userSubscription.findFirst({
      where: { userId: alex.id },
    });

    if (!existingSub) {
      await prisma.userSubscription.create({
        data: {
          userId: alex.id,
          planId: plan.id,
          provider: "razorpay",
          status: "NOT_SUBSCRIBED",
        },
      });
      console.log(`Created initial subscription record for ${alex.name} (Status: NOT_SUBSCRIBED)`);
    } else {
      console.log(`Existing subscription for ${alex.name}: ${existingSub.status}`);
    }
  }

  console.log("Subscription seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
