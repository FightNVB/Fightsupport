"use client";

import type { ReactNode } from "react";
import { authedDownload } from "@/lib/api/authedDownload";

export function AuthenticatedDownloadButton({
  href,
  filename,
  className,
  children,
}: {
  href: string;
  filename: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => void authedDownload(href, filename)}
    >
      {children}
    </button>
  );
}
