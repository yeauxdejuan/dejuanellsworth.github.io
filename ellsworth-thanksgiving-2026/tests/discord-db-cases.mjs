import assert from 'node:assert/strict';

// Real trigger/queue/dispatcher SQL with synthetic transport, Vault and cron adapters.
// No network is used. Actual extension availability/grants are checked on deployment.
export async function installDiscordForTest(admin,migration){
  const adapters=`
    create schema net; create schema cron; create schema vault;
    revoke all on schema net,cron,vault from public,anon,authenticated;
    create table vault.secrets(name text primary key,decrypted_secret text);
    create view vault.decrypted_secrets as select * from vault.secrets;
    create table net.http_request_queue(id bigserial primary key,url text,body jsonb);
    create table net._http_response(id bigint,status_code int,timed_out boolean,error_msg text,headers jsonb);
    create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds int default 2000)
      returns bigint language sql as $$insert into net.http_request_queue(url,body) values ($1,$2) returning id$$;
    create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text,active boolean default true);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.job(jobname,schedule,command) values ($1,$2,$3) returning jobid$$;
    create function cron.alter_job(job_id bigint,active boolean) returns void language sql as $$
      update cron.job set active=$2 where jobid=$1$$;
  `;
  let stripped=0;
  const sql=migration.replace(/^create extension if not exists (pg_net|pg_cron with schema pg_catalog|supabase_vault with schema vault);$/gm,()=>{stripped++;return stripped===1?adapters:'-- Extension adapter is provided by the test bootstrap.';});
  assert.equal(stripped,3,'Only deployment extension statements are replaced by adapters');
  await admin.query(sql);return stripped;
}
export async function checkDiscordDatabase({admin,asUser,denied,check,ids,event,migration}){
  const originalMenu=(await admin.query('select * from public.thanksgiving_dishes order by id')).rows;
  check(await installDiscordForTest(admin,migration)===3,'Real Discord SQL is installed over three synthetic extension adapters');
  await assert.rejects(()=>admin.query(migration),/first-time pg_net\/pg_cron/);await admin.query('rollback');
  check(true,'Installation refuses an existing network/cron setup before changing shared permissions');
  check(JSON.stringify(originalMenu)===JSON.stringify((await admin.query('select * from public.thanksgiving_dishes order by id')).rows),'Discord installation does not alter existing family records');
  check(!(await admin.query('select enabled from ellsworth_private.discord_settings')).rows[0].enabled,'Alerts install disabled');
  check(!(await admin.query("select active from cron.job where jobname='ellsworth-discord-alerts'")).rows[0].active,'The minute job installs paused');
  for(const table of ['discord_outbox','discord_settings']){
    check((await admin.query('select relrowsecurity from pg_class where oid=$1::regclass',['ellsworth_private.'+table])).rows[0].relrowsecurity,table+' has RLS');
    check(!(await admin.query("select has_table_privilege('authenticated',$1,'select,insert,update,delete,truncate') as allowed",['ellsworth_private.'+table])).rows[0].allowed,table+' has no member grants');
    await denied(ids[0],`select * from ellsworth_private.${table}`);
  }
  for(const fn of ['discord_webhook_url','capture_discord_activity','dispatch_discord_notifications','enable_discord_notifications','disable_discord_notifications','test_discord_notifications']){
    check(!(await admin.query("select has_function_privilege('authenticated',$1,'execute') as allowed",['ellsworth_private.'+fn+'()'])).rows[0].allowed,fn+' cannot be called by a family member');
  }
  await denied(ids[0],'select ellsworth_private.enable_discord_notifications()');
  check(!(await admin.query("select has_schema_privilege('authenticated','net','usage') as allowed")).rows[0].allowed,'Website members cannot use the network schema');
  check(!(await admin.query("select has_function_privilege('authenticated','net.http_post(text,jsonb,jsonb,jsonb,integer)','execute') as allowed")).rows[0].allowed,'Website members cannot call privileged network APIs');
  const send=()=>admin.query('select ellsworth_private.dispatch_discord_notifications()');
  const count=async()=>Number((await admin.query('select count(*) as n from ellsworth_private.discord_outbox')).rows[0].n);
  await asUser(ids[0],"insert into public.thanksgiving_games(event_id,name) values ($1,'Disabled notification test')",[event]);
  check(await count()===0,'Activity while disabled is not queued or replayed later');
  await assert.rejects(()=>admin.query('select ellsworth_private.enable_discord_notifications()'),/Save a valid Discord/);
  check(true,'Enabling without a webhook fails without leaking a URL');
  await admin.query("insert into vault.secrets values ('ellsworth_discord_webhook_url','https://example.test/invalid')");
  await assert.rejects(()=>admin.query('select ellsworth_private.enable_discord_notifications()'),/Save a valid Discord/);
  check(true,'A non-Discord destination is rejected');
  const endpoint='https://discord.com/api/webhooks/123456789012345678/synthetic_test_token_only';
  await admin.query("update vault.secrets set decrypted_secret=$1 where name='ellsworth_discord_webhook_url'",[endpoint]);
  await admin.query('select ellsworth_private.enable_discord_notifications()');
  check((await admin.query('select active from cron.job')).rows[0].active,'Explicit enable starts the existing minute job');
  const rsvpSql=`insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children,note,dietary_needs)
    values ($1,$2,'Synthetic @everyone household','coming',2,1,'PRIVATE_NOTE_NOT_FOR_DISCORD','PRIVATE_DIET_NOT_FOR_DISCORD')
    on conflict(event_id,user_id) do update set household_name=excluded.household_name,response=excluded.response,adults=excluded.adults,children=excluded.children,note=excluded.note,dietary_needs=excluded.dietary_needs`;
  await asUser(ids[0],rsvpSql,[event,ids[0]]);
  const initial=await count();await asUser(ids[0],rsvpSql,[event,ids[0]]);
  check(await count()===initial,'Identical RSVP upserts do not notify again just because updated_at changed');
  const game='30000000-0000-4000-8000-000000000001',photo='40000000-0000-4000-8000-000000000001';
  await asUser(ids[0],"insert into public.thanksgiving_games(id,event_id,name) values ($1,$2,'New family game')",[game,event]);
  await asUser(ids[0],"insert into public.thanksgiving_tiktoks(event_id,url) values ($1,'https://www.tiktok.com/@test/video/7777777777777777777')",[event]);
  await asUser(ids[0],"insert into public.thanksgiving_dishes(event_id,id,label,category) values ($1,'discord-custom','Synthetic dish','The sides')",[event]);
  const beforeBuiltin=await count();
  await asUser(ids[0],"select public.manage_ellsworth_signup($1,'turkey','Turkey','The main table','Synthetic cook','PRIVATE_SIGNUP_NOTE','claim')",[event]);
  check(await count()===beforeBuiltin+1,'A first built-in claim notifies only the signup, not a fake new menu item');
  await asUser(ids[0],"insert into public.thanksgiving_photos(id,event_id,external_url,caption) values ($1,$2,'https://example.test/PRIVATE_PHOTO_URL','PRIVATE_CAPTION')",[photo,event]);
  await asUser(ids[0],"insert into public.thanksgiving_photos(event_id,external_url) values ($1,'https://example.test/PRIVATE_PHOTO_TWO')",[event]);
  await asUser(ids[0],"insert into public.thanksgiving_photo_reactions(event_id,photo_id,user_id,reaction) values ($1,$2,$3,'heart')",[event,photo,ids[0]]);
  await asUser(ids[0],"insert into public.thanksgiving_photo_details(event_id,photo_id,edited_by,caption) values ($1,$2,$3,'PRIVATE_EDITED_CAPTION')",[event,photo,ids[0]]);
  await asUser(ids[0],"insert into public.thanksgiving_game_votes(event_id,user_id,game_key) values ($1,$2,$3)",[event,ids[0],game]);
  const kinds=(await admin.query('select distinct kind from ellsworth_private.discord_outbox order by kind')).rows.map(r=>r.kind);
  check(kinds.length===9,'All nine requested activity categories are captured');
  const queueText=JSON.stringify((await admin.query('select * from ellsworth_private.discord_outbox')).rows);
  check(!queueText.includes('PRIVATE_')&&!queueText.includes(endpoint),'The notification queue excludes dietary details, notes, captions, photo URLs and the webhook');
  await send();
  const request=(await admin.query('select * from net.http_request_queue order by id desc limit 1')).rows[0];
  check(request.url===endpoint+'?wait=true','Delivery waits for Discord to confirm message creation');
  check(request.body.content.includes('2 family photos added'),'Multiple photo additions are grouped in one digest');
  check(JSON.stringify(request.body.allowed_mentions)==='{"parse":[]}'&&request.body.flags===4,'User-controlled names cannot ping members and links do not add previews');
  check(request.body.content.length<2000&&!JSON.stringify(request.body).includes('PRIVATE_'),'Digest stays within Discord limits and excludes private content');
  check((await admin.query('select distinct attempts from ellsworth_private.discord_outbox')).rows.every(r=>r.attempts===1),'One batch makes one attempt per event');
  await send();check((await admin.query('select count(*)::int as n from net.http_request_queue')).rows[0].n===1,'An in-flight request is not sent twice');
  await admin.query('insert into net._http_response(id,status_code) values ($1,200)',[request.id]);await send();
  check((await admin.query('select bool_and(delivered_at is not null) as done from ellsworth_private.discord_outbox')).rows[0].done,'Successful confirmed response marks its whole batch delivered');
  await send();check((await admin.query('select count(*)::int as n from net.http_request_queue')).rows[0].n===1,'Delivered activity is not replayed');
  await asUser(ids[0],"insert into public.thanksgiving_games(event_id,name) values ($1,'Retry test')",[event]);await send();
  let retry=(await admin.query('select request_id from ellsworth_private.discord_outbox where delivered_at is null limit 1')).rows[0].request_id;
  await admin.query('insert into net._http_response(id,status_code,headers) values ($1,429,$2)',[retry,{'retry-after':'300'}]);await send();
  check((await admin.query("select available_after>=now()+interval '299 seconds' as waits,request_id is null as reset from ellsworth_private.discord_outbox where delivered_at is null")).rows.every(r=>r.waits&&r.reset),'Rate limits honor Retry-After without losing queued activity');
  await admin.query('update ellsworth_private.discord_outbox set available_after=now() where delivered_at is null');await send();
  retry=(await admin.query('select request_id from ellsworth_private.discord_outbox where delivered_at is null limit 1')).rows[0].request_id;
  await admin.query("update ellsworth_private.discord_outbox set requested_at=now()-interval '6 minutes' where delivered_at is null");await send();
  check((await admin.query('select request_id is null as reset from ellsworth_private.discord_outbox where delivered_at is null')).rows[0].reset,'Lost or expired transport requests become retryable');
  await admin.query('update ellsworth_private.discord_outbox set available_after=now(),attempts=5 where delivered_at is null');
  const requestCount=Number((await admin.query('select count(*) as n from net.http_request_queue')).rows[0].n);await send();
  check(Number((await admin.query('select count(*) as n from net.http_request_queue')).rows[0].n)===requestCount,'Five failed attempts stop retries');
  await asUser(ids[0],"insert into public.thanksgiving_games(event_id,name) values ($1,'Invalid webhook test')",[event]);await send();
  retry=(await admin.query('select request_id from ellsworth_private.discord_outbox where delivered_at is null and request_id is not null limit 1')).rows[0].request_id;
  await admin.query('insert into net._http_response(id,status_code) values ($1,404)',[retry]);await send();
  check(!(await admin.query('select enabled from ellsworth_private.discord_settings')).rows[0].enabled,'A deleted or rejected webhook pauses alerts');
  await admin.query('select ellsworth_private.enable_discord_notifications()');check(await count()>0,'Re-enabling retains delivered history');
  check((await admin.query('select count(*)::int as n from ellsworth_private.discord_outbox where delivered_at is null')).rows[0].n===0,'Re-enabling clears an old failed backlog');
  await admin.query("update ellsworth_private.discord_outbox set created_at=now()-interval '8 days'");await send();check(await count()===0,'Old notification summaries are purged after seven days');
  await admin.query("alter table ellsworth_private.discord_outbox add constraint simulate_queue_failure check(false) not valid");
  check((await asUser(ids[0],"insert into public.thanksgiving_games(event_id,name) values ($1,'Save survives notification failure')",[event])).rowCount===1,'A broken notification queue does not block the original family save');
  await admin.query('alter table ellsworth_private.discord_outbox drop constraint simulate_queue_failure');
  const beforeRollback=await count();
  await admin.query('begin');
  await admin.query("insert into public.thanksgiving_games(event_id,name) values ($1,'Rolled back family action')",[event]);
  await admin.query('rollback');check(await count()===beforeRollback,'Rolled back family writes do not leave notifications');
  await admin.query("insert into ellsworth_private.discord_outbox(kind,summary) select kind,repeat('🦃',200) from unnest(array['rsvp','dish','signup','photo','reaction','game','tiktok','vote','caption']) as kind");
  await send();
  check((await admin.query('select body from net.http_request_queue order by id desc limit 1')).rows[0].body.content.length<2000,'Worst-case Unicode summaries remain below the Discord message limit');
  await admin.query('select ellsworth_private.test_discord_notifications()');
  check((await admin.query('select body from net.http_request_queue order by id desc limit 1')).rows[0].body.content.includes('notifications connected'),'Owner test sends only a fixed connection message');
  await admin.query('select ellsworth_private.disable_discord_notifications()');
  check(!(await admin.query('select active from cron.job')).rows[0].active&&await count()===0,'Disabling pauses the job and clears stored notification summaries');
  check(!(await admin.query("select has_table_privilege('authenticated','net.http_request_queue','select') as allowed")).rows[0].allowed,'Family users cannot inspect the transient request URL');
}
