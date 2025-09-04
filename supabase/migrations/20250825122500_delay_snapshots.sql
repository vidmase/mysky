-- Airport delay snapshots (per airport, time-based)
create table if not exists public.airport_delay_snapshots (
  id uuid primary key default gen_random_uuid(),
  airport_iata text not null,
  ts timestamptz not null,
  scheduled_total integer,
  departing_total integer,
  arriving_total integer,
  delayed_15m integer,
  delayed_30m integer,
  delayed_60m integer,
  canceled integer,
  avg_dep_delay_min integer,
  avg_arr_delay_min integer,
  provider_meta jsonb,
  inserted_at timestamptz not null default now()
);

create index if not exists airport_delay_snapshots_airport_ts_idx
  on public.airport_delay_snapshots (airport_iata, ts);

create index if not exists airport_delay_snapshots_ts_idx
  on public.airport_delay_snapshots (ts);

-- Global delay snapshots (aggregated across tracked airports)
create table if not exists public.global_delay_snapshots (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null,
  airports_count integer,
  scheduled_total integer,
  delayed_15m integer,
  delayed_30m integer,
  delayed_60m integer,
  canceled integer,
  avg_dep_delay_min integer,
  avg_arr_delay_min integer,
  provider_meta jsonb,
  inserted_at timestamptz not null default now()
);

create index if not exists global_delay_snapshots_ts_idx
  on public.global_delay_snapshots (ts);
