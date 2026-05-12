import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const CANDIDATE_FILES = [
  "fightsupport-aanmeldingen-upload.xlsx",
  "aanmeldingen-upload.xlsx",
  "uploadtemplate-aanmeldingen.xlsx",
];

export async function GET() {
  const publicTemplatesDir = path.join(process.cwd(), "public", "templates");

  for (const filename of CANDIDATE_FILES) {
    const filePath = path.join(publicTemplatesDir, filename);

    try {
      const file = await fs.readFile(filePath);

      return new NextResponse(file, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      // probeer volgende kandidaat
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Uploadtemplate niet gevonden in public/templates. Verwachte bestandsnamen: fightsupport-aanmeldingen-upload.xlsx, aanmeldingen-upload.xlsx of uploadtemplate-aanmeldingen.xlsx",
    },
    { status: 404 }
  );
}
