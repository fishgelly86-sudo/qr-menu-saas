import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skani - QR Menu & Ordering",
  description: "Seamless QR code menu and ordering system",
  manifest: "/manifest.json",
};

import ConvexClientProvider from "./ConvexClientProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { LanguageProvider } from "@/contexts/LanguageContext";

import OfflineBanner from "@/components/OfflineBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <LanguageProvider>
            <ToastProvider>
              <OfflineBanner />
              {children}
            </ToastProvider>
          </LanguageProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
