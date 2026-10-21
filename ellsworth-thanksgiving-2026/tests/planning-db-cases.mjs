// Exercises the actual additive migration with real Postgres RLS and privileges.
export async function checkPlanningDatabase({admin,asUser,denied,check,ids,event,migration}){
  const photo='10000000-0000-4000-8000-000000000001',game='20000000-0000-4000-8000-000000000001';
  await admin.query('insert into public.thanksgiving_photos(id,event_id,external_url,caption) values ($1,$2,$3,$4)',[photo,event,'https://example.test/photo.jpg','Original caption']);
  await admin.query('insert into public.thanksgiving_games(id,event_id,name) values ($1,$2,$3)',[game,event,'Synthetic game']);
  const legacy=(await admin.query('select * from public.thanksgiving_dishes order by id')).rows;
  await admin.query(migration);
  check(JSON.stringify(legacy)===JSON.stringify((await admin.query('select * from public.thanksgiving_dishes order by id')).rows),'Planning migration preserves existing menu data');
  const tables=['thanksgiving_rsvps','thanksgiving_schedule','thanksgiving_game_votes','thanksgiving_photo_details','thanksgiving_photo_reactions'];
  for(const table of tables){
    check((await admin.query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity,table+' has RLS');
    check(!(await admin.query("select has_table_privilege('anon',$1,'select,insert,update,delete,truncate') as allowed",['public.'+table])).rows[0].allowed,table+' has no anonymous grants');
    await denied(ids[0],`truncate public.${table}`);
    check((await asUser(ids[6],`select * from public.${table}`)).rowCount===0,table+' denies nonmember reads');
  }
  const rsvpSql='insert into public.thanksgiving_rsvps(event_id,user_id,household_name,response,adults,children,arrival_date,arrival_time,departure_date,departure_time) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)';
  const rsvp=[event,ids[0],'Synthetic household','coming',2,1,'2026-11-25','18:30','2026-11-29','10:00'];
  check((await asUser(ids[0],rsvpSql,rsvp)).rowCount===1,'Member saves own RSVP');
  check((await asUser(ids[1],'select adults+children as guests from public.thanksgiving_rsvps')).rows[0].guests===3,'Other member can read household headcount');
  await denied(ids[0],rsvpSql,rsvp,'23505');
  await denied(ids[1],rsvpSql,rsvp);
  await denied(ids[6],rsvpSql,[event,ids[6],...rsvp.slice(2)]);
  await denied(null,rsvpSql,[event,ids[0],...rsvp.slice(2)]);
  await denied(ids[1],rsvpSql,[event,ids[1],'Bad count','coming',0,0,null,null,null,null],'23514');
  await denied(ids[1],rsvpSql,[event,ids[1],'Bad count','coming',50,1,null,null,null,null],'23514');
  await denied(ids[1],rsvpSql,[event,ids[1],'Bad dates','coming',1,0,'2026-11-26','18:00','2026-11-26','17:00'],'23514');
  await denied(ids[1],rsvpSql,[event,ids[1],'Bad dates','coming',1,0,null,'18:00',null,null],'23514');
  await denied(ids[1],rsvpSql,['another-event',ids[1],...rsvp.slice(2)],'23514');
  check((await asUser(ids[1],"update public.thanksgiving_rsvps set household_name='Intruder' where user_id=$1",[ids[0]])).rowCount===0,'Cannot edit another RSVP');
  check((await asUser(ids[1],'delete from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rowCount===0,'Cannot remove another RSVP');
  await denied(ids[0],'update public.thanksgiving_rsvps set user_id=$1 where user_id=$2',[ids[1],ids[0]]);
  check((await asUser(ids[0],"update public.thanksgiving_rsvps set response='declined',adults=0,children=0 where user_id=$1",[ids[0]])).rowCount===1,'Own RSVP can be declined');
  check((await asUser(ids[0],'delete from public.thanksgiving_rsvps where user_id=$1',[ids[0]])).rowCount===1,'Own RSVP can be removed');

  const dinner='00000000-2026-4000-8000-000000000001';
  check((await asUser(ids[0],'select * from public.thanksgiving_schedule')).rowCount===2,'Dinner and game-night placeholders installed');
  check((await asUser(ids[0],"update public.thanksgiving_schedule set start_time='16:00' where id=$1",[dinner])).rowCount===1,'Family can set seeded dinner time');
  check((await asUser(ids[1],"update public.thanksgiving_schedule set start_time='17:00' where id=$1",[dinner])).rowCount===1,'Shared seed plan is editable by another family member');
  check((await asUser(ids[0],'delete from public.thanksgiving_schedule where id=$1',[dinner])).rowCount===0,'Seed plans cannot be deleted by browser clients');
  const planSql='insert into public.thanksgiving_schedule(event_id,title,day,kind,start_time,end_time) values ($1,$2,$3,$4,$5,$6) returning id,created_by';
  const plan=(await asUser(ids[0],planSql,[event,'Synthetic outing','2026-11-27','outing','11:00','12:00'])).rows[0];
  check(plan.created_by===ids[0],'Schedule assigns authenticated creator by default');
  check((await asUser(ids[1],"update public.thanksgiving_schedule set title='Intruder' where id=$1",[plan.id])).rowCount===0,'Cannot edit another member’s custom plan');
  check((await asUser(ids[1],'delete from public.thanksgiving_schedule where id=$1',[plan.id])).rowCount===0,'Cannot delete another custom plan');
  await denied(ids[0],'update public.thanksgiving_schedule set is_seed=true where id=$1',[plan.id]);
  await denied(ids[0],'update public.thanksgiving_schedule set created_by=$1 where id=$2',[ids[1],plan.id]);
  await denied(ids[0],"insert into public.thanksgiving_schedule(event_id,title,day,kind,is_seed) values ($1,'Forged seed','2026-11-26','other',true)",[event]);
  await denied(ids[0],planSql,[event,'Bad times','2026-11-27','other','12:00','11:00'],'23514');
  await denied(ids[6],planSql,[event,'Nonmember','2026-11-27','other',null,null]);
  check((await asUser(ids[0],"update public.thanksgiving_schedule set note='Updated' where id=$1",[plan.id])).rowCount===1,'Own custom plan can be updated');
  check((await asUser(ids[0],'delete from public.thanksgiving_schedule where id=$1',[plan.id])).rowCount===1,'Own custom plan can be removed');

  const voteSql='insert into public.thanksgiving_game_votes(event_id,game_key,user_id) values ($1,$2,$3)';
  const vote=[event,'builtin-spades',ids[0]];
  check((await asUser(ids[0],voteSql,vote)).rowCount===1,'Built-in game can be voted for');
  await denied(ids[0],voteSql,vote,'23505');
  await denied(ids[1],voteSql,vote);
  await denied(ids[0],voteSql,[event,'imaginary-game',ids[0]]);
  await denied(ids[6],voteSql,[event,'builtin-uno',ids[6]]);
  check((await asUser(ids[1],voteSql,[event,'builtin-spades',ids[1]])).rowCount===1,'Independent member can vote for same game');
  check((await asUser(ids[0],voteSql,[event,game,ids[0]])).rowCount===1,'Persisted suggested game can be voted for');
  check((await asUser(ids[1],'delete from public.thanksgiving_game_votes where user_id=$1',[ids[0]])).rowCount===0,'Cannot remove another member’s votes');
  await denied(ids[0],"update public.thanksgiving_game_votes set game_key='builtin-uno'");
  check((await asUser(ids[0],'delete from public.thanksgiving_game_votes where user_id=$1 and game_key=$2',[ids[0],'builtin-spades'])).rowCount===1,'Own game vote can be removed');
  check((await asUser(ids[0],"select * from public.thanksgiving_game_votes where game_key='builtin-spades'")).rowCount===1,'Other member’s vote survives');

  const detailsSql='insert into public.thanksgiving_photo_details(photo_id,event_id,caption,people_names,date_taken,edited_by) values ($1,$2,$3,$4,$5,$6)';
  check((await asUser(ids[0],detailsSql,[photo,event,'Family memories','Synthetic names','2024-11-28',ids[0]])).rowCount===1,'Member annotates existing photo');
  check((await asUser(ids[1],'update public.thanksgiving_photo_details set caption=$1,edited_by=$2 where photo_id=$3',['Shared caption',ids[1],photo])).rowCount===1,'Another member can edit shared photo details');
  await denied(ids[1],'update public.thanksgiving_photo_details set edited_by=$1 where photo_id=$2',[ids[0],photo]);
  await denied(ids[6],detailsSql,['10000000-0000-4000-8000-000000000002',event,'Blocked','','2024-11-28',ids[6]]);
  await denied(ids[0],detailsSql,['10000000-0000-4000-8000-000000000002',event,'Missing photo','','2024-11-28',ids[0]],'23503');
  check((await admin.query('select caption from public.thanksgiving_photos where id=$1',[photo])).rows[0].caption==='Original caption','Original photo caption remains unchanged');

  const reactionSql='insert into public.thanksgiving_photo_reactions(photo_id,event_id,user_id,reaction) values ($1,$2,$3,$4)';
  const reaction=[photo,event,ids[0],'heart'];
  check((await asUser(ids[0],reactionSql,reaction)).rowCount===1,'Member reacts to a photo');
  await denied(ids[0],reactionSql,reaction,'23505');
  await denied(ids[1],reactionSql,reaction);
  await denied(ids[1],reactionSql,[photo,event,ids[1],'other'],'23514');
  await denied(ids[1],reactionSql,['10000000-0000-4000-8000-000000000002',event,ids[1],'heart'],'23503');
  check((await asUser(ids[1],reactionSql,[photo,event,ids[1],'laugh'])).rowCount===1,'Second member reacts independently');
  check((await asUser(ids[1],"update public.thanksgiving_photo_reactions set reaction='clap' where user_id=$1",[ids[0]])).rowCount===0,'Cannot edit another reaction');
  check((await asUser(ids[0],"update public.thanksgiving_photo_reactions set reaction='clap' where user_id=$1",[ids[0]])).rowCount===1,'Own reaction can change without adding count');
  await denied(ids[0],'update public.thanksgiving_photo_reactions set user_id=$1 where user_id=$2',[ids[2],ids[0]]);
  check((await asUser(ids[0],'delete from public.thanksgiving_photo_reactions where user_id=$1',[ids[0]])).rowCount===1,'Own reaction can be removed');
  check((await asUser(ids[0],'select * from public.thanksgiving_photo_reactions')).rowCount===1,'Other member’s reaction survives');
  await asUser(ids[4],'update public.thanksgiving_photo_details set edited_by=$1 where photo_id=$2',[ids[4],photo]);
  await admin.query('delete from auth.users where id=$1',[ids[4]]);
  check((await admin.query('select edited_by,caption from public.thanksgiving_photo_details where photo_id=$1',[photo])).rows[0].caption==='Shared caption','Photo annotations survive editor account deletion');
}
