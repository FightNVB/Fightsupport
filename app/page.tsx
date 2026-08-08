"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  FileBarChart,
  Medal,
  Scale,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

const platformCards = [
  {
    title: "Matchmaking",
    text: "Slimme matching, boutbeheer en voorbereiding vanuit één omgeving.",
    icon: Dumbbell,
  },
  {
    title: "Controle",
    text: "Documenten, licenties, keurmerken, ervaring en reglementen overzichtelijk gecontroleerd.",
    icon: ShieldCheck,
  },
  {
    title: "Weging",
    text: "Wegingen, categorieën en definitieve line-up veilig verwerken.",
    icon: Scale,
  },
  {
    title: "Uitslagen",
    text: "Registratie, uitslagen en rapportages professioneel afronden.",
    icon: Trophy,
  },
];

const workflow = [
  { label: "Matchmaker", icon: Users },
  { label: "Controle", icon: ClipboardCheck },
  { label: "Officials", icon: Medal },
  { label: "Uitslagen", icon: FileBarChart },
];

const audiences = [
  "Vechtsportbonden",
  "Promotors",
  "Matchmakers",
  "Officials",
  "Sportscholen",
];

const benefits = [
  "Centrale administratie voor evenementen",
  "Controle op licenties, keurmerken en signaleringen",
  "Van matchmaking naar weging en definitieve line-up",
  "Rapportages en uitslagen veilig vastleggen",
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "SportsOrganization"],
      "@id": "https://fightsupport.nl/#organization",
      name: "FightSupport",
      url: "https://fightsupport.nl/",
      logo: "https://fightsupport.nl/icon.png",
      email: "info@fightsupport.nl",
      description: "Digitaal wedstrijdbeheer voor de vechtsport.",
    },
    {
      "@type": "WebSite",
      "@id": "https://fightsupport.nl/#website",
      url: "https://fightsupport.nl/",
      name: "FightSupport",
      inLanguage: "nl-NL",
      publisher: { "@id": "https://fightsupport.nl/#organization" },
    },
  ],
};

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* HERO */}
      <section className="relative min-h-[100svh] w-full overflow-hidden bg-black">
        <Image
          src="/branding/fightsupport/hero.png"
          alt="FightSupport digitaal wedstrijdbeheer voor de vechtsport"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/10" />


        <div className="absolute left-[7vw] bottom-[13vh] z-10 hidden gap-5 lg:flex">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="h-[52px] w-[280px] rounded-[9px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#d9d9d9_18%,#8e8e8e_44%,#f7f7f7_62%,#555_100%)] px-6 text-[13px] font-black uppercase tracking-[0.30em] text-black shadow-[inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-3px_4px_rgba(0,0,0,0.55),0_0_18px_rgba(255,120,0,0.18),0_12px_28px_rgba(0,0,0,0.45)] transition hover:scale-[1.015] hover:brightness-110 active:scale-[0.98]"
          >
            Inloggen
          </button>

          <button
            type="button"
            onClick={() => router.push("/login/register")}
            className="h-[52px] w-[280px] rounded-[9px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#d9d9d9_18%,#8e8e8e_44%,#f7f7f7_62%,#555_100%)] px-6 text-[13px] font-black uppercase tracking-[0.18em] text-black shadow-[inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-3px_4px_rgba(0,0,0,0.55),0_0_18px_rgba(255,120,0,0.18),0_12px_28px_rgba(0,0,0,0.45)] transition hover:scale-[1.015] hover:brightness-110 active:scale-[0.98]"
          >
            Account aanvragen
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col gap-3 px-5 lg:hidden">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="min-h-[54px] rounded-[9px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#d9d9d9_18%,#8e8e8e_44%,#f7f7f7_62%,#555_100%)] px-8 text-sm font-black uppercase tracking-[0.30em] text-black shadow-[inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-3px_4px_rgba(0,0,0,0.55),0_0_22px_rgba(255,120,0,0.24)]"
          >
            Inloggen
          </button>
          <button
            type="button"
            onClick={() => router.push("/login/register")}
            className="min-h-[54px] rounded-[9px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#d9d9d9_18%,#8e8e8e_44%,#f7f7f7_62%,#555_100%)] px-8 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[inset_0_2px_0_rgba(255,255,255,0.95),inset_0_-3px_4px_rgba(0,0,0,0.55),0_0_22px_rgba(255,120,0,0.24)]"
          >
            Account aanvragen
          </button>
        </div>
      </section>

      {/* SEO / PLATFORM */}
      <section className="relative border-y border-orange-500/20 bg-[linear-gradient(180deg,#050505,#0c0c0c,#050505)] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-orange-400">
              Eén platform. Volledige controle.
            </p>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.08em] sm:text-5xl">
              Digitaal wedstrijdbeheer voor de vechtsport
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              FightSupport ondersteunt de complete wedstrijdflow: van matchmaking en controles tot wegingen,
              definitieve line-ups, uitslagenregistratie en rapportage. Eén professioneel platform voor een veilige,
              transparante en georganiseerde vechtsport.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {platformCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.35)]"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-orange-400/35 bg-orange-500/10 text-orange-300 shadow-[0_0_22px_rgba(255,102,0,0.14)]">
                    <Icon size={28} strokeWidth={2.4} />
                  </div>
                  <h2 className="mt-5 text-lg font-black uppercase tracking-[0.1em]">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="bg-black px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-orange-400">
            Een gestroomlijnde werkwijze
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-4 md:gap-3">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="relative">
                  {index < workflow.length - 1 ? (
                    <div className="absolute left-1/2 top-8 hidden h-px w-full bg-gradient-to-r from-orange-500/80 to-orange-500/10 md:block" />
                  ) : null}

                  <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-orange-400/60 bg-zinc-950 text-orange-300 shadow-[0_0_22px_rgba(255,102,0,0.35)]">
                    <Icon size={30} strokeWidth={2.5} />
                  </div>
                  <h2 className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-zinc-100">
                    {step.label}
                  </h2>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOR WHO */}
      <section className="border-y border-white/10 bg-zinc-950 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-orange-400">Voor wie?</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {audiences.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/10 bg-black/70 px-4 py-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEXT FOR GOOGLE */}
      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.42em] text-orange-400">Wat is FightSupport?</p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.08em] sm:text-5xl">
              Vechtsport ondersteuning voor organisaties en officials
            </h2>
            <p className="mt-6 text-base leading-8 text-zinc-300 sm:text-lg">
              FightSupport is een digitaal platform voor wedstrijdbeheer binnen de vechtsport. Het systeem helpt bij
              matchmaking, controle van gegevens, ondersteuning rond de weging, het maken van een definitieve line-up,
              uitslagenregistratie en rapportages. Daarmee krijgen bonden, promotors, matchmakers, officials en
              sportscholen meer overzicht en minder handmatig werk.
            </p>
            <p className="mt-5 text-base leading-8 text-zinc-300 sm:text-lg">
              Het platform is ontwikkeld voor een professionele en veilige wedstrijdorganisatie. Belangrijke informatie
              zoals licenties, startverboden, ervaring, keurmerken, gewicht, categorieën en uitslagen kan centraal worden
              verwerkt en gecontroleerd.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-black uppercase tracking-[0.12em]">Voordelen</h2>
            <div className="mt-6 grid gap-4">
              {benefits.map((item) => (
                <div key={item} className="flex gap-3 text-left text-sm leading-6 text-zinc-300">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-orange-400" size={20} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-orange-400/25 bg-orange-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Contact</p>
              <a
                href="mailto:info@fightsupport.nl"
                className="mt-2 block text-lg font-black text-white hover:text-orange-200"
              >
                info@fightsupport.nl
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-5 py-8 text-center text-xs text-zinc-500 sm:px-8">
        © {new Date().getFullYear()} FightSupport. Alle rechten voorbehouden.
      </footer>
    </main>
  );
}
