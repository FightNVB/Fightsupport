import type { CSSProperties, ReactNode } from "react";

export const NVB_ORANGE = "#ff4d00";

export const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.11) 0%, rgba(255,104,20,0.03) 10%, rgba(0,0,0,0) 22%),
    radial-gradient(circle at 50% 100%, rgba(255,104,20,0.09) 0%, rgba(255,104,20,0.02) 12%, rgba(0,0,0,0) 24%),
    radial-gradient(circle at 16% 20%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    radial-gradient(circle at 84% 22%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    linear-gradient(180deg, #030405 0%, #06080b 18%, #010203 100%)
  `,
};

export function HeaderBand({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.85)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "18px 22px", position: "relative" }}>
        <div style={{ position: "absolute", right: 22, top: 18 }}>{action}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>{title}</div>
          <div style={{ marginTop: 8, fontSize: 10, letterSpacing: 2.8, color: NVB_ORANGE, textTransform: "uppercase" }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

export function SteelCard({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: 3,
      background: "linear-gradient(145deg,#f7f7f7,#717171,#fafafa,#474747,#fff)",
      boxShadow: "0 12px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.9)",
    }}>
      <div style={{ padding: 3, background: "linear-gradient(180deg,#282828,#0d0d0d,#383838)" }}>
        <div style={{
          position: "relative",
          padding: 16,
          background: "linear-gradient(180deg, rgba(10,16,28,0.98), rgba(7,9,14,0.98))",
          border: "1px solid rgba(255,255,255,0.09)",
        }}>{children}</div>
      </div>
    </div>
  );
}

export function SilverButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 18px",
        fontWeight: 900,
        color: "#111",
        border: "1px solid #a9a9a9",
        background: "linear-gradient(180deg,#fff,#dadada,#b8b8b8,#efefef)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 14px rgba(0,0,0,0.3)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...props.style,
      }}
    />
  );
}
