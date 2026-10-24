// Synthetic fixtures only. Starts its own disposable PostgreSQL; never reads a live DB URL.
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import {checkPlanningDatabase} from './planning-db-cases.mjs';
import {checkRolloutDatabase} from './rollout-db-cases.mjs';
import {checkDiscordDatabase,installDiscordForTest} from './discord-db-cases.mjs';
import {checkDiscordHttpDatabase,installDiscordHttpForTest} from './discord-http-db-cases.mjs';
const directory=await mkdtemp(join(tmpdir(),'ellsworth-v2-'));
const instance=new EmbeddedPostgres({databaseDir:join(directory,'db'),user:'postgres',password:'local-test-only',port:55432,persistent:false,onLog:()=>{},onError:()=>{}});
const root=new URL('../',import.meta.url);
const baseline=await readFile(new URL('supabase-setup.sql',root),'utf8');
const migrationName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_shared_dish_signups.sql'));
const migration=await readFile(new URL(`migrations/${migrationName}`,root),'utf8');
const planningName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_family_planning.sql'));
const planningMigration=await readFile(new URL(`migrations/${planningName}`,root),'utf8');
const rolloutName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_rsvp_dietary_and_updated_at.sql'));
const rolloutMigration=await readFile(new URL(`migrations/${rolloutName}`,root),'utf8');
const headsUpName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_heads_up_voting.sql'));
const headsUpMigration=await readFile(new URL(`migrations/${headsUpName}`,root),'utf8');
const discordName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_discord_activity_alerts.sql'));
const discordMigration=await readFile(new URL(`migrations/${discordName}`,root),'utf8');
const discordHttpName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_discord_private_http_transport.sql'));
const discordHttpMigration=await readFile(new URL(`migrations/${discordHttpName}`,root),'utf8');
const discordNoLinkName=(await readdir(new URL('migrations/',root))).find(n=>n.endsWith('_discord_notifications_without_link.sql'));
const discordNoLinkMigration=await readFile(new URL(`migrations/${discordNoLinkName}`,root),'utf8');
const event='ellsworth-thanksgiving-2026';
const ids=Array.from({length:7},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
let admin,checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const bootstrap=`
create role anon nologin; create role authenticated nologin;
create schema auth; create schema extensions; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid,name text,bucket_id text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
alter default privileges in schema public grant all on tables to anon, authenticated;
`;
function client(database='postgres'){return new pg.Client({host:'127.0.0.1',port:55432,user:'postgres',password:'local-test-only',database});}
async function asUser(id,sql,params=[]){
  const c=client();await c.connect();
  try{await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);const result=await c.query(sql,params);await c.query('commit');return result;}
  finally{await c.query('rollback');await c.end();}
}
const rpcSql='select public.manage_ellsworth_signup($1,$2,$3,$4,$5,$6,$7) as result';
const args=(dish,action='claim',name='Test cook')=>[event,dish,`Test ${dish}`,'The sides',name,'Test note',action];
const claim=async(user,dish,action='claim')=>(await asUser(user,rpcSql,args(dish,action))).rows[0].result;
async function denied(id,sql,params=[],code='42501'){
  await assert.rejects(()=>asUser(id,sql,params),e=>e.code===code);checks++;
}
try{
  await instance.initialise();
  let startupTimer;
  try{await Promise.race([instance.start(),new Promise((_,reject)=>{startupTimer=setTimeout(()=>reject(new Error('Local PostgreSQL could not start; allow loopback networking and check port 55432.')),10000);})]);}finally{clearTimeout(startupTimer);}
  admin=client();await admin.connect();
  await admin.query(bootstrap);await admin.query(baseline);
  for(const id of ids)await admin.query('insert into auth.users values ($1)',[id]);
  for(const id of ids.slice(0,6))await admin.query('insert into public.ellsworth_members(user_id) values ($1)',[id]);
  await admin.query(`insert into public.thanksgiving_dishes(event_id,id,label,category,assignee,note,claimed_by) values
    ($1,'legacy','Test legacy','The sides','Legacy cook','Original note',$2),
    ($1,'ownerless','Test ownerless','The sides','Reserved cook','Keep this',null),
    ($1,'nameless','Test nameless','The sides',null,'Keep account',$3),
    ($1,'unclaimed','Test unclaimed','The sides',null,'Keep dish note',null)`,[event,ids[0],ids[1]]);
  const before=(await admin.query('select * from public.thanksgiving_dishes order by id')).rows;
  await admin.query(migration);
  check(JSON.stringify(before)===JSON.stringify((await admin.query('select * from public.thanksgiving_dishes order by id')).rows),'Legacy rows must be unchanged');
  check((await admin.query('select count(*)::int as n from public.thanksgiving_dish_signups')).rows[0].n===3,'All legacy assignments are copied');
  const reserved=(await admin.query("select * from public.thanksgiving_dish_signups where dish_id='ownerless'")).rows[0];
  check(reserved.user_id===null&&reserved.assignee==='Reserved cook'&&reserved.note==='Keep this','Ownerless claims retain names, notes and capacity');
  check((await claim(ids[1],'legacy'))==='claimed','Second signup');
  check((await claim(ids[2],'legacy'))==='claimed','Third signup');
  check((await claim(ids[3],'legacy'))==='full','Fourth signup rejected');
  check((await claim(ids[0],'legacy'))==='already_assigned','Duplicate rejected even when full');
  check((await claim(ids[3],'legacy','release'))==='not_assigned','Cannot remove another account');
  check((await claim(ids[3],'legacy','update'))==='not_assigned','Cannot edit another account');
  check((await claim(ids[0],'legacy','update'))==='updated','Owner may update at capacity');
  check((await claim(ids[1],'legacy','release'))==='removed','Owner releases');
  check((await claim(ids[1],'legacy'))==='claimed','Owner reclaims');
  check((await claim(ids[1],'legacy','release'))==='removed','Slot reopens');
  check((await claim(ids[3],'legacy'))==='claimed','Another account takes released slot');
  await denied(ids[6],rpcSql,args('blocked'));
  await denied(null,rpcSql,args('blocked'));
  await denied(ids[0],rpcSql,['another-event',...args('bad').slice(1)]);
  await denied(ids[0],rpcSql,args('invalid','anything'), '22023');
  await denied(ids[0],rpcSql,args('invalid','claim',' '),'22023');
  await denied(ids[0],'select public.claim_ellsworth_dish($1,$2,$3,$4,$5,$6)',args('legacy').slice(0,6),'55000');
  for(const sql of [
    'truncate public.thanksgiving_dishes',
    'truncate public.thanksgiving_dish_signups',
    "update public.thanksgiving_dishes set assignee='intruder'",
    'delete from public.thanksgiving_dishes',
    "update public.thanksgiving_dish_signups set assignee='intruder'",
    'delete from public.thanksgiving_dish_signups',
    `insert into public.thanksgiving_dish_signups(event_id,dish_id,slot,assignee) values ('${event}','legacy',1,'intruder')`,
    `insert into public.thanksgiving_dishes(event_id,id,label,category,assignee) values ('${event}','bad','bad','The sides','intruder')`
  ])await denied(ids[0],sql);
  const customSql='insert into public.thanksgiving_dishes(event_id,id,label,category) values ($1,$2,$3,$4)';
  await asUser(ids[4],customSql,[event,'custom','Test custom','Other family favorites']);checks++;
  check((await claim(ids[4],'custom'))==='claimed','Custom dish signup');
  await denied(ids[6],customSql,[event,'blocked','blocked','The sides']);
  check((await asUser(ids[6],'select * from public.thanksgiving_dish_signups')).rowCount===0,'Nonmembers see no signups');
  await admin.query('set role anon');
  await assert.rejects(()=>admin.query('select * from public.thanksgiving_dish_signups'),e=>e.code==='42501');checks++;
  await admin.query('reset role');
  for(const [sql,params,code] of [
    ['insert into public.thanksgiving_dish_signups(event_id,dish_id,slot,assignee) values ($1,$2,4,$3)',[event,'custom','Bad slot'],'23514'],
    ['insert into public.thanksgiving_dish_signups(event_id,dish_id,slot,user_id,assignee) values ($1,$2,2,$3,$4)',[event,'custom',ids[4],'Duplicate'],'23505'],
    ['insert into public.thanksgiving_dish_signups(event_id,dish_id,slot,assignee) values ($1,$2,1,$3)',[event,'missing','No parent'],'23503']
  ]){await assert.rejects(()=>admin.query(sql,params),e=>e.code===code);checks++;}
  // Truly overlapping transactions: hold the third signup uncommitted while a fourth waits.
  check((await claim(ids[0],'race'))==='claimed','Race first slot');
  check((await claim(ids[1],'race'))==='claimed','Race second slot');
  const a=client(),b=client();await a.connect();await b.connect();
  try{
    for(const [c,id] of [[a,ids[2]],[b,ids[3]]]){await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);}
    check((await a.query(rpcSql,args('race'))).rows[0].result==='claimed','First racer reserves last slot');
    const bPid=(await b.query('select pg_backend_pid() as pid')).rows[0].pid;
    const pending=b.query(rpcSql,args('race'));
    let waiting=false;
    for(let i=0;i<100;i++){
      const state=(await admin.query('select wait_event_type from pg_stat_activity where pid=$1',[bPid])).rows[0];
      if(state?.wait_event_type==='Lock'){waiting=true;break;}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    check(waiting,'Second racer must wait on the dish lock');
    await a.query('commit');
    check((await pending).rows[0].result==='full','Waiting fourth claim must see committed capacity');await b.query('commit');
    check((await admin.query("select count(*)::int as n from public.thanksgiving_dish_signups where dish_id='race'")).rows[0].n===3,'Race leaves exactly three');
  }finally{await a.query('rollback');await b.query('rollback');await a.end();await b.end();}
  // A repeated migration must fail before backfill; it cannot resurrect released rows.
  await assert.rejects(()=>admin.query(migration),/already installed/);await admin.query('rollback');checks++;
  await checkPlanningDatabase({admin,asUser,denied,check,ids,event,migration:planningMigration});
  await checkRolloutDatabase({admin,asUser,denied,check,ids,event,migration:rolloutMigration});
  const voteSql='insert into public.thanksgiving_game_votes(event_id,game_key,user_id) values ($1,$2,$3)';
  await denied(ids[0],voteSql,[event,'builtin-heads-up',ids[0]]);
  const oldVotes=(await admin.query('select * from public.thanksgiving_game_votes order by game_key,user_id')).rows;
  await admin.query(headsUpMigration);
  check(JSON.stringify(oldVotes)===JSON.stringify((await admin.query('select * from public.thanksgiving_game_votes order by game_key,user_id')).rows),'Heads Up migration preserves all prior votes');
  check((await asUser(ids[0],voteSql,[event,'builtin-heads-up',ids[0]])).rowCount===1,'Heads Up can receive its own member vote');
  await denied(ids[0],voteSql,[event,'builtin-heads-up',ids[0]],'23505');
  await denied(ids[1],voteSql,[event,'builtin-heads-up',ids[0]]);
  await denied(ids[6],voteSql,[event,'builtin-heads-up',ids[6]]);
  await denied(null,voteSql,[event,'builtin-heads-up',ids[1]]);
  await denied(ids[0],voteSql,[event,'imaginary-game',ids[0]]);
  await denied(ids[0],voteSql,['another-event','builtin-heads-up',ids[0]],'23514');
  check((await asUser(ids[1],voteSql,[event,'builtin-heads-up',ids[1]])).rowCount===1,'Another member can independently vote for Heads Up');
  check((await asUser(ids[1],'delete from public.thanksgiving_game_votes where user_id=$1 and game_key=$2',[ids[0],'builtin-heads-up'])).rowCount===0,'Members cannot remove another Heads Up vote');
  check((await asUser(ids[0],'delete from public.thanksgiving_game_votes where user_id=$1 and game_key=$2',[ids[0],'builtin-heads-up'])).rowCount===1,'Members can remove their own Heads Up vote');
  check((await claim(ids[0],'jambalaya'))==='claimed','Jambalaya accepts reservations with the existing RPC');
  await checkDiscordDatabase({admin,asUser,denied,check,ids,event,migration:discordMigration});
  await checkDiscordHttpDatabase({admin,asUser,denied,check,ids,event,migration:discordHttpMigration,noLinkMigration:discordNoLinkMigration});
  // Fresh installation follows the same baseline + migration path, without fixtures.
  await admin.query('create database ellsworth_fresh');const fresh=client('ellsworth_fresh');await fresh.connect();
  const freshBootstrap=bootstrap.replace('create role anon nologin; create role authenticated nologin;','');
  try{await fresh.query(freshBootstrap);await fresh.query(baseline);await fresh.query(migration);await fresh.query(planningMigration);await fresh.query(rolloutMigration);await fresh.query(headsUpMigration);await installDiscordForTest(fresh,discordMigration);await installDiscordHttpForTest(fresh,discordHttpMigration);await fresh.query(discordNoLinkMigration);check(!(await fresh.query('select enabled from ellsworth_private.discord_settings')).rows[0].enabled,'Fresh install keeps notifications off');check((await fresh.query('select count(*)::int as n from public.thanksgiving_dish_signups')).rows[0].n===0,'Fresh install');check((await fresh.query('select count(*)::int as n from public.thanksgiving_schedule')).rows[0].n===2,'Fresh install includes editable family-plan placeholders');check((await fresh.query("select count(*)::int as n from information_schema.columns where table_name='thanksgiving_rsvps' and column_name in ('dietary_needs','updated_at')")).rows[0].n===2,'Fresh install includes rollout RSVP fields');check((await fresh.query("select with_check from pg_policies where schemaname='public' and tablename='thanksgiving_game_votes' and policyname='Members vote for existing games'")).rows[0].with_check.includes('builtin-heads-up'),'Fresh install allows Heads Up votes');}
  finally{await fresh.end();}
  console.log(`PASS: ${checks} database checks on PostgreSQL ${(await admin.query('show server_version')).rows[0].server_version}; legacy preservation, capacity, ownership, RLS, grants, concurrency, fresh install.`);
}finally{
  if(admin)await admin.end();await instance.stop();await rm(directory,{recursive:true,force:true});
}
