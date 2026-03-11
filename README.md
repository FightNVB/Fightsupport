# FightSupport

Vechtsport ondersteuning platform – Next.js + Supabase.

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
