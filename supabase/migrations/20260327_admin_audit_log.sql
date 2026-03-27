-- ===========================================
-- ADMIN AUDIT LOG: Comprehensive activity tracking
-- Logs all admin actions (CREATE, UPDATE, DELETE)
-- ===========================================

-- ---------------------------------------------------------------------------
-- 1. Main audit log table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_beheer_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  
  -- Actor (who did it)
  actor_user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email         text,
  actor_role          text,
  
  -- Action (what happened)
  action              text        NOT NULL,
  entity_type         text        NOT NULL,
  entity_id           text,
  
  -- Context (matchmaking/partij_nr)
  matchmaking_id      text,
  partij_nr           integer,
  
  -- Changes (before/after)
  old_value           jsonb,
  new_value           jsonb,
  
  -- Extra metadata
  meta                jsonb
);

-- ---------------------------------------------------------------------------
-- 2. Indexes for common queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_beheer_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_user_id
  ON public.admin_beheer_audit_log(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON public.admin_beheer_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity_type
  ON public.admin_beheer_audit_log(entity_type);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_matchmaking_id
  ON public.admin_beheer_audit_log(matchmaking_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_beheer_audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. RLS Policies: Only admins can read audit log
-- ---------------------------------------------------------------------------
CREATE POLICY "Only admins can read audit log"
  ON public.admin_beheer_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- No one can insert/update/delete directly via RLS
-- (Only triggers and backend functions can write)

-- ---------------------------------------------------------------------------
-- 5. Helper function: log_audit_event()
-- Logs an event to the audit table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_user_id uuid,
  p_actor_email text,
  p_actor_role text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_matchmaking_id text,
  p_partij_nr integer,
  p_old_value jsonb,
  p_new_value jsonb,
  p_meta jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.admin_beheer_audit_log (
    actor_user_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    matchmaking_id,
    partij_nr,
    old_value,
    new_value,
    meta
  ) VALUES (
    p_actor_user_id,
    p_actor_email,
    p_actor_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_matchmaking_id,
    p_partij_nr,
    p_old_value,
    p_new_value,
    p_meta
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Trigger example: Log uitslagen_officieel changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_uitslagen_officieel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      (SELECT role FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1),
      'snapshot_created',
      'uitslagen_officieel',
      NEW.id::text,
      NEW.matchmaking_id,
      NEW.partij_nr,
      NULL,
      jsonb_build_object(
        'id', NEW.id,
        'matchmaking_id', NEW.matchmaking_id,
        'partij_nr', NEW.partij_nr,
        'uitslag', NEW.uitslag
      ),
      jsonb_build_object('table', 'uitslagen_officieel', 'operation', 'INSERT')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      (SELECT role FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1),
      'snapshot_modified',
      'uitslagen_officieel',
      NEW.id::text,
      NEW.matchmaking_id,
      NEW.partij_nr,
      jsonb_build_object(
        'id', OLD.id,
        'uitslag', OLD.uitslag,
        'updated_at', OLD.updated_at
      ),
      jsonb_build_object(
        'id', NEW.id,
        'uitslag', NEW.uitslag,
        'updated_at', NEW.updated_at
      ),
      jsonb_build_object('table', 'uitslagen_officieel', 'operation', 'UPDATE')
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      (SELECT role FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1),
      'snapshot_deleted',
      'uitslagen_officieel',
      OLD.id::text,
      OLD.matchmaking_id,
      OLD.partij_nr,
      jsonb_build_object(
        'id', OLD.id,
        'matchmaking_id', OLD.matchmaking_id,
        'partij_nr', OLD.partij_nr,
        'uitslag', OLD.uitslag
      ),
      NULL,
      jsonb_build_object('table', 'uitslagen_officieel', 'operation', 'DELETE')
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_audit_uitslagen_officieel'
  ) THEN
    CREATE TRIGGER trg_audit_uitslagen_officieel
    AFTER INSERT OR UPDATE OR DELETE ON public.uitslagen_officieel
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_uitslagen_officieel();
  END IF;
END
$$;

