"use client";

import CompactEindrapport from "@/app/dashboard/_components/CompactEindrapport";

export default function MatchmakerEindrapportPage() {
  return (
    <CompactEindrapport
      endpoint="/api/rapport/matchmaker-eindrapport"
      title="Matchmaker eindrapport"
      backHref={(id) => `/dashboard/matchmaker/matchmaking/${id}`}
    />
  );
}
