-- ========== IN-APP MESSAGING ==========
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  employer_id uuid not null,
  locum_id uuid not null,
  employer_last_read_at timestamptz,
  locum_last_read_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (employer_id <> locum_id)
);
create index conversations_employer_idx on public.conversations(employer_id, last_message_at desc);
create index conversations_locum_idx on public.conversations(locum_id, last_message_at desc);
create index conversations_shift_idx on public.conversations(shift_id);
grant select on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at desc);
create index messages_sender_idx on public.messages(sender_id, created_at desc);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create or replace function public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations
    where id = _conversation_id and _user_id is not null and _user_id in (employer_id, locum_id)
  )
$$;
revoke execute on function public.is_conversation_participant(uuid, uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

-- Reports may reference a conversation / message (additive, nullable)
alter table public.reports
  add column conversation_id uuid references public.conversations(id) on delete set null,
  add column message_id uuid references public.messages(id) on delete set null;
create index reports_conversation_idx on public.reports(conversation_id);
create index reports_message_idx on public.reports(message_id);
create unique index reports_one_open_per_conversation on public.reports(reporter_id, conversation_id)
  where status in ('open','reviewing') and conversation_id is not null;

create or replace function public.is_reported_conversation(_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.reports where conversation_id = _conversation_id)
$$;
revoke execute on function public.is_reported_conversation(uuid) from public, anon;
grant execute on function public.is_reported_conversation(uuid) to authenticated;

-- Policies
create policy "Participants read conversations" on public.conversations for select to authenticated
  using (auth.uid() = employer_id or auth.uid() = locum_id);
create policy "Admins read reported conversations" on public.conversations for select to authenticated
  using (public.has_role(auth.uid(), 'admin') and public.is_reported_conversation(id));

create policy "Participants read messages" on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()));
create policy "Admins read reported messages" on public.messages for select to authenticated
  using (public.has_role(auth.uid(), 'admin') and public.is_reported_conversation(conversation_id));
create policy "Participants send messages as themselves" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id, auth.uid()));

-- Message validation (sender identity, suspension, withdrawn applications, rate limit)
create or replace function public.validate_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c public.conversations%rowtype;
  v_app_status public.application_status;
  v_recent int;
begin
  if v_uid is null then raise exception 'Sign in to send messages'; end if;
  select * into c from public.conversations where id = new.conversation_id;
  if not found or v_uid not in (c.employer_id, c.locum_id) then
    raise exception 'You are not part of this conversation';
  end if;
  if new.sender_id is distinct from v_uid then
    raise exception 'You can only send messages as yourself';
  end if;
  if not public.is_active_user(v_uid) then raise exception 'Your account is suspended'; end if;
  if not public.is_active_user(case when v_uid = c.employer_id then c.locum_id else c.employer_id end) then
    raise exception 'This account is not available for messaging';
  end if;
  select status into v_app_status from public.applications where id = c.application_id;
  if v_app_status = 'withdrawn' then
    raise exception 'This application was withdrawn, so the conversation is closed';
  end if;
  select count(*) into v_recent from public.messages
   where sender_id = v_uid and created_at > now() - interval '1 minute';
  if v_recent >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.';
  end if;
  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end $$;
create trigger messages_validate before insert on public.messages
  for each row execute function public.validate_message();

create or replace function public.after_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         employer_last_read_at = case when new.sender_id = employer_id then new.created_at else employer_last_read_at end,
         locum_last_read_at = case when new.sender_id = locum_id then new.created_at else locum_last_read_at end
   where id = new.conversation_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.after_message_insert();

-- Start (or reopen) the single conversation for an application
create or replace function public.start_conversation(_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a public.applications%rowtype;
  v_employer uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  select * into a from public.applications where id = _application_id;
  if not found then raise exception 'Application not found'; end if;
  select employer_id into v_employer from public.shifts where id = a.shift_id;
  if v_uid not in (a.locum_id, v_employer) then
    raise exception 'You can only message about your own applications or shifts';
  end if;
  select id into v_id from public.conversations where application_id = _application_id;
  if v_id is not null then return v_id; end if;
  if a.status = 'withdrawn' then raise exception 'This application was withdrawn'; end if;
  if not public.is_active_user(v_uid) then raise exception 'Your account is suspended'; end if;
  insert into public.conversations (application_id, shift_id, employer_id, locum_id)
  values (a.id, a.shift_id, v_employer, a.locum_id)
  on conflict (application_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.conversations where application_id = _application_id;
  end if;
  return v_id;
end $$;
revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  update public.conversations
     set employer_last_read_at = case when employer_id = v_uid then now() else employer_last_read_at end,
         locum_last_read_at = case when locum_id = v_uid then now() else locum_last_read_at end
   where id = _conversation_id and v_uid in (employer_id, locum_id);
end $$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Inbox: existing conversations plus applications that can start one.
-- Only returns rows where the caller is a participant; exposes names, never contact details.
create or replace function public.my_conversations(_conversation_id uuid default null)
returns table (
  conversation_id uuid,
  application_id uuid,
  application_status public.application_status,
  shift_id uuid,
  role_title text,
  pharmacy_name text,
  town text,
  shift_date date,
  start_time time,
  end_time time,
  i_am_employer boolean,
  other_user_id uuid,
  other_name text,
  other_last_read_at timestamptz,
  last_message_body text,
  last_message_at timestamptz,
  last_message_mine boolean,
  unread_count bigint
) language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  rows as (
    select c.id as cid, a.id as aid, a.status as astatus, s.id as sid, s.role_title, s.pharmacy_name, s.town,
           s.shift_date, s.start_time, s.end_time,
           (s.employer_id = me.uid) as is_emp,
           case when s.employer_id = me.uid then a.locum_id else s.employer_id end as other_id,
           case when s.employer_id = me.uid then c.locum_last_read_at else c.employer_last_read_at end as other_read,
           case when s.employer_id = me.uid then c.employer_last_read_at else c.locum_last_read_at end as my_read,
           c.last_message_at as lma, me.uid
      from me
      join public.applications a on true
      join public.shifts s on s.id = a.shift_id
      left join public.conversations c on c.application_id = a.id
     where me.uid is not null
       and (a.locum_id = me.uid or s.employer_id = me.uid)
       and (c.id is not null or a.status <> 'withdrawn')
       and (_conversation_id is null or c.id = _conversation_id)
  )
  select r.cid, r.aid, r.astatus, r.sid, r.role_title, r.pharmacy_name, r.town, r.shift_date, r.start_time, r.end_time,
         r.is_emp, r.other_id,
         coalesce(nullif(btrim(p.full_name), ''), case when r.is_emp then 'Locum applicant' else r.pharmacy_name end),
         r.other_read,
         lm.body, r.lma, (lm.sender_id = r.uid),
         coalesce((select count(*) from public.messages m
                    where m.conversation_id = r.cid and m.sender_id <> r.uid
                      and (r.my_read is null or m.created_at > r.my_read)), 0)
    from rows r
    left join public.profiles p on p.id = r.other_id
    left join lateral (
      select left(m.body, 160) as body, m.sender_id from public.messages m
       where m.conversation_id = r.cid order by m.created_at desc limit 1
    ) lm on true
   order by r.lma desc nulls last, r.shift_date desc
$$;
revoke execute on function public.my_conversations(uuid) from public, anon;
grant execute on function public.my_conversations(uuid) to authenticated;

create or replace function public.my_unread_message_count()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() is not null and m.sender_id <> auth.uid()
    and ((c.employer_id = auth.uid() and (c.employer_last_read_at is null or m.created_at > c.employer_last_read_at))
      or (c.locum_id = auth.uid() and (c.locum_last_read_at is null or m.created_at > c.locum_last_read_at)))
$$;
revoke execute on function public.my_unread_message_count() from public, anon;
grant execute on function public.my_unread_message_count() to authenticated;

-- Reports about conversations/messages: only participants, reported user derived server-side
create or replace function public.validate_report_target()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c public.conversations%rowtype;
  v_sender uuid;
  v_msg_conv uuid;
begin
  if new.message_id is not null and new.conversation_id is null then
    select conversation_id into new.conversation_id from public.messages where id = new.message_id;
  end if;
  if new.conversation_id is null then return new; end if;
  select * into c from public.conversations where id = new.conversation_id;
  if not found or new.reporter_id not in (c.employer_id, c.locum_id) then
    raise exception 'You can only report conversations you are part of';
  end if;
  new.reported_user_id := case when new.reporter_id = c.employer_id then c.locum_id else c.employer_id end;
  new.shift_id := null;
  if new.message_id is not null then
    select sender_id, conversation_id into v_sender, v_msg_conv from public.messages where id = new.message_id;
    if v_msg_conv is distinct from new.conversation_id then raise exception 'Message not found'; end if;
    if v_sender = new.reporter_id then raise exception 'You cannot report your own message'; end if;
  end if;
  return new;
end $$;
create trigger reports_validate_target before insert on public.reports
  for each row execute function public.validate_report_target();

-- Live updates for new messages (RLS still applies to subscribers)
alter publication supabase_realtime add table public.messages;