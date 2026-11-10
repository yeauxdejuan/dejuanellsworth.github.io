import assert from 'node:assert/strict';

// Real self-claim SQL, called as family members through the authenticated role (like PostgREST).
// Requires installReassignForTest first (auth.sessions, move_member_rows, audit table).
export async function checkSelfClaimDatabase({admin,asUser,denied,check,event,migration}){
  await admin.query(migration);
  const one=async(sql,params=[])=>(await admin.query(sql,params)).rows[0];
  const id=s=>`00000000-0000-4000-8000-0000000000${s}`;
  const [lost,active,device,stranger,device2,lost2,lost3]=['b1','b2','b3','b4','b5','b6','b7'].map(id);
  for(const u of [lost,active,device,stranger,device2,lost2,lost3])await admin.query("insert into auth.users(id,created_at) values ($1,now()-interval '20 days')",[u]);
  for(const u of [lost,active,device,device2,lost2,lost3])await admin.query('insert into public.ellsworth_members(user_id) values ($1)',[u]);
  await admin.query(`insert into auth.sessions values ($1,now()-interval '10 days','iPhone'),($2,now(),'iPhone'),($3,now(),'iPhone'),($4,now(),'iPhone'),($5,now()-interval '9 days','iPhone')`,[lost,active,device,device2,lost2]);
  const rsvp=(u,name)=>admin.query("insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children) values ($1,$2,$3,'coming',2,0)",[event,u,name]);
  await rsvp(lost,'Claim House');await rsvp(active,'Active House');await rsvp(lost2,'Second House');await rsvp(lost3,'Second House');
  const photo=(await one("insert into public.thanksgiving_photos(event_id,path) values ($1,'claim/test.jpg') returning id",[event])).id;
  await admin.query("insert into public.thanksgiving_photo_reactions(photo_id,event_id,user_id,reaction) values ($1,$2,$3,'heart'),($1,$2,$4,'clap')",[photo,event,lost,device]);
  const list=async u=>(await asUser(u,'select household from public.claimable_households($1)',[event])).rows.map(r=>r.household);
  const claim=(u,name)=>asUser(u,'select public.claim_household($1,$2) as r',[event,name]);
  const refused=async(u,name,pattern,message)=>{await assert.rejects(()=>claim(u,name),pattern);check(true,message);};

  for(const fn of ['public.claim_household(text,text)','public.claimable_households(text)'])
    check(!(await one(`select has_function_privilege('anon','${fn}','execute') as a`)).a,`Anonymous browsers cannot call ${fn}`);
  check((await list(stranger)).length===0,'A non-member sees no households');
  await denied(stranger,'select public.claim_household($1,$2)',[event,'Claim House']);
  const seen=await list(device);
  check(JSON.stringify(seen.filter(h=>/^(Claim|Second|Active) House$/.test(h)))===JSON.stringify(['Claim House','Second House','Second House'])&&JSON.stringify(seen)===JSON.stringify([...seen].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()))),'A member without an RSVP sees only idle households, sorted, without IDs');
  check((await list(active)).length===0,'A member who has an RSVP sees no households');
  await refused(device,'Active House',/cannot be reclaimed/,'An active household cannot be claimed');
  await refused(device,'Second House',/More than one household/,'An ambiguous household name is refused');

  await admin.query('update ellsworth_private.discord_settings set enabled=true');
  const outboxBefore=(await one('select count(*)::int as n from ellsworth_private.discord_outbox')).n;
  const result=(await claim(device,'  claim house ')).rows[0].r;
  check(result.household==='Claim House'&&result.reassignment_id>0,'A member reclaims their household (case and spaces ignored)');
  check((await one('select user_id from public.thanksgiving_rsvps where household_name=$1',['Claim House'])).user_id===device,'The RSVP now belongs to the new device');
  check(!(await one('select exists(select 1 from public.ellsworth_members where user_id=$1) as m',[lost])).m,'The lost identity loses its membership');
  const reactions=(await admin.query('select user_id,reaction from public.thanksgiving_photo_reactions where photo_id=$1',[photo])).rows;
  check(reactions.length===1&&reactions[0].user_id===device&&reactions[0].reaction==='heart','The earlier reaction wins over the new device duplicate');
  const notices=(await admin.query('select summary from ellsworth_private.discord_outbox order by id desc limit 2')).rows;
  check((await one('select count(*)::int as n from ellsworth_private.discord_outbox')).n===outboxBefore+1&&new RegExp(`^Claim House reclaimed their RSVP on a new device \\(undo #${result.reassignment_id}\\)$`).test(notices[0].summary),'The organizer gets one Discord notice with the undo ID, and no move activity');
  await admin.query('update ellsworth_private.discord_settings set enabled=false');
  check((await one('select note from ellsworth_private.member_reassignments where id=$1',[result.reassignment_id])).note==='self-claim: Claim House','The claim is in the audit table');
  check((await asUser(device,"update public.thanksgiving_rsvps set adults=3 where user_id=$1",[device])).rowCount===1,'The member can edit the reclaimed RSVP');
  check((await list(device)).length===0,'After a claim the device sees no more households');
  await refused(device,'Second House',/already has an RSVP/,'One claim per device');

  await admin.query("update public.thanksgiving_rsvps set household_name='Third House' where user_id=$1",[lost3]);
  await admin.query("insert into ellsworth_private.member_reassignments(old_user_id,new_user_id,moved,note) select $1,$2,'{}','self-claim: synthetic' from generate_series(1,5)",[lost3,stranger]);
  await refused(device2,'Second House',/Too many RSVPs/,'Self-claims are limited to five per hour');
  await admin.query("delete from ellsworth_private.member_reassignments where note='self-claim: synthetic'");
  check((await claim(device2,'Second House')).rows[0].r.household==='Second House','A different device can claim another idle household');

  const undone=(await one('select ellsworth_private.undo_member_reassignment($1) as r',[result.reassignment_id])).r;
  check(undone.rsvps===1&&(await one('select user_id from public.thanksgiving_rsvps where household_name=$1',['Claim House'])).user_id===lost,'The organizer can undo a self-claim');
}
