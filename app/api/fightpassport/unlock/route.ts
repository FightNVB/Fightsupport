import { NextResponse } from "next/server";
import { readJsonFile, resolveScraperUtilsPath, writeJsonFile } from "../_utils";
import { requireAdminAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAdminAccess(req);
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim();

    if (!/^\d{7}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: "Unlockcode moet exact 7 cijfers bevatten." },
        { status: 400 }
      );
    }

    const unlockPath = resolveScraperUtilsPath("fp_unlock_request.json");
    const statePath = resolveScraperUtilsPath("fp_session_state.json");

    writeJsonFile(unlockPath, {
      code,
      trust_device: true,
      created_at: new Date().toISOString(),
    });

    const current = readJsonFile(statePath, {});
    writeJsonFile(statePath, {
      ...current,
      status: "unlock_code_submitted",
      message: "Unlockcode ontvangen. Puppeteer vult de code nu in zodra hij op het unlockscherm staat.",
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return secureError(err, "Unlockcode kon niet worden verwerkt.");
  }
}
