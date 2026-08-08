import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const privatePaths = [
  "/api", "/dashboard", "/login", "/reset-password", "/doping",
  "/openbare-matchmaking", "/plan", "/*token=", "/*/upload", "/*/uploads",
  "/*/export", "/*/exports", "/*/rapport", "/*/rapportage",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: privatePaths },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL,
  };
}
