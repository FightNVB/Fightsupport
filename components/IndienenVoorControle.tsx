"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IndienenVoorControle({
  matchmakingId,
  onStatusChange,
}: {
  matchmakingId: string;
  onStatusChange?: (message: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleIndienen = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("matchmakings")
      .update({ status: "Ingediend" })
      .eq("id", matchmakingId);

    setLoading(false);

    if (error) {
      console.error(error);
      onStatusChange?.("❌ Fout bij indienen, probeer opnieuw.", "error");
      return;
    }

    onStatusChange?.("✅ Matchmaking succesvol ingediend bij de bond.", "success");
  };

  return (
    <button
      onClick={handleIndienen}
      disabled={loading}
      className="btn btn-primary"
      style={{
        backgroundColor: "#ff4d00",
        color: "white",
        padding: "6px 12px",
        borderRadius: "6px",
        border: "none",
        fontSize: "12px",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.8 : 1,
        transition: "all 0.3s ease",
      }}
    >
      {loading ? "⏳ Indienen..." : "Indienen ter controle"}
    </button>
  );
}





