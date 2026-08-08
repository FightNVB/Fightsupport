import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FightSupport | Digitaal wedstrijdbeheer voor de vechtsport",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ["FightSupport", "vechtsport", "wedstrijdbeheer", "matchmaking", "kickboksen", "MMA", "boksen", "officials", "vechtsportbond", "line-up", "weging", "uitslagen"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "FightSupport | Digitaal vechtsport ondersteuningsplatform",
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "nl_NL",
    type: "website",
    images: [{ url: "/branding/fightsupport/hero.png", width: 1200, height: 630, alt: "FightSupport digitaal wedstrijdbeheer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FightSupport | Digitaal wedstrijdbeheer voor de vechtsport",
    description: DEFAULT_DESCRIPTION,
    images: ["/branding/fightsupport/hero.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#ff7a00", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="nl" data-scroll-behavior="smooth"><body className="bg-black text-white"><AuthProvider>{children}</AuthProvider></body></html>;
}
