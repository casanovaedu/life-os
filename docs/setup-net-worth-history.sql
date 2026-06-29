-- 1. Create the snapshots table
CREATE TABLE net_worth_snapshots (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  net_worth  numeric(10,2) not null,
  created_at timestamptz default now()
);

-- 2. Backfill today (run manually to seed the first point)
INSERT INTO net_worth_snapshots (date, net_worth)
SELECT CURRENT_DATE, SUM(balance) FROM accounts
ON CONFLICT (date) DO UPDATE SET net_worth = EXCLUDED.net_worth;

-- 3. n8n cron node fires daily at 23:50 with this SQL via Supabase HTTP:
-- POST /rest/v1/rpc/snapshot_net_worth  (create the function below)

-- 4. Supabase function for the cron to call
CREATE OR REPLACE FUNCTION snapshot_net_worth()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO net_worth_snapshots (date, net_worth)
  SELECT CURRENT_DATE, SUM(balance) FROM accounts
  ON CONFLICT (date) DO UPDATE SET net_worth = EXCLUDED.net_worth;
END;
$$;
