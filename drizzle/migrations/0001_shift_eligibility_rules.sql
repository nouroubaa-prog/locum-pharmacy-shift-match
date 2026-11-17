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
    if new.status <> 'draft' then
      raise exception 'Save the shift as a draft first, then publish it';
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
    if old.status = 'draft' and new.status = 'filled' then
      raise exception 'Publish the shift before marking it filled';
    end if;
    if new.status = 'open' and old.status <> 'open'
       and not exists (select 1 from public.shift_contacts where shift_id = new.id) then
      raise exception 'Add contact details before publishing this shift';
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