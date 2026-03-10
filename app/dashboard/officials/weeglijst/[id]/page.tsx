"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface WeegResultaat {
  id: string;
  naam: string;
  hoek: "rood" | "blauw";
  gewicht: number;
  max_gewicht: number;
  dispensatie: boolean;
  boete: boolean;
  opmerking?: string | null;
}

export default function WeeglijstPage() {
  const router = useRouter();
  const { id } = useParams(); // event_id
  const { user, roles } = useAuth();
  const [wegingen, setWegingen] = useState<WeegResultaat[]>([]);
  const [melding, setMelding] = useState<string | null>(null);

  const isHoofd = roles?.includes("hoofdofficial") || roles?.includes("superadmin");

  useEffect(() => {
    if (!user) router.push("/login");
    if (!isHoofd) router.push("/dashboard");
  }, [user, isHoofd, router]);

  useEffect(() => {
    const fetchWeeglijst = async () => {
      const { data, error } = await supabase
        .from("weeglijst_resultaten")
        .select("*")
        .eq("event_id", id)
        .order("id");

      if (error) {
        console.error(error);
        setMelding("❌ Fout bij laden weeglijst.");
      } else setWegingen(data || []);
    };
    fetchWeeglijst();
  }, [id]);

  const updateWeging = async (
    weegId: string,
    updates: Partial<WeegResultaat>
  ) => {
    const { error } = await supabase
      .from("weeglijst_resultaten")
      .update(updates)
      .eq("id", weegId);
    if (error) setMelding("❌ Fout bij opslaan.");
    else setMelding("✅ Wijziging opgeslagen.");
  };

  const berekenStatus = (r: WeegResultaat) => {
    if (r.gewicht <= r.max_gewicht) return "✅ OK";
    const verschil = r.gewicht - r.max_gewicht;
    if (verschil <= 2) return "⚠️ jeugd mogelijk boete";
    if (verschil <= 4 && r.dispensatie) return "🟡 dispensatie";
    return "❌ partij ongeldig";
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-black text-white">
      <div
        className="rounded-2xl p-8"
        style={{
          width: "900px",
          maxWidth: "95vw",
          background: "#111",
          border: "1px solid var(--brand-orange)",
        }}
      >
        <h2 className="text-2xl font-bold text-[var(--brand-orange)] mb-4">
          Weeglijst Controle
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Controleer gewichten, geef dispensaties of boetes.
        </p>

        {melding && (
          <p
            className={`mb-3 ${
              melding.startsWith("✅") ? "text-green-400" : "text-red-400"
            }`}
          >
            {melding}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-[#333]">
            <thead className="bg-[#222] text-[var(--brand-orange)]">
              <tr>
                <th className="p-2">Naam</th>
                <th>Hoek</th>
                <th>Gewicht</th>
                <th>Max</th>
                <th>Status</th>
                <th>Dispensatie</th>
                <th>Boete</th>
                <th>Opmerking</th>
              </tr>
            </thead>
            <tbody>
              {wegingen.map((r) => (
                <tr key={r.id} className="text-center border-t border-[#333]">
                  <td>{r.naam}</td>
                  <td>{r.hoek}</td>
                  <td>{r.gewicht} kg</td>
                  <td>{r.max_gewicht} kg</td>
                  <td>{berekenStatus(r)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.dispensatie}
                      onChange={(e) =>
                        updateWeging(r.id, { dispensatie: e.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.boete}
                      onChange={(e) =>
                        updateWeging(r.id, { boete: e.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="bg-[#222] border border-[#444] rounded px-2 py-1 text-white w-48"
                      value={r.opmerking || ""}
                      onChange={(e) =>
                        updateWeging(r.id, { opmerking: e.target.value })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center mt-5">
          <button
            className="border border-[var(--brand-orange)] text-[var(--brand-orange)] hover:bg-[var(--brand-orange)] hover:text-white rounded py-2 px-5 transition"
            onClick={() =>
              router.push(`/dashboard/officials/hoofdofficial/lineup/${id}`)
            }
          >
            → Naar Line-up
          </button>
        </div>
      </div>
    </main>
  );
}
