import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import NavProgress from "@/components/layout/NavProgress";
import MotionProvider from "@/components/motion/MotionProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

// Poster titles only (.font-display). Sentences stay in Inter.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Numerals only: loads two weights.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bayt - The Family Operating System",
  description: "AI infrastructure for the modern family",
};

// Runs before first paint so the page never flashes the wrong theme: the stored choice wins,
// otherwise the OS setting. Storage can throw (private mode, blocked site data), so it is guarded.
const themeScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='light'||s==='dark'?s:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${anton.variable} ${inter.variable} ${jetbrainsMono.variable} ${plexArabic.variable} antialiased bg-[var(--bg)] text-[var(--ink)]`}
      >
        <MotionProvider>
          <NavProgress />
          {children}
          <Toaster position="bottom-right" />
        </MotionProvider>
      </body>
    </html>
  );
}
