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
    const [language, setLanguageState] = useState<Language>("en");

    useEffect(() => {
        // Check local storage or browser preference
        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang && (savedLang === "en" || savedLang === "ar")) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    };

    const pathname = usePathname();
    const isAdmin = pathname?.startsWith("/admin");
    const direction = (language === "ar" && !isAdmin) ? "rtl" : "ltr";

    useEffect(() => {
        document.documentElement.lang = isAdmin ? "en" : language;
        document.documentElement.dir = direction;
    }, [language, direction, isAdmin]);

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
