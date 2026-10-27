# Total Scraper → FightSystem sportschoolkoppelingen (28 oktober 2026)

## Bron van waarheid
De Total Scraper schrijft per VA naar `public.fightpassport_fighters.raw_details.sportscholen_actueel`.
Een database-trigger `trg_total_fighter_school_sync` roept `nvb_platform.sync_fighter_schools_from_total(va)` aan na INSERT/UPDATE van `raw_details`.

De functie koppelt alleen wanneer:
- de vechter in `nvb_platform.fighters` bestaat;
- een niet-lege lijst met maximaal twaalf sportscholen aanwezig is;
- precies één school `is_huidig=true` heeft;
- iedere school exact en uniek op naam én plaats matcht in `nvb_platform.sportschools`.

Bij twijfel blijft de bestaande koppeling ongewijzigd. Bij succes worden oude, niet-bevestigde `fightpassport_school_fighters`-relaties uit `nvb_platform.fighter_sportschools` verwijderd. Andere handmatige bronnen worden niet verwijderd.

## Live verwerking
Op 28 oktober 2026 zijn 6.124 recente profielen in batches gecontroleerd:
- 3.269 gesynchroniseerd;
- 44 niet eenduidig te koppelen;
- 2.811 zonder precies één actuele sportschool.
De eerste testbatch van 250 was onderdeel van de latere batch en is niet dubbel geteld.

## Scrapers
- `ControlEngine/scrapers/sportscholen/scraper_sportscholen.js` slaat VECHTERS/Excel over en blijft keurmerkgegevens verwerken.
- `ControlEngine/scrapers/team/scraper_team.js` en `ControlEngine/scrapers/fp_total/scraper_team.js` stoppen vóór de oude Excel-import. Bestaande callers krijgen een lege lijst; zij moeten uiteindelijk op de Total Scraper-status worden aangesloten.

## Controle SQL
```sql
select tgname from pg_trigger
where tgrelid='public.fightpassport_fighters'::regclass
and tgname='trg_total_fighter_school_sync';

select s.name, fs.is_current, fs.source
from nvb_platform.fighter_sportschools fs
join nvb_platform.sportschools s on s.id=fs.sportschool_id
join nvb_platform.fighters f on f.id=fs.fighter_id
where f.va_number=19294;
```

## Openstaande werkzaamheden
- De gewijzigde scrapers moeten nog op de VPS worden uitgerold en met echte runs getest.
- Niet-eenduidige en oude profielen moeten apart worden onderzocht, niet automatisch overschreven.
- De legacy `public.fightpassport_school_fighters` tabel en alle API-consumenten moeten nog worden gemigreerd naar de canonieke koppelingen; oude rijen mogen niet zonder broncontrole massaal worden gewist.
- Bewaar de live functie- en triggerdefinities in een versioned database-migratie voordat een volgende databaseomgeving wordt ingericht.
