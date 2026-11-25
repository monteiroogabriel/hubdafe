-- Public account choices never grant administrative permissions.
alter table public.user_profiles add column account_type text not null default 'provider' check (account_type in ('provider','customer'));
alter table public.user_profiles add column phone text not null default '';
alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('provider','customer','administrator'));

create or replace function private.bootstrap_user() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen_type text;
begin
 chosen_type := case when new.raw_user_meta_data->>'account_type' = 'customer' then 'customer' else 'provider' end;
 insert into public.user_profiles(user_id,display_name,phone,account_type)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),100),left(coalesce(new.raw_user_meta_data->>'phone',''),30),chosen_type);
 insert into public.user_roles(user_id,role) values(new.id,chosen_type);
 return new;
end $$;

create or replace function public.owns_provider(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.account_enabled()
 and exists(select 1 from public.user_roles where user_id=auth.uid() and role='provider')
 and exists(select 1 from public.provider_profiles where id=p_id and owner_user_id=auth.uid())
$$;

-- A caller must hold the provider role to create a provider identity.
create function private.guard_provider_creation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=new.owner_user_id and role='provider') then
 raise exception 'PROVIDER_ROLE_REQUIRED';
 end if;
 return new;
end $$;
create trigger provider_role_required before insert on public.provider_profiles for each row execute function private.guard_provider_creation();
revoke execute on function private.guard_provider_creation() from public,anon,authenticated,service_role;
