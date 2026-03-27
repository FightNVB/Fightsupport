-- uitslagen_officieel: stores the official results entered by hoofdofficial
CREATE TABLE IF NOT EXISTS public.uitslagen_officieel (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchmaking_id      text        NOT NULL,
  partij_nr           integer     NOT NULL,
  uitslag             text        NOT NULL,
  ingevoerd_door      uuid        REFERENCES auth.users(id),
  ingevoerd_op        timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matchmaking_id, partij_nr)
);

CREATE INDEX IF NOT EXISTS idx_uitslagen_officieel_matchmaking_id ON public.uitslagen_officieel (matchmaking_id);

-- uitslagen_export_log: tracks FightPassport Excel exports
CREATE TABLE IF NOT EXISTS public.uitslagen_export_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchmaking_id      text        NOT NULL,
  geexporteerd_door   uuid        REFERENCES auth.users(id),
  geexporteerd_op     timestamptz NOT NULL DEFAULT now(),
  bestand_naam        text
);

CREATE INDEX IF NOT EXISTS idx_uitslagen_export_log_matchmaking_id ON public.uitslagen_export_log (matchmaking_id);

-- Enable RLS
ALTER TABLE public.uitslagen_officieel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uitslagen_export_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own records
CREATE POLICY "Authenticated users can read uitslagen_officieel"
  ON public.uitslagen_officieel FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert uitslagen_officieel"
  ON public.uitslagen_officieel FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update uitslagen_officieel"
  ON public.uitslagen_officieel FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read uitslagen_export_log"
  ON public.uitslagen_export_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert uitslagen_export_log"
  ON public.uitslagen_export_log FOR INSERT
  TO authenticated WITH CHECK (true);
