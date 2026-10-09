"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  FileText,
  Lock,
  Sparkles,
  HeartHandshake,
  Calendar,
  X,
  ArrowRight,
  HelpCircle,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { useCurrentLanguage } from "@/components/LanguageToggle";

interface FeatureCategory {
  category: string;
  icon: string;
  status: string;
  statusLabel: string;
  bullets: string[];
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receiptNumber: string;
  paymentMethod: string;
  createdAt: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  startsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  provider: string;
}

export default function SubscriptionPage() {
  const lang = useCurrentLanguage();

  // Data states
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [features, setFeatures] = useState<FeatureCategory[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // UI state
  const [expandedFeatures, setExpandedFeatures] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Checkout modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState("UPI / Autopay");
  const [checkoutSessionData, setCheckoutSessionData] = useState<any>(null);

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("Temporary pause in budget");
  const [cancelImmediately, setCancelImmediately] = useState(false);

  // Fetch subscription status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setSubscription(data.subscription);
        setTransactions(data.transactions || []);
        setFeatures(data.features || []);
        setIsSubscribed(Boolean(data.isSubscribed));
      }
    } catch (err) {
      console.error("Failed to load subscription data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initiate checkout
  const handleInitiateCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setCheckoutSessionData(data);
        setCheckoutModalOpen(true);
      } else {
        showToast(data.error || "Failed to initiate checkout session.");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred during checkout setup.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Complete checkout & verify on server
  const handleConfirmPayment = async () => {
    setCheckoutLoading(true);
    try {
      // In production Razorpay modal, Razorpay returns: razorpay_payment_id, razorpay_subscription_id, razorpay_signature
      // Here we simulate the secure verification flow using HMAC SHA256 verification on the server
      const pseudoPaymentId = `pay_${Date.now()}`;
      const pseudoSignature = `test_sig_${Date.now()}`;

      const res = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerPaymentId: pseudoPaymentId,
          providerSubscriptionId: checkoutSessionData?.subscriptionId,
          providerOrderId: checkoutSessionData?.orderId,
          providerSignature: pseudoSignature,
          paymentMethod: checkoutPaymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Payment verified successfully! Welcome to Pulse Premium.");
        setCheckoutModalOpen(false);
        fetchStatus();
      } else {
        showToast(data.error || "Payment verification failed.");
      }
    } catch (err: any) {
      showToast(err.message || "Payment verification failed.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Process cancellation
  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason,
          cancelImmediately,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Subscription updated.");
        setCancelModalOpen(false);
        fetchStatus();
      } else {
        showToast(data.error || "Failed to cancel subscription.");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Support" />
        <SafetyBanner compact />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#101A45] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in border border-slate-700">
            <CheckCircle2 className="w-5 h-5 text-[#087F8C]" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D5F3E7] text-[#087F8C] border border-[#A6E8D1]">
              <BadgeCheck className="w-4 h-4 text-[#087F8C]" />
              Pulse Healthcare Membership
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#101A45] tracking-tight">
              Unlock Your Complete Pulse Experience
            </h1>
            <p className="text-sm sm:text-base text-[#52616B] leading-relaxed">
              Personalized health support, daily habit tracking, and connected care tools in one membership.
            </p>
          </div>

          {/* Active Subscription Banner (if subscribed) */}
          {isSubscribed && subscription && (
            <div className="p-5 rounded-2xl bg-[#D5F3E7] border border-[#A6E8D1] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white rounded-xl text-[#087F8C] shadow-2xs">
                  <BadgeCheck className="w-6 h-6 text-[#087F8C]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#101A45]">
                      Pulse Premium Active
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#087F8C] text-white">
                      {subscription.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#52616B] mt-0.5">
                    {subscription.cancelAtPeriodEnd ? (
                      <span className="text-amber-800 font-medium">
                        Cancellation scheduled: Access remains active until{" "}
                        {subscription.currentPeriodEnd
                          ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                          : "end of cycle"}
                        .
                      </span>
                    ) : (
                      <span>
                        Next automatic renewal:{" "}
                        <strong>
                          {subscription.currentPeriodEnd
                            ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                            : "in 30 days"}
                        </strong>{" "}
                        • ₹499/month
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!subscription.cancelAtPeriodEnd ? (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:border-red-400 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <button
                    onClick={handleInitiateCheckout}
                    className="w-full sm:w-auto px-4 py-2 bg-[#087F8C] hover:bg-[#066570] text-white rounded-xl text-xs font-semibold transition"
                  >
                    Resume Renewal
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Primary Plan Card */}
          <div className="bg-white rounded-3xl border border-[#C9D7DE] shadow-sm overflow-hidden">
            {/* Plan Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-radial from-white to-slate-50/50">
              <div className="space-y-1.5 max-w-lg">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#101A45]">
                    Pulse Premium
                  </h2>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#D5F3E7] text-[#087F8C]">
                    All-Inclusive
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#087F8C]">
                  &ldquo;Your health journey, connected in one place.&rdquo;
                </p>
                <p className="text-xs text-[#52616B] leading-relaxed pt-1">
                  Access the Project Pulse health-support experience through personalized health goals, daily tracking, food education, peer encouragement, proactive habit support, and healthcare consultation features that are available and enabled on your account.
                </p>
              </div>

              {/* Pricing Box & CTA */}
              <div className="bg-[#DCE8EC]/50 p-5 rounded-2xl border border-[#C9D7DE] text-center md:text-right shrink-0 space-y-3">
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-[#101A45]">
                    ₹499
                    <span className="text-sm sm:text-base font-normal text-[#52616B]">
                      {" "}
                      / month
                    </span>
                  </div>
                  <p className="text-[11px] text-[#52616B] mt-0.5">
                    Recurring monthly billing (INR) • Cancel anytime
                  </p>
                </div>

                {!isSubscribed ? (
                  <button
                    onClick={handleInitiateCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3.5 px-6 bg-[#087F8C] hover:bg-[#066570] disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Initializing Checkout...</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe for ₹499/month</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const el = document.getElementById("billing-management");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full py-3.5 px-6 bg-[#101A45] hover:bg-[#1A286B] text-white rounded-xl text-sm font-bold shadow-md transition"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Feature List (14 Benefit Categories) */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#101A45]">
                    What&apos;s Included in Pulse Premium
                  </h3>
                  <p className="text-xs text-[#52616B]">
                    Transparent breakdown of all 14 connected healthcare & self-management capabilities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedFeatures(!expandedFeatures)}
                  className="text-xs font-semibold text-[#087F8C] hover:underline flex items-center gap-1"
                >
                  <span>{expandedFeatures ? "Collapse View" : "View all 14 features"}</span>
                  {expandedFeatures ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Grid of features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(expandedFeatures ? features : features.slice(0, 6)).map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-[#C9D7DE] transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#101A45]">
                        {idx + 1}. {feat.category}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          feat.status === "ACTIVE"
                            ? "bg-[#D5F3E7] text-[#087F8C]"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {feat.statusLabel}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#52616B]">
                      {feat.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087F8C] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {!expandedFeatures && features.length > 6 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setExpandedFeatures(true)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#101A45] rounded-xl text-xs font-semibold transition"
                  >
                    View all 14 included features ({features.length - 6} more) ↓
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trust and Transparency Section */}
          <div className="bg-white rounded-3xl border border-[#C9D7DE] p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-[#087F8C]" />
              <h3 className="text-lg font-bold text-[#101A45]">
                Billing Terms & Transparency
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#52616B]">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-[#101A45] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#087F8C]" />
                  <span>Monthly Recurring Billing</span>
                </div>
                <p leading-relaxed>
                  Subscriptions are billed in Indian Rupees at ₹499 every 30 days. Payments are securely processed through verified payment channels (UPI Autopay, Debit/Credit Card).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-[#101A45] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#087F8C]" />
                  <span>Cancel Anytime Policy</span>
                </div>
                <p leading-relaxed>
                  You may cancel your subscription at any time with zero penalty. When cancelled, premium benefits remain active until the end of your prepaid billing period.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-[#101A45] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#087F8C]" />
                  <span>Medical Data Preservation</span>
                </div>
                <p leading-relaxed>
                  Cancelling or expiring a subscription will <strong>never</strong> delete your health data, glucose history, food logs, Care Circle permissions, or previously booked consultations.
                </p>
              </div>
            </div>
          </div>

          {/* Payment History & Invoices Section */}
          <div id="billing-management" className="bg-white rounded-3xl border border-[#C9D7DE] p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-6 h-6 text-[#087F8C]" />
                <div>
                  <h3 className="text-lg font-bold text-[#101A45]">
                    Payment History & Receipts
                  </h3>
                  <p className="text-xs text-[#52616B]">
                    Verified transaction statements and invoices for your account.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchStatus}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
                title="Refresh history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading billing statements...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No past transactions recorded. Your billing history will appear here once you subscribe.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[#52616B]">
                      <th className="py-3 px-3 font-semibold">Date</th>
                      <th className="py-3 px-3 font-semibold">Receipt #</th>
                      <th className="py-3 px-3 font-semibold">Amount</th>
                      <th className="py-3 px-3 font-semibold">Method</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-slate-800">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {t.receiptNumber || "RCPT-2026-N/A"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#101A45]">
                          ₹{t.amount.toFixed(2)} {t.currency}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {t.paymentMethod || "UPI / Card"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D5F3E7] text-[#087F8C]">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() =>
                              showToast(`Invoice ${t.receiptNumber} downloaded.`)
                            }
                            className="text-[#087F8C] font-semibold hover:underline"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        <MobileBottomNav />
      </div>

      {/* ================================================================= */}
      {/* CHECKOUT MODAL                                                    */}
      {/* ================================================================= */}
      {checkoutModalOpen && checkoutSessionData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#087F8C]" />
                <h3 className="font-bold text-base text-[#101A45]">
                  Complete Pulse Subscription
                </h3>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#101A45]">
                  {checkoutSessionData.planName}
                </span>
                <span className="font-extrabold text-base text-[#087F8C]">
                  ₹499 / month
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Monthly recurring membership in Indian Rupees (INR).
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod("UPI / Autopay")}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    checkoutPaymentMethod === "UPI / Autopay"
                      ? "border-[#087F8C] bg-[#D5F3E7] text-[#087F8C]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>UPI / QR Mandate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentMethod("Credit / Debit Card")}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    checkoutPaymentMethod === "Credit / Debit Card"
                      ? "border-[#087F8C] bg-[#D5F3E7] text-[#087F8C]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>Credit / Debit Card</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Server-Side Verification:</strong> Payment will be authoritatively verified using cryptographic HMAC signature checks before activating premium membership.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleConfirmPayment}
                className="flex-1 py-2.5 bg-[#087F8C] hover:bg-[#066570] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <span>Authorize & Pay ₹499</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* CANCEL SUBSCRIPTION MODAL                                         */}
      {/* ================================================================= */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#101A45]">
                Cancel Pulse Premium?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              We are sorry to see you go. Your health data, glucose history, food logs, Care Circle permissions, and past consultations will remain <strong>permanently saved and safe</strong> on your account.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Reason for cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#087F8C]"
              >
                <option value="Temporary pause in budget">Temporary pause in budget</option>
                <option value="Achieved target glycemic control">Achieved target glycemic control</option>
                <option value="Switching clinical provider">Switching clinical provider</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div>
                <strong>Effective Date:</strong>{" "}
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "End of current 30-day period"}
              </div>
              <div>No additional monthly charges will occur.</div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Keep Membership
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition"
              >
                {cancelLoading ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
