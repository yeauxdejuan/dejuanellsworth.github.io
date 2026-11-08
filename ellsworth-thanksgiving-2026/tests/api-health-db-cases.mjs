import assert from 'node:assert/strict';

// Real API health SQL over the synthetic Discord transport. Only the HTTP probe adapter is replaced,
// so no network is used. Requires installDiscordHttpForTest first (post_discord_message + request log).
export async function installApiHealthForTest(admin,migration){
  await admin.query(migration);
  await admin.query(`
    create table ellsworth_private.probe_test_response(status int);
    insert into ellsworth_private.probe_test_response values (200);
    create table ellsworth_private.probe_test_requests(id bigserial primary key,url text,apikey text);
    create or replace function ellsworth_private.probe_public_api(url text,apikey text) returns integer
      language plpgsql set search_path='' as $$
      begin
        insert into ellsworth_private.probe_test_requests(url,apikey) values ($1,$2);
        return (select status from ellsworth_private.probe_test_response);
      end;$$;
  `);
}

export async function checkApiHealthDatabase({admin,asUser,denied,check,ids,migration}){
  await installApiHealthForTest(admin,migration);
  const one=async sql=>(await admin.query(sql)).rows[0];
  const posts=async()=>(await one('select count(*)::int as n from ellsworth_private.http_test_requests')).n;
  const lastPost=async()=>(await one('select body from ellsworth_private.http_test_requests order by id desc limit 1')).body.content;
  const probe=status=>admin.query('update ellsworth_private.probe_test_response set status=$1',[status]);
  const discord=status=>admin.query('update ellsworth_private.http_test_response set status=$1,raise_error=false,disable_during=false',[status]);
  const run=async()=>(await one('select ellsworth_private.check_api_health() as status')).status;
  const state=()=>one('select * from ellsworth_private.api_health_state');
  await discord(200);

  check((await asUser(ids[0],'select public.api_health() as ok')).rows[0].ok===true,'Members can call the public health probe');
  check((await one("select has_function_privilege('anon','public.api_health()','execute') as allowed")).allowed,'Anonymous browsers can call the public health probe');
  await denied(ids[0],'select ellsworth_private.check_api_health()');
  await denied(ids[0],'select * from ellsworth_private.api_health_state');
  check(!(await one("select has_function_privilege('anon','ellsworth_private.probe_public_api(text,text)','execute') as allowed")).allowed,'Anonymous callers cannot invoke the private probe');
  check((await one("select schedule from cron.job where jobname='ellsworth-api-health'")).schedule==='*/5 * * * *','Health check runs every five minutes');
  const s0=await state();
  check(s0.probe_url.endsWith('/rest/v1/rpc/api_health')&&s0.probe_key.startsWith('sb_publishable_'),'Probe uses only the public URL and publishable key');
  await assert.rejects(()=>admin.query("update ellsworth_private.api_health_state set probe_url='https://example.com/x'"),e=>e.code==='23514');check(true,'Probe URL is limited to a Supabase REST endpoint');

  const start=await posts();
  check(await run()===200&&await posts()===start,'A healthy API sends nothing');
  await probe(504);
  check(await run()===504&&await posts()===start&&(await state()).consecutive_failures===1,'One failure alone does not alert');
  await probe(null);
  await run();
  check(await posts()===start+1&&(await state()).alerted,'The second failure in a row alerts once');
  const alert=await lastPost();
  check(alert.startsWith('⚠️ ')&&alert.includes('(timeout)')&&alert.includes('Restart project')&&!alert.includes('sb_publishable'),'Down alert names the cause and the fix, without keys');
  await run();
  check(await posts()===start+1,'A continuing outage does not repeat the alert every run');
  await admin.query("update ellsworth_private.api_health_state set last_alert_at=now()-interval '7 hours'");
  await run();
  check(await posts()===start+2&&(await lastPost()).startsWith('⏰ Still down'),'A long outage sends a reminder after six hours');
  await probe(200);await discord(500);
  await run();
  check((await state()).alerted&&(await state()).down_since!==null,'A failed recovery message keeps the alert state for a retry');
  await discord(200);
  await run();
  const s1=await state();
  check((await lastPost()).startsWith('✅ Family board API recovered')&&!s1.alerted&&s1.down_since===null&&s1.consecutive_failures===0,'Recovery is announced once and resets the state');
  const afterRecovery=await posts();
  await run();check(await posts()===afterRecovery,'Recovery is not repeated');

  await probe(504);await discord(500);
  await run();await run();
  check(!(await state()).alerted,'An undelivered down alert is not marked as sent');
  await discord(200);await run();
  check((await state()).alerted,'The down alert is retried on the next failing run');

  await probe(200);await run();
  await admin.query('update ellsworth_private.api_health_state set enabled=false');
  const probes=(await one('select count(*)::int as n from ellsworth_private.probe_test_requests')).n;
  check(await run()===null&&(await one('select count(*)::int as n from ellsworth_private.probe_test_requests')).n===probes,'A paused health check makes no request');
  await admin.query('update ellsworth_private.api_health_state set enabled=true');
}
