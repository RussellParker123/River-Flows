-- Run as database owner. All River Master data is private to the backend.
create table public.rm_months (
  month date primary key,
  budget_micro bigint not null check (budget_micro > 0),
  charged_micro bigint not null default 0 check (charged_micro >= 0)
);
create table public.rm_usage (
  id uuid primary key,
  month date not null references public.rm_months,
  model text not null,
  purpose text not null,
  reserved_micro bigint not null check (reserved_micro > 0),
  actual_micro bigint,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create table public.rm_rates (
  client_hash text not null,
  window_start timestamptz not null,
  count integer not null,
  primary key (client_hash, window_start)
);
create table public.rm_jobs (
  name text primary key check (name in ('collection', 'manager')),
  token uuid,
  expires_at timestamptz,
  cursor bigint not null default 0,
  completed_at timestamptz
);
insert into public.rm_jobs(name) values ('collection'), ('manager');
create table public.rm_gauge_approvals (
  river_name text not null,
  river_state text not null,
  segment_name text not null,
  gauge text not null check (gauge ~ '^[0-9]{8,15}$'),
  approved boolean not null default false,
  reviewed_by text not null,
  evidence_url text not null check (evidence_url ~ '^https://'),
  reviewed_at timestamptz not null default now(),
  primary key (river_name, river_state, segment_name, gauge)
);
create table public.rm_observations (
  gauge text not null check (gauge ~ '^[0-9]{8,15}$'),
  observed_at timestamptz not null,
  flow double precision not null check (flow >= 0 and flow < 'Infinity'::double precision),
  unit text not null check (unit = 'cfs'),
  source_url text not null check (source_url like 'https://waterservices.usgs.gov/nwis/iv/%'),
  station_name text not null,
  qualifiers jsonb not null,
  collected_at timestamptz not null default now(),
  primary key (gauge, observed_at)
);
create table public.rm_proposals (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  river_name text,
  river_state text,
  segment_name text,
  body text not null check (length(body) <= 24000),
  sources jsonb not null,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create table public.rm_daily_observations (
  gauge text not null check (gauge ~ '^[0-9]{8,15}$'),
  observed_on date not null,
  flow double precision not null check (flow >= 0 and flow < 'Infinity'::double precision),
  unit text not null check (unit = 'cfs'),
  statistic text not null check (statistic = 'daily_mean'),
  source_url text not null check (source_url like 'https://waterservices.usgs.gov/nwis/dv/%'),
  qualifiers jsonb not null,
  collected_at timestamptz not null default now(),
  primary key (gauge, observed_on)
);

create function public.rm_reserve(p_id uuid, p_model text, p_purpose text, p_upper bigint, p_budget bigint, p_token uuid default null)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare m date := date_trunc('month', now() at time zone 'UTC')::date; b public.rm_months;
begin
  if p_purpose <> 'chat' then
    perform 1 from public.rm_jobs where name = 'manager' and token = p_token
      and expires_at > clock_timestamp() + interval '30 seconds' for update;
    if not found then raise exception 'Lock lost'; end if;
  end if;
  if p_upper <= 0 or p_budget <= 0 or p_upper > p_budget or length(p_model) > 200 or length(p_purpose) > 100 then return false; end if;
  insert into public.rm_months(month, budget_micro) values(m, p_budget) on conflict do nothing;
  select * into b from public.rm_months where month = m for update;
  update public.rm_months set budget_micro = least(budget_micro, p_budget) where month = m;
  if b.charged_micro + p_upper > least(b.budget_micro, p_budget) then return false; end if;
  insert into public.rm_usage(id, month, model, purpose, reserved_micro) values(p_id, m, p_model, p_purpose, p_upper);
  update public.rm_months set charged_micro = charged_micro + p_upper where month = m;
  return true;
end $$;

create function public.rm_settle(p_id uuid, p_cost bigint, p_input integer, p_output integer)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare u public.rm_usage;
begin
  select * into u from public.rm_usage where id = p_id for update;
  if not found or p_cost < 0 or p_cost > u.reserved_micro or p_input < 0 or p_output < 0 then raise exception 'Invalid settlement'; end if;
  if u.settled_at is not null then return; end if;
  update public.rm_months set charged_micro = charged_micro - (u.reserved_micro - p_cost) where month = u.month;
  update public.rm_usage set actual_micro = p_cost, input_tokens = p_input, output_tokens = p_output, settled_at = now() where id = p_id;
end $$;

create function public.rm_rate(p_hash text, p_limit integer)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare n integer; w timestamptz := date_trunc('minute', now());
begin
  if p_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_limit > 30 then return false; end if;
  insert into public.rm_rates(client_hash, window_start, count) values(p_hash, w, 1)
  on conflict (client_hash, window_start) do update set count = least(public.rm_rates.count + 1, p_limit + 1)
  returning count into n;
  return n <= p_limit;
end $$;

create function public.rm_context(p_river text, p_state text, p_segment text, p_gauge text)
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select jsonb_build_object(
    'approved', exists(select 1 from public.rm_gauge_approvals where river_name = p_river and river_state = p_state
      and segment_name = p_segment and gauge = p_gauge and approved),
    'history', coalesce((select jsonb_agg(x.row order by x.observed_at desc) from (
      select observed_at, jsonb_build_object('gauge', gauge, 'flow', flow, 'unit', unit,
        'observedAt', observed_at, 'collectedAt', collected_at, 'sourceUrl', source_url,
        'stationName', station_name, 'qualifiers', qualifiers) as row
      from public.rm_observations where gauge = p_gauge order by observed_at desc limit 12
    ) x), '[]'::jsonb),
    'dailyHistory', coalesce((select jsonb_agg(x.row order by x.observed_on desc) from (
      select observed_on, jsonb_build_object('gauge', gauge, 'flow', flow, 'unit', unit,
        'statistic', statistic, 'observedOn', observed_on,
        'observedAt', to_char(observed_on, 'YYYY-MM-DD') || 'T00:00:00Z',
        'collectedAt', collected_at, 'sourceUrl', source_url, 'qualifiers', qualifiers) as row
      from public.rm_daily_observations where gauge = p_gauge order by observed_on desc limit 30
    ) x), '[]'::jsonb));
$$;

create function public.rm_lock(p_name text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare j public.rm_jobs;
begin
  select * into j from public.rm_jobs where name = p_name for update;
  if not found then raise exception 'Unknown job'; end if;
  if j.expires_at > clock_timestamp() then return jsonb_build_object('acquired', false); end if;
  update public.rm_jobs set token = p_token, expires_at = clock_timestamp() + interval '210 seconds' where name = p_name;
  return jsonb_build_object('acquired', true, 'cursor', j.cursor);
end $$;

create function public.rm_lock_check(p_name text, p_token uuid)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  perform 1 from public.rm_jobs where name = p_name and token = p_token and expires_at > clock_timestamp() for update;
  if not found then raise exception 'Lock lost'; end if;
end $$;

create function public.rm_unlock(p_name text, p_token uuid)
returns void language sql security definer set search_path = pg_catalog as $$
  update public.rm_jobs set token = null, expires_at = null where name = p_name and token = p_token;
$$;

create function public.rm_collection_commit(p_token uuid, p_rows jsonb, p_cursor bigint, p_daily jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare r jsonb;
begin
  perform public.rm_lock_check('collection', p_token);
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 or p_cursor < 0 then raise exception 'Invalid batch'; end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    insert into public.rm_observations(gauge, observed_at, flow, unit, source_url, station_name, qualifiers)
    values(r->>'gauge', (r->>'observedAt')::timestamptz, (r->>'flow')::double precision,
      r->>'unit', r->>'sourceUrl', r->>'stationName', r->'qualifiers')
    on conflict (gauge, observed_at) do nothing;
  end loop;
  if jsonb_typeof(p_daily) <> 'array' or jsonb_array_length(p_daily) > 1500 then raise exception 'Invalid daily batch'; end if;
  for r in select value from jsonb_array_elements(p_daily) loop
    insert into public.rm_daily_observations(gauge, observed_on, flow, unit, statistic, source_url, qualifiers)
    values(r->>'gauge', (r->>'observedOn')::date, (r->>'flow')::double precision,
      r->>'unit', r->>'statistic', r->>'sourceUrl', r->'qualifiers')
    on conflict (gauge, observed_on) do update set flow = excluded.flow, qualifiers = excluded.qualifiers,
      source_url = excluded.source_url, collected_at = now();
  end loop;
  update public.rm_jobs set cursor = p_cursor, completed_at = now() where name = 'collection';
  delete from public.rm_rates where window_start < now() - interval '1 day';
end $$;

create function public.rm_proposal(p_token uuid, p_role text, p_river text, p_state text, p_segment text, p_body text, p_sources jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare id uuid;
begin
  perform public.rm_lock_check('manager', p_token);
  if p_role not in ('live-flow-watcher', 'historical-flow-analyst', 'river-researcher', 'website-maintainer', 'community-engagement', 'improvement-analyst') then raise exception 'Invalid role'; end if;
  insert into public.rm_proposals(role, river_name, river_state, segment_name, body, sources)
    values(p_role, p_river, p_state, p_segment, p_body, p_sources) returning rm_proposals.id into id;
  return id;
end $$;

create function public.rm_manager_commit(p_token uuid, p_body text, p_cursor bigint, p_sources jsonb)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  perform public.rm_lock_check('manager', p_token);
  if p_cursor < 0 then raise exception 'Invalid cursor'; end if;
  insert into public.rm_proposals(role, body, sources) values('river-master-report', p_body, p_sources);
  update public.rm_jobs set cursor = p_cursor, completed_at = now() where name = 'manager';
end $$;

create function public.rm_status()
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select jsonb_build_object(
    'month', (select to_jsonb(m) from public.rm_months m where month = date_trunc('month', now() at time zone 'UTC')::date),
    'jobs', (select jsonb_agg(jsonb_build_object('name', name, 'cursor', cursor, 'completedAt', completed_at, 'lockedUntil', expires_at)) from public.rm_jobs),
    'pendingProposals', (select count(*) from public.rm_proposals where status = 'pending_approval'),
    'recentUsage', (select coalesce(jsonb_agg(u), '[]'::jsonb) from (select model, purpose, reserved_micro, actual_micro,
      input_tokens, output_tokens, created_at, settled_at from public.rm_usage order by created_at desc limit 30) u));
$$;

create function public.rm_community_context(p_river text, p_state text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare excerpts jsonb;
begin
  if to_regclass('public.comments') is null then
    return jsonb_build_object('status', 'Public comments table is unavailable', 'excerpts', '[]'::jsonb);
  end if;
  -- Only the publicly displayed text, no usernames, links, or other identity fields.
  execute 'select coalesce(jsonb_agg(x.excerpt), ''[]''::jsonb) from (
    select left(comment_text::text, 600) as excerpt from public.comments
    where river_name = $1 and river_state = $2 order by created_at desc limit 5) x'
    into excerpts using p_river, p_state;
  return jsonb_build_object('status', 'Public excerpts available; untrusted and unsourced', 'excerpts', excerpts);
end $$;

-- No public policies, no anonymous/authenticated RPC access, no chat text storage.
do $$
declare obj record;
begin
  for obj in select tablename from pg_tables where schemaname = 'public' and tablename in
    ('rm_months','rm_usage','rm_rates','rm_jobs','rm_gauge_approvals','rm_observations','rm_daily_observations','rm_proposals') loop
    execute format('alter table public.%I enable row level security', obj.tablename);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', obj.tablename);
  end loop;
  for obj in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('rm_reserve','rm_settle','rm_rate','rm_context','rm_lock','rm_lock_check',
      'rm_unlock','rm_collection_commit','rm_proposal','rm_manager_commit','rm_status','rm_community_context') loop
    execute format('revoke all on function %s from public, anon, authenticated', obj.signature);
    execute format('grant execute on function %s to service_role', obj.signature);
  end loop;
end $$;
