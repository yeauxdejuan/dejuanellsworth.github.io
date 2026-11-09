import assert from 'node:assert/strict';

// Real reassignment SQL. Only auth.sessions and auth.users.created_at are added, as hosted Auth has them.
export async function installReassignForTest(admin,migration){
  await admin.query(`alter table auth.users add column if not exists created_at timestamptz default now();
    create table if not exists auth.sessions(user_id uuid,updated_at timestamptz,user_agent text);`);
  await admin.query(migration);
}

export async function checkReassignDatabase({admin,asUser,denied,check,event,migration}){
  await installReassignForTest(admin,migration);
  const one=async(sql,params=[])=>(await admin.query(sql,params)).rows[0];
  const [oldId,newId,otherId,strangerId]=['a1','a2','a3','a4'].map(s=>`00000000-0000-4000-8000-0000000000${s}`);
  for(const id of [oldId,newId,otherId,strangerId])await admin.query('insert into auth.users(id) values ($1)',[id]);
  for(const id of [oldId,newId,otherId])await admin.query('insert into public.ellsworth_members(user_id) values ($1)',[id]);
  await admin.query(`insert into auth.sessions values
    ($1,now()-interval '9 days','Mozilla/5.0 (iPhone; CPU iPhone OS 27_2_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/156.0 Mobile/15E148 Safari/604.1'),
    ($2,now(),'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1')`,[oldId,newId]);
  const outbox=async()=>(await one('select count(*)::int as n from ellsworth_private.discord_outbox')).n;
  const photo=(await one("insert into public.thanksgiving_photos(event_id,path) values ($1,'reassign/test.jpg') returning id",[event])).id;
  const photo2=(await one("insert into public.thanksgiving_photos(event_id,path) values ($1,'reassign/test2.jpg') returning id",[event])).id;
  await admin.query("insert into public.thanksgiving_dishes(event_id,id,label,category) values ($1,'reassign-dish','Reassign dish','The sides')",[event]);
  await admin.query(`insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children) values ($1,$2,'Reassign House','coming',2,1)`,[event,oldId]);
  await admin.query("insert into public.thanksgiving_dish_signups(event_id,dish_id,slot,user_id,assignee) values ($1,'reassign-dish',1,$2,'Old cook')",[event,oldId]);
  await admin.query("insert into public.thanksgiving_game_votes(event_id,game_key,user_id) values ($1,'builtin-heads-up',$2)",[event,oldId]);
  await admin.query("insert into public.thanksgiving_photo_details(photo_id,event_id,caption,edited_by) values ($1,$2,'Old caption',$3)",[photo,event,oldId]);
  await admin.query("insert into public.thanksgiving_photo_reactions(photo_id,event_id,user_id,reaction) values ($1,$2,$3,'heart')",[photo,event,oldId]);
  await admin.query("insert into public.thanksgiving_schedule(event_id,created_by,title,day,kind) values ($1,$2,'Reassign walk','2026-11-27','outing')",[event,oldId]);
  const rsvpBefore=(await one('select updated_at from public.thanksgiving_rsvps where user_id=$1',[oldId])).updated_at;

  await denied(oldId,`select ellsworth_private.reassign_member('${oldId}','${newId}')`);
  await denied(oldId,'select * from ellsworth_private.identity_overview()');
  check(!(await one("select has_function_privilege('anon','ellsworth_private.reassign_member(uuid,uuid,text)','execute') as allowed")).allowed,'Anonymous callers cannot reassign members');

  const overview=(await admin.query('select * from ellsworth_private.identity_overview()')).rows;
  const lost=overview.find(r=>r.user_id===oldId),fresh=overview.find(r=>r.user_id===newId);
  check(lost.household==='Reassign House'&&lost.rows_owned===6&&lost.device==='iPhone Chrome','Overview shows the lost identity with its household, data and device');
  check(fresh.rows_owned===0&&fresh.member&&fresh.device==='iPhone Safari'&&overview.indexOf(fresh)<overview.indexOf(lost),'Overview lists the new identity first, with no data');

  const fails=async(sql,pattern,message)=>{await assert.rejects(()=>admin.query(sql),pattern);check(true,message);};
  await fails(`select ellsworth_private.reassign_member('${oldId}','${oldId}')`,/two different user IDs/,'Reassigning to the same identity is refused');
  await fails(`select ellsworth_private.reassign_member('${oldId}','${strangerId}')`,/has not entered the family code/,'The new identity must have joined with the code');
  await fails(`select ellsworth_private.reassign_member('${oldId}','00000000-0000-4000-8000-0000000000ff')`,/does not exist/,'An unknown user ID is refused');
  await fails(`select ellsworth_private.reassign_member('${otherId}','${newId}')`,/owns no family data/,'An old identity without data is refused');

  await admin.query(`insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children) values ($1,$2,'Duplicate House','coming',1,0)`,[event,newId]);
  await fails(`select ellsworth_private.reassign_member('${oldId}','${newId}')`,/Both identities have: RSVP/,'A duplicate RSVP stops the move');
  check((await one('select count(*)::int as n from public.thanksgiving_rsvps where user_id=$1',[oldId])).n===1,'A refused move changes nothing');
  await admin.query('delete from public.thanksgiving_rsvps where user_id=$1',[newId]);

  await admin.query('update ellsworth_private.discord_settings set enabled=true');
  const sent=await outbox();
  const moved=(await one(`select ellsworth_private.reassign_member('${oldId}','${newId}','test') as r`)).r;
  check(moved.rsvps===1&&moved.dish_signups===1&&moved.game_votes===1&&moved.photo_captions===1&&moved.photo_reactions===1&&moved.schedule_items===1&&moved.reassignment_id>0,'Reassignment moves every owned row and returns an audit ID');
  check((await one('select ellsworth_private.member_row_count($1) as n',[oldId])).n===0&&(await one('select ellsworth_private.member_row_count($1) as n',[newId])).n===6,'All data now belongs to the new identity');
  check(!(await one('select exists(select 1 from public.ellsworth_members where user_id=$1) as m',[oldId])).m,'The lost identity is no longer a member');
  check(await outbox()===sent,'A move sends no Discord activity, even with alerts on');
  await admin.query('update ellsworth_private.discord_settings set enabled=false');
  check((await one('select updated_at from public.thanksgiving_rsvps where user_id=$1',[newId])).updated_at?.getTime()===rsvpBefore?.getTime(),'The RSVP keeps its original save time');
  check((await one("select current_setting('session_replication_role') as r")).r==='origin','Triggers are active again after the move');
  check((await asUser(newId,"update public.thanksgiving_rsvps set adults=3 where user_id=$1",[newId])).rowCount===1,'The new identity can edit the moved RSVP');
  check((await asUser(newId,'delete from public.thanksgiving_photo_reactions where photo_id=$1 and user_id=$2',[photo,newId])).rowCount===1,'The new identity can remove its moved reaction');
  await admin.query("insert into public.thanksgiving_photo_reactions(photo_id,event_id,user_id,reaction) values ($1,$2,$3,'clap')",[photo2,event,newId]);

  const undone=(await one(`select ellsworth_private.undo_member_reassignment(${moved.reassignment_id}) as r`)).r;
  check(undone.rsvps===1&&undone.photo_reactions===1&&(await one('select exists(select 1 from public.ellsworth_members where user_id=$1) as m',[oldId])).m,'Undo moves the data back and restores the old membership');
  check((await one('select undone_at is not null as u from ellsworth_private.member_reassignments where id=$1',[moved.reassignment_id])).u,'Undo is recorded in the audit table');
  await fails(`select ellsworth_private.undo_member_reassignment(${moved.reassignment_id})`,/No active reassignment/,'An undo cannot run twice');
}
