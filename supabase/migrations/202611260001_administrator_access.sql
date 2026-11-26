create function public.grant_administrator(p_email text) returns text
language plpgsql security definer set search_path='' as $$
declare
  target_email text := lower(btrim(p_email));
  target_user uuid;
begin
  perform private.assert_admin();

  if target_email is null or length(target_email) not between 3 and 254 then
    return 'unavailable';
  end if;

  select u.id into target_user
  from auth.users u
  join public.user_profiles p on p.user_id = u.id
  where lower(u.email) = target_email
    and u.email_confirmed_at is not null
    and p.enabled and p.deletion_requested_at is null
    and (select count(*) from auth.users candidate where lower(candidate.email) = target_email) = 1
  for share of u, p;

  if target_user is null then
    return 'unavailable';
  end if;

  insert into public.user_roles(user_id, role, granted_by)
  values(target_user, 'administrator', auth.uid())
  on conflict (user_id, role) do nothing;

  -- The existing role_history trigger records the actor and target on insert.
  if found then
    return 'granted';
  end if;
  return 'already_administrator';
end;
$$;

revoke execute on function public.grant_administrator(text) from public, anon, authenticated, service_role;
grant execute on function public.grant_administrator(text) to authenticated;
