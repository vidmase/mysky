-- Two holes RLS cannot close, both reported by the database linter.
--
-- 1. SECURITY DEFINER functions callable by anon over PostgREST.
--    These execute as postgres, so RLS on the underlying tables does not
--    apply. Verified before writing this: POST /rest/v1/rpc/admin_user_list_view
--    returned the full user list to the anon role, and log_user_activity let
--    anyone forge rows in a 23k-row audit table. Neither has an internal
--    authorization check.
--
--    No application code calls any RPC. The only callers are two maintenance
--    scripts (scripts/apply-direct.js, scripts/apply-sql-functions.js) that
--    connect with the service-role key, which these revokes do not affect.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    -- Postgres grants EXECUTE to PUBLIC by default, and anon/authenticated
    -- inherit it from there: revoking from those two roles alone leaves the
    -- function callable. PUBLIC has to go, then service_role gets it back
    -- explicitly so the maintenance scripts keep working.
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- 2. Mutable search_path on SECURITY DEFINER functions is the standard
--    privilege-escalation vector: a caller who can create objects in a schema
--    earlier in the path gets their code run as the definer. Pinning to
--    public, pg_temp rather than '' keeps the vector extension (installed in
--    public) reachable from match_documents.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
      )
      -- pgvector and friends install their functions in public; they are owned
      -- by the extension, not us, and altering them errors out.
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- 3. all_airport_gps had RLS enabled in 20260913000000 but kept a policy
--    granting every operation to everyone, so anon still read (and could
--    write) all 25 rows. The app reads this table through the service-role
--    client, which bypasses RLS, so dropping the policy costs nothing.
--
--    The other always-true policies the linter reports -- availability,
--    bookings, occupancy_history, properties, services, tenants -- belong to
--    the property/tenant app, not this one, and are left alone.
drop policy if exists "Allow all operations for all users" on public.all_airport_gps;
