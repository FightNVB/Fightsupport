import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireUserWithRole } from "@/app/api/_utils/authz";
import { runFightPassportNodeScript } from "@/lib/control-engine/runFightPassportNodeScript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeVa(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function resolveWriter(action: "doping" | "email"): string {
  const root = process.cwd();
  const relative = action === "doping"
    ? ["ControlEngine", "scrapers", "fp_doping", "scraper_fp_doping_writer.js"]
    : ["ControlEngine", "scrapers", "fp_email", "scraper_fp_email_writer.js"];
  const candidates = [
    path.join(root, ...relative),
    path.join(root, "ControlEngine", ...relative),
    path.join(root, ...relative.slice(1)),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Fightpassport ${action}-writer niet gevonden:\n- ${candidates.join("\n- ")}`);
  return found;
}

export async function POST(req: Request) {
  try {
    await requireUserWithRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const action = body?.action === "doping" || body?.action === "email" ? body.action : null;
    const va = normalizeVa(body?.va);
    if (!action) return NextResponse.json({ error: "action moet doping of email zijn" }, { status: 400 });
    if (!va) return NextResponse.json({ error: "Geldig VA-nummer ontbreekt" }, { status: 400 });

    const scriptPath = resolveWriter(action);
    const result = await runFightPassportNodeScript(
      scriptPath,
      [va],
      {
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "5",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "200",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "350",
      },
      `fp_${action}`
    );

    return NextResponse.json({ ok: true, action, va, ...result });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("[fightpassport/writer/start]", error);
    return NextResponse.json({ error: error?.message ?? "Fightpassport writer mislukt" }, { status: 500 });
  }
}
