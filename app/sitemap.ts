import type { MetadataRoute } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SITE_URL } from "@/lib/seo";

const EXCLUDED_SEGMENTS = new Set([
  "api", "dashboard", "admin", "beheer", "officials", "trainer", "matchmaker",
  "login", "reset-password", "doping", "openbare-matchmaking", "plan", "uploads",
  "exports", "rapportages", "tools",
]);

type PublicRoute = { pathname: string; lastModified: Date };

async function discoverPublicRoutes(directory = path.join(process.cwd(), "app"), segments: string[] = []): Promise<PublicRoute[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true, encoding: "utf8" }).catch(() => null);
  if (!entries) {
    // The homepage is still available in minimal/standalone deployments where
    // source files are not shipped alongside the server bundle.
    return segments.length === 0 ? [{ pathname: "/", lastModified: new Date(0) }] : [];
  }

  const normalized = segments.filter((segment) => !segment.startsWith("(") && !segment.startsWith("@"));
  const blocked = normalized.some((segment) => EXCLUDED_SEGMENTS.has(segment.toLowerCase()));
  const dynamic = normalized.some((segment) => segment.startsWith("[") || segment.includes("token"));
  if (blocked || dynamic) return [];

  const page = entries.find((entry) => entry.isFile() && entry.name === "page.tsx");
  const ownRoute = page
    ? [{
        pathname: normalized.length ? `/${normalized.join("/")}` : "/",
        lastModified: new Date((await fs.stat(path.join(directory, page.name))).mtimeMs),
      }]
    : [];

  const children = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("."))
      .map((entry) => discoverPublicRoutes(path.join(directory, entry.name), [...segments, entry.name])),
  );
  return [...ownRoute, ...children.flat()];
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await discoverPublicRoutes();
  return routes.map(({ pathname, lastModified }) => ({
    url: new URL(pathname, SITE_URL).toString(),
    lastModified,
    changeFrequency: pathname === "/" ? "weekly" : "monthly",
    priority: pathname === "/" ? 1 : 0.7,
  }));
}
