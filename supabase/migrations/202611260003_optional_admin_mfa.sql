-- MFA remains available as an optional account feature, but it is not required
-- to enter the administrator panel or perform administrator operations.
create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.account_enabled()
    and exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role = 'administrator'
    )
$$;

create or replace function private.provision_administrator(
  p_user uuid,
  p_quote_support boolean default false
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists (
    select 1 from auth.users
    where id = p_user and email_confirmed_at is not null
  ) then
    raise exception 'EMAIL_NOT_CONFIRMED';
  end if;

  if not exists (
    select 1 from public.user_profiles
    where user_id = p_user and enabled and deletion_requested_at is null
  ) then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;

  insert into public.user_roles(user_id, role)
  values (p_user, 'administrator')
  on conflict do nothing;

  if p_quote_support then
    insert into public.admin_capabilities(user_id, capability)
    values (p_user, 'quote_support')
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.resolve_file(
  p_key uuid,
  p_user uuid,
  p_aal text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  f public.file_assets;
  permitted boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  select * into f
  from public.file_assets
  where public_key = p_key and state = 'ready';

  if f.id is null then
    return null;
  end if;

  permitted := exists (
    select 1
    from public.user_profiles u
    where u.user_id = p_user
      and u.enabled
      and u.deletion_requested_at is null
      and (
        exists (
          select 1 from public.provider_profiles
          where id = f.provider_id and owner_user_id = p_user
        )
        or exists (
          select 1 from public.user_roles
          where user_id = p_user and role = 'administrator'
        )
      )
  );

  if not permitted and private.can_publish(f.provider_id) then
    permitted := exists (
      select 1
      from public.provider_documents d
      join public.provider_profiles p on p.published_revision_id = d.revision_id
      where d.asset_id = f.id and p.id = f.provider_id
    ) or exists (
      select 1
      from public.service_photos ph
      join public.service_revisions s on s.id = ph.service_revision_id
      join public.provider_profiles p on p.published_revision_id = s.revision_id
      where ph.asset_id = f.id and s.is_active and p.id = f.provider_id
    );
  end if;

  if not permitted then
    return null;
  end if;

  return jsonb_build_object(
    'object_key', f.object_key,
    'mime', f.mime,
    'kind', f.kind
  );
end;
$$;

revoke execute on function private.provision_administrator(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function public.is_administrator()
  from public, anon;
grant execute on function public.is_administrator() to authenticated;
