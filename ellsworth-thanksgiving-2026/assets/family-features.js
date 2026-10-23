'use strict';
// Classic script: initialized after the existing board has defined its shared state.
function initFamilyFeatures(){
  const eventId=FAMILY_CONFIG.eventId,localUser='preview-device';
  const builtinKeys={Spades:'builtin-spades',UNO:'builtin-uno','Name That Tune':'builtin-name-that-tune'};
  // Verified 2026-10-21 against NFL.com. Stored Central wall times, not viewer-local times.
  const nflSource='https://www.nfl.com/news/thanksgiving-2026-nfl-schedule-release';
  const football=[
    {id:'nfl-bears-lions',day:'2026-11-26',start_time:'12:00',title:'Chicago Bears at Detroit Lions',network:'CBS / Paramount+',source:nflSource},
    {id:'nfl-eagles-cowboys',day:'2026-11-26',start_time:'15:30',title:'Philadelphia Eagles at Dallas Cowboys',network:'FOX',source:nflSource},
    {id:'nfl-chiefs-bills',day:'2026-11-26',start_time:'19:20',title:'Kansas City Chiefs at Buffalo Bills',network:'NBC / Peacock',source:nflSource}
  ].map(p=>({...p,kind:'football'}));
  const config={
    rsvps:{table:'thanksgiving_rsvps',columns:'event_id,user_id,household_name,response,adults,children,arrival_date,arrival_time,departure_date,departure_time,note,dietary_needs,updated_at'},
    votes:{table:'thanksgiving_game_votes',columns:'game_key,user_id'},
    details:{table:'thanksgiving_photo_details',columns:'photo_id,caption,edited_by'},
    reactions:{table:'thanksgiving_photo_reactions',columns:'photo_id,user_id,reaction'}
  };
  const state={},ready={},failed={},requests={},busy=new Set();
  let activeUser=isShared?memberUserId:null,tvOpen=false,tvTrigger=null,tvWasFullscreen=false;
  for(const key of Object.keys(config)){state[key]=configured?[]:load('planning_'+key,[]);ready[key]=!configured;}
  const who=()=>isShared?memberUserId:localUser;
  const current=user=>!configured||(isShared&&user===memberUserId);
  const editable=key=>!configured||(isShared&&ready[key]);
  const dateText=date=>date?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date.slice(0,10)+'T12:00:00Z')):'';
  const clock=time=>time?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date('2000-01-01T'+time.slice(0,5)+':00Z')):'';
  const savedTime=value=>{const date=new Date(value);return value&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(date)+' CT':'';};
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
  async function submitForm(form,write,refreshKey,success,audible=true){
    if(form.dataset.saving)return;form.dataset.saving='true';
    const user=who(),buttons=[...form.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);formError('');
    try{
      await write();if(!current(user))return;
      if(audible)playSavedSound(user);
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
    const own=rows.find(r=>r.user_id===who()),saved=$('#rsvpSavedStatus');
    saved.hidden=!own;
    saved.textContent=own?[!configured?'Your RSVP is saved on this device.':ready.rsvps?'Your RSVP is saved.':'Your last saved RSVP is shown here.',savedTime(own.updated_at)?'Last updated '+savedTime(own.updated_at)+'.':''].filter(Boolean).join(' '):'';
    const labels={coming:'Coming',maybe:'Maybe',declined:'Can’t make it'};
    $('#rsvpList').innerHTML=rows.length?rows.slice().sort((a,b)=>a.household_name.localeCompare(b.household_name)).map(r=>`<article class="rsvp-card"${r.user_id===who()?' data-own-rsvp':''}><span class="response-chip ${esc(r.response)}">${labels[r.response]}</span><h3>${esc(r.household_name)}${r.user_id===who()?' · you':''}</h3>${r.response!=='declined'?`<p>${r.adults} adult${r.adults===1?'':'s'} · ${r.children} child${r.children===1?'':'ren'}</p><p>Arrives: ${r.arrival_date?esc(dateText(r.arrival_date))+(r.arrival_time?' · '+esc(clock(r.arrival_time))+' CT':''):'To be confirmed'}</p><p class="rsvp-departure">Departs: ${r.departure_date?esc(dateText(r.departure_date))+(r.departure_time?' · '+esc(clock(r.departure_time))+' CT':''):'To be confirmed'}</p>${r.dietary_needs?`<p><strong>Food allergies / dietary needs:</strong> ${esc(r.dietary_needs)}</p>`:''}`:''}${r.note?`<p>${esc(r.note)}</p>`:''}</article>`).join(''):(!configured||isShared&&ready.rsvps)?'<p class="feature-empty">Be the first to let the family know your plans.</p>':'';
    const ownCard=$('#rsvpList [data-own-rsvp]');
    if(ownCard)(ownCard.querySelector('.rsvp-departure')||ownCard.querySelector('h3')).after(saved);
    else $('#rsvpList').append(saved);
  }
  function openRsvp(){
    if(!guard('rsvps'))return;
    const own=state.rsvps.find(r=>r.user_id===who()),r=own||{response:'coming',adults:1,children:0};
    openModal(`<h3 id="modalTitle">Your family RSVP</h3><p>Count everyone in your household, including yourself. Arrival and departure times are Central.</p><form id="rsvpForm">${field('rsvpName','Your name or household name','text',r.household_name,'required maxlength="75"')}<div class="form-field"><label for="rsvpResponse">Will you join us?</label><select id="rsvpResponse"><option value="coming">Coming</option><option value="maybe">Maybe</option><option value="declined">Can’t make it</option></select></div><div id="rsvpTravel"><div class="form-grid">${field('rsvpAdults','Adults (including you)','number',r.adults,'min="0" max="50" required')}${field('rsvpChildren','Children','number',r.children,'min="0" max="50" required')}${field('rsvpArrival','Arrival date','date',r.arrival_date)}${field('rsvpArrivalTime','Arrival time (optional, Central)','time',r.arrival_time?.slice(0,5))}${field('rsvpDeparture','Departure date','date',r.departure_date)}${field('rsvpDepartureTime','Departure time (optional, Central)','time',r.departure_time?.slice(0,5))}</div><div class="form-field"><label for="rsvpDietary">Food allergies or dietary needs (optional)</label><textarea id="rsvpDietary" maxlength="250" rows="2" aria-describedby="rsvpDietaryHelp" placeholder="For example, a nut allergy or vegetarian meals">${esc(r.dietary_needs||'')}</textarea><p id="rsvpDietaryHelp" class="helper">Visible to joined family members to help plan the meal.</p></div></div><div class="form-field"><label for="rsvpNote">Anything the family should know? (optional)</label><textarea id="rsvpNote" maxlength="250" rows="2">${esc(r.note||'')}</textarea></div>${formTail}${own?'<button type="button" class="btn ghost small" id="removeRsvp">Remove my RSVP</button>':''}</form>`);
    $('#rsvpResponse').value=r.response;
    const update=()=>{$('#rsvpTravel').hidden=$('#rsvpResponse').value==='declined';$('#rsvpTravel').querySelectorAll('input,textarea').forEach(el=>el.disabled=$('#rsvpTravel').hidden);};update();$('#rsvpResponse').addEventListener('change',update);
    const form=$('#rsvpForm');
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!guard('rsvps'))return;
      const response=$('#rsvpResponse').value,declined=response==='declined',adults=declined?0:Number($('#rsvpAdults').value),children=declined?0:Number($('#rsvpChildren').value);
      const arrival_date=declined?null:$('#rsvpArrival').value||null,departure_date=declined?null:$('#rsvpDeparture').value||null,arrival_time=declined?null:$('#rsvpArrivalTime').value||null,departure_time=declined?null:$('#rsvpDepartureTime').value||null;
      if(!$('#rsvpName').value.trim())return formError('Please enter your household name.');
      if(!declined&&(adults+children<1||adults+children>50))return formError('Include between 1 and 50 guests, counting yourself.');
      if(arrival_time&&!arrival_date||departure_time&&!departure_date)return formError('Add the date for each travel time.');
      if(arrival_date&&departure_date&&(departure_date<arrival_date||departure_date===arrival_date&&arrival_time&&departure_time&&departure_time<arrival_time))return formError('Departure cannot be before arrival.');
      const row={event_id:eventId,user_id:who(),household_name:$('#rsvpName').value.trim(),response,adults,children,arrival_date,arrival_time,departure_date,departure_time,note:$('#rsvpNote').value.trim(),dietary_needs:declined?'':$('#rsvpDietary').value.trim()};
      submitForm(form,async()=>{
        if(!isShared)return saveLocal('rsvps',state.rsvps.filter(x=>x.user_id!==row.user_id).concat({...row,updated_at:new Date().toISOString()}));
        const [saved]=await changed(sb.from(config.rsvps.table).upsert(row,{onConflict:'event_id,user_id'}).select(config.rsvps.columns));
        if(current(row.user_id))state.rsvps=state.rsvps.filter(x=>x.user_id!==row.user_id).concat(saved);
      },'rsvps','Your RSVP is saved.');
    });
    $('#removeRsvp')?.addEventListener('click',()=>{if(!guard('rsvps'))return;const user=who();submitForm(form,async()=>{
      if(!isShared)return saveLocal('rsvps',state.rsvps.filter(r=>r.user_id!==user));
      await changed(sb.from(config.rsvps.table).delete().eq('event_id',eventId).eq('user_id',user).select('user_id'));
      if(current(user))state.rsvps=state.rsvps.filter(r=>r.user_id!==user);
    },'rsvps','Your RSVP has been removed.',false);});
  }
  function renderFootball(){
    $('#nflGamesList').innerHTML=football.map(p=>`<article class="schedule-entry football" data-plan-id="${p.id}"><div class="schedule-time">${esc(clock(p.start_time))} CT</div><div><h3>${esc(p.title)}</h3><p>${esc(p.network)}</p></div></article>`).join('');
  }
  function gameKey(g){return g.id||builtinKeys[g.name];}
  function renderGames(){
    const rows=(!configured||isShared)?state.votes:[];
    const list=games.filter(gameInLineup).map((g,i)=>({...g,key:gameKey(g),order:i,count:rows.filter(v=>v.game_key===gameKey(g)).length}));
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
      if(isShared){if(own)await changed(sb.from(config.votes.table).delete().eq('event_id',eventId).eq('game_key',key).eq('user_id',user).select('game_key'));else{await checked(sb.from(config.votes.table).insert({event_id:eventId,game_key:key,user_id:user}));playSavedSound(user);}if(current(user))await refreshGroup('votes');}
      else saveLocal('votes',own?state.votes.filter(v=>!(v.game_key===key&&v.user_id===user)):state.votes.concat({game_key:key,user_id:user}));
      if(current(user))notify(own?'Your vote was removed.':'Your vote is saved.');
    }catch(error){console.error(error);if(current(user))notify('Could not change your vote. Refresh and try again.');}
    finally{busy.delete(tag);renderGames();if(current(user))document.querySelector(`[data-vote="${CSS.escape(key)}"]`)?.focus({preventScroll:true});}
  }
  const extra=document.createElement('div');extra.id='photoExtras';extra.className='photo-extra';$('#photoCaption').after(extra);
  const photoInfo=photo=>{const detail=state.details.find(d=>d.photo_id===photo?.id);return {caption:detail?detail.caption:photo?.caption||''};};
  function renderPhoto(){
    const photo=photos[slideIndex];extra.hidden=!photo;
    if(!photo){extra.innerHTML='';if(tvOpen)closeTv();return;}
    const info=photoInfo(photo),own=state.reactions.find(r=>r.photo_id===photo.id&&r.user_id===who());
    $('#photoCaption').textContent=info.caption||'A little family love.';
    $('#memoryFrame .active-photo')?.setAttribute('alt',info.caption||`Family photo ${slideIndex+1}`);
    extra.innerHTML=`<div class="photo-reactions">${[['heart','❤️','Love'],['laugh','😄','Laugh'],['clap','👏','Applause']].map(([key,emoji,label])=>`<button type="button" data-react="${key}" aria-label="${label}" aria-pressed="${own?.reaction===key}" ${!photo.id||busy.has('reaction')||configured&&isShared&&!ready.reactions?'disabled':''}>${emoji} ${state.reactions.filter(r=>r.photo_id===photo.id&&r.reaction===key).length}</button>`).join('')}</div><div class="photo-extra-actions"><button class="btn secondary small" type="button" id="editPhotoDetails" ${!photo.id||configured&&isShared&&!ready.details?'disabled':''}>Edit caption</button><button class="btn secondary small" type="button" id="startTv">TV slideshow ↗</button></div><p class="helper">${esc(showStatus('details','photo captions')||showStatus('reactions','photo reactions'))}</p>`;
    $('#editPhotoDetails').addEventListener('click',()=>openPhotoDetails(photo.id));$('#startTv').addEventListener('click',openTv);
    if(tvOpen)renderTv();
  }
  function openPhotoDetails(id){
    if(!guard('details'))return;const photo=photos.find(p=>p.id===id);if(!photo)return;const info=photoInfo(photo);
    openModal(`<h3 id="modalTitle">Edit photo caption</h3><p>Add a few words about this memory. Family members can update the caption.</p><form id="photoDetailsForm">${field('photoDetailCaption','Caption','text',info.caption,'maxlength="150"')}${formTail}</form>`);
    const form=$('#photoDetailsForm');form.addEventListener('submit',event=>{
      event.preventDefault();if(!guard('details'))return;
      const row={event_id:eventId,photo_id:id,caption:$('#photoDetailCaption').value.trim(),edited_by:who()};
      submitForm(form,()=>isShared?checked(sb.from(config.details.table).upsert(row,{onConflict:'photo_id'})):saveLocal('details',state.details.filter(d=>d.photo_id!==id).concat(row)),'details','Photo caption is saved.');
    });
  }
  async function react(reaction){
    if(!guard('reactions')||busy.has('reaction'))return;const photo=photos[slideIndex];if(!photo?.id)return;
    const user=who(),own=state.reactions.find(r=>r.photo_id===photo.id&&r.user_id===user),remove=own?.reaction===reaction;
    busy.add('reaction');renderPhoto();
    try{
      const row={photo_id:photo.id,event_id:eventId,user_id:user,reaction};
      if(isShared){if(remove)await changed(sb.from(config.reactions.table).delete().eq('event_id',eventId).eq('photo_id',photo.id).eq('user_id',user).select('photo_id'));else{await checked(sb.from(config.reactions.table).upsert(row,{onConflict:'photo_id,user_id'}));playSavedSound(user);}if(current(user))await refreshGroup('reactions');}
      else saveLocal('reactions',state.reactions.filter(r=>!(r.photo_id===photo.id&&r.user_id===user)).concat(remove?[]:[row]));
      if(current(user))notify(remove?'Reaction removed.':'Reaction saved.');
    }catch(error){console.error(error);if(current(user))notify('Could not save your reaction. Please try again.');}
    finally{busy.delete('reaction');renderPhoto();if(current(user))extra.querySelector(`[data-react="${reaction}"]`)?.focus({preventScroll:true});}
  }
  function renderTv(){
    const photo=photos[slideIndex];if(!photo)return;const info=photoInfo(photo);
    if($('#tvImage').getAttribute('src')!==photo.url)$('#tvImage').src=photo.url;
    $('#tvImage').alt=info.caption||`Family photo ${slideIndex+1}`;$('#tvCaption').textContent=info.caption;
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
  function render(){renderRsvps();renderFootball();renderGames();renderPhoto();}
  $('#editRsvpBtn').addEventListener('click',openRsvp);
  $('#gameSort').addEventListener('change',renderGames);
  $('#refreshRsvpsBtn').addEventListener('click',()=>{if(assertFamilyAccess())refresh();});
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
