"use client";

import CompactEindrapport from "@/app/dashboard/_components/CompactEindrapport";

export default function AdminEindrapportPage() {
  return (
    <CompactEindrapport
      endpoint="/api/rapport/admin-eindrapport"
      title="Admin eindrapport"
      backHref={(id) => `/dashboard/admin/controle/${id}`}
    />
  );
}
