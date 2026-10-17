import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
    const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
    const allowed = new Set(["fightsupport.nl", "www.fightsupport.nl", "localhost", "127.0.0.1"]);
    if (host) allowed.add(host);
    if (!["http:", "https:"].includes(target.protocol) || !allowed.has(target.hostname.toLowerCase()) ||
      !/^\/openbare-matchmaking\/[a-zA-Z0-9_-]+\/?$/.test(target.pathname)) {
      return NextResponse.json({ error: "Ongeldige openbare matchmaking URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Ongeldige URL" }, { status: 400 });
  }

  const providers = [
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(target.href)}`,
    `https://quickchart.io/qr?size=240&format=png&text=${encodeURIComponent(target.href)}`,
  ];
  for (const endpoint of providers) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(7000), cache: "no-store" });
      if (!response.ok || !(response.headers.get("content-type") ?? "").startsWith("image/")) continue;
      const data = await response.arrayBuffer();
      if (data.byteLength < 100 || data.byteLength > 250_000) continue;
      return new NextResponse(data, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
      });
    } catch { /* Try alternate provider. */ }
  }
  return NextResponse.json({ error: "QR-code kon niet worden gegenereerd" }, { status: 502 });
}
