import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  CheckCircle2,
  RefreshCw,
  Heart,
  Droplet,
  Moon,
  Footprints,
  Scale,
  Sparkles,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  Database,
  FileText,
  UserCheck,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <SafetyBanner compact />
      <PublicHeader />

      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 bg-gradient-to-b from-teal-50/50 via-white to-slate-50 border-b border-slate-200/60">
          <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Next-Generation Continuous Metabolic Health</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Your health. <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600">
                  Connected. Personalized.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
                Bring your health data together and understand what is changing, what matters, and what you can do next.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 hover:shadow-lg transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs"
                >
                  <span>See How It Works</span>
                </a>
              </div>

              <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  No tedious manual food weighing
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Background wearable sync
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Clinician-guided protocols
                </span>
              </div>
            </div>

            {/* Hero App Mock Preview Card */}
            <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-4 sm:p-6 lg:p-8 overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE METABOLIC TELEMETRY STREAM
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    Continuous Health Dashboard
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Active Devices:</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700">
                    Apple Watch
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700">
                    Dexcom G7
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700">
                    Oura Gen 3
                  </span>
                </div>
              </div>

              {/* 3 Preview Metric Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Glucose</span>
                    <Droplet className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-slate-900">96 mg/dL</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      96% Time in Target (70–140)
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                    Source: Dexcom CGM • Synced just now
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resting Pulse</span>
                    <Heart className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-slate-900">58 bpm</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      ↓ 4 bpm vs 30-day baseline
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                    Source: Apple Watch • 12 mins ago
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sleep Score</span>
                    <Moon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-slate-900">7h 32m</div>
                    <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                      94m Deep Stage • Restorative
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                    Source: Oura Ring • Overnight
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. THE PROBLEM: FRAGMENTED DATA */}
        <section className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700">
                The Healthcare Disconnect
              </h2>
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Your health data is scattered across seven different silos.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                Most people want to optimize their metabolic vitality, but critical signals are stranded in isolated apps that never talk to each other.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-center">
              {[
                { name: "Wearables", icon: Activity, desc: "Heart rate & HRV" },
                { name: "Glucose Devices", icon: Droplet, desc: "CGM sensor streams" },
                { name: "Medical Records", icon: FileText, desc: "Diagnoses & labs" },
                { name: "Food Tracking", icon: SlidersHorizontal, desc: "Nutrient inputs" },
                { name: "Exercise Apps", icon: Zap, desc: "Workouts & strain" },
                { name: "Sleep Trackers", icon: Moon, desc: "Nocturnal stages" },
                { name: "Manual Logs", icon: Database, desc: "Check-ins & notes" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                      <Icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-teal-800 bg-teal-50/80 inline-block px-4 py-2 rounded-full border border-teal-200/60">
                Pulse Health brings all these fragmented data sources together into a single, unified clinical-grade profile.
              </p>
            </div>
          </div>
        </section>

        {/* 3. PASSIVE + ACTIVE DATA ARCHITECTURE DIAGRAM */}
        <section id="architecture" className="py-20 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
              <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700">
                Data Integration Engine
              </h2>
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Manual inputs + Automatic telemetry = Unified profile.
              </p>
              <p className="text-slate-600 text-base">
                We combine deep qualitative context with high-frequency passive sensor streams to build your continuous metabolic digital twin.
              </p>
            </div>

            {/* Architecture Visual Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-5xl mx-auto">
              {/* Left Column: MANUAL / ACTIVE INPUTS */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3 h-3 rounded-full bg-indigo-600" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Active / Manual Inputs
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-5">
                    Provided during onboarding and occasional short check-ins.
                  </p>
                  <ul className="space-y-3 text-sm text-slate-700">
                    {[
                      "Personal information & demographics",
                      "Medical history & conditions",
                      "Current medications & allergies",
                      "Personalized health & metabolic goals",
                      "Dietary preferences & meal rhythms",
                      "Care team conversations & notes",
                    ].map((txt) => (
                      <li key={txt} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                  Input frequency: Once or as needed
                </div>
              </div>

              {/* Center Column: PLUS & ARROW */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 lg:py-0">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-lg shadow-sm">
                  +
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-2 text-center uppercase tracking-wider">
                  Harmonized
                </div>
              </div>

              {/* Right Column: PASSIVE / AUTOMATIC DATA */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3 h-3 rounded-full bg-teal-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Passive / Automatic Telemetry
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-5">
                    Streams automatically from background wearable & sensor integrations.
                  </p>
                  <ul className="space-y-3 text-sm text-slate-700">
                    {[
                      "Continuous glucose monitoring (CGM)",
                      "Continuous heart rate & resting pulse",
                      "Daily step cadence & active minutes",
                      "Sleep architecture & nocturnal stages",
                      "Heart rate variability (HRV)",
                      "Smart scale weight & body composition",
                    ].map((txt) => (
                      <li key={txt} className="flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                  Sync frequency: Background continuous
                </div>
              </div>

              {/* Unified Output Banner */}
              <div className="lg:col-span-12 bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 text-teal-300 text-xs font-semibold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" />
                    Unified Health Engine
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold">
                    The Unified Metabolic Health Profile
                  </h4>
                  <p className="text-slate-300 text-sm max-w-xl">
                    Thousands of longitudinal data points compiled into an actionable metabolic baseline that updates continuously.
                  </p>
                </div>
                <Link
                  href="/register"
                  className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shrink-0 transition-colors"
                >
                  Create Your Unified Profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. LESS LOGGING, MORE LIVING */}
        <section className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-700">
                Product Philosophy
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                "Less logging, more living."
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Your health data comes together automatically, so you spend less time logging and more time improving.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Zero Manual Food Weighing
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Traditional diets fail because logging every calorie is exhausting. We track physiological glycemic responses directly from sensor data.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Effortless Background Streams
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Put on your watch or ring, apply your sensor, and go about your life. Pulse ingests thousands of passive measurements while you sleep and move.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  30-Second Daily Check-ins
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Open the app, see your trends, log your quick feeling score, get your clinical recommendation, and get on with your day.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HOW IT WORKS: Connect -> Collect -> Analyze -> Personalize -> Improve */}
        <section id="how-it-works" className="py-20 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
              <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700">
                Five-Stage Protocol
              </h2>
              <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                How Pulse Health transforms raw metrics into metabolic vitality.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
              {[
                {
                  step: "01",
                  title: "Connect",
                  desc: "Authorize Apple Health, Fitbit, Oura, or continuous glucose sensors with explicit consent.",
                },
                {
                  step: "02",
                  title: "Collect",
                  desc: "Background telemetry captures thousands of continuous data points with zero friction.",
                },
                {
                  step: "03",
                  title: "Analyze",
                  desc: "Algorithmic models evaluate glucose stability, sleep architecture, and autonomic recovery.",
                },
                {
                  step: "04",
                  title: "Personalize",
                  desc: "Care team coaches tailor nutritional timing and activity windows specifically to your biology.",
                },
                {
                  step: "05",
                  title: "Improve",
                  desc: "Track metabolic markers stabilize, insulin sensitivity improve, and vitality surge over 12 weeks.",
                },
              ].map((item, idx) => (
                <div
                  key={item.step}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                      STAGE {item.step}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-3 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] font-semibold text-teal-700">
                    Step {idx + 1} of 5
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. SECURITY & PRIVACY SECTION */}
        <section id="clinical-safety" className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest mb-3">
                <Lock className="w-4 h-4" />
                Security, Privacy & Clinical Standards
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
                Your biological data is sovereign and strictly protected.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
                Health telemetry is among the most sensitive personal information in existence. Pulse is architected from the foundation with strict tenant isolation, zero password storage in plaintext, explicit data consent, and revocable device permissions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    Explicit, Non-Prechecked Consent
                  </div>
                  <p>You explicitly select and approve which data streams are connected, with full audit trail records.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    User Isolation & Tenant Security
                  </div>
                  <p>Strict access controls guarantee that no user can access or view another patient's health metrics.</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-4 font-mono">
                <span>Compliance review required before production healthcare deployment.</span>
                <span className="text-teal-400">AES-256 / TLS 1.3 Transport Standard</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FINAL CTA SECTION */}
        <section className="py-20 bg-teal-50/50">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready to unify your metabolic health?
            </h2>
            <p className="text-slate-600 text-base max-w-xl mx-auto leading-relaxed">
              Experience the power of continuous health tracking without the burden of manual logging. Start your onboarding in under 3 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-all"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Activity className="w-4 h-4 text-teal-600" />
              Pulse Health Technologies
            </div>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-slate-900">Sign In</Link>
              <Link href="/register" className="hover:text-slate-900">Sign Up</Link>
              <a href="#clinical-safety" className="hover:text-slate-900">Safety & Compliance</a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] leading-relaxed text-slate-400">
            <strong>Medical Disclaimer:</strong> Pulse Health is an informational and wellness platform. The services, metrics, and insights provided are not intended to diagnose, treat, cure, or prevent any medical disease or clinical condition. Always seek the advice of your physician or other qualified healthcare provider with any questions you may have regarding a medical condition.
          </div>
        </div>
      </footer>
    </div>
  );
}
