'use strict';
// Classic script: initialized after the existing board has defined its shared state.
function initFamilyFeatures(){
  const eventId=FAMILY_CONFIG.eventId,localUser='preview-device';
  const builtinKeys=['builtin-spades','builtin-uno','builtin-dominoes','builtin-family-feud','builtin-charades','builtin-name-that-tune'];
  const seeds=[
    {id:'00000000-2026-4000-8000-000000000001',title:'Thanksgiving dinner',day:'2026-11-26',kind:'dinner',is_seed:true,start_time:null,note:'Time to be confirmed by the family.'},
    {id:'00000000-2026-4000-8000-000000000002',title:'Family game night',day:'2026-11-26',kind:'games',is_seed:true,start_time:null,note:'We’ll add the time and game lineup later.'}
  ];
  // Verified 2026-10-21 against NFL.com. Stored Central wall times, not viewer-local times.
  const nflSource='https://www.nfl.com/news/thanksgiving-2026-nfl-schedule-release';
  const football=[
    {id:'nfl-packers-rams',day:'2026-11-25',start_time:'19:00',title:'Green Bay Packers at Los Angeles Rams',network:'Netflix',source:nflSource},
    {id:'nfl-bears-lions',day:'2026-11-26',start_time:'12:00',title:'Chicago Bears at Detroit Lions',network:'CBS / Paramount+',source:nflSource},
    {id:'nfl-eagles-cowboys',day:'2026-11-26',start_time:'15:30',title:'Philadelphia Eagles at Dallas Cowboys',network:'FOX',source:nflSource},
    {id:'nfl-chiefs-bills',day:'2026-11-26',start_time:'19:20',title:'Kansas City Chiefs at Buffalo Bills',network:'NBC / Peacock',source:nflSource},
    {id:'nfl-broncos-steelers',day:'2026-11-27',start_time:'14:00',title:'Denver Broncos at Pittsburgh Steelers',network:'Prime Video',source:nflSource},
    {id:'nfl-saints-bengals',day:'2026-11-29',start_time:'12:00',title:'New Orleans Saints at Cincinnati Bengals',network:'CBS',source:'https://www.nfl.com/schedules/2026/by-week/week-12'}
  ].map(p=>({...p,kind:'football'}));
  const config={
    rsvps:{table:'thanksgiving_rsvps',columns:'event_id,user_id,household_name,response,adults,children,arrival_date,arrival_time,departure_date,departure_time,note'},
    plans:{table:'thanksgiving_schedule',columns:'id,event_id,created_by,is_seed,title,day,start_time,end_time,kind,location,note'},
    votes:{table:'thanksgiving_game_votes',columns:'game_key,user_id'},
    details:{table:'thanksgiving_photo_details',columns:'photo_id,caption,people_names,date_taken,edited_by'},
    reactions:{table:'thanksgiving_photo_reactions',columns:'photo_id,user_id,reaction'}
  };
  const state={},ready={},failed={},requests={},busy=new Set();
  let activeUser=isShared?memberUserId:null,tvOpen=false,tvTrigger=null,tvWasFullscreen=false;
  for(const key of Object.keys(config)){state[key]=configured?[]:load('planning_'+key,key==='plans'?seeds:[]);ready[key]=!configured;}
  const who=()=>isShared?memberUserId:localUser;
  const current=user=>!configured||(isShared&&user===memberUserId);
  const editable=key=>!configured||(isShared&&ready[key]);
  const dateText=date=>date?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date.slice(0,10)+'T12:00:00Z')):'';
  const photoDateText=date=>date?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(date.slice(0,10)+'T12:00:00Z')):'';
  const clock=time=>time?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date('2000-01-01T'+time.slice(0,5)+':00Z')):'';
  const field=(id,label,type,value='',attrs='')=>`<div class="form-field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value??'')}" ${attrs}></div>`;
  const formError=message=>{$('#featureFormError').textContent=message;};
  const formTail='<p id="featureFormError" class="feature-form-error" role="alert"></p><div class="modal-actions"><button class="btn" type="submit">Save changes</button></div>';
  function saveLocal(key,next){if(!save('planning_'+key,next))throw new Error('Local storage unavailable');state[key]=next;}
  function guard(key){if(!assertFamilyAccess())return false;if(!editable(key)){notify('This part of the board is unavailable. Refresh or contact the organizer.');return false;}return true;}
  function showStatus(key,label){return !configured?'Preview · saved on this device.':!isShared?'Join the family board above to see '+label+'.':failed[key]?'Could not load '+label+'. Refresh or contact the organizer.':!ready[key]?'Loading '+label+'…':'';}
  async function refreshGroup(key){
    if(!isShared)return;const user=memberUserId,request=(requests[key]||0)+1;requests[key]=request;
    try{
      const {data,error}=await sb.from(config[key].table).select(config[key].columns).eq('event_id',eventId);
      if(!current(user)||requests[key]!==request)return;if(error)throw error;
      state[key]=data||[];ready[key]=true;failed[key]=false;
    }catch(error){if(!current(user)||requests[key]!==request)return;console.error('Family board refresh failed:',error);ready[key]=false;failed[key]=true;}
    render();
  }
  async function refresh(){await Promise.allSettled(Object.keys(config).map(refreshGroup));}
  function accessChanged(){
    if(activeUser===(isShared?memberUserId:null))return;
    activeUser=isShared?memberUserId:null;
    for(const key of Object.keys(config)){state[key]=[];ready[key]=!configured;failed[key]=false;requests[key]=(requests[key]||0)+1;}
    if(!isShared)closeTv();render();
  }
  async function submitForm(form,write,refreshKey,success){
    if(form.dataset.saving)return;form.dataset.saving='true';
    const user=who(),buttons=[...form.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);formError('');
    try{
      await write();if(!current(user))return;
      if(isShared)await refreshGroup(refreshKey);else render();
      if(!current(user))return;closeModal();notify(success);
    }catch(error){console.error('Family board save failed:',error);if(current(user))formError('Could not save your changes. Please try again.');}
    finally{delete form.dataset.saving;buttons.forEach(button=>{if(button.isConnected)button.disabled=false;});}
  }
  async function checked(query){const result=await query;if(result.error)throw result.error;return result.data;}
  async function changed(query){const data=await checked(query);if(!data?.length)throw new Error('The record changed or is no longer editable.');return data;}
  function renderRsvps(){
    const rows=(!configured||isShared)?state.rsvps:[],coming=rows.filter(r=>r.response==='coming'),maybe=rows.filter(r=>r.response==='maybe');
    const guests=items=>items.reduce((sum,r)=>sum+r.adults+r.children,0);
    $('#rsvpSummary').innerHTML=(!configured||isShared&&ready.rsvps)?`<div class="rsvp-stat"><strong>${guests(coming)}</strong><span>confirmed guests</span></div><div class="rsvp-stat"><strong>${guests(maybe)}</strong><span>possibly joining</span></div><div class="rsvp-stat"><strong>${coming.length}</strong><span>confirmed households</span></div>`:'';
    $('#rsvpStatus').textContent=showStatus('rsvps','RSVPs and arrival details');
    $('#editRsvpBtn').textContent=rows.some(r=>r.user_id===who())?'Edit my RSVP':'+ Add my RSVP';
    $('#editRsvpBtn').disabled=configured&&isShared&&!ready.rsvps;
    const labels={coming:'Coming',maybe:'Maybe',declined:'Can’t make it'};
    $('#rsvpList').innerHTML=rows.length?rows.slice().sort((a,b)=>a.household_name.localeCompare(b.household_name)).map(r=>`<article class="rsvp-card"><span class="response-chip ${esc(r.response)}">${labels[r.response]}</span><h3>${esc(r.household_name)}${r.user_id===who()?' · you':''}</h3>${r.response!=='declined'?`<p>${r.adults} adult${r.adults===1?'':'s'} · ${r.children} child${r.children===1?'':'ren'}</p><p>Arrives: ${r.arrival_date?esc(dateText(r.arrival_date))+(r.arrival_time?' · '+esc(clock(r.arrival_time))+' CT':''):'To be confirmed'}</p><p>Departs: ${r.departure_date?esc(dateText(r.departure_date))+(r.departure_time?' · '+esc(clock(r.departure_time))+' CT':''):'To be confirmed'}</p>`:''}${r.note?`<p>${esc(r.note)}</p>`:''}</article>`).join(''):(!configured||isShared&&ready.rsvps)?'<p class="feature-empty">Be the first to let the family know your plans.</p>':'';
  }
  function openRsvp(){
    if(!guard('rsvps'))return;
    const own=state.rsvps.find(r=>r.user_id===who()),r=own||{response:'coming',adults:1,children:0};
    openModal(`<h3 id="modalTitle">Your family RSVP</h3><p>Count everyone in your household, including yourself. Arrival and departure times are Central.</p><form id="rsvpForm">${field('rsvpName','Your name / household','text',r.household_name,'required maxlength="75"')}<div class="form-field"><label for="rsvpResponse">Will you join us?</label><select id="rsvpResponse"><option value="coming">Coming</option><option value="maybe">Maybe</option><option value="declined">Can’t make it</option></select></div><div id="rsvpTravel"><div class="form-grid">${field('rsvpAdults','Adults (including you)','number',r.adults,'min="0" max="50" required')}${field('rsvpChildren','Children','number',r.children,'min="0" max="50" required')}${field('rsvpArrival','Arrival date','date',r.arrival_date)}${field('rsvpArrivalTime','Arrival time (optional, Central)','time',r.arrival_time?.slice(0,5))}${field('rsvpDeparture','Departure date','date',r.departure_date)}${field('rsvpDepartureTime','Departure time (optional, Central)','time',r.departure_time?.slice(0,5))}</div></div><div class="form-field"><label for="rsvpNote">Anything the family should know? (optional)</label><textarea id="rsvpNote" maxlength="250" rows="2">${esc(r.note||'')}</textarea></div>${formTail}${own?'<button type="button" class="btn ghost small" id="removeRsvp">Remove my RSVP</button>':''}</form>`);
    $('#rsvpResponse').value=r.response;
    const update=()=>{$('#rsvpTravel').hidden=$('#rsvpResponse').value==='declined';$('#rsvpTravel').querySelectorAll('input').forEach(el=>el.disabled=$('#rsvpTravel').hidden);};update();$('#rsvpResponse').addEventListener('change',update);
    const form=$('#rsvpForm');
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!guard('rsvps'))return;
      const response=$('#rsvpResponse').value,declined=response==='declined',adults=declined?0:Number($('#rsvpAdults').value),children=declined?0:Number($('#rsvpChildren').value);
      const arrival_date=declined?null:$('#rsvpArrival').value||null,departure_date=declined?null:$('#rsvpDeparture').value||null,arrival_time=declined?null:$('#rsvpArrivalTime').value||null,departure_time=declined?null:$('#rsvpDepartureTime').value||null;
      if(!$('#rsvpName').value.trim())return formError('Please enter your household name.');
      if(!declined&&(adults+children<1||adults+children>50))return formError('Include between 1 and 50 guests, counting yourself.');
      if(arrival_time&&!arrival_date||departure_time&&!departure_date)return formError('Add the date for each travel time.');
      if(arrival_date&&departure_date&&(departure_date<arrival_date||departure_date===arrival_date&&arrival_time&&departure_time&&departure_time<arrival_time))return formError('Departure must be after arrival.');
      const row={event_id:eventId,user_id:who(),household_name:$('#rsvpName').value.trim(),response,adults,children,arrival_date,arrival_time,departure_date,departure_time,note:$('#rsvpNote').value.trim()};
      submitForm(form,()=>isShared?checked(sb.from(config.rsvps.table).upsert(row,{onConflict:'event_id,user_id'})):saveLocal('rsvps',state.rsvps.filter(x=>x.user_id!==row.user_id).concat(row)),'rsvps','Your RSVP is saved.');
    });
    $('#removeRsvp')?.addEventListener('click',()=>{if(!guard('rsvps'))return;submitForm(form,()=>isShared?changed(sb.from(config.rsvps.table).delete().eq('event_id',eventId).eq('user_id',who()).select('user_id')):saveLocal('rsvps',state.rsvps.filter(r=>r.user_id!==who())),'rsvps','Your RSVP has been removed.');});
  }
  function renderSchedule(){
    const filter=$('#scheduleFilter').value,plans=(!configured||isShared)?state.plans:seeds;
    const entries=[...(filter==='football'?[]:plans),...(filter==='family'?[]:football)].sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||'99').localeCompare(b.start_time||'99'));
    $('#scheduleStatus').textContent=showStatus('plans','the shared family schedule');
    $('#addScheduleBtn').disabled=configured&&isShared&&!ready.plans;
    $('#scheduleList').innerHTML=[...new Set(entries.map(e=>e.day))].map(day=>`<section class="schedule-day"><h3>${esc(dateText(day))}</h3>${entries.filter(p=>p.day===day).map(p=>{
      const canEdit=p.kind!=='football'&&editable('plans')&&(p.is_seed||p.created_by===who());
      return `<article class="schedule-entry ${p.kind==='football'?'football':''}" data-plan-id="${esc(p.id)}"><div class="schedule-time">${p.start_time?esc(clock(p.start_time))+(p.end_time?' – '+esc(clock(p.end_time)):'')+' CT':'Time to be confirmed'}</div><div><span class="response-chip">${p.kind==='football'?'NFL football':p.kind==='games'?'Family games':p.kind==='dinner'?'At the table':p.kind==='outing'?'Outing':'Family plan'}</span><h4>${esc(p.title)}</h4>${p.location?`<p>${esc(p.location)}</p>`:''}${p.note?`<p>${esc(p.note)}</p>`:''}${p.network?`<p>${esc(p.network)}</p><a href="${p.source}" target="_blank" rel="noopener noreferrer">Official NFL schedule ↗</a>`:''}</div>${canEdit?`<button type="button" class="btn ghost small" data-edit-plan="${esc(p.id)}">Edit plan</button>`:''}</article>`;
    }).join('')}</section>`).join('')||'<p class="feature-empty">No plans yet. Add something for the family to look forward to.</p>';
  }
  function openPlan(id){
    if(!guard('plans'))return;
    const own=id?state.plans.find(p=>p.id===id):null;if(id&&(!own||!own.is_seed&&own.created_by!==who()))return;
    const p=own||{day:'2026-11-26',kind:'other'};
    openModal(`<h3 id="modalTitle">${own?'Update':'Add'} a weekend plan</h3><p>All times are Central. Leave the time blank while plans are still coming together.</p><form id="scheduleForm">${field('planTitle','Plan name','text',p.title,'required maxlength="100"')}<div class="form-grid">${field('planDay','Date','date',p.day,'required')}<div class="form-field"><label for="planKind">Type of plan</label><select id="planKind"><option value="dinner">Dinner / meal</option><option value="games">Family games</option><option value="outing">Outing</option><option value="other">Other</option></select></div>${field('planStart','Start time (optional)','time',p.start_time?.slice(0,5))}${field('planEnd','End time (optional)','time',p.end_time?.slice(0,5))}</div>${field('planLocation','Where? (optional)','text',p.location,'maxlength="100"')}<div class="form-field"><label for="planNote">Details (optional)</label><textarea id="planNote" maxlength="300" rows="2">${esc(p.note||'')}</textarea></div>${formTail}${own&&!own.is_seed?'<button type="button" class="btn ghost small" id="removePlan">Remove this plan</button>':''}</form>`);
    $('#planKind').value=p.kind;const form=$('#scheduleForm');
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!guard('plans'))return;
      const start_time=$('#planStart').value||null,end_time=$('#planEnd').value||null;
      if(end_time&&(!start_time||end_time<=start_time))return formError('Choose an end time after the start time.');
      if(!$('#planTitle').value.trim())return formError('Please enter a plan name.');
      const row={title:$('#planTitle').value.trim(),day:$('#planDay').value,kind:$('#planKind').value,start_time,end_time,location:$('#planLocation').value.trim(),note:$('#planNote').value.trim()};
      submitForm(form,()=>isShared?(own?changed(sb.from(config.plans.table).update(row).eq('event_id',eventId).eq('id',own.id).select('id')):checked(sb.from(config.plans.table).insert({...row,event_id:eventId}))):saveLocal('plans',own?state.plans.map(p=>p.id===own.id?{...p,...row}:p):state.plans.concat({...row,id:uid(),created_by:who(),is_seed:false})),'plans','The weekend plan is saved.');
    });
    $('#removePlan')?.addEventListener('click',()=>{if(!guard('plans'))return;submitForm(form,()=>isShared?changed(sb.from(config.plans.table).delete().eq('event_id',eventId).eq('id',own.id).select('id')):saveLocal('plans',state.plans.filter(p=>p.id!==own.id)),'plans','The plan has been removed.');});
  }
  function gameKey(g){return g.id||builtinKeys[STARTER_GAMES.findIndex(s=>s.name===g.name)];}
  function renderGames(){
    const rows=(!configured||isShared)?state.votes:[];
    const list=games.map((g,i)=>({...g,key:gameKey(g),order:i,count:rows.filter(v=>v.game_key===gameKey(g)).length}));
    if($('#gameSort').value==='popular')list.sort((a,b)=>b.count-a.count||a.order-b.order);
    $('#gameVoteStatus').textContent=showStatus('votes','the family’s game votes');
    $('#gamesGrid').innerHTML=list.map((g,i)=>{
      const own=rows.some(v=>v.game_key===g.key&&v.user_id===who());
      return `<article class="game-card" data-num="${String(i+1).padStart(2,'0')}" data-game-key="${esc(g.key)}"><span class="game-icon" aria-hidden="true">${esc(g.icon||'✦')}</span><h3>${esc(g.name)}</h3><p>${esc(g.desc)}</p><div class="game-vote-row"><span>${g.count} vote${g.count===1?'':'s'}</span><button type="button" class="btn light small" data-vote="${esc(g.key)}" aria-pressed="${own}" ${!g.key||busy.has('vote:'+g.key)||configured&&isShared&&!ready.votes?'disabled':''}>${own?'✓ Voted':'+ Vote'}</button></div></article>`;
    }).join('');
  }
  async function vote(key){
    if(!guard('votes')||busy.has('vote:'+key))return;const user=who(),tag='vote:'+key;
    const own=state.votes.some(v=>v.game_key===key&&v.user_id===user);busy.add(tag);renderGames();
    try{
      if(isShared){if(own)await changed(sb.from(config.votes.table).delete().eq('event_id',eventId).eq('game_key',key).eq('user_id',user).select('game_key'));else await checked(sb.from(config.votes.table).insert({event_id:eventId,game_key:key,user_id:user}));if(current(user))await refreshGroup('votes');}
      else saveLocal('votes',own?state.votes.filter(v=>!(v.game_key===key&&v.user_id===user)):state.votes.concat({game_key:key,user_id:user}));
      if(current(user))notify(own?'Your vote was removed.':'Your vote is saved.');
    }catch(error){console.error(error);if(current(user))notify('Could not change your vote. Refresh and try again.');}
    finally{busy.delete(tag);renderGames();if(current(user))document.querySelector(`[data-vote="${CSS.escape(key)}"]`)?.focus({preventScroll:true});}
  }
  const extra=document.createElement('div');extra.id='photoExtras';extra.className='photo-extra';$('#photoCaption').after(extra);
  const photoInfo=photo=>{const detail=state.details.find(d=>d.photo_id===photo?.id);return {caption:detail?detail.caption:photo?.caption||'',people:detail?.people_names||'',date:detail?.date_taken||''};};
  function renderPhoto(){
    const photo=photos[slideIndex];extra.hidden=!photo;
    if(!photo){extra.innerHTML='';if(tvOpen)closeTv();return;}
    const info=photoInfo(photo),own=state.reactions.find(r=>r.photo_id===photo.id&&r.user_id===who());
    $('#photoCaption').textContent=info.caption||'A little family love.';
    $('#memoryFrame .active-photo')?.setAttribute('alt',info.caption||info.people||`Family photo ${slideIndex+1}`);
    extra.innerHTML=`<p class="photo-people">${esc([info.people,photoDateText(info.date)].filter(Boolean).join(' · '))}</p><div class="photo-reactions">${[['heart','❤️','Love'],['laugh','😄','Laugh'],['clap','👏','Applause']].map(([key,emoji,label])=>`<button type="button" data-react="${key}" aria-label="${label}" aria-pressed="${own?.reaction===key}" ${!photo.id||busy.has('reaction')||configured&&isShared&&!ready.reactions?'disabled':''}>${emoji} ${state.reactions.filter(r=>r.photo_id===photo.id&&r.reaction===key).length}</button>`).join('')}</div><div class="photo-extra-actions"><button class="btn secondary small" type="button" id="editPhotoDetails" ${!photo.id||configured&&isShared&&!ready.details?'disabled':''}>Edit caption, names & date</button><button class="btn secondary small" type="button" id="startTv">TV slideshow ↗</button></div><p class="helper">${esc(showStatus('details','photo captions')||showStatus('reactions','photo reactions'))}</p>`;
    $('#editPhotoDetails').addEventListener('click',()=>openPhotoDetails(photo.id));$('#startTv').addEventListener('click',openTv);
    if(tvOpen)renderTv();
  }
  function openPhotoDetails(id){
    if(!guard('details'))return;const photo=photos.find(p=>p.id===id);if(!photo)return;const info=photoInfo(photo);
    openModal(`<h3 id="modalTitle">The story behind this photo</h3><p>Help the family remember who, when, and what made it special. Family members can update these details.</p><form id="photoDetailsForm">${field('photoDetailCaption','Caption','text',info.caption,'maxlength="150"')}${field('photoPeople','Who’s in the photo? (optional)','text',info.people,'maxlength="250"')}${field('photoDate','Date taken (optional)','date',info.date)}${formTail}</form>`);
    const form=$('#photoDetailsForm');form.addEventListener('submit',event=>{
      event.preventDefault();if(!guard('details'))return;
      const row={event_id:eventId,photo_id:id,caption:$('#photoDetailCaption').value.trim(),people_names:$('#photoPeople').value.trim(),date_taken:$('#photoDate').value||null,edited_by:who()};
      submitForm(form,()=>isShared?checked(sb.from(config.details.table).upsert(row,{onConflict:'photo_id'})):saveLocal('details',state.details.filter(d=>d.photo_id!==id).concat(row)),'details','Photo details are saved.');
    });
  }
  async function react(reaction){
    if(!guard('reactions')||busy.has('reaction'))return;const photo=photos[slideIndex];if(!photo?.id)return;
    const user=who(),own=state.reactions.find(r=>r.photo_id===photo.id&&r.user_id===user),remove=own?.reaction===reaction;
    busy.add('reaction');renderPhoto();
    try{
      const row={photo_id:photo.id,event_id:eventId,user_id:user,reaction};
      if(isShared){if(remove)await changed(sb.from(config.reactions.table).delete().eq('event_id',eventId).eq('photo_id',photo.id).eq('user_id',user).select('photo_id'));else await checked(sb.from(config.reactions.table).upsert(row,{onConflict:'photo_id,user_id'}));if(current(user))await refreshGroup('reactions');}
      else saveLocal('reactions',state.reactions.filter(r=>!(r.photo_id===photo.id&&r.user_id===user)).concat(remove?[]:[row]));
      if(current(user))notify(remove?'Reaction removed.':'Reaction saved.');
    }catch(error){console.error(error);if(current(user))notify('Could not save your reaction. Please try again.');}
    finally{busy.delete('reaction');renderPhoto();if(current(user))extra.querySelector(`[data-react="${reaction}"]`)?.focus({preventScroll:true});}
  }
  function renderTv(){
    const photo=photos[slideIndex];if(!photo)return;const info=photoInfo(photo);
    if($('#tvImage').getAttribute('src')!==photo.url)$('#tvImage').src=photo.url;
    $('#tvImage').alt=info.caption||info.people||`Family photo ${slideIndex+1}`;$('#tvCaption').textContent=info.caption;
    $('#tvPeople').textContent=[info.people,photoDateText(info.date)].filter(Boolean).join(' · ');
    $('#tvCount').textContent=`${slideIndex+1} / ${photos.length}`;$('#tvPause').textContent=playing?'Pause slideshow':'Play slideshow';
  }
  function openTv(){
    if(!photos.length)return;tvTrigger=document.activeElement;tvOpen=true;tvWasFullscreen=false;
    $('#tvSlideshow').hidden=false;document.body.style.overflow='hidden';renderTv();$('#tvExit').focus();
    const fullscreen=$('#tvSlideshow').requestFullscreen?.();
    if(fullscreen)fullscreen.then(()=>{if(tvOpen)tvWasFullscreen=true;else if(document.fullscreenElement===$('#tvSlideshow'))document.exitFullscreen?.().catch(()=>{});}).catch(()=>{if(tvOpen)notify('Showing the TV slideshow in this window.');});
  }
  function closeTv(){
    if(!tvOpen)return;tvOpen=false;$('#tvSlideshow').hidden=true;$('#tvImage').removeAttribute('src');
    document.body.style.overflow='';if(document.fullscreenElement===$('#tvSlideshow'))document.exitFullscreen?.().catch(()=>{});
    (tvTrigger?.isConnected?tvTrigger:$('#startTv'))?.focus({preventScroll:true});tvWasFullscreen=false;
  }
  function render(){renderRsvps();renderSchedule();renderGames();renderPhoto();}
  $('#editRsvpBtn').addEventListener('click',openRsvp);$('#addScheduleBtn').addEventListener('click',()=>openPlan());
  $('#scheduleList').addEventListener('click',e=>{const button=e.target.closest('[data-edit-plan]');if(button)openPlan(button.dataset.editPlan);});
  $('#scheduleFilter').addEventListener('change',renderSchedule);$('#gameSort').addEventListener('change',renderGames);
  $('#refreshPlanningBtn').addEventListener('click',()=>{if(assertFamilyAccess())refresh();});
  $('#gamesGrid').addEventListener('click',e=>{const button=e.target.closest('[data-vote]');if(button)vote(button.dataset.vote);});
  extra.addEventListener('click',e=>{const button=e.target.closest('[data-react]');if(button)react(button.dataset.react);});
  $('#tvExit').addEventListener('click',closeTv);$('#tvPrev').addEventListener('click',()=>moveSlide(-1));$('#tvNext').addEventListener('click',()=>moveSlide(1));
  $('#tvPause').addEventListener('click',()=>{$('#photoPause').click();renderTv();});
  document.addEventListener('fullscreenchange',()=>{if(tvOpen&&tvWasFullscreen&&!document.fullscreenElement)closeTv();});
  document.addEventListener('keydown',e=>{
    if(!tvOpen)return;
    if(e.key==='Escape'){e.preventDefault();closeTv();}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveSlide(e.key==='ArrowRight'?1:-1);}
    if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();$('#tvPause').click();}
    if(e.key==='Tab'){
      const buttons=[...$('#tvSlideshow').querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  // Pause advancement in background tabs; user-selected play/pause state is retained.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInterval(slideTimer);else resetSlideTimer();});
  if(!configured){
    const localGames=games.map(g=>gameKey(g)?g:{...g,id:uid()});if(localGames.some((g,i)=>g!==games[i])){games=localGames;save('games',games);}
    const urls=load('photo_urls',[]).map(p=>({...p,id:p.id||uid()}));if(urls.length)save('photo_urls',urls);
  }
  render();if(isShared)refresh();
  return {refresh,accessChanged,renderGames,renderPhoto};
}
