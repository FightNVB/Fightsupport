// lib/control/enrichControleBoutContext.ts
//
// Eén bron van waarheid voor de sportschool/keurmerk-enrich.
// De matchmaker-enrich bevat de uitgebreidste naam-, alias-, plaats- en
// FightPassport-koppeling en behandelt de MM-sportschool als zoekdoel.
// Door control/admin dezelfde implementatie te laten gebruiken kunnen de
// uitkomsten niet meer uiteenlopen (o.a. "MT Utrecht" mag nooit als Malta
// worden geïnterpreteerd terwijl Matchmaker hem als Muay Thai Utrecht matcht).

export { enrichControleBoutContext } from "@/lib/matchmaker/enrichControleBoutContext";
