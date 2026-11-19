-- ========== RECRUITMENT HUB (admin-only CRM) ==========
create type public.recruitment_platform as enum ('facebook','linkedin','whatsapp','university_society','other');
create type public.recruitment_audience as enum ('qualified_pharmacists','students','mixed');
create type public.recruitment_permission as enum ('not_requested','requested','approved','rules_allow','invite_received','declined');
create type public.recruitment_status as enum ('idea','researching','awaiting_permission','active','paused','closed');
create type public.recruitment_draft_kind as enum ('post','permission_request','follow_up');
create type public.recruitment_draft_status as enum ('draft','approved','posted','discarded');
create type public.prospect_stage as enum ('identified','approved_to_contact','contacted','enquired','registered','declined','opted_out');
create type public.consent_status as enum ('none','opted_in','withdrawn');
create type public.career_stage as enum ('registered_pharmacist','pre_registration_graduate','student');
create type public.funnel_metric as enum ('prospects_reached','enquiries');
create type public.referral_reward_status as enum ('pending','eligible','issued','void');

-- Normalised one-way hash for opt-out matching (no raw identifier is stored).
create or replace function public.recruitment_identifier_hash(_identifier text)
returns text language sql immutable set search_path = public as $$
  select case
    when _identifier is null or btrim(_identifier) = '' then null
    when btrim(_identifier) ~ '^[+0-9 ()-]+$'
      then encode(sha256(convert_to(regexp_replace(_identifier, '[^0-9]', '', 'g'), 'UTF8')), 'hex')
    else encode(sha256(convert_to(
      regexp_replace(regexp_replace(lower(btrim(_identifier)), '^(https?://)?(www\.)?', ''), '/+$', ''),
      'UTF8')), 'hex')
  end
$$;

-- Communities / groups
create table public.recruitment_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  platform public.recruitment_platform not null,
  country public.country_code not null default 'IE',
  region text check (region is null or char_length(region) <= 120),
  url text check (url is null or char_length(url) <= 500),
  audience public.recruitment_audience not null default 'qualified_pharmacists',
  rules_summary text check (rules_summary is null or char_length(rules_summary) <= 2000),
  permission_status public.recruitment_permission not null default 'not_requested',
  permission_evidence text check (permission_evidence is null or char_length(permission_evidence) <= 1000),
  admin_contact text check (admin_contact is null or char_length(admin_contact) <= 200),
  last_checked_on date,
  posting_frequency text check (posting_frequency is null or char_length(posting_frequency) <= 120),
  estimated_members integer check (estimated_members is null or estimated_members between 0 and 10000000),
  notes text check (notes is null or char_length(notes) <= 4000),
  status public.recruitment_status not null default 'idea',
  tracking_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
    check (tracking_code ~ '^[a-z0-9-]{4,40}$'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recruitment_communities to authenticated;
grant all on public.recruitment_communities to service_role;
alter table public.recruitment_communities enable row level security;
create policy "Admins read communities" on public.recruitment_communities for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert communities" on public.recruitment_communities for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update communities" on public.recruitment_communities for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete communities" on public.recruitment_communities for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.validate_recruitment_community()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'active' then
    if new.platform = 'whatsapp' then
      if new.permission_status not in ('approved','invite_received') or coalesce(btrim(new.permission_evidence), '') = '' then
        raise exception 'WhatsApp communities can only be active after an explicit invite or admin approval, recorded as evidence';
      end if;
    elsif new.permission_status not in ('approved','rules_allow','invite_received') then
      raise exception 'Record admin permission (or that the group rules allow it) before marking a community active';
    end if;
  end if;
  if new.permission_status = 'declined' and new.status = 'active' then
    raise exception 'Permission was declined for this community';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger recruitment_communities_validate before insert or update on public.recruitment_communities
  for each row execute function public.validate_recruitment_community();

-- Individual prospects (manually added, e.g. LinkedIn or opted-in WhatsApp members)
create table public.recruitment_prospects (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.recruitment_communities(id) on delete set null,
  channel public.recruitment_platform not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  public_profile_url text check (public_profile_url is null or char_length(public_profile_url) <= 500),
  contact_handle text check (contact_handle is null or char_length(contact_handle) <= 200),
  career_stage public.career_stage,
  consent_status public.consent_status not null default 'none',
  consent_source text check (consent_source is null or char_length(consent_source) <= 500),
  consent_recorded_at timestamptz,
  stage public.prospect_stage not null default 'identified',
  approved_to_contact_by uuid,
  approved_to_contact_at timestamptz,
  next_follow_up_on date,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recruitment_prospects_community_idx on public.recruitment_prospects(community_id);
grant select, insert, update, delete on public.recruitment_prospects to authenticated;
grant all on public.recruitment_prospects to service_role;
alter table public.recruitment_prospects enable row level security;
create policy "Admins read prospects" on public.recruitment_prospects for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert prospects" on public.recruitment_prospects for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update prospects" on public.recruitment_prospects for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete prospects" on public.recruitment_prospects for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Suppression list (opt-outs). Hash only.
create table public.recruitment_suppressions (
  id uuid primary key default gen_random_uuid(),
  identifier_hash text not null unique,
  channel public.recruitment_platform,
  source text not null default 'self_service' check (source in ('self_service','admin')),
  created_at timestamptz not null default now()
);
grant select on public.recruitment_suppressions to authenticated;
grant all on public.recruitment_suppressions to service_role;
alter table public.recruitment_suppressions enable row level security;
create policy "Admins read suppressions" on public.recruitment_suppressions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.is_recruitment_suppressed(_identifier text)
returns boolean language sql stable security definer set search_path = public as $$
  select _identifier is not null and exists (
    select 1 from public.recruitment_suppressions
    where identifier_hash = public.recruitment_identifier_hash(_identifier)
  )
$$;
-- Only called from security-definer triggers/functions; not exposed to app users.
revoke execute on function public.is_recruitment_suppressed(text) from public, anon, authenticated;

create or replace function public.validate_recruitment_prospect()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_suppressed boolean;
begin
  v_suppressed := public.is_recruitment_suppressed(new.contact_handle)
               or public.is_recruitment_suppressed(new.public_profile_url);

  if new.consent_status = 'withdrawn' or v_suppressed then
    if new.stage in ('identified','approved_to_contact','contacted') then
      new.stage := 'opted_out';
    end if;
    if v_suppressed and new.consent_status = 'opted_in' then
      new.consent_status := 'withdrawn';
    end if;
  end if;

  if new.consent_status = 'opted_in' then
    if coalesce(btrim(new.consent_source), '') = '' then
      raise exception 'Record how and where this person opted in';
    end if;
    if new.consent_recorded_at is null or (tg_op = 'UPDATE' and old.consent_status <> 'opted_in') then
      new.consent_recorded_at := now();
    end if;
  end if;

  if new.channel = 'whatsapp' and new.stage in ('approved_to_contact','contacted','enquired')
     and new.consent_status <> 'opted_in' then
    raise exception 'WhatsApp contacts must opt in before they can be contacted';
  end if;

  if new.stage = 'approved_to_contact' and (tg_op = 'INSERT' or old.stage is distinct from 'approved_to_contact') then
    new.approved_to_contact_by := auth.uid();
    new.approved_to_contact_at := now();
  end if;

  if new.stage = 'contacted' and (tg_op = 'INSERT' or old.stage <> 'contacted') then
    if new.approved_to_contact_at is null then
      raise exception 'An admin must approve contact before marking this person as contacted';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;
create trigger recruitment_prospects_validate before insert or update on public.recruitment_prospects
  for each row execute function public.validate_recruitment_prospect();

-- Drafts (AI-assisted or manual). Nothing is sent by the app.
create table public.recruitment_drafts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.recruitment_communities(id) on delete set null,
  prospect_id uuid references public.recruitment_prospects(id) on delete set null,
  kind public.recruitment_draft_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 6000),
  status public.recruitment_draft_status not null default 'draft',
  ai_generated boolean not null default false,
  approved_by uuid,
  approved_at timestamptz,
  posted_by uuid,
  posted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recruitment_drafts_community_idx on public.recruitment_drafts(community_id);
create index recruitment_drafts_prospect_idx on public.recruitment_drafts(prospect_id);
grant select, insert, update, delete on public.recruitment_drafts to authenticated;
grant all on public.recruitment_drafts to service_role;
alter table public.recruitment_drafts enable row level security;
create policy "Admins read drafts" on public.recruitment_drafts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert drafts" on public.recruitment_drafts for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update drafts" on public.recruitment_drafts for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete drafts" on public.recruitment_drafts for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.validate_recruitment_draft()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c public.recruitment_communities%rowtype;
  p public.recruitment_prospects%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then raise exception 'New drafts start as drafts'; end if;
    new.approved_by := null; new.approved_at := null; new.posted_by := null; new.posted_at := null;
  else
    -- Editing an approved draft sends it back for review.
    if old.status = 'approved' and new.status = 'approved' and (new.body <> old.body or new.title <> old.title) then
      new.status := 'draft';
    end if;
    if old.status = 'posted' and (new.body <> old.body or new.status <> 'posted') then
      raise exception 'Posted drafts are kept as a record and cannot be changed';
    end if;
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif new.status = 'draft' then
    new.approved_by := null; new.approved_at := null;
  end if;

  if new.status = 'posted' and old.status <> 'posted' then
    if old.status <> 'approved' then
      raise exception 'Approve the draft before marking it as posted or sent';
    end if;
    if new.kind = 'post' then
      select * into c from public.recruitment_communities where id = new.community_id;
      if not found then raise exception 'Choose the community this was posted in'; end if;
      if c.permission_status not in ('approved','rules_allow','invite_received')
         or (c.platform = 'whatsapp' and c.permission_status not in ('approved','invite_received')) then
        raise exception 'This community has not given permission for recruitment posts';
      end if;
    end if;
    if new.prospect_id is not null then
      select * into p from public.recruitment_prospects where id = new.prospect_id;
      if found and (p.stage = 'opted_out' or p.consent_status = 'withdrawn'
         or public.is_recruitment_suppressed(p.contact_handle)
         or public.is_recruitment_suppressed(p.public_profile_url)) then
        raise exception 'This person has opted out of contact';
      end if;
      if found and p.approved_to_contact_at is null then
        raise exception 'Approve contact with this person first';
      end if;
    end if;
    new.posted_by := auth.uid();
    new.posted_at := now();
  end if;

  new.updated_at := now();
  return new;
end $$;
create trigger recruitment_drafts_validate before insert or update on public.recruitment_drafts
  for each row execute function public.validate_recruitment_draft();

-- Manual funnel counts (e.g. reach of an approved group post)
create table public.recruitment_funnel_entries (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.recruitment_communities(id) on delete set null,
  metric public.funnel_metric not null,
  count integer not null check (count between 1 and 1000000),
  occurred_on date not null default current_date,
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index recruitment_funnel_entries_community_idx on public.recruitment_funnel_entries(community_id);
grant select, insert, update, delete on public.recruitment_funnel_entries to authenticated;
grant all on public.recruitment_funnel_entries to service_role;
alter table public.recruitment_funnel_entries enable row level security;
create policy "Admins read funnel entries" on public.recruitment_funnel_entries for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert funnel entries" on public.recruitment_funnel_entries for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update funnel entries" on public.recruitment_funnel_entries for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete funnel entries" on public.recruitment_funnel_entries for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Signup attribution (where a new account came from)
create table public.signup_attributions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  community_id uuid references public.recruitment_communities(id) on delete set null,
  source_channel text check (source_channel is null or char_length(source_channel) <= 40),
  referral_code text check (referral_code is null or referral_code ~ '^[A-Za-z0-9_-]{1,40}$'),
  landing_path text check (landing_path is null or char_length(landing_path) <= 200),
  created_at timestamptz not null default now()
);
create index signup_attributions_community_idx on public.signup_attributions(community_id);
grant select on public.signup_attributions to authenticated;
grant all on public.signup_attributions to service_role;
alter table public.signup_attributions enable row level security;
create policy "Users read own attribution" on public.signup_attributions for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read attributions" on public.signup_attributions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.record_signup_attribution(_tracking_code text, _referral_code text, _landing_path text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_comm public.recruitment_communities%rowtype;
  v_ref text := nullif(btrim(coalesce(_referral_code, '')), '');
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  -- Only brand-new accounts are attributed.
  if not exists (select 1 from public.profiles where id = v_uid and created_at > now() - interval '3 days') then
    return;
  end if;
  if v_ref is not null and v_ref !~ '^[A-Za-z0-9_-]{1,40}$' then v_ref := null; end if;
  select * into v_comm from public.recruitment_communities
    where tracking_code = lower(btrim(coalesce(_tracking_code, '')));
  if v_comm.id is null and v_ref is null then return; end if;
  insert into public.signup_attributions (user_id, community_id, source_channel, referral_code, landing_path)
  values (v_uid, v_comm.id, case when v_comm.id is not null then v_comm.platform::text else 'referral' end,
          v_ref, left(coalesce(_landing_path, ''), 200))
  on conflict (user_id) do nothing;
end $$;
revoke execute on function public.record_signup_attribution(text, text, text) from public, anon;
grant execute on function public.record_signup_attribution(text, text, text) to authenticated;

-- Referral rewards (prepared for the €1 voucher scheme; nothing is issued automatically)
create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  referrer_user_id uuid references public.profiles(id) on delete set null,
  referral_code text check (referral_code is null or char_length(referral_code) <= 40),
  reward_label text not null default 'Amazon voucher' check (char_length(reward_label) <= 80),
  amount numeric(6,2) not null default 1.00 check (amount >= 0 and amount <= 100),
  currency public.currency_code not null default 'EUR',
  qualifying_event text not null default 'first_completed_shift' check (char_length(qualifying_event) <= 80),
  status public.referral_reward_status not null default 'pending',
  issued_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index referral_rewards_referrer_idx on public.referral_rewards(referrer_user_id);
grant select, insert, update, delete on public.referral_rewards to authenticated;
grant all on public.referral_rewards to service_role;
alter table public.referral_rewards enable row level security;
create policy "Admins read rewards" on public.referral_rewards for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert rewards" on public.referral_rewards for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update rewards" on public.referral_rewards for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete rewards" on public.referral_rewards for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create or replace function public.stamp_referral_reward()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'issued' and (tg_op = 'INSERT' or old.status <> 'issued') then
    new.issued_at := coalesce(new.issued_at, now());
  elsif new.status <> 'issued' then
    new.issued_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger referral_rewards_stamp before insert or update on public.referral_rewards
  for each row execute function public.stamp_referral_reward();

-- Self-service opt-out (anyone, no account needed)
create or replace function public.request_recruitment_opt_out(_identifier text, _channel public.recruitment_platform default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_hash text;
begin
  if _identifier is null or char_length(btrim(_identifier)) not between 3 and 255 then
    raise exception 'Enter the email, phone number or profile link you want us to stop contacting';
  end if;
  v_hash := public.recruitment_identifier_hash(_identifier);
  insert into public.recruitment_suppressions (identifier_hash, channel, source)
  values (v_hash, _channel, case when public.has_role(auth.uid(), 'admin') then 'admin' else 'self_service' end)
  on conflict (identifier_hash) do nothing;
  update public.recruitment_prospects
     set consent_status = case when consent_status = 'opted_in' then 'withdrawn'::public.consent_status else consent_status end,
         stage = case when stage in ('identified','approved_to_contact','contacted','enquired')
                      then 'opted_out'::public.prospect_stage else stage end
   where public.recruitment_identifier_hash(contact_handle) = v_hash
      or public.recruitment_identifier_hash(public_profile_url) = v_hash;
end $$;
revoke execute on function public.request_recruitment_opt_out(text, public.recruitment_platform) from public;
grant execute on function public.request_recruitment_opt_out(text, public.recruitment_platform) to anon, authenticated;

-- ========== CAREER STAGE: students/graduates are never treated as registered pharmacists ==========
alter table public.locum_profiles
  add column career_stage public.career_stage not null default 'registered_pharmacist',
  add column registration_verified_at timestamptz,
  add column registration_verified_by uuid;
comment on column public.locum_profiles.career_stage is
  'Students and pre-registration graduates cannot apply for shifts; only an admin can move them to registered_pharmacist.';

create or replace function public.protect_locum_verification()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.registration_verified_at := null;
    new.registration_verified_by := null;
    return new;
  end if;
  if new.registration_verified_at is distinct from old.registration_verified_at
     or new.registration_verified_by is distinct from old.registration_verified_by then
    raise exception 'Only an administrator can verify registration';
  end if;
  if old.career_stage <> 'registered_pharmacist' and new.career_stage = 'registered_pharmacist' then
    raise exception 'An administrator must verify your PSI/GPhC registration before your account is treated as a registered pharmacist';
  end if;
  if new.psi_number is distinct from old.psi_number or new.gphc_number is distinct from old.gphc_number
     or new.career_stage <> 'registered_pharmacist' then
    new.registration_verified_at := null;
    new.registration_verified_by := null;
  end if;
  return new;
end $$;
create trigger locum_profiles_protect_verification before insert or update on public.locum_profiles
  for each row execute function public.protect_locum_verification();

create or replace function public.admin_set_locum_verification(_user_id uuid, _verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if _verified then
    update public.locum_profiles
       set career_stage = 'registered_pharmacist', registration_verified_at = now(), registration_verified_by = auth.uid()
     where user_id = _user_id and (coalesce(psi_number, '') <> '' or coalesce(gphc_number, '') <> '');
    if not found then raise exception 'This locum has no PSI or GPhC number on their profile'; end if;
  else
    update public.locum_profiles set registration_verified_at = null, registration_verified_by = null
     where user_id = _user_id;
  end if;
end $$;
revoke execute on function public.admin_set_locum_verification(uuid, boolean) from public, anon;
grant execute on function public.admin_set_locum_verification(uuid, boolean) to authenticated;

-- Applications: same rules as before, plus students/graduates are blocked.
create or replace function public.validate_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s public.shifts%rowtype;
  lp public.locum_profiles%rowtype;
begin
  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  select * into s from public.shifts where id = new.shift_id;
  if not found then raise exception 'Shift not found'; end if;

  if tg_op = 'INSERT' then
    if new.locum_id <> v_uid or not public.has_role(v_uid, 'locum') then
      raise exception 'Only locum accounts can apply';
    end if;
    if not public.is_active_user(v_uid) then
      raise exception 'Your account is suspended';
    end if;
    if s.status <> 'open' or s.moderation <> 'visible' then
      raise exception 'This shift is not accepting applications';
    end if;
    if s.application_deadline <= now() or s.shift_date < current_date then
      raise exception 'The application deadline has passed';
    end if;
    select * into lp from public.locum_profiles where user_id = v_uid;
    if not found then raise exception 'Complete your locum profile before applying'; end if;
    if lp.career_stage <> 'registered_pharmacist' then
      raise exception 'Pharmacist shifts are only open to registered pharmacists. Students and graduates can apply once their registration is verified.';
    end if;
    if s.required_registration = 'PSI' and coalesce(lp.psi_number, '') = '' then
      raise exception 'This shift requires a PSI registration number on your profile';
    end if;
    if s.required_registration = 'GPhC' and coalesce(lp.gphc_number, '') = '' then
      raise exception 'This shift requires a GPhC registration number on your profile';
    end if;
    if lp.years_experience < s.min_experience_years then
      raise exception 'This shift requires at least % years of experience', s.min_experience_years;
    end if;
    new.status := 'pending';
    new.decided_at := null;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE
  if new.shift_id <> old.shift_id or new.locum_id <> old.locum_id then
    raise exception 'Application cannot be moved';
  end if;
  if new.status = old.status and new.message is not distinct from old.message then
    new.updated_at := now();
    return new;
  end if;

  if v_uid = old.locum_id then
    if new.message is distinct from old.message then
      raise exception 'Application message cannot be edited after sending';
    end if;
    if new.status <> 'withdrawn' or old.status not in ('pending','shortlisted') then
      raise exception 'You can only withdraw a pending or shortlisted application';
    end if;
  elsif s.employer_id = v_uid then
    if new.message is distinct from old.message then
      raise exception 'Employers cannot edit application messages';
    end if;
    if old.status = 'withdrawn' then
      raise exception 'This application was withdrawn';
    end if;
    if new.status not in ('pending','shortlisted','accepted','declined') then
      raise exception 'Invalid status';
    end if;
    if s.status = 'cancelled' then
      raise exception 'This shift was cancelled';
    end if;
    new.decided_at := case when new.status in ('accepted','declined') then now() else null end;
  else
    raise exception 'Not allowed';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ========== FUNNEL REPORT (admins only; returns nothing for anyone else) ==========
create or replace function public.recruitment_funnel(_since date default null)
returns table (
  community_id uuid,
  community_name text,
  platform public.recruitment_platform,
  audience public.recruitment_audience,
  prospects_reached bigint,
  enquiries bigint,
  registrations bigint,
  verified_registrations bigint,
  first_completed_shifts bigint,
  referral_rewards bigint
) language sql stable security definer set search_path = public as $$
  with comm as (
    select rc.id, rc.name, rc.platform, rc.audience from public.recruitment_communities rc
    union all
    select null::uuid, 'Direct / unattributed', null::public.recruitment_platform, null::public.recruitment_audience
  ),
  manual as (
    select fe.community_id as cid,
           coalesce(sum(fe.count) filter (where fe.metric = 'prospects_reached'), 0)::bigint as reached,
           coalesce(sum(fe.count) filter (where fe.metric = 'enquiries'), 0)::bigint as enq
      from public.recruitment_funnel_entries fe
     where _since is null or fe.occurred_on >= _since
     group by fe.community_id
  ),
  pros as (
    select rp.community_id as cid,
           count(*) filter (where rp.stage in ('contacted','enquired','registered'))::bigint as reached,
           count(*) filter (where rp.stage in ('enquired','registered'))::bigint as enq
      from public.recruitment_prospects rp
     where _since is null or rp.updated_at::date >= _since
     group by rp.community_id
  ),
  att as (
    select sa.community_id as cid,
           count(*)::bigint as regs,
           count(*) filter (where lp.career_stage = 'registered_pharmacist' and lp.registration_verified_at is not null)::bigint as verified,
           count(*) filter (where exists (
             select 1 from public.applications ap join public.shifts s on s.id = ap.shift_id
              where ap.locum_id = sa.user_id and ap.status = 'accepted' and s.status = 'filled' and s.shift_date < current_date
           ))::bigint as first_shift,
           count(rr.id) filter (where rr.status in ('eligible','issued'))::bigint as rewards
      from public.signup_attributions sa
      left join public.locum_profiles lp on lp.user_id = sa.user_id
      left join public.referral_rewards rr on rr.referred_user_id = sa.user_id
     where _since is null or sa.created_at::date >= _since
     group by sa.community_id
  )
  select comm.id, comm.name, comm.platform, comm.audience,
         coalesce(manual.reached, 0) + coalesce(pros.reached, 0),
         coalesce(manual.enq, 0) + coalesce(pros.enq, 0),
         coalesce(att.regs, 0),
         coalesce(att.verified, 0),
         coalesce(att.first_shift, 0),
         coalesce(att.rewards, 0)
    from comm
    left join manual on manual.cid is not distinct from comm.id
    left join pros on pros.cid is not distinct from comm.id
    left join att on att.cid is not distinct from comm.id
   where public.has_role(auth.uid(), 'admin')
   order by comm.id is null, comm.name
$$;
revoke execute on function public.recruitment_funnel(date) from public, anon;
grant execute on function public.recruitment_funnel(date) to authenticated;
