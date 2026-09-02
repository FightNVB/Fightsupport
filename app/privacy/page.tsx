"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const ORANGE = "#ff4d00";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#fff",
        background:
          "radial-gradient(circle at 50% 0%, rgba(255,104,20,0.10), transparent 22%), linear-gradient(180deg, #030405 0%, #06080b 22%, #010203 100%)",
        padding: "32px 18px 60px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 16px",
            border: "1px solid #9a9a9a",
            background:
              "linear-gradient(180deg,#fff 0%,#ddd 35%,#fafafa 55%,#aaa 100%)",
            color: "#111",
            fontWeight: 900,
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={16} />
          Terug naar dashboard
        </button>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            background:
              "linear-gradient(135deg, rgba(26,29,34,.98), rgba(7,10,15,.98))",
            boxShadow: "0 18px 40px rgba(0,0,0,.45)",
            padding: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldCheck size={34} color={ORANGE} />
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Privacy
              </h1>
              <div
                style={{
                  marginTop: 5,
                  color: ORANGE,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                FightSupport
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 26,
              color: "#dedede",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            <p>
              FightSupport verwerkt persoonsgegevens die nodig zijn voor het
              gebruik van het platform en voor de ondersteuning van
              vechtsportevenementen, matchmaking, controles en bijbehorende
              administratieve processen.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>Welke gegevens</h2>
            <p>
              Afhankelijk van je rol en gebruik kunnen onder andere naam,
              contactgegevens, accountgegevens, rolgegevens en gegevens die
              noodzakelijk zijn voor de uitvoering van wedstrijd- en
              administratieve processen worden verwerkt.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>
              Waarom worden gegevens verwerkt?
            </h2>
            <p>
              Gegevens worden uitsluitend gebruikt voor het functioneren,
              beveiligen en beheren van FightSupport en voor de uitvoering van
              de processen waarvoor het platform wordt gebruikt.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>Beveiliging</h2>
            <p>
              FightSupport neemt passende technische en organisatorische
              maatregelen om persoonsgegevens te beschermen tegen verlies,
              onbevoegde toegang en ongewenste verwerking.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>Bewaartermijnen</h2>
            <p>
              Persoonsgegevens worden niet langer bewaard dan noodzakelijk voor
              het doel waarvoor ze zijn verzameld, tenzij een wettelijke of
              organisatorische bewaarplicht van toepassing is.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>Jouw rechten</h2>
            <p>
              Je kunt verzoeken om inzage, correctie of verwijdering van
              persoonsgegevens, voor zover dit binnen de toepasselijke wet- en
              regelgeving mogelijk is.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>Contact</h2>
            <p>
              Voor vragen over privacy of de verwerking van persoonsgegevens
              kun je contact opnemen met de beheerder van FightSupport.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
