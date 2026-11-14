
-- ========== ENUMS ==========
create type public.app_role as enum ('admin','employer','locum');
create type public.country_code as enum ('IE','UK');
create type public.currency_code as enum ('EUR','GBP');
create type public.registration_body as enum ('PSI','GPhC');
create type public.shift_status as enum ('draft','open','filled','cancelled');
create type public.application_status as enum ('pending','shortlisted','accepted','declined','withdrawn');
create type public.report_status as enum ('open','reviewing','resolved','dismissed');
create type public.report_reason as enum ('inaccurate','suspicious','inappropriate','duplicate','other');
create type public.account_status as enum ('active','suspended');
create type public.moderation_status as enum ('visible','hidden');

-- ========== GENERIC updated_at ==========
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  contact_email text check (contact_email is null or char_length(contact_email) <= 255),
  phone text check (phone is null or char_length(phone) <= 40),
  country public.country_code not null default 'IE',
  account_status public.account_status not null default 'active',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ========== USER ROLES ==========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and account_status = 'active')
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid());
create policy "Admins read all roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Self-service role choice: employer or locum, once.
create or replace function public.choose_account_role(_role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _role not in ('employer','locum') then raise exception 'Invalid role'; end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('employer','locum')) then
    raise exception 'Account type already chosen';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), _role);
end $$;
revoke execute on function public.choose_account_role(public.app_role) from public, anon;
grant execute on function public.choose_account_role(public.app_role) to authenticated;

-- ========== LOCUM PROFILES ==========
create table public.locum_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  psi_number text check (psi_number is null or psi_number ~ '^[0-9]{1,6}$'),
  gphc_number text check (gphc_number is null or gphc_number ~ '^[0-9]{7}$'),
  base_country public.country_code not null default 'IE',
  base_town text not null default '' check (char_length(base_town) <= 80),
  base_lat double precision,
  base_lng double precision,
  radius_km integer not null default 30 check (radius_km between 1 and 500),
  available_days smallint[] not null default '{1,2,3,4,5}',
  available_from date,
  available_until date,
  preferred_rate numeric(6,2) check (preferred_rate is null or (preferred_rate >= 0 and preferred_rate <= 500)),
  preferred_currency public.currency_code not null default 'EUR',
  years_experience smallint not null default 0 check (years_experience between 0 and 60),
  bio text check (bio is null or char_length(bio) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until is null or available_from is null or available_until >= available_from)
);
grant select, insert, update, delete on public.locum_profiles to authenticated;
grant all on public.locum_profiles to service_role;
alter table public.locum_profiles enable row level security;
create trigger locum_profiles_updated before update on public.locum_profiles
  for each row execute function public.set_updated_at();

-- ========== PHARMACIES ==========
create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  address_line text not null check (char_length(address_line) between 2 and 200),
  town text not null check (char_length(town) between 1 and 80),
  county text check (county is null or char_length(county) <= 80),
  postcode text check (postcode is null or char_length(postcode) <= 10),
  country public.country_code not null default 'IE',
  lat double precision,
  lng double precision,
  contact_email text check (contact_email is null or char_length(contact_email) <= 255),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pharmacies_owner_idx on public.pharmacies(owner_id);
grant select, insert, update, delete on public.pharmacies to authenticated;
grant all on public.pharmacies to service_role;
alter table public.pharmacies enable row level security;
create trigger pharmacies_updated before update on public.pharmacies
  for each row execute function public.set_updated_at();

create policy "Employers manage own pharmacies - select" on public.pharmacies for select to authenticated
  using (owner_id = auth.uid());
create policy "Admins read pharmacies" on public.pharmacies for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Employers insert own pharmacies" on public.pharmacies for insert to authenticated
  with check (owner_id = auth.uid() and public.has_role(auth.uid(), 'employer') and public.is_active_user(auth.uid()));
create policy "Employers update own pharmacies" on public.pharmacies for update to authenticated
  using (owner_id = auth.uid() and public.has_role(auth.uid(), 'employer'))
  with check (owner_id = auth.uid() and public.has_role(auth.uid(), 'employer') and public.is_active_user(auth.uid()));
create policy "Employers delete own pharmacies" on public.pharmacies for delete to authenticated
  using (owner_id = auth.uid() and public.has_role(auth.uid(), 'employer'));

-- ========== SHIFTS ==========
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  pharmacy_name text not null check (char_length(pharmacy_name) between 2 and 120),
  address_line text not null check (char_length(address_line) between 2 and 200),
  town text not null check (char_length(town) between 1 and 80),
  county text check (county is null or char_length(county) <= 80),
  postcode text check (postcode is null or char_length(postcode) <= 10),
  country public.country_code not null default 'IE',
  lat double precision,
  lng double precision,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  hourly_rate numeric(6,2) not null check (hourly_rate > 0 and hourly_rate <= 500),
  currency public.currency_code not null default 'EUR',
  role_title text not null default 'Locum Pharmacist' check (char_length(role_title) between 2 and 80),
  required_registration public.registration_body not null default 'PSI',
  min_experience_years smallint not null default 0 check (min_experience_years between 0 and 60),
  requirements text check (requirements is null or char_length(requirements) <= 1000),
  notes text check (notes is null or char_length(notes) <= 2000),
  application_deadline timestamptz not null,
  status public.shift_status not null default 'draft',
  moderation public.moderation_status not null default 'visible',
  published_at timestamptz,
  filled_at timestamptz,
  cancelled_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (
    (country = 'IE' and currency = 'EUR' and required_registration = 'PSI') or
    (country = 'UK' and currency = 'GBP' and required_registration = 'GPhC')
  )
);
create index shifts_search_idx on public.shifts(status, moderation, shift_date);
create index shifts_employer_idx on public.shifts(employer_id);
grant select on public.shifts to anon;
grant select, insert, update, delete on public.shifts to authenticated;
grant all on public.shifts to service_role;
alter table public.shifts enable row level security;

-- ========== SHIFT CONTACTS (private) ==========
create table public.shift_contacts (
  shift_id uuid primary key references public.shifts(id) on delete cascade,
  contact_name text check (contact_name is null or char_length(contact_name) <= 120),
  contact_email text not null check (char_length(contact_email) between 3 and 255),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.shift_contacts to authenticated;
grant all on public.shift_contacts to service_role;
alter table public.shift_contacts enable row level security;
create trigger shift_contacts_updated before update on public.shift_contacts
  for each row execute function public.set_updated_at();

-- ========== APPLICATIONS ==========
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  locum_id uuid not null references public.profiles(id) on delete cascade,
  message text check (message is null or char_length(message) <= 1000),
  status public.application_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, locum_id)
);
create index applications_locum_idx on public.applications(locum_id);
grant select, insert, update on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;

-- ========== REPORTS ==========
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete cascade,
  reported_user_id uuid,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (shift_id is not null or reported_user_id is not null)
);
create unique index reports_one_open_per_shift on public.reports(reporter_id, shift_id)
  where status in ('open','reviewing') and shift_id is not null;
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;

-- ========== NOTIFICATIONS ==========
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Users read own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "Users mark own notifications read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== HELPER FUNCTIONS (break RLS recursion) ==========
create or replace function public.owns_shift(_shift_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shifts where id = _shift_id and employer_id = _user_id)
$$;

create or replace function public.has_applied(_shift_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where shift_id = _shift_id and locum_id = _user_id)
$$;

create or replace function public.has_active_application(_shift_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications
    where shift_id = _shift_id and locum_id = _user_id
      and status in ('pending','shortlisted','accepted')
  )
$$;

create or replace function public.is_applicant_of_employer(_locum_id uuid, _employer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    join public.shifts s on s.id = a.shift_id
    where a.locum_id = _locum_id and s.employer_id = _employer_id
  )
$$;

-- ========== PROFILES POLICIES ==========
create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "Employers read applicant profiles" on public.profiles for select to authenticated
  using (public.is_applicant_of_employer(id, auth.uid()));
create policy "Admins read all profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Users insert own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid() and account_status = 'active');
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and new.account_status is distinct from old.account_status
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can change account status';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, contact_email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 120),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== LOCUM PROFILE POLICIES ==========
create policy "Locums read own locum profile" on public.locum_profiles for select to authenticated
  using (user_id = auth.uid());
create policy "Employers read applicant locum profiles" on public.locum_profiles for select to authenticated
  using (public.is_applicant_of_employer(user_id, auth.uid()));
create policy "Admins read locum profiles" on public.locum_profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Locums insert own locum profile" on public.locum_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.has_role(auth.uid(), 'locum'));
create policy "Locums update own locum profile" on public.locum_profiles for update to authenticated
  using (user_id = auth.uid() and public.has_role(auth.uid(), 'locum'))
  with check (user_id = auth.uid() and public.has_role(auth.uid(), 'locum'));
create policy "Locums delete own locum profile" on public.locum_profiles for delete to authenticated
  using (user_id = auth.uid());

-- ========== SHIFT POLICIES ==========
create policy "Public reads open shifts" on public.shifts for select to anon, authenticated
  using (status = 'open' and moderation = 'visible' and shift_date >= current_date);
create policy "Employers read own shifts" on public.shifts for select to authenticated
  using (employer_id = auth.uid());
create policy "Applicants read shifts they applied to" on public.shifts for select to authenticated
  using (public.has_applied(id, auth.uid()));
create policy "Admins read all shifts" on public.shifts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Employers create own shifts" on public.shifts for insert to authenticated
  with check (employer_id = auth.uid() and public.has_role(auth.uid(), 'employer') and public.is_active_user(auth.uid()));
create policy "Employers update own shifts" on public.shifts for update to authenticated
  using (employer_id = auth.uid() and public.has_role(auth.uid(), 'employer'))
  with check (employer_id = auth.uid() and public.has_role(auth.uid(), 'employer') and public.is_active_user(auth.uid()));
create policy "Employers delete own draft shifts" on public.shifts for delete to authenticated
  using (employer_id = auth.uid() and public.has_role(auth.uid(), 'employer') and status = 'draft');

create or replace function public.validate_shift()
returns trigger language plpgsql set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_mod public.moderation_status;
  v_end timestamptz;
begin
  -- Service role / migrations: no user context.
  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  v_is_admin := public.has_role(v_uid, 'admin');

  -- Admin moderating someone else's shift: only the moderation flag may change.
  if tg_op = 'UPDATE' and v_is_admin and old.employer_id <> v_uid then
    v_mod := new.moderation;
    new := old;
    new.moderation := v_mod;
    new.updated_at := now();
    return new;
  end if;

  if not public.has_role(v_uid, 'employer') then
    raise exception 'Only employer accounts can create or modify shifts';
  end if;
  if new.employer_id <> v_uid then
    raise exception 'You can only manage your own shifts';
  end if;
  if not exists (select 1 from public.pharmacies where id = new.pharmacy_id and owner_id = v_uid) then
    raise exception 'Pharmacy not found on your account';
  end if;

  if tg_op = 'INSERT' then
    new.moderation := 'visible';
    if new.status not in ('draft','open') then
      raise exception 'New shifts must be draft or open';
    end if;
  else
    -- Employers cannot change moderation or ownership.
    new.moderation := old.moderation;
    new.employer_id := old.employer_id;
    if old.status in ('filled','cancelled') and new.status = old.status then
      raise exception 'Filled or cancelled shifts cannot be edited';
    end if;
    if old.status in ('filled','cancelled') and new.status <> old.status then
      raise exception 'This shift is closed';
    end if;
    if old.status = 'open' and new.status = 'draft' then
      raise exception 'Published shifts cannot return to draft; cancel instead';
    end if;
  end if;

  -- Publishing rules
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open' or
      new.shift_date is distinct from old.shift_date or new.application_deadline is distinct from old.application_deadline or
      new.end_time is distinct from old.end_time) then
    v_end := (new.shift_date + new.end_time) at time zone 'Europe/Dublin';
    if new.shift_date < current_date then
      raise exception 'Shift date must be today or later';
    end if;
    if new.application_deadline <= now() then
      raise exception 'Application deadline must be in the future';
    end if;
    if new.application_deadline > v_end then
      raise exception 'Application deadline must be before the shift ends';
    end if;
  end if;

  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    new.published_at := now();
  end if;
  if new.status = 'filled' and (tg_op = 'INSERT' or old.status <> 'filled') then
    new.filled_at := now();
  end if;
  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled') then
    new.cancelled_at := now();
  end if;

  new.updated_at := now();
  return new;
end $$;
create trigger shifts_validate before insert or update on public.shifts
  for each row execute function public.validate_shift();

-- ========== SHIFT CONTACT POLICIES ==========
create policy "Owners read shift contacts" on public.shift_contacts for select to authenticated
  using (public.owns_shift(shift_id, auth.uid()));
create policy "Active applicants read shift contacts" on public.shift_contacts for select to authenticated
  using (public.has_active_application(shift_id, auth.uid()));
create policy "Admins read shift contacts" on public.shift_contacts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Owners insert shift contacts" on public.shift_contacts for insert to authenticated
  with check (public.owns_shift(shift_id, auth.uid()) and public.has_role(auth.uid(), 'employer'));
create policy "Owners update shift contacts" on public.shift_contacts for update to authenticated
  using (public.owns_shift(shift_id, auth.uid()) and public.has_role(auth.uid(), 'employer'))
  with check (public.owns_shift(shift_id, auth.uid()) and public.has_role(auth.uid(), 'employer'));
create policy "Owners delete shift contacts" on public.shift_contacts for delete to authenticated
  using (public.owns_shift(shift_id, auth.uid()) and public.has_role(auth.uid(), 'employer'));

-- ========== APPLICATION POLICIES ==========
create policy "Locums read own applications" on public.applications for select to authenticated
  using (locum_id = auth.uid());
create policy "Employers read applications to own shifts" on public.applications for select to authenticated
  using (public.owns_shift(shift_id, auth.uid()));
create policy "Admins read applications" on public.applications for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Locums apply" on public.applications for insert to authenticated
  with check (locum_id = auth.uid() and public.has_role(auth.uid(), 'locum') and public.is_active_user(auth.uid()));
create policy "Locums and shift owners update applications" on public.applications for update to authenticated
  using (locum_id = auth.uid() or public.owns_shift(shift_id, auth.uid()))
  with check (locum_id = auth.uid() or public.owns_shift(shift_id, auth.uid()));

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
    if s.status <> 'open' or s.moderation <> 'visible' then
      raise exception 'This shift is not accepting applications';
    end if;
    if s.application_deadline <= now() or s.shift_date < current_date then
      raise exception 'The application deadline has passed';
    end if;
    select * into lp from public.locum_profiles where user_id = v_uid;
    if not found then raise exception 'Complete your locum profile before applying'; end if;
    if s.required_registration = 'PSI' and coalesce(lp.psi_number, '') = '' then
      raise exception 'This shift requires a PSI registration number on your profile';
    end if;
    if s.required_registration = 'GPhC' and coalesce(lp.gphc_number, '') = '' then
      raise exception 'This shift requires a GPhC registration number on your profile';
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
create trigger applications_validate before insert or update on public.applications
  for each row execute function public.validate_application();

-- ========== MARK SHIFT FILLED (runs as caller; RLS + triggers apply) ==========
create or replace function public.mark_shift_filled(_shift_id uuid, _application_id uuid default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.owns_shift(_shift_id, auth.uid()) then
    raise exception 'You can only fill your own shifts';
  end if;
  if _application_id is not null then
    update public.applications set status = 'accepted'
      where id = _application_id and shift_id = _shift_id and status in ('pending','shortlisted','accepted');
    if not found then raise exception 'Application not found or no longer active'; end if;
    update public.applications set status = 'declined'
      where shift_id = _shift_id and id <> _application_id and status in ('pending','shortlisted');
  end if;
  update public.shifts set status = 'filled' where id = _shift_id and status = 'open';
  if not found then raise exception 'Only open shifts can be marked filled'; end if;
end $$;
revoke execute on function public.mark_shift_filled(uuid, uuid) from public, anon;
grant execute on function public.mark_shift_filled(uuid, uuid) to authenticated;

-- ========== REPORT POLICIES ==========
create policy "Users create reports" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and admin_notes is null
              and resolved_by is null and resolved_at is null);
create policy "Users read own reports" on public.reports for select to authenticated
  using (reporter_id = auth.uid());
create policy "Admins read reports" on public.reports for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update reports" on public.reports for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ========== ADMIN RPCs ==========
create or replace function public.admin_set_user_status(_user_id uuid, _status public.account_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if _user_id = auth.uid() then raise exception 'You cannot change your own status'; end if;
  update public.profiles set account_status = _status where id = _user_id;
end $$;
revoke execute on function public.admin_set_user_status(uuid, public.account_status) from public, anon;
grant execute on function public.admin_set_user_status(uuid, public.account_status) to authenticated;

create or replace function public.admin_set_shift_moderation(_shift_id uuid, _moderation public.moderation_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  update public.shifts set moderation = _moderation where id = _shift_id;
end $$;
revoke execute on function public.admin_set_shift_moderation(uuid, public.moderation_status) from public, anon;
grant execute on function public.admin_set_shift_moderation(uuid, public.moderation_status) to authenticated;

-- ========== NOTIFICATION TRIGGERS ==========
create or replace function public.notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.shifts%rowtype;
begin
  select * into s from public.shifts where id = new.shift_id;
  if exists (select 1 from public.profiles where id = s.employer_id) then
    insert into public.notifications (user_id, kind, title, body, link)
    values (s.employer_id, 'application_new', 'New application',
      'A locum applied for ' || s.pharmacy_name || ' on ' || to_char(s.shift_date, 'DD Mon YYYY') || '.',
      '/employer/shifts/' || s.id);
  end if;
  return new;
end $$;
create trigger applications_notify_new after insert on public.applications
  for each row execute function public.notify_new_application();

create or replace function public.notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.shifts%rowtype;
begin
  if new.status = old.status then return new; end if;
  select * into s from public.shifts where id = new.shift_id;
  if new.status in ('shortlisted','accepted','declined') then
    insert into public.notifications (user_id, kind, title, body, link)
    values (new.locum_id, 'application_' || new.status::text,
      'Application ' || new.status::text,
      'Your application for ' || s.pharmacy_name || ' on ' || to_char(s.shift_date, 'DD Mon YYYY') || ' was ' || new.status::text || '.',
      '/shifts/' || s.id);
  elsif new.status = 'withdrawn' and exists (select 1 from public.profiles where id = s.employer_id) then
    insert into public.notifications (user_id, kind, title, body, link)
    values (s.employer_id, 'application_withdrawn', 'Application withdrawn',
      'An applicant withdrew from ' || s.pharmacy_name || ' on ' || to_char(s.shift_date, 'DD Mon YYYY') || '.',
      '/employer/shifts/' || s.id);
  end if;
  return new;
end $$;
create trigger applications_notify_status after update on public.applications
  for each row execute function public.notify_application_status();

create or replace function public.notify_shift_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    insert into public.notifications (user_id, kind, title, body, link)
    select a.locum_id, 'shift_cancelled', 'Shift cancelled',
      new.pharmacy_name || ' cancelled the shift on ' || to_char(new.shift_date, 'DD Mon YYYY') || '.',
      '/shifts/' || new.id
    from public.applications a
    where a.shift_id = new.id and a.status in ('pending','shortlisted','accepted');
  end if;
  return new;
end $$;
create trigger shifts_notify_cancelled after update on public.shifts
  for each row execute function public.notify_shift_cancelled();

-- Lock down helper functions from anon
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ========== DEMO SEED DATA (clearly marked is_demo) ==========
insert into public.pharmacies (id, owner_id, name, address_line, town, county, postcode, country, lat, lng, contact_email, contact_phone, is_demo) values
 ('d0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-00000000de00','[Demo] Liffey Street Pharmacy','12 Liffey Street Upper','Dublin','Dublin','D01 X0X0','IE',53.3478,-6.2637,'demo.liffey@example.com','+353 1 555 0101',true),
 ('d0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-00000000de00','[Demo] Lee Quay Chemist','4 Lavitt''s Quay','Cork','Cork','T12 X0X0','IE',51.8997,-8.4730,'demo.leequay@example.com','+353 21 555 0102',true),
 ('d0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-00000000de00','[Demo] Salthill Pharmacy','88 Upper Salthill','Galway','Galway','H91 X0X0','IE',53.2610,-9.0740,'demo.salthill@example.com','+353 91 555 0103',true),
 ('d0000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-00000000de00','[Demo] Shannon Bridge Pharmacy','21 O''Connell Street','Limerick','Limerick','V94 X0X0','IE',52.6638,-8.6267,'demo.shannon@example.com','+353 61 555 0104',true),
 ('d0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-00000000de00','[Demo] Marble City Pharmacy','3 High Street','Kilkenny','Kilkenny','R95 X0X0','IE',52.6541,-7.2448,'demo.marble@example.com','+353 56 555 0105',true),
 ('d0000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-00000000de00','[Demo] Northern Quarter Pharmacy','45 Oldham Street','Manchester','Greater Manchester','M1 1AA','UK',53.4839,-2.2346,'demo.nq@example.com','+44 161 555 0106',true);

insert into public.shifts (id, employer_id, pharmacy_id, pharmacy_name, address_line, town, county, postcode, country, lat, lng, shift_date, start_time, end_time, hourly_rate, currency, role_title, required_registration, min_experience_years, requirements, notes, application_deadline, status, published_at, is_demo) values
 ('5d000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000001','[Demo] Liffey Street Pharmacy','12 Liffey Street Upper','Dublin','Dublin','D01 X0X0','IE',53.3478,-6.2637, current_date + 3,'09:00','18:00',48.00,'EUR','Locum Pharmacist','PSI',1,'Methadone dispensing; flu vaccination trained preferred','Busy city-centre community pharmacy with two technicians on site. Demo listing.', (current_date + 2)::timestamptz + interval '18 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000001','[Demo] Liffey Street Pharmacy','12 Liffey Street Upper','Dublin','Dublin','D01 X0X0','IE',53.3478,-6.2637, current_date + 6,'10:00','14:00',52.00,'EUR','Locum Pharmacist','PSI',0,null,'Saturday half day. Demo listing.', (current_date + 5)::timestamptz + interval '12 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000002','[Demo] Lee Quay Chemist','4 Lavitt''s Quay','Cork','Cork','T12 X0X0','IE',51.8997,-8.4730, current_date + 4,'09:00','17:30',45.00,'EUR','Locum Pharmacist','PSI',2,'Nursing home trays','Quiet morning, busier afternoons. Demo listing.', (current_date + 3)::timestamptz + interval '17 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000003','[Demo] Salthill Pharmacy','88 Upper Salthill','Galway','Galway','H91 X0X0','IE',53.2610,-9.0740, current_date + 8,'09:30','18:30',46.50,'EUR','Supervising Pharmacist cover','PSI',3,'Comfortable supervising pre-reg student','Seafront pharmacy, parking available. Demo listing.', (current_date + 6)::timestamptz + interval '17 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000004','[Demo] Shannon Bridge Pharmacy','21 O''Connell Street','Limerick','Limerick','V94 X0X0','IE',52.6638,-8.6267, current_date + 5,'09:00','18:00',44.00,'EUR','Locum Pharmacist','PSI',0,null,'Demo listing.', (current_date + 4)::timestamptz + interval '12 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000005','[Demo] Marble City Pharmacy','3 High Street','Kilkenny','Kilkenny','R95 X0X0','IE',52.6541,-7.2448, current_date + 10,'09:00','13:00',50.00,'EUR','Locum Pharmacist','PSI',1,'Vaccination clinic morning','Demo listing.', (current_date + 8)::timestamptz + interval '17 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000001','[Demo] Liffey Street Pharmacy','12 Liffey Street Upper','Dublin','Dublin','D01 X0X0','IE',53.3478,-6.2637, current_date + 14,'08:30','20:00',55.00,'EUR','Locum Pharmacist','PSI',2,'Late opening','Long day, two breaks scheduled. Demo listing.', (current_date + 12)::timestamptz + interval '17 hours','open', now(), true),
 ('5d000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-00000000de00','d0000000-0000-4000-8000-000000000006','[Demo] Northern Quarter Pharmacy','45 Oldham Street','Manchester','Greater Manchester','M1 1AA','UK',53.4839,-2.2346, current_date + 7,'09:00','18:00',38.00,'GBP','Locum Pharmacist','GPhC',1,'NHS Pharmacy First service','UK demo listing to show GBP / GPhC support.', (current_date + 5)::timestamptz + interval '17 hours','open', now(), true);

insert into public.shift_contacts (shift_id, contact_name, contact_email, contact_phone)
select s.id, 'Demo Manager', p.contact_email, p.contact_phone
from public.shifts s join public.pharmacies p on p.id = s.pharmacy_id
where s.is_demo;
