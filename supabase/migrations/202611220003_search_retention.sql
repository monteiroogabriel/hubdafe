create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
alter table public.provider_revisions add column search_text text not null default '';
alter table public.provider_revisions add column search_vector tsvector not null default '';
create function private.refresh_search(p_revision uuid) returns void language sql security definer set search_path='' as $$
 update public.provider_revisions r set search_text=x.txt,search_vector=to_tsvector('portuguese',x.txt) from (
 select rr.id,lower(extensions.unaccent(concat_ws(' ',rr.display_name,rr.professional_name,rr.business_name,rr.short_description,rr.full_description,(select string_agg(concat_ws(' ',s.title,s.description,c.name),' ') from public.service_revisions s join public.categories c on c.id=s.category_id where s.revision_id=rr.id and s.is_active)))) txt
 from public.provider_revisions rr where rr.id=p_revision) x where r.id=x.id
$$;
create function private.search_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='provider_revisions' then perform private.refresh_search(new.id);
 elsif tg_op='DELETE' then perform private.refresh_search(old.revision_id);
 else perform private.refresh_search(new.revision_id);end if;
 return null;
end $$;
create trigger revision_search after insert or update of display_name,professional_name,business_name,short_description,full_description on public.provider_revisions for each row execute function private.search_trigger();
create trigger service_search after insert or update or delete on public.service_revisions for each row execute function private.search_trigger();
create index revisions_search_vector on public.provider_revisions using gin(search_vector);
create index revisions_search_trigram on public.provider_revisions using gin(search_text extensions.gin_trgm_ops);
create or replace function public.search_directory(p_query text default '',p_category text default '',p_city text default '',p_page integer default 1) returns jsonb language sql stable security definer set search_path='' as $$
 with term as(select lower(extensions.unaccent(left(coalesce(p_query,''),100))) q),matches as(
 select p.id,r.approved_at,ts_rank(r.search_vector,websearch_to_tsquery('portuguese',t.q)) rank
 from public.provider_profiles p join public.provider_revisions r on r.id=p.published_revision_id cross join term t
 where private.can_publish(p.id) and (t.q='' or r.search_vector @@ websearch_to_tsquery('portuguese',t.q) or r.search_text like '%'||t.q||'%' or extensions.word_similarity(t.q,r.search_text)>.45)
 and (coalesce(p_category,'')='' or exists(select 1 from public.service_revisions s join public.categories c on c.id=s.category_id where s.revision_id=r.id and s.is_active and c.is_active and c.slug=p_category))
 and (coalesce(p_city,'')='' or lower(extensions.unaccent(r.city)) like '%'||lower(extensions.unaccent(left(p_city,100)))||'%' or exists(select 1 from public.provider_service_areas a where a.revision_id=r.id and lower(extensions.unaccent(a.city)) like '%'||lower(extensions.unaccent(left(p_city,100)))||'%'))
 ),page as(select * from matches order by rank desc,approved_at desc,id limit 20 offset ((greatest(1,least(coalesce(p_page,1),500))-1)*20))
 select jsonb_build_object('total',(select count(*) from matches),'items',coalesce((select jsonb_agg(private.public_profile(id) order by rank desc,approved_at desc,id) from page),'[]'))
$$;
create function public.public_sitemap() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('slug',p.slug,'updated_at',r.approved_at)),'[]') from public.provider_profiles p join public.provider_revisions r on r.id=p.published_revision_id where private.can_publish(p.id)
$$;
create function private.queue_file_deletion() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into private.cleanup_jobs(object_key) values(old.object_key);return old;end $$;
create trigger file_cleanup before delete on public.file_assets for each row execute function private.queue_file_deletion();
create function public.prepare_cleanup() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN'; end if;
 delete from public.quote_requests where (status='closed' and closed_at<now()-interval '180 days') or (status='spam' and updated_at<now()-interval '30 days') or (status not in ('closed','spam') and created_at<now()-interval '12 months');
 delete from private.rate_limits where expires_at<now();
 delete from private.idempotency where created_at<now()-interval '24 hours';
 delete from public.admin_audit_logs where created_at<now()-interval '24 months';
 delete from public.provider_revisions r where r.created_at<now()-interval '30 days' and r.state in ('approved','rejected')
 and not exists(select 1 from public.provider_profiles p where p.published_revision_id=r.id)
 and not exists(select 1 from public.quote_requests q join public.service_revisions s on s.id=q.service_revision_id where s.revision_id=r.id);
 delete from public.file_assets f where f.created_at<now()-interval '24 hours'
 and not exists(select 1 from public.provider_documents d where d.asset_id=f.id)
 and not exists(select 1 from public.service_photos p where p.asset_id=f.id);
 return jsonb_build_object('files',coalesce((select jsonb_agg(t) from (select id,object_key from private.cleanup_jobs order by created_at limit 100) t),'[]'),
 'users',coalesce((select jsonb_agg(u.id) from auth.users u left join public.user_profiles p on p.user_id=u.id where
 (p.deletion_requested_at<now()-interval '1 day') or (u.email_confirmed_at is null and u.created_at<now()-interval '30 days')),'[]'));
end $$;
create function public.ack_cleanup(p_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;delete from private.cleanup_jobs where id=any(p_ids);end $$;
revoke execute on function public.public_sitemap(),public.prepare_cleanup(),public.ack_cleanup(uuid[]) from public,anon,authenticated;
grant execute on function public.public_sitemap() to anon,authenticated;
grant execute on function public.prepare_cleanup(),public.ack_cleanup(uuid[]) to service_role;
revoke execute on all functions in schema private from public,anon,authenticated;
