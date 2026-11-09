-- TerasMatrix backend — Supabase / PostgreSQL schema
-- Run this file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null,
  email text not null,
  umkm_name text not null,
  role text not null check (role in ('owner', 'employee')),
  lokasi text,
  sektor text,
  omzet bigint check (omzet is null or omzet >= 0),
  invite_code text unique,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_one_owner_per_umkm
  on public.profiles (lower(trim(umkm_name)))
  where role = 'owner';
create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

create table if not exists public.factor_definitions (
  key text primary key,
  label text not null,
  role text not null check (role in ('owner', 'employee')),
  weight numeric(4, 2) not null check (weight > 0),
  scale_max smallint not null check (scale_max between 1 and 5)
);

insert into public.factor_definitions (key, label, role, weight, scale_max)
values
  ('INS', 'Sumber Daya', 'owner', 0.20, 3),
  ('OV', 'Budaya', 'employee', 0.18, 5),
  ('LDI', 'Kepemimpinan', 'employee', 0.17, 5),
  ('WEQ', 'Proses', 'employee', 0.15, 5),
  ('OPS', 'Inovasi', 'owner', 0.15, 5),
  ('ECT', 'Eksternal', 'owner', 0.15, 5)
on conflict (key) do update
set label = excluded.label,
    role = excluded.role,
    weight = excluded.weight,
    scale_max = excluded.scale_max;

create table if not exists public.question_definitions (
  question_id text primary key,
  factor_key text not null references public.factor_definitions(key),
  role text not null check (role in ('owner', 'employee')),
  scale_max smallint not null check (scale_max between 1 and 5)
);

insert into public.question_definitions (question_id, factor_key, role, scale_max)
values
  ('ins_oh1', 'INS', 'owner', 3), ('ins_oh2', 'INS', 'owner', 3),
  ('ins_oh3', 'INS', 'owner', 3), ('ins_oh4', 'INS', 'owner', 3),
  ('ins_oh5', 'INS', 'owner', 3), ('ins_oh6', 'INS', 'owner', 3),
  ('ov_oh18', 'OV', 'employee', 5), ('ov_oh19', 'OV', 'employee', 5),
  ('ov_oh20', 'OV', 'employee', 5), ('ov_oh21', 'OV', 'employee', 5),
  ('ov_oh22', 'OV', 'employee', 5), ('ov_oh23', 'OV', 'employee', 5),
  ('ov_oh24', 'OV', 'employee', 5), ('ov_oh25', 'OV', 'employee', 5),
  ('ldi_oh7', 'LDI', 'employee', 5), ('ldi_oh8', 'LDI', 'employee', 5),
  ('ldi_oh9', 'LDI', 'employee', 5), ('ldi_oh10', 'LDI', 'employee', 5),
  ('ldi_oh11', 'LDI', 'employee', 5), ('ldi_oh12', 'LDI', 'employee', 5),
  ('weq_oh13', 'WEQ', 'employee', 5), ('weq_oh14', 'WEQ', 'employee', 5),
  ('weq_oh15', 'WEQ', 'employee', 5), ('weq_oh16', 'WEQ', 'employee', 5),
  ('weq_oh17', 'WEQ', 'employee', 5),
  ('ops_oh26', 'OPS', 'owner', 5), ('ops_oh27', 'OPS', 'owner', 5),
  ('ops_oh28', 'OPS', 'owner', 5), ('ops_oh29', 'OPS', 'owner', 5),
  ('ops_oh30', 'OPS', 'owner', 5), ('ops_oh31', 'OPS', 'owner', 5),
  ('ect_oh32', 'ECT', 'owner', 5), ('ect_oh33', 'ECT', 'owner', 5),
  ('ect_oh34', 'ECT', 'owner', 5), ('ect_oh35', 'ECT', 'owner', 5)
on conflict (question_id) do update
set factor_key = excluded.factor_key,
    role = excluded.role,
    scale_max = excluded.scale_max;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  status text not null default 'submitted'
    check (status in ('submitted', 'validated')),
  validation_pass boolean not null default true,
  submitted_at timestamptz not null default now(),
  score_ins numeric(5, 4),
  score_ov numeric(5, 4),
  score_ldi numeric(5, 4),
  score_weq numeric(5, 4),
  score_ops numeric(5, 4),
  score_ect numeric(5, 4),
  score_composite numeric(5, 4),
  score_on_5 numeric(4, 2),
  health_category text
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  factor_key text not null references public.factor_definitions(key),
  question_id text not null references public.question_definitions(question_id),
  answer_value smallint not null,
  scale_max smallint not null,
  unique (submission_id, question_id),
  check (answer_value between 1 and scale_max)
);

create index if not exists submissions_submitted_at_idx
  on public.submissions (submitted_at desc);
create index if not exists answers_submission_id_idx
  on public.answers (submission_id);

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create or replace function public.get_my_invite_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.invite_code
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.role = 'owner'
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'owner');
  v_umkm_name text := trim(coalesce(new.raw_user_meta_data ->> 'umkm_name', ''));
  v_organization_id uuid;
  v_invite_code text;
begin
  if v_role = 'employee' then
    select p.umkm_name, p.organization_id
      into v_umkm_name, v_organization_id
    from public.profiles as p
    where p.role = 'owner'
      and p.invite_code = upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
    if not found then
      raise exception 'Kode undangan tidak valid. Minta kode terbaru kepada Owner UMKM.';
    end if;
  elsif v_role = 'owner' then
    v_organization_id := new.id;
    v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  else
    raise exception 'Peran akun tidak valid.';
  end if;

  insert into public.profiles (id, organization_id, email, umkm_name, role, lokasi, sektor, omzet, invite_code)
  values (
    new.id,
    v_organization_id,
    lower(new.email),
    v_umkm_name,
    v_role,
    nullif(trim(new.raw_user_meta_data ->> 'lokasi'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'sektor'), ''),
    nullif(new.raw_user_meta_data ->> 'omzet', '')::bigint,
    v_invite_code
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.factor_definitions enable row level security;
alter table public.question_definitions enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;

drop policy if exists "Users can read profiles in their UMKM" on public.profiles;
create policy "Users can read profiles in their UMKM"
  on public.profiles for select to authenticated
  using (organization_id = (select public.current_organization_id()));

drop policy if exists "Authenticated users can read factors" on public.factor_definitions;
create policy "Authenticated users can read factors"
  on public.factor_definitions for select to authenticated using (true);

drop policy if exists "Authenticated users can read questions" on public.question_definitions;
create policy "Authenticated users can read questions"
  on public.question_definitions for select to authenticated using (true);

drop policy if exists "Users can read submissions in their UMKM" on public.submissions;
create policy "Users can read submissions in their UMKM"
  on public.submissions for select to authenticated
  using (
    exists (
      select 1 from public.profiles as p
      where p.id = submissions.user_id
        and p.organization_id = (select public.current_organization_id())
    )
  );

drop policy if exists "Users can read answers in their UMKM" on public.answers;
create policy "Users can read answers in their UMKM"
  on public.answers for select to authenticated
  using (
    exists (
      select 1
      from public.submissions as s
      join public.profiles as p on p.id = s.user_id
      where s.id = answers.submission_id
        and p.organization_id = (select public.current_organization_id())
    )
  );

create or replace function public.submit_assessment(p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_owner_submission public.submissions%rowtype;
  v_saved_submission public.submissions%rowtype;
  v_question public.question_definitions%rowtype;
  v_factor record;
  v_submission_id uuid;
  v_answer_value integer;
  v_answer_count integer := 0;
  v_expected_count integer;
  v_answer_numeric numeric;
  v_factor_score numeric;
  v_composite numeric := 0;
  v_scores jsonb := '{}'::jsonb;
  v_category text;
begin
  if v_user_id is null then
    raise exception 'Silakan login untuk mengirim penilaian.';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Format jawaban tidak valid.';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profil pengguna tidak ditemukan.';
  end if;
  if exists (select 1 from public.submissions where user_id = v_user_id) then
    raise exception 'Anda hanya dapat mengisi kuesioner sekali.';
  end if;

  select count(*) into v_expected_count
  from public.question_definitions where role = v_profile.role;
  if (select count(*) from jsonb_object_keys(p_answers)) <> v_expected_count then
    raise exception 'Semua pertanyaan wajib dijawab.';
  end if;

  for v_question in
    select * from public.question_definitions where role = v_profile.role
  loop
    if not (p_answers ? v_question.question_id)
      or jsonb_typeof(p_answers -> v_question.question_id) <> 'number' then
      raise exception 'Jawaban tidak valid untuk pertanyaan %.', v_question.question_id;
    end if;
    v_answer_numeric := (p_answers ->> v_question.question_id)::numeric;
    if v_answer_numeric <> trunc(v_answer_numeric) then
      raise exception 'Jawaban harus berupa bilangan bulat.';
    end if;
    v_answer_value := v_answer_numeric::integer;
    if v_answer_value < 1 or v_answer_value > v_question.scale_max then
      raise exception 'Nilai jawaban di luar rentang untuk pertanyaan %.', v_question.question_id;
    end if;
    v_answer_count := v_answer_count + 1;
  end loop;

  if v_answer_count <> (select count(*) from jsonb_object_keys(p_answers)) then
    raise exception 'Jawaban berisi pertanyaan yang tidak sesuai dengan peran akun.';
  end if;

  if v_profile.role = 'employee' then
    select s.* into v_owner_submission
    from public.submissions as s
    join public.profiles as p on p.id = s.user_id
    where p.role = 'owner'
      and p.organization_id = v_profile.organization_id
    order by s.submitted_at desc
    limit 1
    for update of s;
    if not found then
      raise exception 'Owner UMKM ini harus mengisi kuesioner terlebih dahulu.';
    end if;
  end if;

  insert into public.submissions (user_id, role)
  values (v_user_id, v_profile.role)
  returning id into v_submission_id;

  insert into public.answers (submission_id, factor_key, question_id, answer_value, scale_max)
  select
    v_submission_id,
    q.factor_key,
    q.question_id,
    (p_answers ->> q.question_id)::smallint,
    q.scale_max
  from public.question_definitions as q
  where q.role = v_profile.role;

  for v_factor in
    select key, weight
    from public.factor_definitions
    where role = v_profile.role
  loop
    select avg((p_answers ->> q.question_id)::numeric / q.scale_max)
      into v_factor_score
    from public.question_definitions as q
    where q.factor_key = v_factor.key;

    v_scores := v_scores || jsonb_build_object(v_factor.key, v_factor_score);
  end loop;

  if v_profile.role = 'owner' then
    update public.submissions
    set score_ins = (v_scores ->> 'INS')::numeric,
        score_ops = (v_scores ->> 'OPS')::numeric,
        score_ect = (v_scores ->> 'ECT')::numeric
    where id = v_submission_id;
    v_saved_submission.id := v_submission_id;
  else
    update public.submissions
    set score_ov = (v_scores ->> 'OV')::numeric,
        score_ldi = (v_scores ->> 'LDI')::numeric,
        score_weq = (v_scores ->> 'WEQ')::numeric
    where id = v_submission_id;

    select avg(s.score_ov), avg(s.score_ldi), avg(s.score_weq)
      into v_saved_submission.score_ov, v_saved_submission.score_ldi, v_saved_submission.score_weq
    from public.submissions as s
    join public.profiles as p on p.id = s.user_id
    where s.role = 'employee'
      and p.organization_id = v_profile.organization_id;

    update public.submissions
    set score_ov = v_saved_submission.score_ov,
        score_ldi = v_saved_submission.score_ldi,
        score_weq = v_saved_submission.score_weq
    where id = v_owner_submission.id;
    v_submission_id := v_owner_submission.id;
  end if;

  select
    sum(score_value * weight) / nullif(sum(weight), 0)
  into v_composite
  from (
    select 'INS'::text as key, score_ins as score_value from public.submissions where id = v_submission_id
    union all
    select 'OV', score_ov from public.submissions where id = v_submission_id
    union all
    select 'LDI', score_ldi from public.submissions where id = v_submission_id
    union all
    select 'WEQ', score_weq from public.submissions where id = v_submission_id
    union all
    select 'OPS', score_ops from public.submissions where id = v_submission_id
    union all
    select 'ECT', score_ect from public.submissions where id = v_submission_id
  ) as scores
  join public.factor_definitions as f on f.key = scores.key
  where scores.score_value is not null;

  v_category := case
    when v_composite >= 0.80 then 'SANGAT BAIK'
    when v_composite >= 0.60 then 'BAIK'
    when v_composite >= 0.40 then 'CUKUP'
    else 'PERLU PERHATIAN'
  end;

  update public.submissions
  set score_composite = v_composite,
      score_on_5 = v_composite * 5,
      health_category = v_category,
      status = 'validated'
  where id = v_submission_id
  returning * into v_saved_submission;

  v_scores := jsonb_build_object(
    'INS', jsonb_build_object('normScore', v_saved_submission.score_ins, 'scoreOn5', v_saved_submission.score_ins * 5),
    'OV', jsonb_build_object('normScore', v_saved_submission.score_ov, 'scoreOn5', v_saved_submission.score_ov * 5),
    'LDI', jsonb_build_object('normScore', v_saved_submission.score_ldi, 'scoreOn5', v_saved_submission.score_ldi * 5),
    'WEQ', jsonb_build_object('normScore', v_saved_submission.score_weq, 'scoreOn5', v_saved_submission.score_weq * 5),
    'OPS', jsonb_build_object('normScore', v_saved_submission.score_ops, 'scoreOn5', v_saved_submission.score_ops * 5),
    'ECT', jsonb_build_object('normScore', v_saved_submission.score_ect, 'scoreOn5', v_saved_submission.score_ect * 5)
  );

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'scores', v_scores,
    'composite', jsonb_build_object(
      'composite', v_saved_submission.score_composite,
      'scoreOn5', v_saved_submission.score_on_5,
      'category', v_saved_submission.health_category
    ),
    'warnings', '[]'::jsonb
  );
end;
$$;

revoke all on function public.submit_assessment(jsonb) from public;
grant execute on function public.submit_assessment(jsonb) to authenticated;
grant execute on function public.current_organization_id() to authenticated;
revoke all on function public.get_my_invite_code() from public;
grant execute on function public.get_my_invite_code() to authenticated;

revoke all on table public.profiles from anon, authenticated;
grant select (id, umkm_name, role, lokasi, sektor, omzet, created_at)
  on table public.profiles to authenticated;
grant select on public.factor_definitions, public.question_definitions,
  public.submissions, public.answers to authenticated;
