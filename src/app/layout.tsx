import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Hind_Siliguri, Sora, Caveat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DeveloperStrip from "@/components/DeveloperStrip";
import ThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TTC Network — One Platform. All Colleges. Every Story.",
  description:
    "A unified, community-driven web platform serving all Government Teachers' Training Colleges (TTCs) of Bangladesh. Share stories, events, notices, and connect with your TTC community.",
  keywords: [
    "TTC",
    "Teachers Training College",
    "Bangladesh",
    "B.Ed",
    "Education",
    "National University",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${hindSiliguri.variable} ${sora.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[#FAFAFA] dark:bg-[#0C0C10] text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <SiteSettingsProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <Navbar />
                  <main className="pb-14">{children}</main>
                  <DeveloperStrip />
                </ConfirmProvider>
              </ToastProvider>
            </SiteSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
