"use client";

import { useRouter } from "next/navigation";
import SmartAttentionPanel from "@/components/dashboard/SmartAttentionPanel";
import { ArrowLeft } from "lucide-react";

export default function AdminAttentionPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#050607,#0b0e12)", color: "white", padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, textTransform: "uppercase" }}>Slim dashboard</h1>
            <div style={{ color: "#ff4d00", fontSize: 12, letterSpacing: 1.5, marginTop: 5 }}>AANDACHTSPUNTEN EN OPENSTAANDE ACTIES</div>
          </div>
          <button onClick={() => router.push("/dashboard/admin")} style={buttonStyle}><ArrowLeft size={16} /> Terug naar Admin</button>
        </div>
        <SmartAttentionPanel roleLabel="Admin" />
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", cursor: "pointer",
  border: "1px solid #aaa", background: "linear-gradient(#fff,#bbb)", color: "#111", fontWeight: 900,
};
