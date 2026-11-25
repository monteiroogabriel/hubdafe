-- All application writes go through explicit, transactional operations.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.user_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', enabled boolean not null default true,
 created_at timestamptz not null default now(), deletion_requested_at timestamptz
);
create table public.user_roles (
 user_id uuid references public.user_profiles on delete cascade,
 role text check(role in ('provider','administrator')), granted_by uuid,
 created_at timestamptz not null default now(), primary key(user_id,role)
);
create table public.admin_capabilities (
 user_id uuid references public.user_profiles on delete cascade,
 capability text check(capability='quote_support'), granted_by uuid,
 created_at timestamptz not null default now(), primary key(user_id,capability)
);
create table public.provider_profiles (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null unique references public.user_profiles on delete cascade,
 slug text not null unique default ('membro-' || replace(gen_random_uuid()::text,'-','')),
 status text not null default 'draft' check(status in ('draft','pending_review','approved','rejected','suspended')),
 is_active boolean not null default true, published_revision_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.provider_memberships (
 provider_id uuid primary key references public.provider_profiles on delete cascade,
 verified_at timestamptz, verified_by uuid, membership_date date
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 80),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null default '',
 is_active boolean not null default true, sort_order integer not null default 0
);
create table public.provider_revisions (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles on delete cascade,
 state text not null default 'draft' check(state in ('draft','pending_review','approved','rejected')),
 provider_type text not null default 'individual' check(provider_type in ('individual','business')),
 display_name text not null default '' check(length(display_name)<=100),
 professional_name text not null default '', business_name text not null default '',
 short_description text not null default '' check(length(short_description)<=240),
 full_description text not null default '' check(length(full_description)<=5000),
 public_email text not null default '', public_phone text not null default '', public_whatsapp text not null default '',
 website_url text not null default '' check(website_url='' or website_url ~ '^https://'),
 country text not null default 'BR' check(country ~ '^[A-Z]{2}$'), region text not null default '', city text not null default '',
 provider_message text, version integer not null default 1,
 submitted_at timestamptz, approved_at timestamptz, approved_by uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,provider_id)
);
create unique index one_open_revision on public.provider_revisions(provider_id) where state in ('draft','pending_review');
alter table public.provider_profiles add constraint published_revision_owner foreign key(published_revision_id,id) references public.provider_revisions(id,provider_id) deferrable initially deferred;
create table public.provider_service_areas (
 id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.provider_revisions on delete cascade,
 country text not null default 'BR', region text not null default '', city text not null check(length(city) between 1 and 100)
);
create table public.services (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles on delete cascade,
 public_key uuid not null unique default gen_random_uuid(), unique(id,provider_id)
);
create table public.service_revisions (
 id uuid primary key default gen_random_uuid(), service_id uuid not null, provider_id uuid not null, revision_id uuid not null,
 title text not null check(length(title) between 2 and 120), description text not null check(length(description) between 10 and 5000),
 category_id uuid not null references public.categories on delete restrict,
 is_active boolean not null default true, sort_order integer not null default 0,
 foreign key(service_id,provider_id) references public.services(id,provider_id) on delete cascade,
 foreign key(revision_id,provider_id) references public.provider_revisions(id,provider_id) on delete cascade,
 unique(service_id,revision_id), unique(id,provider_id)
);
create table public.file_assets (
 id uuid primary key default gen_random_uuid(), public_key uuid not null unique default gen_random_uuid(),
 provider_id uuid not null references public.provider_profiles on delete cascade,
 object_key text not null unique, kind text not null check(kind in ('image','pdf')),
 state text not null default 'quarantine' check(state in ('quarantine','ready','rejected')),
 size_bytes integer not null check(size_bytes > 0 and size_bytes <= 5242880), mime text, sha256 text,
 original_name text not null default '', created_at timestamptz not null default now(),
 unique(id,provider_id)
);
create table public.service_photos (
 id uuid primary key default gen_random_uuid(), service_revision_id uuid not null references public.service_revisions on delete cascade,
 asset_id uuid not null references public.file_assets on delete restrict,
 alt_text text not null default '' check(length(alt_text)<=200), sort_order integer not null default 0,
 unique(service_revision_id,asset_id)
);
create table public.provider_documents (
 id uuid primary key default gen_random_uuid(), revision_id uuid not null references public.provider_revisions on delete cascade,
 asset_id uuid not null references public.file_assets on delete restrict,
 kind text not null check(kind in ('avatar','logo','presentation')), unique(revision_id,kind)
);
create table public.moderation_decisions (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles on delete cascade,
 revision_id uuid references public.provider_revisions on delete set null, actor_user_id uuid not null,
 decision text not null, internal_note text not null default '', provider_message text not null default '', created_at timestamptz not null default now()
);
create table public.privacy_records (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles on delete cascade,
 purpose text not null check(purpose='directory_publication'), notice_version text not null,
 accepted_at timestamptz not null default now(), revoked_at timestamptz
);
create unique index one_current_consent on public.privacy_records(provider_id,purpose) where revoked_at is null;
create table public.quote_requests (
 id uuid primary key default gen_random_uuid(), reference uuid not null unique default gen_random_uuid(),
 provider_id uuid not null references public.provider_profiles on delete cascade, service_revision_id uuid,
 requester_name text not null check(length(requester_name) between 2 and 100),
 preferred_contact_method text not null check(preferred_contact_method in ('email','phone','whatsapp')),
 requester_email text, requester_phone text, message text not null check(length(message) between 10 and 3000),
 service_location text not null default '', notice_version text not null, acknowledged_at timestamptz not null default now(),
 status text not null default 'new' check(status in ('new','viewed','in_progress','closed','spam')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), closed_at timestamptz,
 foreign key(service_revision_id,provider_id) references public.service_revisions(id,provider_id) on delete restrict,
 check((preferred_contact_method='email' and requester_email is not null) or (preferred_contact_method in ('phone','whatsapp') and requester_phone is not null))
);
create table public.admin_audit_logs (
 id uuid primary key default gen_random_uuid(), actor_user_id uuid, action text not null,
 entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table private.rate_limits (bucket text primary key, count integer not null, expires_at timestamptz not null);
create table private.idempotency (key uuid primary key, fingerprint text not null, reference uuid not null, created_at timestamptz not null default now());
create table private.cleanup_jobs (id uuid primary key default gen_random_uuid(), object_key text not null, created_at timestamptz default now());
create index profiles_status on public.provider_profiles(status);
create index revisions_provider on public.provider_revisions(provider_id);
create index service_revisions_parent on public.service_revisions(revision_id);
create index service_revisions_category on public.service_revisions(category_id);
create index quotes_owner_status on public.quote_requests(provider_id,status,created_at desc);
create index files_provider on public.file_assets(provider_id);

create function private.bootstrap_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.user_profiles(user_id) values(new.id);
 insert into public.user_roles(user_id,role) values(new.id,'provider');
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.bootstrap_user();

create function public.account_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_profiles p where p.user_id=auth.uid() and p.enabled and p.deletion_requested_at is null)
$$;
create function public.is_administrator() returns boolean language sql stable security definer set search_path='' as $$
 select public.account_enabled() and coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.user_roles where user_id=auth.uid() and role='administrator')
$$;
create function public.owns_provider(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.account_enabled() and exists(select 1 from public.provider_profiles where id=p_id and owner_user_id=auth.uid())
$$;
create function private.assert_admin(p_provider uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_administrator() then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.provider_profiles where id=p_provider and owner_user_id=auth.uid()) then raise exception 'SELF_MODERATION'; end if;
end $$;
create function private.audit(p_action text,p_entity uuid,p_metadata jsonb default '{}') returns void language sql security definer set search_path='' as $$
 insert into public.admin_audit_logs(actor_user_id,action,entity_id,metadata) values(auth.uid(),p_action,p_entity,p_metadata)
$$;
create function private.complete_revision(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.provider_revisions r where r.id=p_id and length(trim(r.display_name))>=2 and length(trim(r.short_description))>=10
 and (r.city<>'' or exists(select 1 from public.provider_service_areas where revision_id=r.id))
 and (r.public_email<>'' or r.public_phone<>'' or r.public_whatsapp<>'')
 and exists(select 1 from public.service_revisions s where s.revision_id=r.id and s.is_active)
 and not exists(select 1 from public.provider_documents d join public.file_assets f on f.id=d.asset_id where d.revision_id=r.id and (f.state<>'ready' or f.provider_id<>r.provider_id))
 and not exists(select 1 from public.service_revisions s join public.service_photos ph on ph.service_revision_id=s.id join public.file_assets f on f.id=ph.asset_id where s.revision_id=r.id and (f.state<>'ready' or f.provider_id<>r.provider_id)))
$$;
create function private.can_publish(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.provider_profiles p join public.user_profiles u on u.user_id=p.owner_user_id
 join public.provider_revisions r on r.id=p.published_revision_id
 join public.provider_memberships m on m.provider_id=p.id
 where p.id=p_id and p.status='approved' and p.is_active and u.enabled and u.deletion_requested_at is null
 and r.state='approved' and m.verified_at is not null and private.complete_revision(r.id)
 and exists(select 1 from public.privacy_records c where c.provider_id=p.id and c.revoked_at is null))
$$;

-- No direct mutation grants, including for administrators. RLS limits readable rows.
do $$ declare t text; begin
 foreach t in array array['user_profiles','user_roles','admin_capabilities','provider_profiles','provider_memberships','categories','provider_revisions','provider_service_areas','services','service_revisions','file_assets','service_photos','provider_documents','moderation_decisions','privacy_records','quote_requests','admin_audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select on public.user_profiles,public.user_roles,public.provider_profiles,public.provider_revisions,public.provider_service_areas,public.services,public.service_revisions,public.file_assets,public.service_photos,public.provider_documents,public.privacy_records,public.quote_requests,public.categories,public.moderation_decisions,public.admin_audit_logs to authenticated;
create policy self_account on public.user_profiles for select to authenticated using(user_id=auth.uid() and public.account_enabled());
create policy self_roles on public.user_roles for select to authenticated using(user_id=auth.uid() and public.account_enabled());
create policy profile_read on public.provider_profiles for select to authenticated using(public.owns_provider(id) or public.is_administrator());
create policy revision_read on public.provider_revisions for select to authenticated using(public.owns_provider(provider_id) or public.is_administrator());
create policy areas_read on public.provider_service_areas for select to authenticated using(exists(select 1 from public.provider_revisions r where r.id=revision_id));
create policy services_read on public.services for select to authenticated using(public.owns_provider(provider_id) or public.is_administrator());
create policy service_revisions_read on public.service_revisions for select to authenticated using(public.owns_provider(provider_id) or public.is_administrator());
create policy files_read on public.file_assets for select to authenticated using(public.owns_provider(provider_id) or public.is_administrator());
create policy photos_read on public.service_photos for select to authenticated using(exists(select 1 from public.service_revisions s where s.id=service_revision_id));
create policy documents_read on public.provider_documents for select to authenticated using(exists(select 1 from public.provider_revisions r where r.id=revision_id));
create policy consent_read on public.privacy_records for select to authenticated using(public.owns_provider(provider_id));
create policy quotes_owner_read on public.quote_requests for select to authenticated using(public.owns_provider(provider_id));
create policy categories_read on public.categories for select to authenticated using(is_active or public.is_administrator());
create policy moderation_admin_read on public.moderation_decisions for select to authenticated using(public.is_administrator());
create policy audit_admin_read on public.admin_audit_logs for select to authenticated using(public.is_administrator());

create function public.start_draft() returns uuid language plpgsql security definer set search_path='' as $$
declare p public.provider_profiles; old public.provider_revisions; result uuid; s record; sid uuid;
begin
 if not public.account_enabled() then raise exception 'FORBIDDEN'; end if;
 insert into public.provider_profiles(owner_user_id) values(auth.uid()) on conflict(owner_user_id) do nothing;
 select * into p from public.provider_profiles where owner_user_id=auth.uid() for update;
 select id into result from public.provider_revisions where provider_id=p.id and state in ('draft','pending_review');
 if result is not null then return result; end if;
 select * into old from public.provider_revisions where provider_id=p.id order by created_at desc limit 1;
 if old.id is null then insert into public.provider_revisions(provider_id) values(p.id) returning id into result;
 else
 insert into public.provider_revisions(provider_id,provider_type,display_name,professional_name,business_name,short_description,full_description,public_email,public_phone,public_whatsapp,website_url,country,region,city)
 values(p.id,old.provider_type,old.display_name,old.professional_name,old.business_name,old.short_description,old.full_description,old.public_email,old.public_phone,old.public_whatsapp,old.website_url,old.country,old.region,old.city) returning id into result;
 insert into public.provider_service_areas(revision_id,country,region,city) select result,country,region,city from public.provider_service_areas where revision_id=old.id;
 for s in select * from public.service_revisions where revision_id=old.id loop
 insert into public.service_revisions(service_id,provider_id,revision_id,title,description,category_id,is_active,sort_order) values(s.service_id,p.id,result,s.title,s.description,s.category_id,s.is_active,s.sort_order) returning id into sid;
 insert into public.service_photos(service_revision_id,asset_id,alt_text,sort_order) select sid,asset_id,alt_text,sort_order from public.service_photos where service_revision_id=s.id;
 end loop;
 insert into public.provider_documents(revision_id,asset_id,kind) select result,asset_id,kind from public.provider_documents where revision_id=old.id;
 end if;
 return result;
end $$;

create function public.save_revision(p_revision uuid,p_version integer,p_data jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare r public.provider_revisions; p uuid; service jsonb; area jsonb; sid uuid; srid uuid; photo jsonb; aid uuid; i integer:=0; j integer; existing public.service_revisions;
begin
 select provider_id into p from public.provider_revisions where id=p_revision;
 perform 1 from public.provider_profiles where id=p for update;
 select * into r from public.provider_revisions where id=p_revision for update;
 if not public.owns_provider(p) or r.state<>'draft' then raise exception 'FORBIDDEN'; end if;
 if r.version is distinct from p_version then raise exception 'STALE_REVISION'; end if;
 if jsonb_typeof(p_data->'services') is distinct from 'array' or jsonb_array_length(p_data->'services')>20 then raise exception 'INVALID_SERVICES'; end if;
 update public.provider_revisions set provider_type=p_data->>'provider_type',display_name=trim(p_data->>'display_name'),
 professional_name=coalesce(p_data->>'professional_name',''),business_name=coalesce(p_data->>'business_name',''),
 short_description=trim(p_data->>'short_description'),full_description=coalesce(p_data->>'full_description',''),
 public_email=coalesce(p_data->>'public_email',''),public_phone=coalesce(p_data->>'public_phone',''),public_whatsapp=coalesce(p_data->>'public_whatsapp',''),
 website_url=coalesce(p_data->>'website_url',''),country=coalesce(p_data->>'country','BR'),region=coalesce(p_data->>'region',''),city=coalesce(p_data->>'city',''),
 version=version+1,updated_at=now() where id=p_revision;
 delete from public.provider_service_areas where revision_id=p_revision;
 for area in select value from jsonb_array_elements(coalesce(p_data->'service_areas','[]')) loop
 insert into public.provider_service_areas(revision_id,country,region,city) values(p_revision,coalesce(area->>'country','BR'),coalesce(area->>'region',''),area->>'city'); end loop;
 -- Draft rows have no submitted quote references; approved revisions are immutable.
 for service in select value from jsonb_array_elements(p_data->'services') loop
 sid:=nullif(service->>'service_id','')::uuid;
 if sid is null then insert into public.services(provider_id) values(p) returning id into sid;
 elsif not exists(select 1 from public.services where id=sid and provider_id=p) then raise exception 'SERVICE_OWNERSHIP'; end if;
 select * into existing from public.service_revisions where service_id=sid and revision_id=p_revision;
 if not exists(select 1 from public.categories where id=(service->>'category_id')::uuid and (is_active or id=existing.category_id)) then raise exception 'INACTIVE_CATEGORY'; end if;
 insert into public.service_revisions(service_id,provider_id,revision_id,title,description,category_id,is_active,sort_order)
 values(sid,p,p_revision,service->>'title',service->>'description',(service->>'category_id')::uuid,coalesce((service->>'is_active')::boolean,true),i)
 on conflict(service_id,revision_id) do update set title=excluded.title,description=excluded.description,category_id=excluded.category_id,is_active=excluded.is_active,sort_order=excluded.sort_order returning id into srid;
 -- Return stable IDs to the caller through subsequent reads. Missing service IDs are retained in this invocation.
 service:=jsonb_set(service,'{service_id}',to_jsonb(sid));
 p_data:=jsonb_set(p_data,array['services',i::text],service);
 delete from public.service_photos where service_revision_id=srid;
 if jsonb_array_length(coalesce(service->'photos','[]'))>8 then raise exception 'PHOTO_LIMIT'; end if;
 j:=0;
 for photo in select value from jsonb_array_elements(coalesce(service->'photos','[]')) loop
 aid:=(photo->>'asset_id')::uuid;
 if not exists(select 1 from public.file_assets where id=aid and provider_id=p and state='ready' and kind='image') then raise exception 'FILE_OWNERSHIP'; end if;
 insert into public.service_photos(service_revision_id,asset_id,alt_text,sort_order) values(srid,aid,coalesce(photo->>'alt_text',''),j); j:=j+1;
 end loop;
 i:=i+1;
 end loop;
 delete from public.service_revisions where revision_id=p_revision and service_id not in (select (v->>'service_id')::uuid from jsonb_array_elements(p_data->'services') v);
 delete from public.provider_documents where revision_id=p_revision;
 for service in select value from jsonb_array_elements(coalesce(p_data->'documents','[]')) loop
 aid:=(service->>'asset_id')::uuid;
 if not exists(select 1 from public.file_assets where id=aid and provider_id=p and state='ready' and kind=case when service->>'kind'='presentation' then 'pdf' else 'image' end) then raise exception 'FILE_OWNERSHIP'; end if;
 insert into public.provider_documents(revision_id,asset_id,kind) values(p_revision,aid,service->>'kind'); end loop;
 return r.version+1;
end $$;

create function public.submit_revision(p_revision uuid,p_consent boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.provider_revisions; p uuid; begin
 select provider_id into p from public.provider_revisions where id=p_revision;
 perform 1 from public.provider_profiles where id=p for update;
 select * into r from public.provider_revisions where id=p_revision for update;
 if not public.owns_provider(p) or r.state<>'draft' then raise exception 'FORBIDDEN'; end if;
 if p_consent is distinct from true or not private.complete_revision(p_revision) then raise exception 'INCOMPLETE_PROFILE'; end if;
 insert into public.privacy_records(provider_id,purpose,notice_version) values(p,'directory_publication','2026-11-22') on conflict do nothing;
 update public.provider_revisions set state='pending_review',submitted_at=now(),version=version+1 where id=p_revision;
 update public.provider_profiles set status=case when status='suspended' then status when published_revision_id is null then 'pending_review' else status end,updated_at=now() where id=p;
end $$;
create function public.withdraw_revision(p_revision uuid) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
 select provider_id into p from public.provider_revisions where id=p_revision;
 perform 1 from public.provider_profiles where id=p for update;
 if not public.owns_provider(p) then raise exception 'FORBIDDEN'; end if;
 update public.provider_revisions set state='draft',version=version+1 where id=p_revision and state='pending_review';
 update public.provider_profiles set status='draft' where id=p and published_revision_id is null and status='pending_review';
end $$;
create function public.set_publication(p_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare p public.provider_profiles; begin
 select * into p from public.provider_profiles where owner_user_id=auth.uid() for update;
 if not public.owns_provider(p.id) then raise exception 'FORBIDDEN'; end if;
 if p_active and (p.status<>'approved' or not exists(select 1 from public.privacy_records where provider_id=p.id and revoked_at is null)) then raise exception 'PUBLICATION_NOT_ALLOWED'; end if;
 update public.provider_profiles set is_active=p_active where id=p.id;
end $$;
create function public.revoke_publication_consent() returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
 select id into p from public.provider_profiles where owner_user_id=auth.uid() for update;
 if not public.owns_provider(p) then raise exception 'FORBIDDEN'; end if;
 update public.privacy_records set revoked_at=now() where provider_id=p and revoked_at is null;
 update public.provider_profiles set is_active=false where id=p;
end $$;
create function public.decide_revision(p_revision uuid,p_approve boolean,p_membership boolean,p_message text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.provider_revisions; p public.provider_profiles; begin
 select provider_id into p.id from public.provider_revisions where id=p_revision;
 select * into p from public.provider_profiles where id=p.id for update;
 perform private.assert_admin(p.id);
 select * into r from public.provider_revisions where id=p_revision for update;
 if r.state<>'pending_review' then raise exception 'INVALID_TRANSITION'; end if;
 if p_approve then
 if p_membership is distinct from true or not private.complete_revision(p_revision) then raise exception 'INCOMPLETE_PROFILE'; end if;
 insert into public.provider_memberships(provider_id,verified_at,verified_by) values(p.id,now(),auth.uid()) on conflict(provider_id) do update set verified_at=now(),verified_by=auth.uid();
 update public.provider_revisions set state='approved',approved_at=now(),approved_by=auth.uid(),provider_message=null where id=p_revision;
 update public.provider_profiles set published_revision_id=p_revision,status=case when status='suspended' then status else 'approved' end,updated_at=now() where id=p.id;
 else
 if length(trim(p_message))<5 then raise exception 'REJECTION_MESSAGE_REQUIRED'; end if;
 update public.provider_revisions set state='rejected',provider_message=left(p_message,1000) where id=p_revision;
 update public.provider_profiles set status=case when status='suspended' then status when published_revision_id is null then 'rejected' else 'approved' end where id=p.id;
 end if;
 insert into public.moderation_decisions(provider_id,revision_id,actor_user_id,decision,internal_note,provider_message) values(p.id,p_revision,auth.uid(),case when p_approve then 'approved' else 'rejected' end,left(p_note,2000),left(p_message,1000));
 perform private.audit(case when p_approve then 'approved' else 'rejected' end,p.id,jsonb_build_object('revision_id',p_revision));
end $$;
create function public.set_suspension(p_provider uuid,p_suspend boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.provider_profiles; begin
 select * into p from public.provider_profiles where id=p_provider for update;
 perform private.assert_admin(p_provider);
 if length(trim(p_reason))<5 then raise exception 'REASON_REQUIRED'; end if;
 if not p_suspend and (p.status<>'suspended' or not private.complete_revision(p.published_revision_id)) then raise exception 'INVALID_TRANSITION'; end if;
 update public.provider_profiles set status=case when p_suspend then 'suspended' else 'approved' end,updated_at=now() where id=p_provider;
 insert into public.moderation_decisions(provider_id,actor_user_id,decision,internal_note) values(p_provider,auth.uid(),case when p_suspend then 'suspended' else 'reactivated' end,left(p_reason,2000));
 perform private.audit(case when p_suspend then 'suspended' else 'reactivated' end,p_provider);
end $$;
create function public.manage_category(p_id uuid,p_name text,p_slug text,p_description text,p_active boolean,p_order integer) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 perform private.assert_admin();
 insert into public.categories(id,name,slug,description,is_active,sort_order) values(coalesce(p_id,gen_random_uuid()),p_name,p_slug,left(p_description,500),p_active,p_order)
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,is_active=excluded.is_active,sort_order=excluded.sort_order returning id into result;
 perform private.audit('category_updated',result); return result;
end $$;

create function public.public_categories() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'name',name,'description',description) order by sort_order,name),'[]') from public.categories where is_active
$$;
create function private.public_profile(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('slug',p.slug,'display_name',r.display_name,'provider_type',r.provider_type,'short_description',r.short_description,'full_description',r.full_description,
 'professional_name',r.professional_name,'business_name',r.business_name,'public_email',r.public_email,'public_phone',r.public_phone,'public_whatsapp',r.public_whatsapp,'website_url',r.website_url,
 'city',r.city,'region',r.region,'country',r.country,'approved_at',r.approved_at,
 'service_areas',coalesce((select jsonb_agg(jsonb_build_object('city',a.city,'region',a.region,'country',a.country)) from public.provider_service_areas a where a.revision_id=r.id),'[]'),
 'documents',coalesce((select jsonb_agg(jsonb_build_object('kind',d.kind,'key',f.public_key)) from public.provider_documents d join public.file_assets f on f.id=d.asset_id where d.revision_id=r.id and f.state='ready'),'[]'),
 'services',coalesce((select jsonb_agg(jsonb_build_object('key',s.public_key,'title',sr.title,'description',sr.description,'category',c.name,'category_slug',c.slug,
 'photos',coalesce((select jsonb_agg(jsonb_build_object('key',f.public_key,'alt',ph.alt_text) order by ph.sort_order) from public.service_photos ph join public.file_assets f on f.id=ph.asset_id where ph.service_revision_id=sr.id and f.state='ready'),'[]')) order by sr.sort_order)
 from public.service_revisions sr join public.services s on s.id=sr.service_id join public.categories c on c.id=sr.category_id where sr.revision_id=r.id and sr.is_active),'[]'))
 from public.provider_profiles p join public.provider_revisions r on r.id=p.published_revision_id where p.id=p_id and private.can_publish(p.id)
$$;
create function public.get_public_profile(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select private.public_profile(id) from public.provider_profiles where slug=p_slug
$$;
create function public.search_directory(p_query text default '',p_category text default '',p_city text default '',p_page integer default 1) returns jsonb language sql stable security definer set search_path='' as $$
 with matches as (
 select p.id,r.approved_at from public.provider_profiles p join public.provider_revisions r on r.id=p.published_revision_id
 where private.can_publish(p.id) and (p_query='' or concat_ws(' ',r.display_name,r.professional_name,r.business_name,r.short_description) ilike '%'||left(p_query,100)||'%' or exists(select 1 from public.service_revisions s where s.revision_id=r.id and s.is_active and concat_ws(' ',s.title,s.description) ilike '%'||left(p_query,100)||'%'))
 and (p_category='' or exists(select 1 from public.service_revisions s join public.categories c on c.id=s.category_id where s.revision_id=r.id and s.is_active and c.is_active and c.slug=p_category))
 and (p_city='' or r.city ilike '%'||left(p_city,100)||'%' or exists(select 1 from public.provider_service_areas a where a.revision_id=r.id and a.city ilike '%'||left(p_city,100)||'%'))
 ), page as (select * from matches order by approved_at desc,id limit 20 offset ((greatest(1,least(coalesce(p_page,1),500))-1)*20))
 select jsonb_build_object('total',(select count(*) from matches),'items',coalesce((select jsonb_agg(private.public_profile(id) order by approved_at desc,id) from page),'[]'))
$$;

create function public.consume_quote_limit(p_ip text,p_contact text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; k text; allowed boolean:=true; begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN'; end if;
 if length(p_ip)<>64 or length(p_contact)<>64 then raise exception 'INVALID_HASH'; end if;
 k:='ip:'||p_ip||':'||floor(extract(epoch from now())/900)::text;
 insert into private.rate_limits values(k,1,now()+interval '24 hours') on conflict(bucket) do update set count=private.rate_limits.count+1 returning count into n;
 allowed:=n<=5;
 k:='contact:'||p_contact||':'||floor(extract(epoch from now())/3600)::text;
 insert into private.rate_limits values(k,1,now()+interval '24 hours') on conflict(bucket) do update set count=private.rate_limits.count+1 returning count into n;
 return allowed and n<=3;
end $$;
create function public.create_quote(p_slug text,p_service uuid,p_data jsonb,p_key uuid,p_fingerprint text) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.provider_profiles; sr uuid; result uuid; prior private.idempotency; begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into prior from private.idempotency where key=p_key;
 if found then if prior.fingerprint<>p_fingerprint then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return prior.reference; end if;
 select * into p from public.provider_profiles where slug=p_slug for update;
 if not private.can_publish(p.id) then raise exception 'PROVIDER_UNAVAILABLE'; end if;
 if p_service is not null then
 select s.id into sr from public.service_revisions s join public.services i on i.id=s.service_id where i.public_key=p_service and s.revision_id=p.published_revision_id and s.provider_id=p.id and s.is_active;
 if sr is null then raise exception 'INVALID_SERVICE'; end if; end if;
 insert into public.quote_requests(provider_id,service_revision_id,requester_name,preferred_contact_method,requester_email,requester_phone,message,service_location,notice_version)
 values(p.id,sr,p_data->>'name',p_data->>'contact_method',nullif(p_data->>'email',''),nullif(p_data->>'phone',''),p_data->>'message',coalesce(p_data->>'location',''),'2026-11-22') returning reference into result;
 insert into private.idempotency values(p_key,p_fingerprint,result,now()); return result;
end $$;
create function public.update_quote_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; begin
 select * into q from public.quote_requests where id=p_id for update;
 if not public.owns_provider(q.provider_id) then raise exception 'FORBIDDEN'; end if;
 update public.quote_requests set status=p_status,updated_at=now(),closed_at=case when p_status='closed' then coalesce(closed_at,now()) else null end where id=p_id;
end $$;
create function public.support_quote(p_reference uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; begin
 perform private.assert_admin();
 if not exists(select 1 from public.admin_capabilities where user_id=auth.uid() and capability='quote_support') or length(trim(p_reason))<10 then raise exception 'FORBIDDEN'; end if;
 select * into q from public.quote_requests where reference=p_reference;
 if q.id is null then return null; end if;
 perform private.audit('quote_accessed',q.id,jsonb_build_object('reason',left(p_reason,300)));
 return to_jsonb(q);
end $$;
create function public.request_account_deletion() returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.account_enabled() then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.provider_profiles where owner_user_id=auth.uid() for update;
 update public.provider_profiles set is_active=false where owner_user_id=auth.uid();
 update public.user_profiles set enabled=false,deletion_requested_at=now() where user_id=auth.uid();
 perform private.audit('account_deletion_requested',auth.uid());
end $$;

-- Functions are not public by default. Explicitly enumerate exposed capabilities.
revoke execute on all functions in schema public from public,anon,authenticated;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function public.public_categories(),public.get_public_profile(text),public.search_directory(text,text,text,integer) to anon,authenticated;
grant execute on function public.account_enabled(),public.is_administrator(),public.owns_provider(uuid),public.start_draft(),public.save_revision(uuid,integer,jsonb),public.submit_revision(uuid,boolean),public.withdraw_revision(uuid),public.set_publication(boolean),public.revoke_publication_consent(),public.decide_revision(uuid,boolean,boolean,text,text),public.set_suspension(uuid,boolean,text),public.manage_category(uuid,text,text,text,boolean,integer),public.update_quote_status(uuid,text),public.support_quote(uuid,text),public.request_account_deletion() to authenticated;
grant execute on function public.consume_quote_limit(text,text),public.create_quote(text,uuid,jsonb,uuid,text) to service_role;
alter default privileges in schema public revoke execute on functions from public;
