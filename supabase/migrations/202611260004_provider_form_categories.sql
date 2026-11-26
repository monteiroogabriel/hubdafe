-- Instagram is versioned with the profile and becomes public only after approval.
alter table public.provider_revisions add column instagram_username text not null default ''
  check (instagram_username = '' or instagram_username ~ '^[A-Za-z0-9._]{1,30}$');

create or replace function public.start_draft() returns uuid language plpgsql security definer set search_path='' as $$
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
 insert into public.provider_revisions(provider_id,provider_type,display_name,professional_name,business_name,short_description,full_description,public_email,public_phone,public_whatsapp,website_url,instagram_username,country,region,city)
 values(p.id,old.provider_type,old.display_name,old.professional_name,old.business_name,old.short_description,old.full_description,old.public_email,old.public_phone,old.public_whatsapp,old.website_url,old.instagram_username,old.country,old.region,old.city) returning id into result;
 insert into public.provider_service_areas(revision_id,country,region,city) select result,country,region,city from public.provider_service_areas where revision_id=old.id;
 for s in select * from public.service_revisions where revision_id=old.id loop
 insert into public.service_revisions(service_id,provider_id,revision_id,title,description,category_id,is_active,sort_order) values(s.service_id,p.id,result,s.title,s.description,s.category_id,s.is_active,s.sort_order) returning id into sid;
 insert into public.service_photos(service_revision_id,asset_id,alt_text,sort_order) select sid,asset_id,alt_text,sort_order from public.service_photos where service_revision_id=s.id;
 end loop;
 insert into public.provider_documents(revision_id,asset_id,kind) select result,asset_id,kind from public.provider_documents where revision_id=old.id;
 end if;
 return result;
end $$;

create or replace function public.save_revision(p_revision uuid,p_version integer,p_data jsonb) returns integer language plpgsql security definer set search_path='' as $$
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
 instagram_username=coalesce(p_data->>'instagram_username',''),website_url=coalesce(p_data->>'website_url',''),country=coalesce(p_data->>'country','BR'),region=coalesce(p_data->>'region',''),city=coalesce(p_data->>'city',''),
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

create or replace function private.public_profile(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('slug',p.slug,'display_name',r.display_name,'provider_type',r.provider_type,'short_description',r.short_description,'full_description',r.full_description,
 'professional_name',r.professional_name,'business_name',r.business_name,'public_email',r.public_email,'public_phone',r.public_phone,'public_whatsapp',r.public_whatsapp,'website_url',r.website_url,'instagram_username',r.instagram_username,
 'city',r.city,'region',r.region,'country',r.country,'approved_at',r.approved_at,
 'service_areas',coalesce((select jsonb_agg(jsonb_build_object('city',a.city,'region',a.region,'country',a.country)) from public.provider_service_areas a where a.revision_id=r.id),'[]'),
 'documents',coalesce((select jsonb_agg(jsonb_build_object('kind',d.kind,'key',f.public_key)) from public.provider_documents d join public.file_assets f on f.id=d.asset_id where d.revision_id=r.id and f.state='ready'),'[]'),
 'services',coalesce((select jsonb_agg(jsonb_build_object('key',s.public_key,'title',sr.title,'description',sr.description,'category',c.name,'category_slug',c.slug,
 'photos',coalesce((select jsonb_agg(jsonb_build_object('key',f.public_key,'alt',ph.alt_text) order by ph.sort_order) from public.service_photos ph join public.file_assets f on f.id=ph.asset_id where ph.service_revision_id=sr.id and f.state='ready'),'[]')) order by sr.sort_order)
 from public.service_revisions sr join public.services s on s.id=sr.service_id join public.categories c on c.id=sr.category_id where sr.revision_id=r.id and sr.is_active),'[]'))
 from public.provider_profiles p join public.provider_revisions r on r.id=p.published_revision_id where p.id=p_id and private.can_publish(p.id)
$$;

insert into public.categories(name,slug,sort_order) values
('Casa e manutenção','casa-e-manutencao',10),
('Construção e reformas','construcao-e-reformas',20),
('Limpeza e organização','limpeza-e-organizacao',30),
('Beleza e cuidados pessoais','beleza-e-cuidados-pessoais',40),
('Alimentação','alimentacao',50),
('Educação e aulas','educacao-e-aulas',60),
('Tecnologia e informática','tecnologia-e-informatica',70),
('Design e comunicação','design-e-comunicacao',80),
('Eventos e fotografia','eventos-e-fotografia',90),
('Transporte e entregas','transporte-e-entregas',100),
('Costura e artesanato','costura-e-artesanato',110),
('Serviços profissionais','servicos-profissionais',120)
on conflict(slug) do nothing;
