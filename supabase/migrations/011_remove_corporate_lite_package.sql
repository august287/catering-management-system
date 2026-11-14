-- ==============================================================================
-- Migration: 011_remove_corporate_lite_package.sql
-- Removes the "Corporate Lite Executive" package. It is not one of the client's
-- actual offerings (Package A / B / C).
--
-- reservations.package_id is ON DELETE SET NULL, so any past booking that used
-- this package keeps its row and total; it just no longer links to a package.
--
-- Safe to run repeatedly.
-- ==============================================================================

delete from public.packages
where name = 'Corporate Lite Executive';
