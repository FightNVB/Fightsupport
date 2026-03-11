# FightSupport

Vechtsport ondersteuning platform – Next.js + Supabase.

---

## 🤖 Hoe werkt de AI (GitHub Copilot)?

GitHub Copilot is een **AI die automatisch code schrijft** voor jouw project. Je hoeft zelf geen code te kennen om het te gebruiken. Hieronder staat de volledige werkwijze van begin tot eind.

---

### 📌 De grote lijn: hoe gaat het in z'n werk?

```
Jij typt een taak (Issue)
        ↓
Copilot leest de taak en schrijft de code
        ↓
Copilot maakt een Pull Request (PR) aan — een voorstel voor wijzigingen
        ↓
Jij bekijkt het voorstel (lokaal of op GitHub)
        ↓
Jij keurt goed → de code gaat naar het echte project (main)
```

---

### Stap 1 — Een taak opgeven aan de AI

Een **Issue** is simpelweg een taakje dat je typt op GitHub. De AI leest dit en gaat ermee aan de slag.

1. Ga naar [https://github.com/FightNVB/Fightsupport/issues](https://github.com/FightNVB/Fightsupport/issues)
2. Klik op de groene knop **"New issue"**
3. Geef de taak een duidelijke titel, bijv.:
   - *"Voeg een zoekbalk toe aan de gebruikerslijst"*
   - *"Officials mogen alleen hun eigen bondteam zien"*
4. Schrijf in het tekstvak **wat** er moet gebeuren en **waarom**
5. Klik op **"Submit new issue"**

> 💡 **Tip:** Hoe duidelijker je beschrijft wat je wilt, hoe beter de AI het begrijpt. Schrijf in normaal Nederlands — geen technische termen nodig.

Daarna:
- Ga in het Issue naar **"Assignees"** (rechter kolom)
- Klik op het tandwiel ⚙️ naast Assignees
- Kies **"Copilot"** uit de lijst
- Copilot gaat nu automatisch aan de slag!

---

### Stap 2 — Wachten terwijl Copilot werkt

Nadat je het Issue aan Copilot hebt toegewezen, werkt de AI op de achtergrond. Dit duurt normaal **1 tot 5 minuten**.

Je ziet dan een melding in het Issue:
> *"Copilot started working on this"*

Als het klaar is verschijnt er een link naar een **Pull Request (PR)**.

---

### Stap 3 — De Pull Request (PR) bekijken

Een **Pull Request** is een *voorstel* van de AI. De code is nog **niet** in het echte project verwerkt — je moet het eerst goedkeuren.

**Op GitHub (snel overzicht):**
1. Ga naar [https://github.com/FightNVB/Fightsupport/pulls](https://github.com/FightNVB/Fightsupport/pulls)
2. Klik op de PR van Copilot
3. Klik op het tabblad **"Files changed"** om te zien wat er is aangepast
   - Rode regels = verwijderd
   - Groene regels = toegevoegd

**Lokaal testen (aanbevolen — zie sectie hieronder):**
Download de PR-branch zodat je de wijzigingen echt kunt uitproberen in je browser.

---

### Stap 4 — Goedkeuren of afwijzen

**Als de wijzigingen er goed uitzien:**
1. Klik in de PR op de groene knop **"Merge pull request"**
2. Klik op **"Confirm merge"**
3. De code staat nu in het echte project ✅

**Als er iets niet klopt:**
1. Scroll naar beneden in de PR
2. Schrijf een reactie (comment) met wat er anders moet, bijv.:
   - *"De filterknop werkt niet voor bondteam X"*
   - *"Het overzicht toont nog steeds alle matchmakings"*
3. Copilot leest jouw reactie en past de code aan

> ⚠️ Druk **nooit** op "Merge" als je het nog niet hebt getest. Eenmaal gemerged gaat de code live.

---

### 💬 Hoe communiceer je met de AI?

De AI leest alles wat je **schrijft in het Issue of de PR**. Je kunt gewoon normaal Nederlands typen:

| Wat je wilt | Wat je typt |
|---|---|
| Iets uitleggen | Schrijf een reactie in de PR |
| Om een aanpassing vragen | Schrijf wat er niet klopt in een comment |
| Een nieuwe taak geven | Maak een nieuw Issue aan |
| Meer uitleg vragen | Stel je vraag als comment in het Issue |

---

### ❓ Veelgestelde vragen

**"Kan de AI mijn project kapot maken?"**
Nee — de AI werkt altijd in een aparte branch (een kopie). Jouw echte project (`main`) verandert pas nadat *jij* op Merge hebt geklikt.

**"Wat als ik de wijzigingen niet wil?"**
Klik in de PR op **"Close pull request"**. De PR wordt gesloten en er verandert niets aan je project.

**"Kan ik meerdere taken tegelijk geven?"**
Ja — elk Issue is een aparte taak. Maak gewoon meerdere Issues aan.

**"De AI begrijpt me niet — wat nu?"**
Probeer je taak opnieuw te beschrijven, preciezer en in kleinere stukjes. Bijv. niet *"maak het beter"* maar *"zorg dat officials alleen matchmakings zien van hun eigen bondteam"*.

---

## 🚀 Lokaal opstarten (eerste keer)

### 1. Vereisten

Zorg dat je dit hebt geïnstalleerd:

- [Node.js](https://nodejs.org/) versie **18 of hoger** (download de LTS versie)
- [Git](https://git-scm.com/) (bij VS Code meestal al aanwezig)
- [VS Code](https://code.visualstudio.com/) (aanbevolen editor)

### 2. Project binnenhalen (alleen de eerste keer)

Open een terminal in VS Code (`Ctrl + `` ` ``) en voer uit:

```bash
git clone https://github.com/FightNVB/Fightsupport.git
cd Fightsupport
```

### 3. Packages installeren (alleen de eerste keer, of na updates)

```bash
npm install
```

### 4. Omgevingsvariabelen instellen

Maak een bestand aan met de naam `.env.local` in de hoofdmap van het project.
Kijk in `.env.local.example` voor de benodigde variabelen en vul je eigen Supabase-sleutels in.

> ⚠️ Dit bestand staat in `.gitignore` en wordt nooit naar GitHub gepusht — dit is veilig.

### 5. Development server starten

```bash
npm run dev
```

Open daarna [http://localhost:3000](http://localhost:3000) in je browser.

---

## 🔄 Wijzigingen van een Pull Request (PR) lokaal testen

Heb je een PR gekregen van Copilot (of iemand anders) en wil je die lokaal bekijken?

### Optie A – Via GitHub Desktop (makkelijkst)

1. Open **GitHub Desktop**
2. Ga naar **Repository → Open in GitHub Desktop** (of open het project)
3. Klik linksboven op de branch-knop (staat waarschijnlijk op `main`)
4. Kies de PR-branch, bijv. `copilot/fix-duplicate-load-function-and-add-filter`
5. Klik **Fetch origin** en daarna **Pull origin**
6. Start de dev-server: `npm run dev`

### Optie B – Via terminal in VS Code

```bash
# Haal alle branches op
git fetch origin

# Schakel over naar de PR-branch (vervang de naam)
git checkout copilot/fix-duplicate-load-function-and-add-filter

# Installeer eventuele nieuwe packages
npm install

# Start de server
npm run dev
```

### Terug naar main

```bash
git checkout main
git pull origin main
```

---

## ✅ PR samenvoegen (mergen) in GitHub

Als je de wijzigingen hebt goedgekeurd:

1. Ga naar [https://github.com/FightNVB/Fightsupport/pulls](https://github.com/FightNVB/Fightsupport/pulls)
2. Open de PR
3. Klik op de groene knop **"Merge pull request"**
4. Bevestig met **"Confirm merge"**
5. Haal de wijzigingen daarna lokaal binnen:

```bash
git checkout main
git pull origin main
```

---

## 🧰 Handige commando's

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Start de development server op poort 3000 |
| `npm run build` | Bouw de productie-versie |
| `npm run clean` | Verwijder de buildcache (bij rare fouten) |
| `git status` | Bekijk welke bestanden zijn gewijzigd |
| `git pull origin main` | Haal de laatste versie van main op |
