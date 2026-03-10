"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import NvbDarkButton from "@/components/NvbDarkButton";
import NvbLightButton from "@/components/NvbLightButton";

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const NVB_ORANGE = "#ff4d00";

function metalText(): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, #ffffff 0%, #d6d6d6 45%, #9a9a9a 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

export default function InformatiePage() {
  const router = useRouter();

  const documenten = [
    { titel: "NVB Wedstrijdreglement", bestand: "/nvb_wedstrijdreglement.pdf" },
    { titel: "NVB Matchmaker Reglement", bestand: "/nvb_Matchmaker_reglement.pdf" },
    { titel: "NVB Promotor Beleid", bestand: "/nvb_Promotor_beleid.pdf" },
    { titel: "Sparring Evenementen", bestand: "/Sparring_evenementen.pdf" },
    {
      titel: "Algemene Gedragsregels Full Contact",
      bestand: "/algemene_gedragsregels_full_contact.pdf",
    },
    {
      titel: "Beslisboom Talentstatus Hoofdcontact",
      bestand: "/Beslisboom talentstatus hoofdcontact (3).pdf",
    },
    { titel: "Tuchtreglement 2025", bestand: "/tuchtreglement_2025.pdf" },
  ];

  const kennistoets = {
    titel: "NVB Kennistoets (Publiek)",
    link: "https://form.jotform.com/252374559618064",
  };

  const separator = useMemo(
    () =>
      ({
        height: "1px",
        background:
          "linear-gradient(to right, transparent, rgba(220,220,220,0.25), transparent)",
      }) as React.CSSProperties,
    []
  );

  return (
    // Let op: geen bg-black hier, want jouw /dashboard/layout doet de achtergrond al.
    <main className="flex items-center justify-center min-h-screen px-4 py-6">
      <div className="relative w-full max-w-[560px]">
        {/* zachte buiten-gloed */}
        <div
          className="pointer-events-none absolute -inset-12 rounded-[48px]"
          style={{
            boxShadow: "0 0 80px rgba(255,77,0,0.14)",
          }}
        />

        {/* frame */}
        <div className="relative rounded-[42px] p-[10px]">
          {/* METAAL BASIS – ZONDER VEGEN */}
          <div
            className="absolute inset-0 rounded-[42px]"
            style={{
              background:
                "linear-gradient(180deg, #d0d0d0 0%, #8f8f8f 50%, #2a2a2a 100%)",
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.35),
                0 0 0 2px rgba(120,120,120,0.20),
                0 30px 80px rgba(0,0,0,0.70)
              `,
            }}
          />

          {/* RAND: ZILVER → ORANJE (strak) */}
          <div
            className="relative rounded-[34px] p-[2px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(230,230,230,0.85) 0%, rgba(180,180,180,0.40) 22%, rgba(255,77,0,0.55) 65%, rgba(255,77,0,0.95) 100%)",
            }}
          >
            {/* content */}
            <div
              className="rounded-[32px] px-6 py-6"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,10,10,0.98), rgba(5,5,5,0.98))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* HEADER (zelfde stijl als Admin Portaal) */}
              <div
                className="mb-6 rounded-xl text-center"
                style={{
                  padding: "14px 16px",
                  background:
                    "linear-gradient(180deg, rgba(255,77,0,0.28), rgba(0,0,0,0))",
                  border: "1px solid rgba(255,77,0,0.30)",
                }}
              >
                <div
                  className={inter.className}
                  style={{
                    ...metalText(),
                    fontSize: 30,
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  REGLEMENTEN &amp; INFORMATIE
                </div>
              </div>

              {/* LOGO (zelfde spacing als Admin Portaal) */}
              <div className="flex flex-col items-center mb-6">
                <Image
                  src="/branding/fightsupport/logo-dark.png"
                  width={150}
                  height={80}
                  alt="FightSupport"
                  priority
                />

                <div
                  className={`${inter.className} mt-2`}
                  style={{
                    color: NVB_ORANGE,
                    letterSpacing: "0.12em",
                    fontSize: 16,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  FIGHTSUPPORT
                </div>

                {/* rustige tagline (normale letters) */}
                <div
                  className={inter.className}
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    fontWeight: 500,
                    color: "rgba(220,220,220,0.75)",
                  }}
                >
                  Vechtsport ondersteuning
                </div>
              </div>

              <div className="my-4" style={separator} />

              {/* ACTIES (zelfde plek/feel als Admin Portaal) */}
              <div className="flex flex-col gap-3">
                {documenten.map((doc) => (
                  <NvbDarkButton
                    key={doc.bestand}
                    label={doc.titel}
                    onClick={() => window.open(doc.bestand, "_blank")}
                  />
                ))}

                <NvbDarkButton
                  label={kennistoets.titel}
                  onClick={() => window.open(kennistoets.link, "_blank")}
                />
              </div>

              <div className="my-4" style={separator} />

              {/* TERUG (zelfde als Admin Portaal) */}
              <NvbLightButton
                label="Terug naar dashboard"
                onClick={() => router.push("/dashboard")}
              />

              <p className="mt-4 text-xs text-center text-white/50">
                © FightSupport
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}