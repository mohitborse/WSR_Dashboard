-- Migration: add week tracking to WSR reports so developers can submit
-- WSR twice per sprint (week_number = 1 or 2). Also add optional
-- start_date / end_date columns to make week boundaries explicit.

BEGIN;

ALTER TABLE IF EXISTS wsr_reports
  ADD COLUMN IF NOT EXISTS week_number smallint NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS wsr_reports
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE IF EXISTS wsr_reports
  ADD COLUMN IF NOT EXISTS end_date date;

-- Create a new unique index that includes week_number so the same
-- developer can have multiple reports within a sprint (one per week).
CREATE UNIQUE INDEX IF NOT EXISTS idx_wsr_dev_sprint_week_unique
  ON wsr_reports (developer_id, sprint_id, week_number);

-- Attempt to remove the older unnamed unique constraint on
-- (developer_id, sprint_id) if it exists. This block tries to find
-- the constraint by matching contype='u' and the column numbers.
DO $$
DECLARE
  c text;
  dev_att int;
  sprint_att int;
BEGIN
  SELECT attnum INTO dev_att FROM pg_attribute WHERE attrelid = 'wsr_reports'::regclass AND attname = 'developer_id';
  SELECT attnum INTO sprint_att FROM pg_attribute WHERE attrelid = 'wsr_reports'::regclass AND attname = 'sprint_id';
  SELECT conname INTO c FROM pg_constraint
    WHERE conrelid = 'wsr_reports'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[dev_att, sprint_att];
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE wsr_reports DROP CONSTRAINT %I', c);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop old unique constraint for wsr_reports: %', SQLERRM;
END$$;

COMMIT;
