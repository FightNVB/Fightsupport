-- Remove redundant/unused indexes that add write amplification during FightPassport syncs.
-- The retained VA indexes continue to cover the same lookup paths.
drop index if exists public.fightpassport_results_va_idx;
drop index if exists public.fightpassport_startbans_va_idx;
drop index if exists public.fightpassport_fighters_last_scraped_idx;
