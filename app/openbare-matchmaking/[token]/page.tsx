import type { Metadata } from "next";
import PublicMatchmakingClient from "@/components/public-matchmaking/PublicMatchmakingClient";
import { NO_INDEX } from "@/lib/seo";
import "./public-matchmaking.css";

export const metadata: Metadata = {
  title: "Live line-up",
  description: "Bekijk de actuele line-up en partijgegevens.",
  robots: NO_INDEX,
};

export default async function PublicMatchmakingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicMatchmakingClient token={token} />;
}
