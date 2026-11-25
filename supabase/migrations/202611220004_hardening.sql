-- Recheck confirmation and account status on every authorized database operation.
alter table private.rate_limits enable row level security;
alter table private.idempotency enable row level security;
alter table private.cleanup_jobs enable row level security;
create or replace function public.account_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_profiles p join auth.users u on u.id=p.user_id where p.user_id=auth.uid() and p.enabled and p.deletion_requested_at is null and u.email_confirmed_at is not null)
$$;
alter table public.provider_revisions add constraint email_format check(public_email='' or (length(public_email)<=254 and public_email ~ '^[^[:space:]@?&#]+@[^[:space:]@?&#]+\.[^[:space:]@?&#]+$'));
alter table public.provider_revisions add constraint phone_format check(public_phone='' or public_phone ~ '^\+[1-9][0-9]{6,14}$');
alter table public.provider_revisions add constraint whatsapp_format check(public_whatsapp='' or public_whatsapp ~ '^\+[1-9][0-9]{6,14}$');
alter table public.provider_revisions add constraint identity_lengths check(length(professional_name)<=100 and length(business_name)<=100 and length(city)<=100 and length(region)<=100 and length(website_url)<=2000);
alter table public.provider_service_areas add constraint area_format check(country ~ '^[A-Z]{2}$' and length(region)<=100);
alter table public.quote_requests add constraint quote_email check(requester_email is null or (length(requester_email)<=254 and requester_email ~ '^[^[:space:]@?&#]+@[^[:space:]@?&#]+\.[^[:space:]@?&#]+$'));
alter table public.quote_requests add constraint quote_phone check(requester_phone is null or requester_phone ~ '^\+[1-9][0-9]{6,14}$');
alter table public.quote_requests add constraint quote_location check(length(service_location)<=150);

create function private.role_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then perform private.audit(tg_table_name||'_revoked',old.user_id);return old;
 else perform private.audit(tg_table_name||'_granted',new.user_id);return new;end if;
end $$;
create trigger role_history after insert or update or delete on public.user_roles for each row execute function private.role_audit();
create trigger capability_history after insert or update or delete on public.admin_capabilities for each row execute function private.role_audit();
create function private.provision_administrator(p_user uuid,p_quote_support boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_CONFIRMED';end if;
 if not exists(select 1 from auth.mfa_factors where user_id=p_user and status='verified' and factor_type='totp') then raise exception 'MFA_REQUIRED';end if;
 insert into public.user_roles(user_id,role) values(p_user,'administrator') on conflict do nothing;
 if p_quote_support then insert into public.admin_capabilities(user_id,capability) values(p_user,'quote_support') on conflict do nothing;end if;
end $$;
revoke execute on all functions in schema private from public,anon,authenticated,service_role;
