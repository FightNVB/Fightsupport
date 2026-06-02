import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "FightSupport | Digitaal wedstrijdbeheer voor de vechtsport",

  description:
    "Professioneel wedstrijdbeheer voor vechtsportbonden, promotors, matchmakers, officials en sportscholen. Matchmaking, controles, wegingen, line-ups en uitslagen in één platform.",

  keywords: [
    "FightSupport",
    "vechtsport",
    "wedstrijdbeheer",
    "matchmaking",
    "kickboksen",
    "MMA",
    "boksen",
    "officials",
    "vechtsportbond",
    "line-up",
    "weging",
    "uitslagen",
  ],

  metadataBase: new URL("https://fightsupport.nl"),

  openGraph: {
    title: "FightSupport | Digitaal vechtsport ondersteuningsplatform",
    description:
      "Professioneel wedstrijdbeheer voor vechtsportbonden, promotors, matchmakers, officials en sportscholen.",
    url: "https://fightsupport.nl",
    siteName: "FightSupport",
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "/branding/fightsupport/hero.png",
        width: 1200,
        height: 630,
        alt: "FightSupport",
      },
    ],
  },

  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body className="bg-black text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}