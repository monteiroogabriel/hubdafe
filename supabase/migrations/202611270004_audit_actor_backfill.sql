-- Backfill actor identity on existing audit events when the account still exists.
update public.admin_audit_logs l
set actor_email = coalesce(nullif(l.actor_email, ''), u.email, ''),
    actor_name = coalesce(nullif(l.actor_name, ''), nullif(btrim(p.display_name), ''), '')
from auth.users u
left join public.user_profiles p on p.user_id = u.id
where l.actor_user_id = u.id
  and (l.actor_email = '' or l.actor_name = '');
