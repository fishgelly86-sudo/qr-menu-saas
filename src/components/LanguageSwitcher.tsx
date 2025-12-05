"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors border border-white/10 text-sm font-medium backdrop-blur-sm"
            aria-label="Switch Language"
        >
            <Globe className="w-4 h-4" />
            <span>{language === "en" ? "العربية" : "English"}</span>
        </button>
    );
}
