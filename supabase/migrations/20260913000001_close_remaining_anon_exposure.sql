-- Follow-up to 20260913000000: the objects that sweep missed.
--
-- The first pass filtered pg_class to relkind='r', so views were never
-- considered, and five tables were held back as unattributed. Since then:
--   * processed_data  - n8n's (camelCase workflowId/createdAt columns)
--   * documents       - pgvector store (id/content/metadata/embedding), n8n's
--   * user_activity   - ours: written only by SECURITY DEFINER functions
--                       (see 20240322000000_fix_disabled_sync.sql), never
--                       from client code, so RLS does not affect the writers
--   * bills, bill_shares - belong to the property/tenant app that shares this
--                       database. Its sibling tables (properties, tenants,
--                       bookings, availability, services) already run with RLS
--                       on, so these two look like an oversight there rather
--                       than a deliberate exemption.

alter table public.processed_data enable row level security;
alter table public.documents      enable row level security;
alter table public.user_activity  enable row level security;
alter table public.bills          enable row level security;
alter table public.bill_shares    enable row level security;

-- events_log is a view over event_logs. event_logs itself has RLS with two
-- policies, but a view without security_invoker executes as its owner
-- (postgres), so reading through the view bypassed those policies entirely --
-- anon could see every row of a table that was supposed to be protected.
-- security_invoker makes the view run as the caller, so event_logs' own
-- policies apply. No code in this repo queries the view.
alter view public.events_log set (security_invoker = on);
