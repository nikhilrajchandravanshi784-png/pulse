"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Language } from "@/lib/i18n";

export function LanguageToggle() {
  const [lang, setLang] = useState<Language>("hi");

  useEffect(() => {
    const saved = localStorage.getItem("pulse_preferred_lang") as Language;
    if (saved && (saved === "hi" || saved === "en")) {
      setLang(saved);
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === "hi" ? "en" : "hi";
    setLang(nextLang);
    localStorage.setItem("pulse_preferred_lang", nextLang);
    // Dispatch custom event so reactive components update smoothly
    window.dispatchEvent(new Event("pulse_lang_change"));
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-xs font-semibold text-teal-800 shadow-2xs transition-colors cursor-pointer"
      title={lang === "hi" ? "Switch to English" : "हिंदी में बदलें"}
    >
      <Globe className="w-3.5 h-3.5 text-teal-600" />
      <span>{lang === "hi" ? "हिंदी (Hindi)" : "English"}</span>
      <span className="text-[10px] text-teal-600 font-mono">⇄</span>
    </button>
  );
}

export function useCurrentLanguage(): Language {
  const [lang, setLang] = useState<Language>("hi");

  useEffect(() => {
    const check = () => {
      const saved = localStorage.getItem("pulse_preferred_lang") as Language;
      if (saved && (saved === "hi" || saved === "en")) {
        setLang(saved);
      }
    };
    check();
    window.addEventListener("pulse_lang_change", check);
    return () => window.removeEventListener("pulse_lang_change", check);
  }, []);

  return lang;
}
