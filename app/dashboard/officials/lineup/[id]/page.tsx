"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Partij {
  id: number;
  volgorde: number;
  naam_rood: string;
  naam_blauw: string;
  gewicht_max: number;
}

interface Weeg {
  naam: string;
  hoek: string;
  boete: boolean;
  dispensatie: boolean;
  opmerking?: string;
}

export default function LineUpPage() {
  const { id } = useParams(); // event_id
  const router = useRouter();
  const [partijen, setPartijen] = useState<Partij[]>([]);
  const [wegingen, setWegingen] = useState<Weeg[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase
        .from("partijen")
        .select("*")
        .eq("event_id", id)
        .order("volgorde");
      setPartijen(p || []);

      const { data: w } = await supabase
        .from("weeglijst_resultaten")
        .select("*")
        .eq("event_id", id);
      setWegingen(w || []);
    };
    fetchData();
  }, [id]);

  const findWeeg = (naam: string) =>
    wegingen.find((w) => w.naam.toLowerCase() === naam.toLowerCase());

  return (
    <main className="flex justify-center bg-black text-white min-h-screen">
      <div
        className="p-8 rounded-2xl"
        style={{
          width: "900px",
          background: "#111",
          border: "1px solid var(--brand-orange)",
        }}
      >
        <h2 className="text-2xl font-bold text-[var(--brand-orange)] mb-4">Line-up</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Officiële volgorde van partijen met weegstatus en opmerkingen.
        </p>

        <table className="w-full text-sm border border-[#333]">
          <thead className="bg-[#222] text-[var(--brand-orange)]">
            <tr>
              <th>#</th>
              <th>Rood</th>
              <th>Blauw</th>
              <th>Gewicht max</th>
              <th>Status</th>
              <th>Opmerkingen</th>
            </tr>
          </thead>
          <tbody>
            {partijen.map((p) => {
              const rood = findWeeg(p.naam_rood);
              const blauw = findWeeg(p.naam_blauw);
              return (
                <tr key={p.id} className="border-t border-[#333] text-center">
                  <td>{p.volgorde}</td>
                  <td className="text-red-400">{p.naam_rood}</td>
                  <td className="text-blue-400">{p.naam_blauw}</td>
                  <td>{p.gewicht_max} kg</td>
                  <td>
                    {rood?.boete || blauw?.boete
                      ? "⚠️ boete"
                      : rood?.dispensatie || blauw?.dispensatie
                      ? "🟡 dispensatie"
                      : "✅ OK"}
                  </td>
                  <td className="text-gray-400 text-left px-2">
                    {[rood?.opmerking, blauw?.opmerking]
                      .filter(Boolean)
                      .join(" | ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-center mt-6 gap-4">
          <button
            className="border border-[var(--brand-orange)] text-[var(--brand-orange)] hover:bg-[var(--brand-orange)] hover:text-white rounded py-2 px-5 transition"
            onClick={() =>
              router.push(`/dashboard/officials/hoofdofficial/weeglijst/${id}`)
            }
          >
            ← Terug naar Weeglijst
          </button>
          <button
            className="bg-[var(--brand-orange)] hover:bg-[#e34600] text-white rounded py-2 px-5 transition"
            onClick={() => window.print()}
          >
            🖨️ Print Line-up
          </button>
        </div>
      </div>
    </main>
  );
}
