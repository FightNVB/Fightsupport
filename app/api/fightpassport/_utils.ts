import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export function resolveScraperUtilsPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "utils", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers", "utils", ...parts),
    path.join(root, "scrapers", "utils", ...parts),
  ];
  const dirCandidates = candidates.map((p) => path.dirname(p));
  for (const d of dirCandidates) {
    if (fs.existsSync(d)) return path.join(d, ...parts);
  }
  const fallback = path.join(root, "ControlEngine", "scrapers", "utils", ...parts);
  fs.mkdirSync(path.dirname(fallback), { recursive: true });
  return fallback;
}

export function readJsonFile(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}
