create or replace function public.manage_category(
  p_id uuid, p_name text, p_slug text, p_description text, p_active boolean, p_order integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result uuid;
begin
  perform private.assert_admin();
  if p_id is null then
    insert into public.categories(name, slug, description, is_active, sort_order)
    values (p_name, p_slug, left(p_description, 500), p_active, p_order)
    returning id into result;
  else
    update public.categories
    set name = p_name, slug = p_slug, description = left(p_description, 500),
        is_active = p_active, sort_order = p_order
    where id = p_id
    returning id into result;
  end if;
  if result is not null then
    perform private.audit('category_updated', result);
  end if;
  return result;
end $$;

create function public.delete_category(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  removed record;
begin
  perform private.assert_admin();
  begin
    delete from public.categories where id = p_id returning name, slug into removed;
  exception when foreign_key_violation then
    return 'in_use';
  end;
  if not found then
    return 'missing';
  end if;
  perform private.audit('category_deleted', p_id, jsonb_build_object('name', removed.name, 'slug', removed.slug));
  return 'deleted';
end $$;

revoke execute on function public.delete_category(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_category(uuid) to authenticated;
