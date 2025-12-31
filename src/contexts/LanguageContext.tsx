"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import en from "../locales/en.json";
import ar from "../locales/ar.json";

type Language = "en" | "ar";
type Direction = "ltr" | "rtl";
type Translations = typeof en;

interface LanguageContextType {
    language: Language;
    direction: Direction;
    t: (key: keyof Translations, params?: Record<string, string>) => string;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
    en,
    ar,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isManager = pathname?.startsWith("/admin/manager");
    const isAdmin = pathname?.startsWith("/admin");

    // Track if component has mounted to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    // Always start with "en" for both server and client to prevent hydration mismatch
    // The actual user preference will be loaded after mount
    const [language, setLanguageState] = useState<Language>("en");

    // Set mounted state after first render
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load language preference from localStorage AFTER component mounts
    // This prevents hydration mismatch between server and client
    useEffect(() => {
        if (!mounted) return;

        const savedLang = localStorage.getItem("language") as Language;
        const managerLang = localStorage.getItem("manager_language") as Language;

        if (isManager) {
            if (managerLang) {
                setLanguageState(managerLang);
            } else {
                // Default to Arabic for manager side
                setLanguageState("ar");
                localStorage.setItem("manager_language", "ar");
                localStorage.setItem("language", "ar");
            }
        } else if (savedLang && (savedLang === "en" || savedLang === "ar")) {
            setLanguageState(savedLang);
        }
    }, [mounted, isManager]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
        if (isManager) {
            localStorage.setItem("manager_language", lang);
        }
    };

    // Allow RTL for manager side (and other admin if needed)
    // Previously restricted all admin to LTR
    const direction = language === "ar" ? "rtl" : "ltr";

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
    }, [language, direction]);

    const t = (key: keyof Translations, params?: Record<string, string>) => {
        let text = translations[language][key] || translations["en"][key] || key;

        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(`{${paramKey}}`, paramValue);
            });
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, direction, t, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
