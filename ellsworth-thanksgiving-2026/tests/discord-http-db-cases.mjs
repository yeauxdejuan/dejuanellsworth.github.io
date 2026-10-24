import assert from 'node:assert/strict';

// Model hosted pg_net's PUBLIC grants, then prove the final transport never uses it.
export async function installDiscordHttpForTest(admin,migration){
  const adapter=`
    create table ellsworth_private.http_test_requests(id bigserial primary key,url text,body jsonb);
    create table ellsworth_private.http_test_response(status int,content text,raise_error boolean default false,disable_during boolean default false);
    insert into ellsworth_private.http_test_response(status,content) values (200,'{}');
    create function extensions.http_post(text,text,text) returns table(status integer,content text)
      language plpgsql as $$
      begin
        if (select raise_error from ellsworth_private.http_test_response) then raise exception 'Synthetic transport failure'; end if;
        insert into ellsworth_private.http_test_requests(url,body) values ($1,$2::jsonb);
        if (select disable_during from ellsworth_private.http_test_response) then perform ellsworth_private.disable_discord_notifications(); end if;
        return query select r.status,r.content from ellsworth_private.http_test_response r;
      end;$$;
  `;
  assert.ok(migration.includes('create extension if not exists http with schema extensions;'));
  await admin.query(migration.replace('create extension if not exists http with schema extensions;',()=>adapter));
}

export async function checkDiscordHttpDatabase({admin,asUser,denied,check,ids,event,migration}){
  await admin.query(`grant usage on schema net to public;grant all on all tables in schema net to public;
    grant execute on all functions in schema net to public;truncate net.http_request_queue,net._http_response;`);
  await installDiscordHttpForTest(admin,migration);
  check((await admin.query("select has_table_privilege('authenticated','net.http_request_queue','select') as allowed")).rows[0].allowed,'Final transport is tested with the actual hosted shared-queue access model');
  await denied(ids[0],"select * from ellsworth_private.post_discord_message('Unauthorized')");
  check(!(await admin.query("select has_function_privilege('anon','ellsworth_private.post_discord_message(text)','execute') as allowed")).rows[0].allowed,'Anonymous callers cannot invoke the private transport');
  check(Number((await admin.query('select ellsworth_private.test_discord_notifications() as status')).rows[0].status)===200,'Connection test returns the confirmed HTTP status');
  const send=()=>admin.query('select ellsworth_private.dispatch_discord_notifications()');
  const activity=name=>asUser(ids[0],'insert into public.thanksgiving_games(event_id,name) values ($1,$2)',[event,name]);
  await admin.query('select ellsworth_private.enable_discord_notifications()');
  await activity('Synchronous background test');await send();
  check((await admin.query('select bool_and(delivered_at is not null) as delivered from ellsworth_private.discord_outbox')).rows[0].delivered,'A background response confirms the batch in the same dispatch');
  check((await admin.query('select count(*)::int as n from net.http_request_queue')).rows[0].n===0,'Webhook URL and content never enter the shared HTTP queue');
  const requestCount=(await admin.query('select count(*)::int as n from ellsworth_private.http_test_requests')).rows[0].n;
  await send();check((await admin.query('select count(*)::int as n from ellsworth_private.http_test_requests')).rows[0].n===requestCount,'Confirmed batches are not repeated');
  await activity('Rate limited background test');
  await admin.query('update ellsworth_private.http_test_response set status=429,content=$1',[JSON.stringify({retry_after:300})]);await send();
  check((await admin.query("select available_after>=now()+interval '299 seconds' as waits from ellsworth_private.discord_outbox where delivered_at is null")).rows[0].waits,'Direct transport honors the Discord retry delay');
  await admin.query('update ellsworth_private.http_test_response set raise_error=true');
  await admin.query('update ellsworth_private.discord_outbox set available_after=now() where delivered_at is null');await send();
  check((await admin.query('select attempts=2 and last_status is null as retained from ellsworth_private.discord_outbox where delivered_at is null')).rows[0].retained,'A caught network exception retains the event without returning secret-bearing errors');
  await admin.query('update ellsworth_private.discord_outbox set available_after=now(),attempts=5 where delivered_at is null');
  const before=(await admin.query('select count(*)::int as n from ellsworth_private.http_test_requests')).rows[0].n;await send();
  check((await admin.query('select count(*)::int as n from ellsworth_private.http_test_requests')).rows[0].n===before,'Retry exhaustion still stops requests');
  await admin.query('update ellsworth_private.http_test_response set raise_error=false,status=404,content=\'{}\'');
  await activity('Rejected direct webhook');await send();check(!(await admin.query('select enabled from ellsworth_private.discord_settings')).rows[0].enabled,'A rejected direct webhook pauses alerts');
  await admin.query('select ellsworth_private.enable_discord_notifications()');
  await admin.query('update ellsworth_private.http_test_response set status=200,disable_during=true');
  await activity('Pause while sending');await send();
  check(!(await admin.query('select enabled from ellsworth_private.discord_settings')).rows[0].enabled,'A pause during a request cannot accidentally re-enable alerts');
  const body=(await admin.query('select body from ellsworth_private.http_test_requests order by id desc limit 1')).rows[0].body;
  check(JSON.stringify(body.allowed_mentions)==='{"parse":[]}'&&body.flags===4,'The corrected transport preserves mention and preview suppression');
  check((await admin.query('select count(*)::int as n from net.http_request_queue')).rows[0].n===0,'All success/failure paths keep webhook credentials out of shared queues');
}
