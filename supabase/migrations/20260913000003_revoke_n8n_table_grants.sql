-- Defence in depth for the n8n tables: remove the PostgREST-facing grants
-- entirely rather than relying on RLS alone.
--
-- Before this, anon and authenticated held DELETE, INSERT, REFERENCES, SELECT,
-- TRIGGER, TRUNCATE and UPDATE on all 37. RLS (added in 20260913000000 and
-- ...0001) filters rows for select/insert/update/delete, but TRUNCATE is a
-- table-level privilege that row policies never see - so anon could still have
-- emptied credentials_entity outright. Revoking the grants closes that and
-- also drops the tables out of the exposed PostgREST/GraphQL schema, which is
-- what the linter's pg_graphql_*_table_exposed warnings are about.
--
-- Safe for n8n: it connects as postgres, which owns every table here, so
-- neither these grants nor RLS apply to it. No code in this repo queries any
-- of these tables. service_role keeps its grants.
do $$
declare t text;
begin
  foreach t in array array[
    -- n8n core
    'annotation_tag_entity','auth_identity','auth_provider_sync_history','credentials_entity',
    'event_destinations','execution_annotation_tags','execution_annotations','execution_data',
    'execution_entity','execution_metadata','folder','folder_tag','installed_nodes',
    'installed_packages','invalid_auth_token','migrations','project','project_relation','role',
    'settings','shared_credentials','shared_workflow','tag_entity','test_case_execution',
    'test_definition','test_metric','test_run','user','user_api_keys','variables',
    'webhook_entity','workflow_entity','workflow_history','workflow_statistics','workflows_tags',
    -- n8n's pgvector store and its processed-data table
    'documents','processed_data'
  ]
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;
