import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Project Pulse: Patients, Clinicians, Care Plans, HbA1c, and Educational Library...");

  // 1. Seed Clinician Account: Dr. Rajesh Verma, MD
  const clinicianEmail = "dr.verma@pulsehealth.demo";
  const clinicianHash = await bcrypt.hash("ClinicianPassword123!", 10);

  const clinician = await prisma.user.upsert({
    where: { email: clinicianEmail },
    update: {
      name: "Dr. Rajesh Verma, MD",
      role: "CLINICIAN",
      passwordHash: clinicianHash,
    },
    create: {
      email: clinicianEmail,
      name: "Dr. Rajesh Verma, MD",
      passwordHash: clinicianHash,
      role: "CLINICIAN",
      profile: {
        create: {
          country: "India",
          isOnboarded: true,
          onboardingStep: 6,
        },
      },
      clinicianProfile: {
        create: {
          licenseNumber: "MCI-84729-DEL",
          specialty: "Endocrinology & Diabetology",
          hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
          contactPhone: "+91 98110 23456",
        },
      },
    },
  });
  console.log(`✅ Clinician ready: ${clinician.name} (${clinician.email})`);

  // Ensure ClinicianProfile exists
  await prisma.clinicianProfile.upsert({
    where: { userId: clinician.id },
    update: {},
    create: {
      userId: clinician.id,
      licenseNumber: "MCI-84729-DEL",
      specialty: "Endocrinology & Diabetology",
      hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
      contactPhone: "+91 98110 23456",
    },
  });

  // 2. Seed Demo Patient Account: Alex Morgan
  const patientEmail = "alex.morgan@pulsehealth.demo";
  const patientHash = await bcrypt.hash("DemoPassword123!", 10);

  const patient = await prisma.user.upsert({
    where: { email: patientEmail },
    update: {
      name: "Alex Morgan",
      role: "PATIENT",
      passwordHash: patientHash,
    },
    create: {
      email: patientEmail,
      name: "Alex Morgan",
      passwordHash: patientHash,
      role: "PATIENT",
      profile: {
        create: {
          dateOfBirth: new Date("1988-06-14"),
          biologicalSex: "male",
          heightCm: 178,
          weightKg: 75.4,
          country: "India",
          onboardingStep: 6,
          isOnboarded: true,
        },
      },
    },
  });
  console.log(`✅ Patient ready: ${patient.name} (${patient.email})`);

  // PatientProfile for Project Pulse 90-Day Journey
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000);
  await prisma.patientProfile.upsert({
    where: { userId: patient.id },
    update: {
      diabetesType: "Type 2 Diabetes",
      diagnosisYear: 2021,
      primaryClinicianName: "Dr. Rajesh Verma, MD",
      clinicName: "Pulse Diabetes & Metabolic Care Center",
      programStartDay: ninetyDaysAgo,
      programDayCurrent: 90,
      programStatus: "ACTIVE",
      preferredReminderTime: "08:30",
    },
    create: {
      userId: patient.id,
      diabetesType: "Type 2 Diabetes",
      diagnosisYear: 2021,
      primaryClinicianName: "Dr. Rajesh Verma, MD",
      clinicName: "Pulse Diabetes & Metabolic Care Center",
      programStartDay: ninetyDaysAgo,
      programDayCurrent: 90,
      programStatus: "ACTIVE",
      preferredReminderTime: "08:30",
    },
  });

  // 3. Clinician-Approved Care Plan
  let carePlan = await prisma.carePlan.findFirst({
    where: { patientId: patient.id },
  });

  if (!carePlan) {
    carePlan = await prisma.carePlan.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        title: "90-Day Metabolic & Glucose Stabilization Plan",
        instructions:
          "Maintain daily 15-minute post-meal walk, follow Indian plate method with whole grains and high fiber, self-monitor fasting blood glucose 3x per week.",
        monitoringSchedule: "Fasting 3x/week, 2h post-dinner 2x/week",
        dietGuidance: "Indian plate method: 50% non-starchy vegetables/salad, 25% protein (dal/paneer/eggs), 25% whole grains (multigrain roti/brown rice).",
        activityGuidance: "10-15 minute gentle walk within 30 minutes following main meals.",
        followUpDate: new Date(Date.now() + 14 * 86400 * 1000),
        status: "ACTIVE",
        currentVersion: 1,
      },
    });
    console.log(`✅ Care Plan created: ${carePlan.title}`);
  }

  // 4. SMART Health Goals
  await prisma.healthGoal.deleteMany({ where: { userId: patient.id } });

  const goalWalk = await prisma.healthGoal.create({
    data: {
      userId: patient.id,
      carePlanId: carePlan.id,
      title: "Take a 10-15 minute walk after lunch",
      titleHindi: "दोपहर के भोजन के बाद 10-15 मिनट टहलें",
      description: "Gentle post-prandial movement to reduce post-meal glucose spikes.",
      reason: "Enhances insulin sensitivity and post-meal glucose disposal.",
      frequency: "5 days per week",
      preferredTime: "13:30 (After lunch)",
      targetDurationMin: 15,
      targetUnit: "minutes",
      category: "activity",
      sourceRecommendation: "Clinician Care Plan",
      patientStatus: "ACCEPTED",
      clinicianStatus: "APPROVED",
      isPrimary: true,
      status: "ACTIVE",
    },
  });

  const goalGlucose = await prisma.healthGoal.create({
    data: {
      userId: patient.id,
      carePlanId: carePlan.id,
      title: "Log fasting blood sugar 3 mornings a week",
      titleHindi: "सप्ताह में 3 दिन सुबह खाली पेट रक्त शर्करा मापें",
      description: "Consistent fasting glucose tracking to understand morning baseline.",
      reason: "Identifies hepatic glucose output patterns.",
      frequency: "3 mornings per week",
      preferredTime: "07:30 (Fasting)",
      targetDurationMin: 5,
      targetUnit: "times/week",
      category: "monitoring",
      sourceRecommendation: "Clinician Care Plan",
      patientStatus: "ACCEPTED",
      clinicianStatus: "APPROVED",
      isPrimary: false,
      status: "ACTIVE",
    },
  });

  const goalNutrition = await prisma.healthGoal.create({
    data: {
      userId: patient.id,
      carePlanId: carePlan.id,
      title: "Apply the Plate Method at dinner",
      titleHindi: "रात के खाने में संतुलित प्लेट विधि अपनाएं",
      description: "Half plate salad/vegetables, quarter protein, quarter complex carbohydrate.",
      reason: "Balances macronutrients and moderates carbohydrate intake.",
      frequency: "Daily",
      preferredTime: "20:00 (Dinner)",
      targetDurationMin: 20,
      category: "nutrition",
      sourceRecommendation: "Clinician Care Plan",
      patientStatus: "ACCEPTED",
      clinicianStatus: "APPROVED",
      isPrimary: false,
      status: "ACTIVE",
    },
  });

  console.log("✅ 3 SMART Health Goals created.");

  // 5. Verified Laboratory HbA1c Measurements (Baseline vs 90-Day Follow-Up)
  await prisma.clinicalMeasurement.deleteMany({ where: { userId: patient.id } });

  await prisma.clinicalMeasurement.create({
    data: {
      userId: patient.id,
      measurementType: "HBA1C",
      value: 7.8,
      unit: "%",
      measuredAt: ninetyDaysAgo,
      source: "LABORATORY",
      laboratoryName: "Dr. Lal PathLabs (Certified Clinical Diagnostic)",
      isBaseline: true,
      isFollowUp: false,
      clinicalNotes: "Initial consultation baseline venous blood draw. Clinically verified.",
    },
  });

  await prisma.clinicalMeasurement.create({
    data: {
      userId: patient.id,
      measurementType: "HBA1C",
      value: 7.1,
      unit: "%",
      measuredAt: new Date(),
      source: "LABORATORY",
      laboratoryName: "Dr. Lal PathLabs (Certified Clinical Diagnostic)",
      isBaseline: false,
      isFollowUp: true,
      clinicalNotes: "90-day program follow-up venous blood draw. 0.7% net reduction achieved.",
    },
  });
  console.log("✅ Verified Laboratory HbA1c measurements seeded (Baseline: 7.8%, Follow-up: 7.1%).");

  // 6. Recent Daily Check-Ins & Recovery Event
  await prisma.dailyCheckIn.deleteMany({ where: { userId: patient.id } });

  const dates = [6, 5, 4, 3, 2, 1, 0];
  for (const d of dates) {
    const checkDate = new Date(Date.now() - d * 86400 * 1000).toISOString().split("T")[0];
    let routineStatus = "Completed";
    let barrier = null;
    let mood = "Good";

    if (d === 2) {
      routineStatus = "Not completed";
      barrier = "Busy schedule";
      mood = "Okay";
    } else if (d === 4) {
      routineStatus = "Partially completed";
      mood = "Okay";
    }

    await prisma.dailyCheckIn.create({
      data: {
        userId: patient.id,
        date: checkDate,
        mood,
        routineStatus,
        barrier,
        supportRequested: barrier ? true : false,
        completionTimeSec: 38,
        energyLevel: 4,
        stressLevel: 2,
      },
    });
  }

  // Recovery Event for Day 2 missed routine
  await prisma.recoveryEvent.deleteMany({ where: { patientId: patient.id } });
  await prisma.recoveryEvent.create({
    data: {
      patientId: patient.id,
      goalId: goalWalk.id,
      missedDate: new Date(Date.now() - 2 * 86400 * 1000).toISOString().split("T")[0],
      reportedBarrier: "Busy schedule",
      suggestedResponse: "Offer shorter 8-minute micro-walk routine directly after lunch.",
      suggestedActionTitle: "8-minute gentle post-lunch walk",
      patientDecision: "ACCEPTED",
      revisedGoalTitle: "Take an 8-minute gentle walk after lunch",
      subsequentActionDone: true, // Successfully recovered within 7 days!
      status: "RESOLVED",
    },
  });
  console.log("✅ Check-ins and Recovery event seeded with 7-day return-to-routine proof.");

  // 7. Care Circle Invitation
  await prisma.careCircleInvitation.deleteMany({ where: { patientId: patient.id } });
  const invitation = await prisma.careCircleInvitation.create({
    data: {
      patientId: patient.id,
      caregiverName: "Priya Morgan",
      caregiverEmail: "priya.morgan@demo.com",
      relationship: "Spouse / Partner",
      invitationToken: "demo-care-circle-token-42",
      expiresAt: new Date(Date.now() + 14 * 86400 * 1000),
      status: "ACCEPTED",
      shareGoals: true,
      shareCompletedActions: true,
      shareReminders: true,
      shareEducation: true,
      shareWeeklySummary: true,
      shareGlucose: false, // Default sensitive metric opt-out
    },
  });
  console.log(`✅ Care Circle invitation seeded with token: ${invitation.invitationToken}`);

  // 8. Reviewed Educational Articles (Bilingual Hindi & English)
  const articles = [
    {
      slug: "indian-plate-method",
      language: "hi",
      topic: "nutrition",
      title: "The Balanced Plate Method for Blood Sugar Stability",
      titleHindi: "रक्त शर्करा संतुलन के लिए भारतीय थाली (प्लेट) विधि",
      content:
        "The Plate Method divides your plate into three functional zones: 50% non-starchy vegetables (cucumber, greens, gourds), 25% protein (dal, paneer, tofu, eggs), and 25% low-GI carbohydrates (multigrain roti, brown rice). This prevents rapid glycemic excursions without feeling restrictive.",
      contentHindi:
        "मधुमेह में आहार को प्रतिबंधित करने की बजाय थाली को सही अनुपात में बांटना सबसे सरल और प्रभावी तरीका है। अपनी थाली का 50% भाग हरी सब्जियों और सलाद से भरें, 25% भाग प्रोटीन (दाल, पनीर, अंकुरित अनाज या अंडा) और 25% भाग कम ग्लाइसेमिक कार्बोहाइड्रेट (जैसे मिस्सी रोटी या बाजरा) रखें। इससे भोजन के बाद शर्करा की अचानक वृद्धि नहीं होती।",
      authorOrg: "Pulse Clinical Board & Nutrition Directorate",
      sourceUrl: "https://www.icmr.nic.in/guidelines/diabetes",
      evidenceInfo: "ICMR Guidelines for Type 2 Diabetes Management & ADA Standards of Care 2024",
      reviewerName: "Dr. Rajesh Verma, MD",
      reviewerRole: "Consultant Diabetologist & Clinical Lead",
      isApproved: true,
      status: "PUBLISHED",
    },
    {
      slug: "post-meal-walking-glucose",
      language: "hi",
      topic: "physical_activity",
      title: "Why 10-15 Minutes of Post-Meal Walking Matters",
      titleHindi: "भोजन के बाद 10-15 मिनट टहलने का वैज्ञानिक महत्व",
      content:
        "Light movement within 30 minutes following meals stimulates non-insulin-mediated glucose uptake via skeletal muscle contraction (GLUT-4 translocation). A gentle 10-minute walk significantly reduces peak postprandial glucose.",
      contentHindi:
        "भोजन के तुरंत बाद भारी व्यायाम नहीं, बल्कि केवल 10 से 15 मिनट का हल्का टहलना मांसपेशियों को रक्त से ग्लूकोज सोखने में मदद करता है। वैज्ञानिक अध्ययनों के अनुसार, भोजन के 30 मिनट के भीतर हल्के कदमों से चलना भोजन के बाद की शर्करा के स्तर को 20 से 30% तक कम कर सकता है।",
      authorOrg: "Pulse Clinical Exercise Physiology Team",
      sourceUrl: "https://diabetesjournals.org/care",
      evidenceInfo: "American Diabetes Association (ADA) 2024 Physical Activity Consensus",
      reviewerName: "Dr. Rajesh Verma, MD",
      reviewerRole: "Consultant Diabetologist & Clinical Lead",
      isApproved: true,
      status: "PUBLISHED",
    },
    {
      slug: "hypoglycemia-recognition-safety",
      language: "hi",
      topic: "glucose_basics",
      title: "Recognizing & Safely Managing Low Blood Sugar (Hypoglycemia)",
      titleHindi: "हाइपोग्लाइसीमिया (कम शर्करा) के लक्षण और आपातकालीन नियम",
      content:
        "Hypoglycemia (blood glucose < 70 mg/dL) requires immediate attention. Symptoms include shakiness, cold sweat, palpitations, dizziness, and irritability. Follow the 'Rule of 15': ingest 15 grams of fast-acting glucose (e.g. 3 glucose tablets, 1/2 cup fruit juice), wait 15 minutes, and recheck.",
      contentHindi:
        "यदि रक्त शर्करा 70 mg/dL से नीचे चली जाए, तो इसे हाइपोग्लाइसीमिया कहते हैं। इसके लक्षणों में पसीना आना, हाथ कांपना, घबराहट और चक्कर आना शामिल हैं। ऐसी स्थिति में '15 का नियम' अपनाएं: तुरंत 15 ग्राम तेजी से घुलने वाली चीनी या आधा कप फलों का रस लें, 15 मिनट प्रतीक्षा करें और पुनः शर्करा जांचें। यदि शर्करा 55 से कम हो या लक्षण गंभीर हों, तो तुरंत आपातकालीन सहायता लें।",
      authorOrg: "Pulse Emergency Clinical Safety Protocol",
      sourceUrl: "https://www.endocrinology.org/clinical-guidance",
      evidenceInfo: "Endocrine Society Clinical Practice Guideline on Hypoglycemia",
      reviewerName: "Dr. Rajesh Verma, MD",
      reviewerRole: "Consultant Diabetologist & Clinical Lead",
      isApproved: true,
      status: "PUBLISHED",
    },
    {
      slug: "routine-recovery-without-guilt",
      language: "hi",
      topic: "recovery_habits",
      title: "Recovering Broken Routines Without Guilt",
      titleHindi: "अपराध-बोध के बिना दिनचर्या में दोबारा शुरुआत कैसे करें",
      content:
        "Missing a planned health action is normal human behavior, not a failure of willpower. When life gets busy or fatigue sets in, the most successful strategy is micro-adaptation: reduce the action duration rather than abandoning the routine entirely.",
      contentHindi:
        "स्वास्थ्य यात्रा में दिनचर्या का कभी-कभी छूटना पूरी तरह सामान्य है। इसे असफलता मानने के बजाय, यह समझें कि व्यस्तता या थकान जीवन का हिस्सा है। पल्स का सिद्धांत है: 'दोष मत दो, रास्ता बदलो।' यदि 15 मिनट नहीं मिल रहे, तो केवल 5 मिनट का छोटा कदम उठाएं। निरंतरता पूर्णता से अधिक महत्वपूर्ण है।",
      authorOrg: "Pulse Behavioral Psychology Directorate",
      sourceUrl: "https://www.behavioralmedicine.org",
      evidenceInfo: "Journal of Behavioral Medicine & Habit Formation Research 2023",
      reviewerName: "Dr. Rajesh Verma, MD",
      reviewerRole: "Consultant Diabetologist & Clinical Lead",
      isApproved: true,
      status: "PUBLISHED",
    },
  ];

  for (const art of articles) {
    await prisma.educationalArticle.upsert({
      where: { slug: art.slug },
      update: art,
      create: art,
    });
  }
  console.log(`✅ ${articles.length} Bilingual reviewed educational articles seeded.`);

  // 9. Safety Escalation entry for Clinician Queue demo
  await prisma.safetyEscalation.deleteMany({ where: { patientId: patient.id } });
  await prisma.safetyEscalation.create({
    data: {
      patientId: patient.id,
      reason: "Inquiry regarding adjusting prescribed Metformin dosage while fasting",
      severity: "MODERATE",
      triggerSource: "COACH_QUERY",
      patientSafeNotice: "Medication doses must only be adjusted by your licensed doctor. Do not change doses independently.",
      resolutionStatus: "OPEN",
    },
  });
  console.log("✅ Sample safety escalation seeded in clinician follow-up queue.");

  console.log("\n🎉 Project Pulse seed completed successfully!");
  console.log("--------------------------------------------------");
  console.log("Demo Patient Credentials:   alex.morgan@pulsehealth.demo / DemoPassword123!");
  console.log("Demo Clinician Credentials: dr.verma@pulsehealth.demo   / ClinicianPassword123!");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
