# ControlEngine Scrapers

Deze map bevat de Puppeteer-scrapers voor FightPassport.

## Installeren

```bash
cd scrapers
npm install
```

## .env

We hebben al een `.env` voor je klaargezet met jouw Supabase URL en service-role key.
Controleer deze waarden en pas eventueel `HEADLESS` aan naar `false` als je de browser wilt zien.

## Full fighter test draaien

```bash
cd scrapers
npm run test:full_fighter
```

De test gebruikt `test_full_fighter.js` en logt een samenvatting van één vechter naar de console.
