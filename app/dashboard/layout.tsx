import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import PartyEditFighterSearchV2 from "./_components/PartyEditFighterSearchV2";

export const metadata: Metadata = { robots: NO_INDEX };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PartyEditFighterSearchV2 />
    </>
  );
}
