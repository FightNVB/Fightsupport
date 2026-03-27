-- ===========================================
-- SCHEMA INTEGRITY: Foreign keys, constraints, indexes
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)
-- ===========================================

-- ---------------------------------------------------------------------------
-- 1. Foreign key: weigh_in_bouts -> matchmaking_uploads
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_weigh_in_bouts_matchmaking'
      AND table_name = 'weigh_in_bouts'
  ) THEN
    ALTER TABLE public.weigh_in_bouts
      ADD CONSTRAINT fk_weigh_in_bouts_matchmaking
      FOREIGN KEY (matchmaking_id)
      REFERENCES public.matchmaking_uploads(matchmaking_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Unique constraint: weigh_in_bouts (matchmaking_id, partij_nr)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_bout_per_matchmaking'
      AND table_name = 'weigh_in_bouts'
  ) THEN
    ALTER TABLE public.weigh_in_bouts
      ADD CONSTRAINT unique_bout_per_matchmaking
      UNIQUE (matchmaking_id, partij_nr);
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Index: matchmaking_uploads.status (common filter)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_matchmaking_uploads_status
  ON public.matchmaking_uploads(status);

-- ---------------------------------------------------------------------------
-- 4. Index: matchmaking_uploads.uploaded_by (owner lookups)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_matchmaking_uploads_uploaded_by
  ON public.matchmaking_uploads(uploaded_by);

-- ---------------------------------------------------------------------------
-- 5. Index: matchmaking_uploads.bondteam (team-based access)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_matchmaking_uploads_bondteam
  ON public.matchmaking_uploads(bondteam);

-- ---------------------------------------------------------------------------
-- 6. Index: weigh_in_bouts.matchmaking_id (common join)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_weigh_in_bouts_matchmaking_id
  ON public.weigh_in_bouts(matchmaking_id);

-- ---------------------------------------------------------------------------
-- 7. Index: dispensatie_requests.matchmaking_id
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dispensatie_requests_matchmaking_id
  ON public.dispensatie_requests(matchmaking_id);

-- ---------------------------------------------------------------------------
-- 8. Index: dispensatie_requests.status
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dispensatie_requests_status
  ON public.dispensatie_requests(status);

-- ---------------------------------------------------------------------------
-- 9. Index: user_profiles.role (role-based queries)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON public.user_profiles(role);

-- ---------------------------------------------------------------------------
-- 10. Index: user_profiles.bondteam (bondteam-based access)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_bondteam
  ON public.user_profiles(bondteam);

-- ---------------------------------------------------------------------------
-- 11. Check constraint: matchmaking_uploads.status valid enum
--     (add any additional statuses your app uses)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_matchmaking_uploads_status'
      AND table_name = 'matchmaking_uploads'
  ) THEN
    ALTER TABLE public.matchmaking_uploads
      ADD CONSTRAINT chk_matchmaking_uploads_status
      CHECK (
        status IS NULL OR status IN (
          'concept',
          'uploading',
          'uploaded',
          'processing',
          'matched',
          'weighted',
          'ready_for_results',
          'results_entered',
          'definitief',
          'archived'
        )
      );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 12. Check constraint: dispensatie_requests.status valid enum
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_dispensatie_requests_status'
      AND table_name = 'dispensatie_requests'
  ) THEN
    ALTER TABLE public.dispensatie_requests
      ADD CONSTRAINT chk_dispensatie_requests_status
      CHECK (
        status IN ('open', 'approved', 'rejected', 'withdrawn')
      );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 13. Audit trigger: updated_at auto-update for matchmaking_uploads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_matchmaking_uploads()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_matchmaking_uploads'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_matchmaking_uploads
    BEFORE UPDATE ON public.matchmaking_uploads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_matchmaking_uploads();
  END IF;
END
$$;
