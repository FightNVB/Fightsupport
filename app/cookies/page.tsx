"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Cookie } from "lucide-react";

const ORANGE = "#ff4d00";

export default function CookiesPage() {
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
            <Cookie size={34} color={ORANGE} />
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Cookies
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
              FightSupport gebruikt alleen cookies en vergelijkbare technieken
              die nodig zijn om het platform goed en veilig te laten werken.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>
              Functionele cookies
            </h2>
            <p>
              Functionele cookies kunnen worden gebruikt om onder andere
              inlogsessies, beveiliging en technische instellingen van het
              platform te ondersteunen.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>
              Geen advertentiecookies
            </h2>
            <p>
              FightSupport gebruikt geen cookies om gebruikers voor
              advertentiedoeleinden te volgen.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>
              Cookies verwijderen
            </h2>
            <p>
              Je kunt cookies via de instellingen van je browser verwijderen.
              Houd er rekening mee dat noodzakelijke cookies nodig kunnen zijn
              om in te loggen en bepaalde onderdelen van FightSupport te
              gebruiken.
            </p>

            <h2 style={{ color: "#fff", marginTop: 28 }}>Wijzigingen</h2>
            <p>
              Wanneer het gebruik van cookies binnen FightSupport verandert,
              kan deze pagina worden aangepast.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
