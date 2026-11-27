-- New accounts are always providers, regardless of metadata supplied by the caller.
create or replace function private.bootstrap_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles(user_id, display_name, phone, account_type)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'name', ''), 100),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 30),
    'provider'
  );
  insert into public.user_roles(user_id, role) values (new.id, 'provider');
  return new;
end $$;

-- Keep old requests subject to the existing retention routine.
revoke all privileges on public.quote_requests from public, anon, authenticated, service_role;
drop policy if exists quotes_owner_read on public.quote_requests;
revoke execute on function
  public.consume_quote_limit(text, text),
  public.create_quote(text, uuid, jsonb, uuid, text),
  public.update_quote_status(uuid, text),
  public.support_quote(uuid, text)
from public, anon, authenticated, service_role;

create or replace function public.admin_metrics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.provider_profiles),
    'pending_revisions', (select count(*) from public.provider_revisions where state = 'pending_review'),
    'approved', (select count(*) from public.provider_profiles where status = 'approved'),
    'rejected', (select count(*) from public.provider_profiles where status = 'rejected'),
    'suspended', (select count(*) from public.provider_profiles where status = 'suspended')
  );
end $$;
