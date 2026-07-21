"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Siren,
  Sparkles,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Priority = "critical" | "urgent" | "attention" | "info";
type Bucket = "today" | "soon" | "later";

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: Priority;
  bucket: Bucket;
  kind: string;
  reason: string;
  dueLabel?: string | null;
  eventDate?: string | null;
};

type Payload = {
  total: number;
  critical: number;
  urgent: number;
  attention: number;
  summary: string;
  counts: Record<Bucket, number>;
  items: AttentionItem[];
};

const bucketLabels: Record<Bucket, string> = {
  today: "Vandaag",
  soon: "Binnenkort",
  later: "Later",
};

const priorityAccent: Record<Priority, string> = {
  critical: "#ff4d00",
  urgent: "#ff7a3d",
  attention: "#d7d7d7",
  info: "rgba(255,255,255,.4)",
};

export default function SmartAttentionPanel({ roleLabel }: { roleLabel: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeBucket, setActiveBucket] = useState<Bucket>("today");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authedFetch("/api/dashboard/attention", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Laden mislukt");
      setData(json);
      const firstAvailable = (["today", "soon", "later"] as Bucket[]).find((bucket) => (json?.counts?.[bucket] ?? 0) > 0);
      if (firstAvailable) setActiveBucket(firstAvailable);
    } catch (e: any) {
      setError(e?.message || "Laden mislukt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleItems = useMemo(
    () => data?.items.filter((item) => item.bucket === activeBucket) ?? [],
    [activeBucket, data],
  );

  return (
    <section
      style={{
        marginBottom: 22,
        border: "1px solid rgba(255,255,255,.14)",
        background:
          "linear-gradient(135deg,rgba(255,77,0,.13),rgba(15,18,22,.96) 34%,rgba(5,7,9,.98))",
        boxShadow: "0 18px 45px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.05)",
        padding: 18,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,77,0,.55)",
              background: "rgba(255,77,0,.12)",
            }}
          >
            <BrainCircuit size={25} />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2.2, color: "#ff7a3d", fontWeight: 900 }}>FIGHTSUPPORT ASSISTENT</div>
            <h2 style={{ margin: "4px 0 2px", fontSize: 22, lineHeight: 1.05 }}>Wat vraagt nu jouw aandacht?</h2>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12 }}>{roleLabel} · prioriteiten op basis van status, wachttijd en evenementdatum</div>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.05)",
            color: "white",
            padding: "9px 11px",
            cursor: "pointer",
            display: "flex",
            gap: 7,
            alignItems: "center",
          }}
        >
          <RefreshCw size={14} className={loading ? "smart-spin" : ""} /> Vernieuwen
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "26px 2px 8px", color: "rgba(255,255,255,.58)" }}>Ik beoordeel wat nu als eerste aandacht nodig heeft…</div>
      ) : error ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid rgba(255,90,90,.35)", color: "#ffb3b3" }}>{error}</div>
      ) : data ? (
        <>
          <div className="smart-summary-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,minmax(90px,.65fr))", gap: 10, marginTop: 17 }}>
            <div style={{ padding: 13, background: "rgba(255,255,255,.045)", borderLeft: "3px solid #ff4d00" }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{data.summary}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                {data.critical > 0
                  ? `${data.critical} punt${data.critical === 1 ? "" : "en"} zijn tijdkritisch.`
                  : "Er zijn geen tijdkritische blokkades gevonden."}
              </div>
            </div>
            <Stat label="Totaal" value={data.total} icon={<Sparkles size={14} />} />
            <Stat label="Kritiek" value={data.critical} icon={<Siren size={14} />} />
            <Stat label="Urgent" value={data.urgent} icon={<AlertTriangle size={14} />} />
            <Stat label="Aandacht" value={data.attention} icon={<ArrowRight size={14} />} />
          </div>

          {data.items.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, color: "#b8e6c8" }}>
              <CheckCircle2 size={19} /> Je bent helemaal bij.
            </div>
          ) : (
            <>
              <div className="smart-tabs" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginTop: 15 }}>
                {(["today", "soon", "later"] as Bucket[]).map((bucket) => {
                  const selected = activeBucket === bucket;
                  return (
                    <button
                      key={bucket}
                      onClick={() => setActiveBucket(bucket)}
                      style={{
                        border: selected ? "1px solid rgba(255,77,0,.7)" : "1px solid rgba(255,255,255,.09)",
                        borderBottom: selected ? "2px solid #ff4d00" : "1px solid rgba(255,255,255,.09)",
                        background: selected ? "rgba(255,77,0,.11)" : "rgba(255,255,255,.025)",
                        color: "white",
                        padding: "10px 12px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 900, fontSize: 12 }}>
                        {bucket === "today" ? <Siren size={14} /> : bucket === "soon" ? <CalendarClock size={14} /> : <Clock3 size={14} />}
                        {bucketLabels[bucket]}
                      </span>
                      <span style={{ minWidth: 23, padding: "2px 6px", background: "rgba(0,0,0,.28)", fontSize: 11, fontWeight: 900 }}>{data.counts[bucket] ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 9, display: "grid", gap: 7 }}>
                {visibleItems.length === 0 ? (
                  <div style={{ padding: "15px 3px", color: "rgba(255,255,255,.48)", fontSize: 12 }}>Geen acties in deze categorie.</div>
                ) : (
                  visibleItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => router.push(item.href)}
                      className="smart-action-row"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        color: "white",
                        border: "1px solid rgba(255,255,255,.09)",
                        borderLeft: `3px solid ${priorityAccent[item.priority]}`,
                        background: index === 0 && activeBucket === "today" ? "rgba(255,77,0,.08)" : "rgba(255,255,255,.025)",
                        padding: "11px 12px",
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: "105px 1fr auto auto",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: priorityAccent[item.priority], fontWeight: 900 }}>{item.kind}</span>
                      <span>
                        <strong style={{ display: "block", fontSize: 13 }}>{item.title}</strong>
                        <small style={{ color: "rgba(255,255,255,.55)", display: "block", marginTop: 2 }}>{item.detail}</small>
                        <small style={{ color: "rgba(255,255,255,.38)", display: "block", marginTop: 3 }}>{item.reason}</small>
                      </span>
                      {item.dueLabel ? (
                        <span style={{ whiteSpace: "nowrap", fontSize: 10, fontWeight: 900, padding: "5px 7px", border: "1px solid rgba(255,255,255,.11)", background: "rgba(0,0,0,.24)" }}>
                          {item.dueLabel}
                        </span>
                      ) : null}
                      <ArrowRight size={16} />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </>
      ) : null}

      <style jsx global>{`
        @keyframes smartSpin { to { transform: rotate(360deg); } }
        .smart-spin { animation: smartSpin .8s linear infinite; }
        @media(max-width: 860px) {
          .smart-summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .smart-summary-grid > div:first-child { grid-column: 1 / -1; }
          .smart-action-row { grid-template-columns: 1fr auto !important; }
          .smart-action-row > span:first-child { grid-column: 1 / -1; }
          .smart-action-row > span:nth-child(3) { grid-column: 1 / 2; width: max-content; }
        }
        @media(max-width: 560px) {
          .smart-summary-grid, .smart-tabs { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div style={{ padding: 11, background: "rgba(0,0,0,.24)", border: "1px solid rgba(255,255,255,.075)" }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center", color: "rgba(255,255,255,.48)", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 3 }}>{value}</div>
    </div>
  );
}
