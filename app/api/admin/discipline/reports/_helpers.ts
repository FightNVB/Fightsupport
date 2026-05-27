export function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(value: unknown) {
  if (!value) return "-";
  try { return new Date(String(value)).toLocaleDateString("nl-NL"); } catch { return String(value); }
}

export function reportHtml(title: string, body: string) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { margin:0; background:#24211f; color:#f4f4f5; font-family:Arial, Helvetica, sans-serif; }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px; }
    .header { border:1px solid #a1a1aa; background:linear-gradient(135deg,#302b27,#1f1d1b,#151312); padding:20px; margin-bottom:16px; }
    h1 { margin:0; color:#fff; text-transform:uppercase; font-size:26px; letter-spacing:.04em; }
    h2 { color:#fdba74; text-transform:uppercase; font-size:16px; margin:18px 0 8px; }
    .meta { color:#d4d4d8; font-size:12px; text-transform:uppercase; font-weight:700; margin-top:8px; }
    .card { border:1px solid #71717a; background:#11100f; padding:14px; margin-bottom:10px; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
    .label { color:#a1a1aa; text-transform:uppercase; font-size:10px; font-weight:800; }
    .value { color:#fff; font-weight:800; margin-top:3px; }
    .orange { color:#fdba74; }
    table { width:100%; border-collapse:collapse; background:#11100f; }
    th,td { border:1px solid #52525b; padding:8px; text-align:left; vertical-align:top; font-size:12px; }
    th { color:#fdba74; text-transform:uppercase; background:#1f1d1b; }
    .print { margin: 0 0 14px; }
    button { border:1px solid #e4e4e7; background:linear-gradient(#fff,#d4d4d8,#71717a); color:#11100f; font-weight:900; text-transform:uppercase; padding:10px 14px; cursor:pointer; }
    @media print { body { background:#fff; color:#111; } .wrap { padding:0; } .print { display:none; } .header,.card,table,th,td { color:#111; background:#fff; } h1,h2,.orange,.value { color:#111; } .label,.meta { color:#333; } }
  </style></head><body><div class="wrap"><div class="print"><button onclick="window.print()">Print / opslaan als PDF</button></div>${body}</div></body></html>`;
}
