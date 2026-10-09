"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { SafetyBanner } from "@/components/layout/SafetyBanner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      <SafetyBanner compact />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-100">
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-600/30 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">
                Pulse<span className="text-teal-600">Health</span>
              </span>
            </Link>
            <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
            <p className="text-xs text-slate-500">
              We will send secure instructions to your verified health account
            </p>
          </div>

          {submitted ? (
            <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-teal-950">Instructions Dispatched</h4>
              <p className="text-xs text-teal-800 leading-relaxed">
                If an account exists for <span className="font-semibold">{email}</span>, a secure password reset link has been dispatched.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-xs text-slate-400">
        Pulse Health Platform • Encrypted & Isolated Tenant Architecture
      </div>
    </div>
  );
}
