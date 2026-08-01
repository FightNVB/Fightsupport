import type { Metadata } from "next";
import PublicMatchmakingClient from "@/components/public-matchmaking/PublicMatchmakingClient";
import "./public-matchmaking.css";

export const metadata: Metadata = {
  title: "Live matchmaking | FightSupport",
  description: "Bekijk de actuele voorlopige matchmaking.",
  robots: { index: false, follow: false },
};

export default async function PublicMatchmakingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicMatchmakingClient token={token} />;
}
