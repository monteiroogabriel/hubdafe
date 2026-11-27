-- Preserve the identity of an actor at the time the action is recorded.
alter table public.admin_audit_logs
  add column actor_email text not null default '',
  add column actor_name text not null default '';

create or replace function private.audit(p_action text, p_entity uuid, p_metadata jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_email_value text := '';
  actor_name_value text := '';
begin
  if auth.uid() is not null then
    select coalesce(u.email, ''), coalesce(nullif(btrim(p.display_name), ''), '')
      into actor_email_value, actor_name_value
    from auth.users u
    left join public.user_profiles p on p.user_id = u.id
    where u.id = auth.uid();
  end if;

  insert into public.admin_audit_logs(
    actor_user_id, actor_email, actor_name, action, entity_id, metadata
  ) values (
    auth.uid(), actor_email_value, actor_name_value, p_action, p_entity, coalesce(p_metadata, '{}')
  );
end;
$$;

-- Record role and capability changes with enough context to identify the target.
create or replace function private.role_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  target_role text;
  event_action text;
  target_email text;
begin
  if tg_op = 'UPDATE' and old is not distinct from new then
    return new;
  end if;

  if tg_op = 'DELETE' then
    target_user := old.user_id;
    target_role := case when tg_table_name = 'user_roles' then old.role else old.capability end;
    event_action := case
      when tg_table_name = 'user_roles' and old.role = 'administrator' then 'administrator_revoked'
      when tg_table_name = 'admin_capabilities' then 'capability_revoked'
      else null
    end;
  else
    target_user := new.user_id;
    target_role := case when tg_table_name = 'user_roles' then new.role else new.capability end;
    event_action := case
      when tg_table_name = 'user_roles' and new.role = 'administrator' then 'administrator_granted'
      when tg_table_name = 'admin_capabilities' then 'capability_granted'
      else null
    end;
  end if;

  if event_action is not null then
    select coalesce(email, '') into target_email from auth.users where id = target_user;
    perform private.audit(event_action, target_user, jsonb_build_object(
      'target_email', target_email,
      case when tg_table_name = 'user_roles' then 'role' else 'capability' end, target_role
    ));
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.audit_revision_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_action text;
  provider_name text;
begin
  provider_name := coalesce(nullif(btrim(new.display_name), ''), nullif(btrim(new.professional_name), ''), nullif(btrim(new.business_name), ''), 'Perfil sem nome');

  if tg_op = 'INSERT' then
    event_action := 'profile_draft_created';
  elsif old.state is distinct from new.state then
    event_action := case new.state
      when 'pending_review' then 'profile_submitted'
      when 'draft' then 'profile_submission_withdrawn'
      when 'approved' then 'profile_revision_approved'
      when 'rejected' then 'profile_revision_rejected'
      else 'profile_revision_state_changed'
    end;
  elsif old.version is distinct from new.version and new.state = 'draft' then
    event_action := 'profile_draft_saved';
  else
    return new;
  end if;

  perform private.audit(event_action, new.provider_id, jsonb_build_object(
    'provider_name', provider_name,
    'revision_state', new.state,
    'version', new.version
  ));
  return new;
end;
$$;

drop trigger if exists provider_revision_audit on public.provider_revisions;
create trigger provider_revision_audit
  after insert or update on public.provider_revisions
  for each row execute function private.audit_revision_change();

create or replace function private.audit_provider_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider_name text;
begin
  if old.is_active is not distinct from new.is_active
    and old.published_revision_id is not distinct from new.published_revision_id then
    return new;
  end if;

  select coalesce(nullif(btrim(r.display_name), ''), nullif(btrim(r.professional_name), ''), nullif(btrim(r.business_name), ''), 'Perfil sem nome')
    into provider_name
  from public.provider_revisions r
  where r.provider_id = new.id
  order by (r.id = coalesce(new.published_revision_id, old.published_revision_id)) desc, r.created_at desc
  limit 1;

  perform private.audit('provider_status_changed', new.id, jsonb_build_object(
    'provider_name', coalesce(provider_name, 'Perfil sem nome'),
    'old_status', old.status,
    'new_status', new.status,
    'publication_active', new.is_active
  ));
  return new;
end;
$$;

drop trigger if exists provider_status_audit on public.provider_profiles;
create trigger provider_status_audit
  after update on public.provider_profiles
  for each row execute function private.audit_provider_status_change();

create or replace function private.audit_publication_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit('publication_consent_granted', new.provider_id, jsonb_build_object('notice_version', new.notice_version));
  elsif old.revoked_at is null and new.revoked_at is not null then
    perform private.audit('publication_consent_revoked', new.provider_id, jsonb_build_object('notice_version', new.notice_version));
  end if;
  return new;
end;
$$;

drop trigger if exists publication_consent_audit_insert on public.privacy_records;
create trigger publication_consent_audit_insert
  after insert on public.privacy_records
  for each row execute function private.audit_publication_consent();
drop trigger if exists publication_consent_audit_revoke on public.privacy_records;
create trigger publication_consent_audit_revoke
  after update of revoked_at on public.privacy_records
  for each row when (old.revoked_at is null and new.revoked_at is not null)
  execute function private.audit_publication_consent();

create or replace function public.manage_category(
  p_id uuid, p_name text, p_slug text, p_description text, p_active boolean, p_order integer
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result uuid;
  event_action text;
begin
  perform private.assert_admin();
  if p_id is null then
    insert into public.categories(name, slug, description, is_active, sort_order)
    values (p_name, p_slug, left(p_description, 500), p_active, p_order)
    returning id into result;
    event_action := 'category_created';
  else
    update public.categories
    set name = p_name, slug = p_slug, description = left(p_description, 500),
        is_active = p_active, sort_order = p_order
    where id = p_id
    returning id into result;
    event_action := 'category_updated';
  end if;

  if result is not null then
    perform private.audit(event_action, result, jsonb_build_object(
      'name', p_name,
      'slug', p_slug,
      'active', p_active
    ));
  end if;
  return result;
end;
$$;

-- Revision state changes are now logged by a trigger, which avoids the previous
-- generic approval/rejection entry and records the revision version and profile.
create or replace function public.decide_revision(
  p_revision uuid, p_approve boolean, p_membership boolean, p_message text, p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.provider_revisions;
  p public.provider_profiles;
begin
  select provider_id into p.id from public.provider_revisions where id = p_revision;
  select * into p from public.provider_profiles where id = p.id for update;
  perform private.assert_admin(p.id);
  select * into r from public.provider_revisions where id = p_revision for update;
  if r.state <> 'pending_review' then raise exception 'INVALID_TRANSITION'; end if;

  if p_approve then
    if p_membership is distinct from true or not private.complete_revision(p_revision) then raise exception 'INCOMPLETE_PROFILE'; end if;
    insert into public.provider_memberships(provider_id, verified_at, verified_by)
    values (p.id, now(), auth.uid())
    on conflict (provider_id) do update set verified_at = now(), verified_by = auth.uid();
    update public.provider_revisions set state = 'approved', approved_at = now(), approved_by = auth.uid(), provider_message = null where id = p_revision;
    update public.provider_profiles set published_revision_id = p_revision, status = case when status = 'suspended' then status else 'approved' end, updated_at = now() where id = p.id;
  else
    if length(trim(p_message)) < 5 then raise exception 'REJECTION_MESSAGE_REQUIRED'; end if;
    update public.provider_revisions set state = 'rejected', provider_message = left(p_message, 1000) where id = p_revision;
    update public.provider_profiles set status = case when status = 'suspended' then status when published_revision_id is null then 'rejected' else 'approved' end where id = p.id;
  end if;

  insert into public.moderation_decisions(provider_id, revision_id, actor_user_id, decision, internal_note, provider_message)
  values (p.id, p_revision, auth.uid(), case when p_approve then 'approved' else 'rejected' end, left(p_note, 2000), left(p_message, 1000));
end;
$$;

create or replace function public.set_suspension(p_provider uuid, p_suspend boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.provider_profiles;
begin
  select * into p from public.provider_profiles where id = p_provider for update;
  perform private.assert_admin(p_provider);
  if length(trim(p_reason)) < 5 then raise exception 'REASON_REQUIRED'; end if;
  if not p_suspend and (p.status <> 'suspended' or not private.complete_revision(p.published_revision_id)) then raise exception 'INVALID_TRANSITION'; end if;

  update public.provider_profiles
  set status = case when p_suspend then 'suspended' else 'approved' end, updated_at = now()
  where id = p_provider;
  insert into public.moderation_decisions(provider_id, actor_user_id, decision, internal_note)
  values (p_provider, auth.uid(), case when p_suspend then 'suspended' else 'reactivated' end, left(p_reason, 2000));
  perform private.audit(case when p_suspend then 'suspended' else 'reactivated' end, p_provider, jsonb_build_object('reason', left(p_reason, 2000)));
end;
$$;

revoke execute on function public.manage_category(uuid, text, text, text, boolean, integer) from public, anon, authenticated, service_role;
grant execute on function public.manage_category(uuid, text, text, text, boolean, integer) to authenticated;
revoke execute on function public.set_suspension(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.set_suspension(uuid, boolean, text) to authenticated;
