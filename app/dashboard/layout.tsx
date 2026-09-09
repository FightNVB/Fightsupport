import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import PartyEditFighterSearchV2 from "./_components/PartyEditFighterSearchV2";
import BuitenlandseUitslagenPanel from "./_components/BuitenlandseUitslagenPanel";
import AanmeldingZonderVa from "./_components/AanmeldingZonderVa";
import AdminForeignResultsIndicators from "./_components/AdminForeignResultsIndicators";
import AdminOfficialReportButton from "./_components/AdminOfficialReportButton";

export const metadata: Metadata = { robots: NO_INDEX };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PartyEditFighterSearchV2 />
      <BuitenlandseUitslagenPanel />
      <AanmeldingZonderVa />
      <AdminForeignResultsIndicators />
      <AdminOfficialReportButton />
    </>
  );
}
