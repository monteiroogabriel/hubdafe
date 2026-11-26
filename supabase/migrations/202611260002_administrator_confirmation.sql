-- Resolve only a unique, active account. The caller must already be a verified administrator.
create function private.administrator_target(p_email text)
returns table (user_id uuid, confirmed boolean)
language sql security definer set search_path='' as $$
  select u.id, u.email_confirmed_at is not null
  from auth.users u
  join public.user_profiles p on p.user_id = u.id
  where length(btrim(p_email)) between 3 and 254
    and lower(u.email) = lower(btrim(p_email))
    and p.enabled and p.deletion_requested_at is null
    and (select count(*) from auth.users candidate where lower(candidate.email) = lower(btrim(p_email))) = 1
  for share of u, p
$$;
revoke execute on function private.administrator_target(text) from public, anon, authenticated, service_role;

create or replace function public.grant_administrator(p_email text) returns text
language plpgsql security definer set search_path='' as $$
declare
  target_user uuid;
  confirmed boolean;
begin
  perform private.assert_admin();
  select t.user_id, t.confirmed into target_user, confirmed from private.administrator_target(p_email) t;
  if target_user is null then return 'unavailable'; end if;
  if not confirmed then return 'confirmation_required'; end if;

  insert into public.user_roles(user_id, role, granted_by)
  values(target_user, 'administrator', auth.uid())
  on conflict (user_id, role) do nothing;

  if found then return 'granted'; end if;
  return 'already_administrator';
end;
$$;

create function public.can_resend_administrator_confirmation(p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform private.assert_admin();
  return exists(select 1 from private.administrator_target(p_email) where not confirmed);
end;
$$;
revoke execute on function public.can_resend_administrator_confirmation(text) from public, anon, authenticated, service_role;
grant execute on function public.can_resend_administrator_confirmation(text) to authenticated;

-- The first role can be assigned before enrollment. The panel still requires AAL2.
create or replace function private.provision_administrator(p_user uuid,p_quote_support boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_CONFIRMED';
  end if;
  if not exists(select 1 from public.user_profiles where user_id=p_user and enabled and deletion_requested_at is null) then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;
  insert into public.user_roles(user_id,role) values(p_user,'administrator') on conflict do nothing;
  if p_quote_support then
    insert into public.admin_capabilities(user_id,capability)
    values(p_user,'quote_support') on conflict do nothing;
  end if;
end;
$$;
