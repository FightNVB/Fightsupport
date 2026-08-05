import { authedFetch } from "@/lib/api/authedFetch";

export async function authedDownload(url: string, fallbackName: string) {
  const response = await authedFetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Download mislukt.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  const disposition = response.headers.get("content-disposition") ?? "";
  link.download = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
