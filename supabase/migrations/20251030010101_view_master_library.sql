-- master library view: expose template tasks with org names
create or replace view view_master_library as
  select t.*, o.name as organization_name
  from tasks t
    left join organizations o on t.organization_id = o.id
  where t.origin = 'template';
