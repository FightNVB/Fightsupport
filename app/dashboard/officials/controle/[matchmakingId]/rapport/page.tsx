"use client";

import CompactEindrapport from "@/app/dashboard/_components/CompactEindrapport";

export default function OfficialsEindrapportPage() {
  return (
    <CompactEindrapport
      endpoint="/api/rapport/official-eindrapport"
      title="Officials eindrapport"
      backHref={(id) => `/dashboard/officials/controle/${id}`}
    />
  );
}
