-- Locum4U database access-rule checks.
-- Runs entirely inside one DO block that always ends by raising an exception,
-- so every test row is rolled back and nothing is left in the database.
-- Read the "RESULTS" line in the error message: each check prints PASS or FAIL.
do $main$
declare
  emp uuid := gen_random_uuid();
  emp2 uuid := gen_random_uuid();
  loc uuid := gen_random_uuid();
  loc_nopsi uuid := gen_random_uuid();
  ph uuid; sh uuid; sh_exp uuid; app uuid; n int; st text;
  results text := '';
begin
  execute $f$create function pg_temp.act(_uid uuid) returns void language plpgsql as $b$
    begin
      if _uid is null then
        perform set_config('role', 'anon', true);
        perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      else
        perform set_config('role', 'authenticated', true);
        perform set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
      end if;
    end $b$ $f$;
  execute $f$create function pg_temp.su() returns void language plpgsql as $b$
    begin
      perform set_config('role', 'postgres', true);
      perform set_config('request.jwt.claims', '', true);
    end $b$ $f$;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
    (emp,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rt-emp@example.test',  '{}', now(), now()),
    (emp2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rt-emp2@example.test', '{}', now(), now()),
    (loc,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rt-loc@example.test',  '{}', now(), now()),
    (loc_nopsi, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rt-loc2@example.test', '{}', now(), now());
  insert into public.user_roles (user_id, role) values (emp, 'employer'), (emp2, 'employer'), (loc, 'locum'), (loc_nopsi, 'locum');
  insert into public.locum_profiles (user_id, psi_number, gphc_number, years_experience) values (loc, '123456', null, 3), (loc_nopsi, null, '1234567', 10);

  -- 1. Employer creates pharmacy + draft shift
  perform pg_temp.act(emp);
  insert into public.pharmacies (owner_id, name, address_line, town, country) values (emp, 'RT Pharmacy', '1 Main St', 'Dublin', 'IE') returning id into ph;
  insert into public.shifts (employer_id, pharmacy_id, pharmacy_name, address_line, town, shift_date, start_time, end_time, hourly_rate, application_deadline, status)
    values (emp, ph, 'RT Pharmacy', '1 Main St', 'Dublin', current_date + 5, '09:00', '17:00', 45, now() + interval '2 days', 'draft') returning id into sh;
  results := results || ' 1:PASS';

  -- 2. Inserting straight as open is refused
  begin
    insert into public.shifts (employer_id, pharmacy_id, pharmacy_name, address_line, town, shift_date, start_time, end_time, hourly_rate, application_deadline, status)
      values (emp, ph, 'RT Pharmacy', '1 Main St', 'Dublin', current_date + 5, '09:00', '17:00', 45, now() + interval '2 days', 'open');
    results := results || ' 2:FAIL';
  exception when others then results := results || ' 2:PASS'; end;

  -- 3. Publishing without contact refused; with contact allowed
  begin
    update public.shifts set status = 'open' where id = sh;
    results := results || ' 3a:FAIL';
  exception when others then results := results || ' 3a:PASS'; end;
  insert into public.shift_contacts (shift_id, contact_name, contact_email, contact_phone) values (sh, 'Mgr', 'rt-mgr@example.test', '+353 1 000');
  update public.shifts set status = 'open' where id = sh;
  select status::text into st from public.shifts where id = sh;
  results := results || case when st = 'open' then ' 3b:PASS' else ' 3b:FAIL' end;

  -- 4. Another employer cannot change or read private contact
  perform pg_temp.act(emp2);
  update public.shifts set hourly_rate = 1 where id = sh;
  get diagnostics n = row_count;
  results := results || case when n = 0 then ' 4a:PASS' else ' 4a:FAIL' end;
  select count(*) into n from public.shift_contacts where shift_id = sh;
  results := results || case when n = 0 then ' 4b:PASS' else ' 4b:FAIL' end;

  -- 5. Locum cannot create or modify shifts
  perform pg_temp.act(loc);
  begin
    insert into public.shifts (employer_id, pharmacy_id, pharmacy_name, address_line, town, shift_date, start_time, end_time, hourly_rate, application_deadline)
      values (loc, ph, 'X', 'X St', 'Dublin', current_date + 5, '09:00', '17:00', 45, now() + interval '2 days');
    results := results || ' 5a:FAIL';
  exception when others then results := results || ' 5a:PASS'; end;
  update public.shifts set hourly_rate = 1 where id = sh;
  get diagnostics n = row_count;
  results := results || case when n = 0 then ' 5b:PASS' else ' 5b:FAIL' end;

  -- 6. Contact hidden before applying, visible after; anon never sees it
  select count(*) into n from public.shift_contacts where shift_id = sh;
  results := results || case when n = 0 then ' 6a:PASS' else ' 6a:FAIL' end;
  insert into public.applications (shift_id, locum_id, message) values (sh, loc, 'Hi') returning id into app;
  select count(*) into n from public.shift_contacts where shift_id = sh;
  results := results || case when n = 1 then ' 6b:PASS' else ' 6b:FAIL' end;
  perform pg_temp.act(null);
  begin
    select count(*) into n from public.shift_contacts where shift_id = sh;
    results := results || case when n = 0 then ' 6c:PASS' else ' 6c:FAIL' end;
  exception when insufficient_privilege then results := results || ' 6c:PASS'; end;

  -- 7. Duplicate application refused
  perform pg_temp.act(loc);
  begin
    insert into public.applications (shift_id, locum_id) values (sh, loc);
    results := results || ' 7:FAIL';
  exception when unique_violation then results := results || ' 7:PASS'; end;

  -- 8. Missing PSI number refused for an Irish shift
  perform pg_temp.act(loc_nopsi);
  begin
    insert into public.applications (shift_id, locum_id) values (sh, loc_nopsi);
    results := results || ' 8:FAIL';
  exception when others then results := results || ' 8:PASS'; end;

  -- 9. Employer cannot apply
  perform pg_temp.act(emp2);
  begin
    insert into public.applications (shift_id, locum_id) values (sh, emp2);
    results := results || ' 9:FAIL';
  exception when others then results := results || ' 9:PASS'; end;

  -- 10. Experience requirement enforced
  perform pg_temp.act(emp);
  insert into public.shifts (employer_id, pharmacy_id, pharmacy_name, address_line, town, shift_date, start_time, end_time, hourly_rate, application_deadline, status, min_experience_years)
    values (emp, ph, 'RT Pharmacy', '1 Main St', 'Dublin', current_date + 6, '09:00', '17:00', 45, now() + interval '2 days', 'draft', 5) returning id into sh_exp;
  insert into public.shift_contacts (shift_id, contact_email) values (sh_exp, 'rt-mgr@example.test');
  update public.shifts set status = 'open' where id = sh_exp;
  perform pg_temp.act(loc);
  begin
    insert into public.applications (shift_id, locum_id) values (sh_exp, loc);
    results := results || ' 10:FAIL';
  exception when others then results := results || ' 10:PASS'; end;

  -- 11. Deadline passed refused
  perform pg_temp.su();
  update public.shifts set min_experience_years = 0, application_deadline = now() - interval '1 minute' where id = sh_exp;
  perform pg_temp.act(loc);
  begin
    insert into public.applications (shift_id, locum_id) values (sh_exp, loc);
    results := results || ' 11:FAIL';
  exception when others then results := results || ' 11:PASS'; end;

  -- 12. Locum cannot accept own application
  begin
    update public.applications set status = 'accepted' where id = app;
    results := results || ' 12:FAIL';
  exception when others then results := results || ' 12:PASS'; end;

  -- 13. Owner marks filled with the applicant
  perform pg_temp.act(emp);
  perform public.mark_shift_filled(sh, app);
  select status::text into st from public.applications where id = app;
  results := results || case when st = 'accepted' then ' 13a:PASS' else ' 13a:FAIL' end;
  select status::text into st from public.shifts where id = sh;
  results := results || case when st = 'filled' then ' 13b:PASS' else ' 13b:FAIL' end;

  -- 14. Other employer cannot fill someone else's shift
  perform pg_temp.act(emp2);
  begin
    perform public.mark_shift_filled(sh_exp, null);
    results := results || ' 14:FAIL';
  exception when others then results := results || ' 14:PASS'; end;

  -- 15. Non-admin cannot moderate or suspend
  begin
    perform public.admin_set_shift_moderation(sh_exp, 'hidden');
    results := results || ' 15a:FAIL';
  exception when others then results := results || ' 15a:PASS'; end;
  begin
    perform public.admin_set_user_status(loc, 'suspended');
    results := results || ' 15b:FAIL';
  exception when others then results := results || ' 15b:PASS'; end;

  perform pg_temp.su();
  raise exception 'RESULTS:%', results;
end $main$;
