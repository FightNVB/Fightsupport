// Self-hosted fonts — no external network requests at build time.
import localFont from "next/font/local";

export const inter = localFont({
  src: [
    {
      path: "../public/fonts/Inter-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Inter-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
});

export const bebasNeue = localFont({
  src: "../public/fonts/BebasNeue-Regular.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});
