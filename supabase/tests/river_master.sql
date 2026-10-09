-- Run after the migration with psql -v ON_ERROR_STOP=1, as database owner.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); token uuid := gen_random_uuid();
  next_token uuid := gen_random_uuid(); result jsonb;
begin
  if not public.rm_reserve(a, 'test', 'chat', 60, 100) then raise exception 'Initial reserve failed'; end if;
  if public.rm_reserve(b, 'test', 'chat', 60, 100) then raise exception 'Budget overspent'; end if;
  perform public.rm_settle(a, 20, 3, 4);
  perform public.rm_settle(a, 20, 3, 4); -- idempotent; no second refund
  if not public.rm_reserve(b, 'test', 'chat', 60, 100) then raise exception 'Settlement failed'; end if;
  if (select charged_micro from public.rm_months where month = date_trunc('month', now() at time zone 'UTC')::date) <> 80 then
    raise exception 'Incorrect budget accounting';
  end if;
  if not public.rm_rate(repeat('a', 64), 1) or public.rm_rate(repeat('a', 64), 1) then raise exception 'Rate limit failed'; end if;
  result := public.rm_lock('collection', token);
  if not (result->>'acquired')::boolean then raise exception 'Lock acquisition failed'; end if;
  if (public.rm_lock('collection', next_token)->>'acquired')::boolean then raise exception 'Overlap allowed'; end if;
  perform public.rm_unlock('collection', next_token);
  perform public.rm_lock_check('collection', token); -- wrong token cannot unlock
  perform public.rm_collection_commit(token,
    '[{"gauge":"13010050","observedAt":"2026-10-09T12:00:00Z","flow":42,"unit":"cfs","sourceUrl":"https://waterservices.usgs.gov/nwis/iv/?format=json&sites=13010050","stationName":"Test","qualifiers":["P"]}]', 40,
    '[{"gauge":"13010050","observedOn":"2026-10-08","flow":31,"unit":"cfs","statistic":"daily_mean","sourceUrl":"https://waterservices.usgs.gov/nwis/dv/?format=json&sites=13010050&statCd=00003","qualifiers":["A"]}]');
  result := public.rm_context('Test', 'WY', 'Reach', '13010050');
  if (result->>'approved')::boolean or result->'history'->0->>'flow' <> '42' then raise exception 'Unverified context failed'; end if;
  if result->'dailyHistory'->0->>'flow' <> '31' or result->'dailyHistory'->0->>'statistic' <> 'daily_mean' then raise exception 'Daily context failed'; end if;
  if to_regclass('public.comments') is null and
    public.rm_community_context('Test', 'WY')->>'status' <> 'Public comments table is unavailable' then raise exception 'Missing comments not reported'; end if;
  insert into public.rm_gauge_approvals(river_name, river_state, segment_name, gauge, approved, reviewed_by, evidence_url)
    values('Test', 'WY', 'Reach', '13010050', true, 'operator', 'https://waterdata.usgs.gov/');
  if not (public.rm_context('Test', 'WY', 'Reach', '13010050')->>'approved')::boolean then raise exception 'Approval lookup failed'; end if;
  if (public.rm_context('Test', 'WY', 'Other reach', '13010050')->>'approved')::boolean then raise exception 'Approval leaked between reaches'; end if;
  update public.rm_jobs set expires_at = now() - interval '1 second' where name = 'collection';
  perform public.rm_lock('collection', next_token);
  begin
    perform public.rm_collection_commit(token, '[]', 99);
    raise exception 'Stale owner wrote data';
  exception when raise_exception then
    if sqlerrm <> 'Lock lost' then raise; end if;
  end;
  if (select cursor from public.rm_jobs where name = 'collection') <> 40 then raise exception 'Cursor changed on failed commit'; end if;
  perform public.rm_lock('manager', token);
  perform public.rm_proposal(token, 'historical-flow-analyst', 'Test', 'WY', 'Reach', 'Draft only', '[]');
  if (select status from public.rm_proposals where body = 'Draft only') <> 'pending_approval' then raise exception 'Draft auto-approved'; end if;
  update public.rm_jobs set expires_at = now() + interval '5 seconds' where name = 'manager';
  begin
    perform public.rm_reserve(gen_random_uuid(), 'test', 'historical-flow-analyst', 1, 100, token);
    raise exception 'Expiring lock allowed paid work';
  exception when raise_exception then
    if sqlerrm <> 'Lock lost' then raise; end if;
  end;
end $$;
set local role anon;
do $$
begin
  begin
    perform public.rm_status();
    raise exception 'Anonymous RPC access allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.rm_proposals;
    raise exception 'Anonymous table access allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select public.rm_status() is not null as service_rpc_works;
do $$
begin
  begin
    perform count(*) from public.rm_proposals;
    raise exception 'Service direct table access allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
