-- Locum4U in-app messaging access-rule checks.
-- Runs inside one DO block that always ends by raising an exception, so every
-- test row is rolled back. Read the "RESULTS" line: each check prints PASS or FAIL.
do $main$
declare
  emp uuid := gen_random_uuid();
  emp2 uuid := gen_random_uuid();
  loc uuid := gen_random_uuid();
  loc2 uuid := gen_random_uuid();
  adm uuid := gen_random_uuid();
  ph uuid; sh uuid; app uuid; app2 uuid; conv uuid; conv_again uuid; msg uuid;
  n int; b bigint; t text; i int;
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
    (emp,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mt-emp@example.test',  '{"full_name":"Emp One"}', now(), now()),
    (emp2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mt-emp2@example.test', '{}', now(), now()),
    (loc,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mt-loc@example.test',  '{"full_name":"Loc One"}', now(), now()),
    (loc2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mt-loc2@example.test', '{}', now(), now()),
    (adm,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mt-adm@example.test',  '{}', now(), now());
  insert into public.user_roles (user_id, role) values
    (emp, 'employer'), (emp2, 'employer'), (loc, 'locum'), (loc2, 'locum'), (adm, 'admin');
  insert into public.locum_profiles (user_id, psi_number, years_experience) values (loc, '123456', 3), (loc2, '654321', 3);

  perform pg_temp.act(emp);
  insert into public.pharmacies (owner_id, name, address_line, town, country) values (emp, 'MT Pharmacy', '1 Main St', 'Dublin', 'IE') returning id into ph;
  insert into public.shifts (employer_id, pharmacy_id, pharmacy_name, address_line, town, shift_date, start_time, end_time, hourly_rate, application_deadline, status)
    values (emp, ph, 'MT Pharmacy', '1 Main St', 'Dublin', current_date + 5, '09:00', '17:00', 45, now() + interval '2 days', 'draft') returning id into sh;
  insert into public.shift_contacts (shift_id, contact_email) values (sh, 'mt-mgr@example.test');
  update public.shifts set status = 'open' where id = sh;

  perform pg_temp.act(loc);
  insert into public.applications (shift_id, locum_id) values (sh, loc) returning id into app;
  perform pg_temp.act(loc2);
  insert into public.applications (shift_id, locum_id) values (sh, loc2) returning id into app2;

  -- 1. Applicant starts the conversation for their own application
  perform pg_temp.act(loc);
  conv := public.start_conversation(app);
  results := results || case when conv is not null then ' 1:PASS' else ' 1:FAIL' end;

  -- 2. Employer opening it gets the same thread (no duplicates)
  perform pg_temp.act(emp);
  conv_again := public.start_conversation(app);
  perform pg_temp.su();
  select count(*) into n from public.conversations where application_id = app;
  results := results || case when conv_again = conv and n = 1 then ' 2:PASS' else ' 2:FAIL' end;

  -- 3. Another applicant / another employer cannot open someone else's application
  perform pg_temp.act(loc2);
  begin perform public.start_conversation(app); results := results || ' 3a:FAIL';
  exception when others then results := results || ' 3a:PASS'; end;
  perform pg_temp.act(emp2);
  begin perform public.start_conversation(app); results := results || ' 3b:FAIL';
  exception when others then results := results || ' 3b:PASS'; end;

  -- 4. Applicant sends a message
  perform pg_temp.act(loc);
  insert into public.messages (conversation_id, sender_id, body) values (conv, loc, '  Hello, is parking available? ') returning id into msg;
  select body into t from public.messages where id = msg;
  results := results || case when t = 'Hello, is parking available?' then ' 4:PASS' else ' 4:FAIL' end;

  -- 5. Impersonation refused
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, emp, 'fake');
    results := results || ' 5:FAIL';
  exception when others then results := results || ' 5:PASS'; end;

  -- 6. Other applicant cannot read or write this thread
  perform pg_temp.act(loc2);
  select count(*) into n from public.messages where conversation_id = conv;
  results := results || case when n = 0 then ' 6a:PASS' else ' 6a:FAIL' end;
  select count(*) into n from public.conversations where id = conv;
  results := results || case when n = 0 then ' 6b:PASS' else ' 6b:FAIL' end;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, loc2, 'hi');
    results := results || ' 6c:FAIL';
  exception when others then results := results || ' 6c:PASS'; end;
  select count(*) into n from public.my_conversations() where conversation_id = conv;
  results := results || case when n = 0 then ' 6d:PASS' else ' 6d:FAIL' end;

  -- 7. Other employer cannot read
  perform pg_temp.act(emp2);
  select count(*) into n from public.messages where conversation_id = conv;
  results := results || case when n = 0 then ' 7:PASS' else ' 7:FAIL' end;

  -- 8. Anonymous visitors cannot read
  perform pg_temp.act(null);
  begin
    select count(*) into n from public.messages;
    results := results || case when n = 0 then ' 8:PASS' else ' 8:FAIL' end;
  exception when others then results := results || ' 8:PASS'; end;

  -- 9. Employer sees it as unread, then reads it
  perform pg_temp.act(emp);
  b := public.my_unread_message_count();
  results := results || case when b = 1 then ' 9a:PASS' else ' 9a:FAIL' end;
  select other_name into t from public.my_conversations(conv);
  results := results || case when t = 'Loc One' then ' 9b:PASS' else ' 9b:FAIL' end;
  perform public.mark_conversation_read(conv);
  b := public.my_unread_message_count();
  results := results || case when b = 0 then ' 9c:PASS' else ' 9c:FAIL' end;

  -- 10. Employer sees both applicants as message candidates, locum sees only own
  select count(*) into n from public.my_conversations() where shift_id = sh;
  results := results || case when n = 2 then ' 10a:PASS' else ' 10a:FAIL' end;
  perform pg_temp.act(loc);
  select count(*) into n from public.my_conversations() where shift_id = sh;
  results := results || case when n = 1 then ' 10b:PASS' else ' 10b:FAIL' end;

  -- 11. Length limits
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, loc, repeat('x', 2001));
    results := results || ' 11a:FAIL';
  exception when others then results := results || ' 11a:PASS'; end;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, loc, '   ');
    results := results || ' 11b:FAIL';
  exception when others then results := results || ' 11b:PASS'; end;

  -- 12. Messages cannot be edited or deleted by participants
  update public.messages set body = 'edited' where id = msg;
  delete from public.messages where id = msg;
  perform pg_temp.su();
  select body into t from public.messages where id = msg;
  results := results || case when t = 'Hello, is parking available?' then ' 12:PASS' else ' 12:FAIL' end;

  -- 13. Admin cannot read an unreported conversation
  perform pg_temp.act(adm);
  select count(*) into n from public.messages where conversation_id = conv;
  results := results || case when n = 0 then ' 13:PASS' else ' 13:FAIL' end;

  -- 14. Other applicant cannot report this conversation
  perform pg_temp.act(loc2);
  begin
    insert into public.reports (reporter_id, conversation_id, reason) values (loc2, conv, 'inappropriate');
    results := results || ' 14:FAIL';
  exception when others then results := results || ' 14:PASS'; end;

  -- 15. Employer reports the message; reported user derived server-side
  perform pg_temp.act(emp);
  insert into public.reports (reporter_id, message_id, reason, reported_user_id) values (emp, msg, 'inappropriate', emp2);
  perform pg_temp.su();
  select count(*) into n from public.reports where conversation_id = conv and reported_user_id = loc and shift_id is null;
  results := results || case when n = 1 then ' 15:PASS' else ' 15:FAIL' end;

  -- 16. Admin can read the reported conversation
  perform pg_temp.act(adm);
  select count(*) into n from public.messages where conversation_id = conv;
  results := results || case when n = 1 then ' 16:PASS' else ' 16:FAIL' end;

  -- 17. Rate limit (20 per minute)
  perform pg_temp.act(emp);
  begin
    for i in 1..21 loop
      insert into public.messages (conversation_id, sender_id, body) values (conv, emp, 'msg ' || i);
    end loop;
    results := results || ' 17:FAIL';
  exception when others then results := results || ' 17:PASS'; end;

  -- 18. Withdrawn application closes the conversation for new messages
  perform pg_temp.act(loc);
  update public.applications set status = 'withdrawn' where id = app;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, loc, 'still there?');
    results := results || ' 18a:FAIL';
  exception when others then results := results || ' 18a:PASS'; end;
  select count(*) into n from public.messages where conversation_id = conv;
  results := results || case when n >= 1 then ' 18b:PASS' else ' 18b:FAIL' end;

  -- 19. The other applicant sees no conversations at all
  perform pg_temp.act(loc2);
  select count(*) into n from public.conversations;
  results := results || case when n = 0 then ' 19:PASS' else ' 19:FAIL' end;

  perform pg_temp.su();
  raise exception 'RESULTS:%', results;
end $main$;
