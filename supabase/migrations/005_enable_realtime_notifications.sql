-- ==============================================================================
-- Migration: 005_enable_realtime_notifications.sql
-- Purpose: Enable Supabase Realtime for the notifications table.
--
-- Without adding the table to the `supabase_realtime` publication, Postgres
-- never streams change events to clients, so `postgres_changes` subscriptions
-- receive nothing and the UI only updates after a manual refresh.
--
-- REPLICA IDENTITY FULL makes UPDATE/DELETE payloads carry the complete row, so
-- the client can safely replace/remove the matching notification.
--
-- Safe to run repeatedly (idempotent).
-- ==============================================================================

alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
