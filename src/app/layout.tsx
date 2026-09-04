import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Hind_Siliguri, Sora, Caveat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileDock from "@/components/MobileDock";
import DeveloperStrip from "@/components/DeveloperStrip";
import ThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { VerificationProvider } from "@/contexts/VerificationContext";
import VerificationBanner from "@/components/VerificationBanner";
import PwaRegister from "@/components/PwaRegister";

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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C0392B" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0C10" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "TTC NETWORK",
    template: "%s | TTC NETWORK",
  },
  description:
    "A unified, community-driven web platform serving all Government Teachers' Training Colleges (TTCs) of Bangladesh. Share stories, events, notices, and connect with your TTC community.",
  keywords: [
    "TTC",
    "Teachers Training College",
    "Bangladesh",
    "B.Ed",
    "B.Ed Honours",
    "M.Ed",
    "Education",
    "National University",
  ],
  applicationName: "TTC NETWORK",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TTC NETWORK",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${hindSiliguri.variable} ${sora.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
                if (isStandalone) {
                  document.title = 'TTC NETWORK';
                }
                window.__ttcInstallPrompt = null;
                window.__ttcAppInstalled = false;
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__ttcInstallPrompt = e;
                  window.dispatchEvent(new CustomEvent('ttc-install-prompt-ready', { detail: e }));
                  console.log('[PWA] beforeinstallprompt captured early in head');
                });
                window.addEventListener('appinstalled', function() {
                  window.__ttcAppInstalled = true;
                  window.__ttcInstallPrompt = null;
                  window.dispatchEvent(new CustomEvent('ttc-app-installed'));
                  console.log('[PWA] TTC NETWORK app installed');
                });
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-[#FAFAFA] dark:bg-[#0C0C10] text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <PwaRegister />
        <ThemeProvider>
          <AuthProvider>
            <VerificationProvider>
              <SiteSettingsProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <VerificationBanner />
                    <Navbar />
                    <main className="pb-24 md:pb-14">{children}</main>
                    <MobileDock />
                    <DeveloperStrip />
                  </ConfirmProvider>
                </ToastProvider>
              </SiteSettingsProvider>
            </VerificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
