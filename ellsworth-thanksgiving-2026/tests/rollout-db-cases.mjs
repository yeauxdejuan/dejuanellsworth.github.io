// Real database checks for the additive dietary field and server-stamped save time.
export async function checkRolloutDatabase({admin,asUser,denied,check,ids,event,migration}){
  await asUser(ids[0],`insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children,note)
    values($1,$2,'Existing household','coming',2,1,'Keep this note')`,[event,ids[0]]);
  const before=(await admin.query('select * from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rows[0];
  await admin.query(migration);
  const legacy=(await admin.query('select * from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rows[0];
  check(Object.keys(before).every(key=>JSON.stringify(before[key])===JSON.stringify(legacy[key])),'Rollout migration preserves existing RSVP fields');
  check(legacy.dietary_needs===''&&legacy.updated_at===null,'Existing RSVPs have no invented historical save time');
  const upsert=`insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children,dietary_needs)
    values($1,$2,'Existing household','coming',2,1,$3)
    on conflict(event_id,user_id) do update set dietary_needs=excluded.dietary_needs
    returning dietary_needs,updated_at`;
  const saved=(await asUser(ids[0],upsert,[event,ids[0],'Nut allergy; vegetarian meals'])).rows[0];
  check(saved.dietary_needs==='Nut allergy; vegetarian meals'&&saved.updated_at instanceof Date,'Member upsert saves dietary needs and returns the server timestamp');
  check((await asUser(ids[1],'select dietary_needs from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rows[0].dietary_needs===saved.dietary_needs,'Joined members can read dietary details for meal planning');
  check((await asUser(ids[6],'select * from public.thanksgiving_rsvps')).rowCount===0,'Nonmembers cannot read dietary details');
  check((await asUser(ids[1],"update public.thanksgiving_rsvps set dietary_needs='Changed' where user_id=$1",[ids[0]])).rowCount===0,'Members cannot edit another household’s dietary needs');
  const read=(await asUser(ids[0],'select updated_at from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rows[0];
  check(read.updated_at.getTime()===saved.updated_at.getTime(),'Reading RSVPs does not change last-updated time');
  const stamped=(await asUser(ids[0],"update public.thanksgiving_rsvps set updated_at='2100-01-01',dietary_needs='' where user_id=$1 returning updated_at,dietary_needs",[ids[0]])).rows[0];
  check(stamped.updated_at.getTime()<Date.parse('2100-01-01')&&stamped.updated_at>=saved.updated_at,'Database overrides client-supplied timestamps on updates');
  check(stamped.dietary_needs==='','Members can clear dietary needs');
  await denied(ids[0],upsert,[event,ids[0],'x'.repeat(251)],'23514');
  check((await asUser(ids[0],'select updated_at from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rows[0].updated_at.getTime()===stamped.updated_at.getTime(),'Failed dietary saves do not change the previous save time');
  const inserted=(await asUser(ids[1],`insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children)
    values($1,$2,'New household','maybe',1,0) returning dietary_needs,updated_at`,[event,ids[1]])).rows[0];
  check(inserted.dietary_needs===''&&inserted.updated_at instanceof Date,'Older clients can insert RSVPs while the server supplies new field defaults');
  check(!(await admin.query("select has_function_privilege('authenticated','ellsworth_private.stamp_rsvp_update()','EXECUTE') as allowed")).rows[0].allowed,'Timestamp trigger function is not exposed to browser callers');
  await denied(ids[6],upsert,[event,ids[6],'Blocked']);
  await denied(null,upsert,[event,ids[0],'Blocked']);
  await asUser(ids[0],'delete from public.thanksgiving_rsvps where user_id=$1',[ids[0]]);
}
