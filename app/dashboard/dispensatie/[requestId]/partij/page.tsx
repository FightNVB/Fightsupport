"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Oude/verkorte dispensatie-partijroute bestaat alleen nog als veilige terugval.
// Een dispensatie-aanvraag heeft precies één eigen partijpagina; zonder de
// volledige matchmakingId/partijNr-route gaan we terug naar het overzicht.
export default function DispensatiePartijFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/dispensatie");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <div className="mx-auto max-w-5xl border border-zinc-600 bg-[#171717] p-4">
        Terug naar dispensatie...
      </div>
    </main>
  );
}
