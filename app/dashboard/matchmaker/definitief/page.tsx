"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  matchmaking_id: string;
  bondteam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  status: string;
  finalized_at: string | null;
};

export default function DefinitieveMatchmakingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("definitive_matchmakings")
          .select("*")
          .order("evenement_datum", { ascending: false });

        if (error) throw error;

        setRows((data ?? []) as Row[]);
      } catch (e: any) {
        setError(e?.message ?? "Laden mislukt");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0b0c10] text-white">
        Laden...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0c10] text-white px-6 py-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-black mb-6">
          Definitieve Matchmakings
        </h1>

        {error && (
          <div className="bg-red-600/20 border border-red-500 p-4 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="bg-white text-black rounded-2xl overflow-hidden">

          <table className="min-w-full text-sm">

            <thead className="bg-zinc-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Evenement</th>
                <th className="px-4 py-3 text-left">Datum</th>
                <th className="px-4 py-3 text-left">Bondteam</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actie</th>
              </tr>
            </thead>

            <tbody>

              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-zinc-100"}
                >

                  <td className="px-4 py-3 font-bold">
                    {row.evenement_naam ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    {row.evenement_datum ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    {row.bondteam ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    {row.status === "definitief" ? (
                      <span className="bg-green-500 px-2 py-1 rounded text-xs font-bold">
                        DEFINITIEF
                      </span>
                    ) : (
                      <span className="bg-yellow-400 px-2 py-1 rounded text-xs font-bold">
                        CONCEPT
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">

                    <Link
                      href={`/dashboard/officials/definitief/${row.id}`}
                      className="border px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-500 hover:text-white"
                    >
                      Openen
                    </Link>

                  </td>

                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Geen definitieve matchmakings gevonden
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>
      </div>
    </main>
  );
}