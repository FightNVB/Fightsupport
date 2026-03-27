"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Bout = {
  id: string;
  partij_nr: number;
  sort_order: number;
  discipline: string | null;
  klasse_mm: string | null;
  rood_naam: string | null;
  blauw_naam: string | null;
  rood_gewogen_gewicht: number | null;
  blauw_gewogen_gewicht: number | null;
  eindstatus: string;
};

export default function DefinitieveLineupPage() {

  const params = useParams();
  const definitiveId = String(params?.definitiveId ?? "");

  const [bouts, setBouts] = useState<Bout[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {

    const { data } = await supabase
      .from("definitive_matchmaking_bouts")
      .select("*")
      .eq("definitive_matchmaking_id", definitiveId)
      .order("sort_order");

    setBouts((data ?? []) as Bout[]);
    setLoading(false);
  }

  useEffect(() => {
    if (definitiveId) load();
  }, [definitiveId]);

  async function move(id: string, direction: "up" | "down") {

    const index = bouts.findIndex((b) => b.id === id);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= bouts.length) return;

    const newList = [...bouts];
    const temp = newList[index];
    newList[index] = newList[newIndex];
    newList[newIndex] = temp;

    setBouts(newList);

    const items = newList.map((b, i) => ({
      id: b.id,
      sort_order: i + 1,
    }));

    await fetch("/api/officials/reorder-definitive-lineup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        definitiveMatchmakingId: definitiveId,
        items,
      }),
    });
  }

  async function autoSort() {
  const res = await fetch("/api/officials/auto-sort-definitive-lineup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      definitiveMatchmakingId: definitiveId,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    alert(json?.error || "Automatisch sorteren mislukt.");
    return;
  }

  await load();
}

  async function autoSort() {
  const res = await fetch("/api/officials/auto-sort-definitive-lineup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      definitiveMatchmakingId: definitiveId,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    alert(json?.error || "Automatisch sorteren mislukt.");
    return;
  }

  await load();
}

  async function finalize() {

    await fetch("/api/officials/lock-definitive-lineup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        definitiveMatchmakingId: definitiveId,
      }),
    });

    alert("Line-up definitief opgeslagen.");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0b0c10] text-white">
        Laden...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0c10] text-white px-6 py-8">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl font-black mb-6">
          Definitieve Line-up
        </h1>

        <button
  onClick={autoSort}
  className="mr-3 rounded-xl border border-zinc-300 bg-white px-6 py-3 font-black text-zinc-900 hover:border-orange-400 hover:text-orange-700"
>
  Automatisch sorteren
</button>

        <button
  onClick={autoSort}
  className="mt-6 mr-3 rounded-xl border border-zinc-300 bg-white px-6 py-3 font-black text-zinc-900 hover:border-orange-400 hover:text-orange-700"
>
  Automatisch sorteren
</button>

        <div className="bg-white text-black rounded-2xl overflow-hidden">

          <table className="min-w-full text-sm">

            <thead className="bg-zinc-900 text-white">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3 text-left">Partij</th>
                <th className="px-4 py-3 text-left">Rood</th>
                <th className="px-4 py-3 text-left">Blauw</th>
                <th className="px-4 py-3">Actie</th>
              </tr>
            </thead>

            <tbody>

              {bouts.map((b, i) => (

                <tr key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-zinc-100"}>

                  <td className="px-4 py-3 font-bold">
                    {i + 1}
                  </td>

                  <td className="px-4 py-3">
                    {b.discipline} · {b.klasse_mm}
                  </td>

                  <td className="px-4 py-3 font-bold">
                    {b.rood_naam}
                  </td>

                  <td className="px-4 py-3 font-bold">
                    {b.blauw_naam}
                  </td>

                  <td className="px-4 py-3">

                    <button
                      onClick={() => move(b.id, "up")}
                      className="mr-2 px-2 py-1 border rounded text-xs"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() => move(b.id, "down")}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      ↓
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <button
          onClick={finalize}
          className="mt-6 bg-orange-500 px-6 py-3 rounded-xl font-black hover:bg-orange-600"
        >
          Definitieve lineup opslaan
        </button>

      </div>

    </main>
  );
}