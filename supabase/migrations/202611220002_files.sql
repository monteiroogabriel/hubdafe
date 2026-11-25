create function public.reserve_upload(p_name text,p_size integer,p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p uuid; f public.file_assets; begin
 select id into p from public.provider_profiles where owner_user_id=auth.uid() for update;
 if not public.owns_provider(p) then raise exception 'FORBIDDEN'; end if;
 if p_kind is null or p_size is null or p_kind not in ('image','pdf') or p_size<=0 or p_size>(case when p_kind='pdf' then 3145728 else 5242880 end) then raise exception 'FILE_LIMIT'; end if;
 if coalesce((select sum(size_bytes) from public.file_assets where provider_id=p),0)+p_size>209715200 then raise exception 'QUOTA_EXCEEDED'; end if;
 if (select count(*) from public.file_assets where provider_id=p and created_at>now()-interval '1 hour')>=30 then raise exception 'UPLOAD_RATE_LIMIT'; end if;
 insert into public.file_assets(provider_id,object_key,kind,size_bytes,original_name) values(p,p::text||'/'||gen_random_uuid()::text,p_kind,p_size,left(p_name,120)) returning * into f;
 return to_jsonb(f);
end $$;
create function public.finalize_upload(p_id uuid,p_user uuid,p_size integer,p_mime text,p_hash text,p_valid boolean) returns void language plpgsql security definer set search_path='' as $$
declare f public.file_assets;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN'; end if;
 select * into f from public.file_assets where id=p_id for update;
 if f.state<>'quarantine' or not exists(select 1 from public.provider_profiles p join public.user_profiles u on u.user_id=p.owner_user_id where p.id=f.provider_id and p.owner_user_id=p_user and u.enabled and u.deletion_requested_at is null) then raise exception 'FORBIDDEN'; end if;
 update public.file_assets set state=case when p_valid then 'ready' else 'rejected' end,size_bytes=case when p_valid then p_size else size_bytes end,mime=p_mime,sha256=p_hash where id=p_id;
end $$;
create function public.resolve_file(p_key uuid,p_user uuid,p_aal text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.file_assets; permitted boolean; begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN'; end if;
 select * into f from public.file_assets where public_key=p_key and state='ready';if f.id is null then return null; end if;
 permitted:=exists(select 1 from public.user_profiles u where u.user_id=p_user and u.enabled and u.deletion_requested_at is null and
 (exists(select 1 from public.provider_profiles where id=f.provider_id and owner_user_id=p_user) or (p_aal='aal2' and exists(select 1 from public.user_roles where user_id=p_user and role='administrator'))));
 if not permitted and private.can_publish(f.provider_id) then
 permitted:=exists(select 1 from public.provider_documents d join public.provider_profiles p on p.published_revision_id=d.revision_id where d.asset_id=f.id and p.id=f.provider_id)
 or exists(select 1 from public.service_photos ph join public.service_revisions s on s.id=ph.service_revision_id join public.provider_profiles p on p.published_revision_id=s.revision_id where ph.asset_id=f.id and s.is_active and p.id=f.provider_id);
 end if;
 if not permitted then return null; end if;
 return jsonb_build_object('object_key',f.object_key,'mime',f.mime,'kind',f.kind);
end $$;
create function public.admin_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.assert_admin();return jsonb_build_object(
 'total',(select count(*) from public.provider_profiles),
 'pending_revisions',(select count(*) from public.provider_revisions where state='pending_review'),
 'approved',(select count(*) from public.provider_profiles where status='approved'),
 'rejected',(select count(*) from public.provider_profiles where status='rejected'),
 'suspended',(select count(*) from public.provider_profiles where status='suspended'),
 'quotes',(select count(*) from public.quote_requests));end $$;
revoke execute on function public.reserve_upload(text,integer,text),public.finalize_upload(uuid,uuid,integer,text,text,boolean),public.resolve_file(uuid,uuid,text),public.admin_metrics() from public,anon,authenticated;
grant execute on function public.reserve_upload(text,integer,text),public.admin_metrics() to authenticated;
grant execute on function public.finalize_upload(uuid,uuid,integer,text,text,boolean),public.resolve_file(uuid,uuid,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('quarantine','quarantine',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('validated','validated',false,5242880,array['image/webp','application/pdf'])
 on conflict(id) do nothing;
-- Deliberately no anon/authenticated policies on storage.objects: access is mediated.
