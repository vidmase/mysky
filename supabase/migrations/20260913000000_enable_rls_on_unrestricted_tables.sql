-- Enable RLS on public tables that PostgREST exposes to the anon key.
--
-- The anon key ships in the browser bundle, so every table below was readable
-- AND writable by anyone who opened the site. Verified before applying:
--   * app code reaches only airport_delay_snapshots and all_airport_gps of these;
--     everything else goes through the service-role client (lib/supabase-server.ts),
--     which bypasses RLS, so enabling it changes nothing for the app.
--   * all tables are owned by postgres, and n8n connects as postgres, so RLS
--     does not apply to n8n's own queries.
--
-- Deliberately NOT touched (owner unknown - no reference in this repo):
--   bills, bill_shares, documents, processed_data, user_activity

-- n8n's tables. This repo never queries them.
alter table public.annotation_tag_entity      enable row level security;
alter table public.auth_identity              enable row level security;
alter table public.auth_provider_sync_history enable row level security;
alter table public.credentials_entity         enable row level security;
alter table public.event_destinations         enable row level security;
alter table public.execution_annotation_tags  enable row level security;
alter table public.execution_annotations      enable row level security;
alter table public.execution_data             enable row level security;
alter table public.execution_entity           enable row level security;
alter table public.execution_metadata         enable row level security;
alter table public.folder                     enable row level security;
alter table public.folder_tag                 enable row level security;
alter table public.installed_nodes            enable row level security;
alter table public.installed_packages         enable row level security;
alter table public.invalid_auth_token         enable row level security;
alter table public.migrations                 enable row level security;
alter table public.project                    enable row level security;
alter table public.project_relation           enable row level security;
alter table public.role                       enable row level security;
alter table public.settings                   enable row level security;
alter table public.shared_credentials         enable row level security;
alter table public.shared_workflow            enable row level security;
alter table public.tag_entity                 enable row level security;
alter table public.test_case_execution        enable row level security;
alter table public.test_definition            enable row level security;
alter table public.test_metric                enable row level security;
alter table public.test_run                   enable row level security;
alter table public."user"                     enable row level security;
alter table public.user_api_keys              enable row level security;
alter table public.variables                  enable row level security;
alter table public.webhook_entity             enable row level security;
alter table public.workflow_entity            enable row level security;
alter table public.workflow_history           enable row level security;
alter table public.workflow_statistics        enable row level security;
alter table public.workflows_tags             enable row level security;

-- Flight-domain tables. flights, flightlog_users, chat_message_reactions,
-- all_airport_gps and occupancy_history already carry policies that were
-- inert because RLS was off; enabling it makes them take effect.
alter table public.airlines                enable row level security;
alter table public.airlines_logo           enable row level security;
alter table public.airport_coordinates     enable row level security;
alter table public.airport_countries       enable row level security;
alter table public.airport_delay_snapshots enable row level security;
alter table public.airports                enable row level security;
alter table public.all_airport_gps         enable row level security;
alter table public.chat_message_reactions  enable row level security;
alter table public.flight_delays           enable row level security;
alter table public.flight_details          enable row level security;
alter table public.flightlog_users         enable row level security;
alter table public.flights                 enable row level security;
alter table public.global_delay_snapshots  enable row level security;
alter table public.occupancy_history       enable row level security;

-- app/api/delays/* reads this one with the anon key, so it needs an explicit
-- read policy. Public reference data (airport delay statistics), read-only:
-- writes stay closed and continue to go through the service-role ingest path.
drop policy if exists "airport_delay_snapshots public read" on public.airport_delay_snapshots;
create policy "airport_delay_snapshots public read"
  on public.airport_delay_snapshots
  for select
  to anon, authenticated
  using (true);
