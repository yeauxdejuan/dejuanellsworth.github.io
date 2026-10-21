// Synthetic shared HTTP fixtures. External hosts are mocked; no production data is touched.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const root=new URL('../',import.meta.url);
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#d6a34a"/><path d="M0 600 600 100 1200 600" fill="#b65a32"/></svg>';
const image='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
const tables={thanksgiving_dishes:[],thanksgiving_games:[],thanksgiving_tiktoks:[],thanksgiving_photos:[],thanksgiving_rsvps:[],thanksgiving_schedule:[
 {id:'00000000-2026-4000-8000-000000000001',event_id:'ellsworth-thanksgiving-2026',title:'Thanksgiving dinner',day:'2026-11-26',kind:'dinner',is_seed:true,start_time:null},
 {id:'00000000-2026-4000-8000-000000000002',event_id:'ellsworth-thanksgiving-2026',title:'Family game night',day:'2026-11-26',kind:'games',is_seed:true,start_time:null}
],thanksgiving_game_votes:[],thanksgiving_photo_details:[],thanksgiving_photo_reactions:[]};
let failClaim=false,holdClaim=null,failWriteTable=null,failReadTable=null,uploads=0,checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const stub=`window.supabase={createClient(){
const session=()=>JSON.parse(localStorage.getItem('testSession')||'null');
const request=async(body)=>{try{return await (await fetch('/__test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,user:session()?.user.id})})).json();}catch{return {data:null,error:{message:'Network error'}};}};
return {auth:{async getSession(){return {data:{session:session()},error:null};},async signInAnonymously(){const s={user:{id:crypto.randomUUID()}};localStorage.setItem('testSession',JSON.stringify(s));return {data:{session:s},error:null};},async signOut(){localStorage.removeItem('testSession');localStorage.removeItem('testMember');return {error:null};}},
async rpc(name,args){if(name==='is_ellsworth_member')return {data:localStorage.getItem('testMember')==='yes',error:null};if(name==='join_ellsworth_family'){localStorage.setItem('testMember','yes');return {data:true,error:null};}return request({operation:'rpc',args});},
from(table){let operation='select',value=null,filters=[],conflict=null;const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},insert(v){operation='insert';value=v;return q;},upsert(v,options){operation='upsert';value=v;conflict=options?.onConflict;return q;},update(v){operation='update';value=v;return q;},delete(){operation='delete';return q;},then(ok,bad){return request({operation,table,value,filters,conflict}).then(ok,bad);}};return q;},
storage:{from(){return {async upload(){return request({operation:'upload'});},async createSignedUrl(){return {data:{signedUrl:${JSON.stringify(image)}},error:null};}};}}};}};`;
const server=createServer(async(req,res)=>{
try{
 if(req.url==='/__test'){
  let text='';for await(const c of req)text+=c;const b=JSON.parse(text);let data=null,error=null;
  if((b.table===failWriteTable&&['insert','upsert','update','delete'].includes(b.operation))||(b.table===failReadTable&&b.operation==='select')){
   if(b.operation==='select')failReadTable=null;else failWriteTable=null;
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{message:'Synthetic planning failure'}}));return;
  }
  if(b.operation==='rpc'){
   if(holdClaim){const wait=holdClaim;holdClaim=null;await wait;}
   if(failClaim){failClaim=false;error={message:'Synthetic failure'};}
   else{const a=b.args;let d=tables.thanksgiving_dishes.find(d=>d.id===a.p_id);
    if(!d){d={id:a.p_id,label:a.p_label,category:a.p_category,event_id:a.p_event_id,note:null,signups:[]};tables.thanksgiving_dishes.push(d);}
    const own=d.signups.find(s=>s.user_id===b.user);
    if(a.p_action==='release'){data=own?'removed':'not_assigned';d.signups=d.signups.filter(s=>s!==own);}
    else if(a.p_action==='update'){data=own?'updated':'not_assigned';if(own)Object.assign(own,{assignee:a.p_assignee,note:a.p_note});}
    else if(own)data='already_assigned';else if(d.signups.length===3)data='full';
    else{d.signups.push({slot:[1,2,3].find(n=>!d.signups.some(s=>s.slot===n)),user_id:b.user,assignee:a.p_assignee,note:a.p_note});data='claimed';}
   }
  }else if(b.operation==='upload'){uploads++;data={path:'synthetic.jpg'};}
  else if(b.operation==='insert'){const row={...b.value,id:b.value.id||crypto.randomUUID()};if(b.table==='thanksgiving_dishes')row.signups=[];if(b.table==='thanksgiving_schedule'){row.created_by=b.user;row.is_seed=false;}tables[b.table].push(row);data=[row];}
  else if(b.operation==='upsert'){const keys=b.conflict.split(',');const row=tables[b.table].find(r=>keys.every(k=>r[k]===b.value[k]));if(row){Object.assign(row,b.value);data=[row];}else{tables[b.table].push({...b.value});data=[b.value];}}
  else if(b.operation==='update'){data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));data.forEach(row=>Object.assign(row,b.value));}
  else if(b.operation==='delete'){data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));tables[b.table]=tables[b.table].filter(row=>!data.includes(row));}
  else data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error}));return;
 }
 const path=req.url==='/'?'index.html':req.url.slice(1).split('?')[0];
 if(!['index.html','assets/autumn-leaf.svg','assets/family-features.js','assets/family-features.css'].includes(path)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',path.endsWith('svg')?'image/svg+xml':path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL(path,root)));
}catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
const errors=[];
async function newPage(width=1440,options={}){
 const {localPreview=false,...contextOptions}=options;
 const context=await browser.newContext({viewport:{width,height:1000},...contextOptions});
 await context.route('**/*',async route=>{
  const u=route.request().url();if(localPreview&&u===url+'/'){const html=(await readFile(new URL('index.html',root),'utf8')).replace(/url: 'https:\/\/[^']+\.supabase.co'/,"url: ''");return route.fulfill({contentType:'text/html',body:html});}
  if(u.startsWith(url)||u.startsWith('data:'))return route.continue();
  if(u.includes('/supabase.min.js'))return route.fulfill({contentType:'application/javascript',body:stub});
  if(u.startsWith('https://a0.muscache.com')||u.startsWith('https://example.test'))return route.fulfill({contentType:'image/svg+xml',body:svg});
  if(u.startsWith('https://fonts.'))return route.fulfill({contentType:'text/css',body:''});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock external media</title>'});
 });
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);return p;
}
async function join(p){await p.locator('#familyPortal').waitFor({state:'visible'});await p.fill('#familyCode','synthetic-test-code-only-2026');await p.click('#joinFamilyBtn');await p.waitForFunction(()=>isShared&&menuReady);}
async function signup(p,name,dish='mac'){await p.locator(`[data-dish-id="${dish}"]`).click();await p.fill('#claimName',name);await p.fill('#claimNote','Synthetic test note');await p.locator('#claimForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});}
async function checkRequestedLayout(p){
 check(await p.locator('#nfl-games').evaluate(el=>el===document.querySelector('main').lastElementChild),'NFL Games is the final app section');
 check((await p.locator('#nfl-games h2').innerText()).trim()==='NFL Games.','Football heading is NFL Games');
 check(!(await p.locator('main').innerText()).toLowerCase().includes('weekend together'),'Weekend together wording removed');
 check(await p.locator('#nfl-games .football').count()===3,'Only the three Thursday games are shown');
 check(await p.locator('#weekend .football').count()===0,'Football is separate from editable family plans');
 check(!(await p.locator('#nfl-games').innerText()).match(/Packers|Broncos|Saints|Friday|Sunday/),'Non-Thursday games excluded');
 check(JSON.stringify(await p.locator('#gamesGrid .game-card').evaluateAll(cards=>cards.map(c=>c.dataset.gameKey)))===JSON.stringify(['builtin-spades','builtin-uno','builtin-name-that-tune']),'Remaining game IDs retain their original vote keys');
 check(!(await p.locator('#gamesGrid').innerText()).match(/Charades|Family Feud|Dominoes/),'Removed games are absent from the lineup');
 check(await p.evaluate(()=>AIRBNB_PHOTOS.length===8&&new Set(AIRBNB_PHOTOS).size===8),'Eight distinct selected listing URLs');
 check(await p.evaluate(()=>AIRBNB_PHOTO_DETAILS.every(p=>/^(Living area|Exterior|Patio|Backyard) image \d+$/.test(p.label))),'Gallery is limited to exterior and main living-area photos');
 check(await p.locator('[data-house-photo]').count()===8,'Every selected property photo has a thumbnail');
}
async function checkInvitationRouting(p){
 let pickers=0;const onPicker=()=>pickers++;p.on('filechooser',onPicker);
 const expectCode=async label=>{
  check(await p.locator('#familyPortal').evaluate(el=>el===document.activeElement),`${label} focuses invitation instructions without activating an input`);
  await p.waitForFunction(()=>{const portal=document.querySelector('#familyPortal'),r=document.querySelector('#familyPortalTitle').getBoundingClientRect();return Math.abs(portal.getBoundingClientRect().top-parseFloat(getComputedStyle(portal).scrollMarginTop))<1&&r.top>=80&&r.bottom<=innerHeight;});
  check(await p.locator('#modalBackdrop').isHidden(),`${label} leaves contribution forms closed`);
 };
 for(const label of await p.locator('label[for="photoUpload"]').all()){
  await label.click();await expectCode('Photo picker click');
  for(const key of ['Enter','Space']){await label.evaluate(el=>el.focus({preventScroll:true}));await label.press(key);await expectCode(`Photo picker ${key}`);}
 }
 check(pickers===0,'Logged-out photo actions never open the file picker');p.off('filechooser',onPicker);
 await p.click('#addPhotoUrlBtn');await expectCode('Photo link');
 await p.click('#addGameBtn');await expectCode('Game suggestion');
 for(const [selector,label] of [['#editRsvpBtn','RSVP'],['#addScheduleBtn','Weekend plan'],['[data-vote="builtin-spades"]','Game vote']]){await p.click(selector);await expectCode(label);}
 for(const value of ['', 'not-a-url', 'https://www.tiktok.com/@test/video/1234567890123456789']){
  await p.fill('#tikUrl',value);await p.locator('#tikForm button').click();await expectCode(`TikTok button with ${value?'entered':'empty'} URL`);
 }
 await p.fill('#tikUrl','');await p.locator('#tikUrl').scrollIntoViewIfNeeded();await p.locator('#tikUrl').press('Enter');await expectCode('TikTok keyboard submit');
 check(uploads===0&&tables.thanksgiving_photos.length===0&&tables.thanksgiving_tiktoks.length===0&&tables.thanksgiving_games.length===0,'Logged-out attempts do not save contributions');
}
async function checkFamilyPlanning(a,b){
 await a.click('#editRsvpBtn');await a.fill('#rsvpName','Synthetic household A');await a.fill('#rsvpAdults','2');await a.fill('#rsvpChildren','1');
 await a.fill('#rsvpArrival','2026-11-25');await a.fill('#rsvpArrivalTime','18:30');await a.fill('#rsvpDeparture','2026-11-24');
 await a.locator('#rsvpForm button[type=submit]').click();check((await a.locator('#featureFormError').innerText()).includes('Departure'),'RSVP rejects departure before arrival');check(tables.thanksgiving_rsvps.length===0,'Invalid RSVP not sent');
 await a.fill('#rsvpDeparture','2026-11-29');await a.fill('#rsvpDepartureTime','10:00');failWriteTable='thanksgiving_rsvps';await a.locator('#rsvpForm button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#featureFormError').textContent.includes('Could not save'));
 check(await a.locator('#modalBackdrop').isVisible()&&tables.thanksgiving_rsvps.length===0,'Failed RSVP stays open without success');
 await a.locator('#rsvpForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 check((await a.locator('#rsvpSummary').innerText()).includes('3\nconfirmed guests'),'RSVP counts household adults and children');check((await a.locator('#rsvpList').innerText()).includes('6:30 PM CT'),'RSVP shows Central arrival time');
 await b.click('#refreshPlanningBtn');await b.waitForFunction(()=>document.querySelector('#rsvpList').textContent.includes('Synthetic household A'));check((await b.locator('#editRsvpBtn').innerText()).includes('Add'),'Second member can add only their own RSVP');
 await b.click('#editRsvpBtn');await b.fill('#rsvpName','Synthetic household B');await b.selectOption('#rsvpResponse','maybe');await b.fill('#rsvpAdults','2');await b.locator('#rsvpForm button[type=submit]').click();await b.locator('#modalBackdrop').waitFor({state:'hidden'});
 await a.click('#refreshPlanningBtn');await a.waitForFunction(()=>document.querySelector('#rsvpSummary').textContent.includes('2possibly joining'));check(tables.thanksgiving_rsvps.length===2,'Independent household RSVPs coexist');
 await a.click('#editRsvpBtn');await a.selectOption('#rsvpResponse','declined');await a.locator('#rsvpForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_rsvps.find(r=>r.household_name.endsWith('A')).adults===0,'Declined RSVP contributes no guests');
 await a.click('#editRsvpBtn');await a.click('#removeRsvp');await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_rsvps.length===1,'Own RSVP can be removed');
 const dinner='00000000-2026-4000-8000-000000000001';await a.locator(`[data-edit-plan="${dinner}"]`).click();await a.fill('#planStart','16:00');await a.locator('#scheduleForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 await b.click('#refreshPlanningBtn');await b.waitForFunction(()=>document.querySelector('[data-plan-id="00000000-2026-4000-8000-000000000001"]').textContent.includes('4:00 PM CT'));check((await a.locator('[data-plan-id="00000000-2026-4000-8000-000000000002"]').innerText()).includes('Time to be confirmed'),'Family game-night time remains undecided');
 await a.click('#addScheduleBtn');await a.fill('#planTitle','Synthetic family walk');await a.fill('#planDay','2026-11-27');await a.selectOption('#planKind','outing');await a.fill('#planStart','11:00');await a.fill('#planEnd','10:00');await a.locator('#scheduleForm button[type=submit]').click();check((await a.locator('#featureFormError').innerText()).includes('after the start'),'Schedule rejects reversed times');
 await a.fill('#planEnd','12:00');await a.locator('#scheduleForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});const plan=tables.thanksgiving_schedule.find(p=>p.title==='Synthetic family walk');check(Boolean(plan),'Custom family plan saved');
 await b.click('#refreshPlanningBtn');await b.waitForFunction(()=>document.querySelector('#scheduleList').textContent.includes('Synthetic family walk'));check(await b.locator(`[data-edit-plan="${plan.id}"]`).count()===0,'Other member cannot edit a custom plan');
 check(await a.locator('#nfl-games .schedule-entry').count()===3,'Final NFL section shows Thursday games');check((await a.locator('[data-plan-id="nfl-chiefs-bills"]').innerText()).includes('7:20 PM CT'),'NFL kickoff stays in Central');check(await a.locator('#nfl-games [data-edit-plan]').count()===0,'Official football entries are read-only');
 check(await a.locator('#scheduleList .football').count()===0,'Family plans remain separate from NFL games');
 await a.locator(`[data-edit-plan="${plan.id}"]`).click();await a.click('#removePlan');await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(!tables.thanksgiving_schedule.some(p=>p.id===plan.id),'Own custom plan can be removed');
 const vote='[data-vote="builtin-spades"]';await a.locator(vote).click();await a.waitForFunction(()=>document.querySelector('[data-vote="builtin-spades"]').getAttribute('aria-pressed')==='true');
 await b.locator(vote).click();await b.waitForFunction(()=>document.querySelector('[data-vote="builtin-spades"]').getAttribute('aria-pressed')==='true');await a.click('#refreshPlanningBtn');await a.waitForFunction(()=>document.querySelector('[data-game-key="builtin-spades"]').textContent.includes('2 votes'));check(tables.thanksgiving_game_votes.length===2,'Two members vote independently for a game');
 await a.locator('[data-vote="builtin-uno"]').click();await a.waitForFunction(()=>document.querySelector('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true');check(await a.locator('#gamesGrid .game-card').first().getAttribute('data-game-key')==='builtin-spades','Most popular games sort first');
 await a.locator(vote).click();await a.waitForFunction(()=>document.querySelector('[data-vote="builtin-spades"]').getAttribute('aria-pressed')==='false');check(tables.thanksgiving_game_votes.filter(v=>v.game_key==='builtin-spades').length===1,'Removing vote preserves another member’s vote');
 failWriteTable='thanksgiving_game_votes';await a.locator('[data-vote="builtin-name-that-tune"]').click();await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not change'));check(await a.locator('[data-vote="builtin-name-that-tune"]').getAttribute('aria-pressed')==='false','Failed vote not shown as saved');
 const photoId=await a.evaluate(()=>photos[slideIndex].id);await a.click('#editPhotoDetails');await a.fill('#photoDetailCaption','Family <together>');await a.fill('#photoPeople','Test cook A & <Test cook B>');await a.fill('#photoDate','2024-11-28');await a.locator('#photoDetailsForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 check(await a.locator('#photoCaption').innerText()==='Family <together>','Caption displays as text');check((await a.locator('.photo-people').innerText()).includes('Test cook A & <Test cook B>'),'Photo names displayed safely');check(await a.locator('.photo-people img').count()===0,'Photo metadata cannot inject markup');
 await b.evaluate(()=>refreshPhotos());await b.click('#refreshPlanningBtn');await b.waitForFunction(()=>familyFeatures&&photos.length===2);await b.evaluate(id=>{slideIndex=photos.findIndex(p=>p.id===id);renderPhotos();},photoId);await b.waitForFunction(()=>document.querySelector('#photoCaption').textContent==='Family <together>');check((await b.locator('.photo-people').innerText()).includes('Nov 28'),'Photo metadata shared across sessions');
 await a.locator('[data-react="heart"]').click();await a.waitForFunction(()=>document.querySelector('[data-react="heart"]').getAttribute('aria-pressed')==='true');await b.locator('[data-react="clap"]').click();await b.waitForFunction(()=>document.querySelector('[data-react="clap"]').getAttribute('aria-pressed')==='true');
 await a.locator('[data-react="laugh"]').click();await a.waitForFunction(()=>document.querySelector('[data-react="laugh"]').getAttribute('aria-pressed')==='true');check(tables.thanksgiving_photo_reactions.length===2,'Changing reaction replaces own reaction without duplicating it');await a.locator('[data-react="laugh"]').click();await a.waitForFunction(()=>document.querySelector('[data-react="laugh"]').getAttribute('aria-pressed')==='false');check(tables.thanksgiving_photo_reactions.length===1,'Removing reaction preserves another member’s reaction');
 if(await a.evaluate(()=>document.fullscreenEnabled)){await a.click('#startTv');await a.waitForFunction(()=>document.fullscreenElement?.id==='tvSlideshow');check(await a.evaluate(()=>document.fullscreenElement.id)==='tvSlideshow','Native fullscreen opens');await a.click('#tvExit');await a.waitForFunction(()=>!document.fullscreenElement);check(await a.locator('#tvSlideshow').isHidden(),'Native fullscreen exits cleanly');}
 await a.evaluate(()=>{document.querySelector('#tvSlideshow').requestFullscreen=()=>Promise.reject(new Error('Synthetic fullscreen unavailable'));});await a.click('#startTv');check(await a.locator('#tvSlideshow').isVisible(),'TV slideshow works when native fullscreen is unavailable');check(await a.locator('#tvCaption').innerText()==='Family <together>','TV slideshow includes photo caption');check((await a.locator('#tvPeople').innerText()).includes('Test cook A'),'TV slideshow includes people and date');check((await a.locator('#tvPeople').innerText()).includes('2024'),'Historical photo date includes the year');
 const previous=await a.locator('#tvCount').innerText();await a.click('#tvNext');check(await a.locator('#tvCount').innerText()!==previous,'TV slideshow advances');await a.keyboard.press('ArrowLeft');check(await a.locator('#tvCount').innerText()===previous,'TV slideshow keyboard navigation');
 await a.click('#tvPause');check((await a.locator('#tvPause').innerText()).includes('Pause'),'TV slideshow play control');const beforeAuto=await a.locator('#tvCount').innerText();await a.waitForFunction(previous=>document.querySelector('#tvCount').textContent!==previous,beforeAuto,{timeout:8000});check(await a.locator('#tvCount').innerText()!==beforeAuto,'TV slideshow advances automatically');await a.click('#tvPause');check((await a.locator('#tvPause').innerText()).includes('Play'),'TV slideshow pause control');
 await a.keyboard.press('Escape');check(await a.locator('#tvSlideshow').isHidden(),'Escape exits TV slideshow');check(await a.locator('#startTv').evaluate(el=>el===document.activeElement),'TV slideshow restores focus after changing photos');
 failReadTable='thanksgiving_rsvps';await a.click('#refreshPlanningBtn');await a.waitForFunction(()=>document.querySelector('#rsvpStatus').textContent.includes('Could not load'));check(await a.locator('#editRsvpBtn').isDisabled(),'Failed RSVP refresh disables writes');await a.click('#refreshPlanningBtn');await a.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled);
 await a.reload();await a.waitForFunction(()=>isShared&&menuReady);await a.waitForFunction(()=>document.querySelector('#rsvpList').textContent.includes('Synthetic household B'));check((await a.locator('#rsvpList').innerText()).includes('Synthetic household B'),'Shared plans survive page reload');
 for(const width of [375,430,768,1024,1440]){await a.setViewportSize({width,height:1000});check(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Populated family features fit at ${width}px`);if(width===375||width===1440){await a.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await a.screenshot({animations:'disabled',path:new URL(`artifacts/features-${width}.png`,import.meta.url).pathname,fullPage:true});}}
}
async function checkLocalPlanning(){
 const p=await newPage(430,{localPreview:true});await p.evaluate(()=>localStorage.setItem('thanksgiving26_games',JSON.stringify([...games,{name:'Charades'},{name:'Family Feud'},{name:'Dominoes'}])));await p.reload();check(!(await p.locator('#gamesGrid').innerText()).match(/Charades|Family Feud|Dominoes/),'Returning local previews hide removed games');check(await p.locator('[data-vote="builtin-name-that-tune"]').count()===1,'Legacy preview keeps Name That Tune vote key');await p.click('#editRsvpBtn');await p.fill('#rsvpName','Local preview household');await p.locator('#rsvpForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});
 await p.locator('[data-vote="builtin-uno"]').click();await p.waitForFunction(()=>document.querySelector('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true');await p.reload();
 check((await p.locator('#rsvpList').innerText()).includes('Local preview household'),'Local preview RSVP persists');check(await p.locator('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true','Local preview vote persists');check((await p.locator('#rsvpStatus').innerText()).includes('Preview'),'Local data is labeled as device-only');await p.context().close();
}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const mobile=await newPage(375,{isMobile:true,hasTouch:true});await checkInvitationRouting(mobile);await mobile.context().close();
 const a=await newPage();await checkRequestedLayout(a);await checkInvitationRouting(a);await join(a);
 await a.locator('#tikForm button').click();check(await a.locator('#tikUrl').evaluate(el=>el===document.activeElement&&!el.validity.valid),'Joined TikTok form still validates empty URLs');
 let release;holdClaim=new Promise(r=>release=r);await a.locator('[data-dish-id="mac"]').click();await a.fill('#claimName','Test cook A');await a.locator('#claimForm button[type=submit]').click();
 check(!(await a.locator('#toast').innerText()).includes('sign-up is saved'),'No success before database confirmation');check(await a.locator('#claimForm button[type=submit]').isDisabled(),'Double submission disabled');release();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 check((await a.locator('[data-dish-id="mac"]').locator('..').innerText()).includes('1/3 assigned'),'First signup count');
 const b=await newPage(430,{timezoneId:'Asia/Tokyo'});await join(b);await signup(b,'Test cook B');await a.click('#refreshMenuBtn');await a.waitForFunction(()=>combinedMenu().find(d=>d.id==='mac').signups.length===2);
 check((await a.locator('#dishBoard').innerText()).includes('Test cook B'),'Independent sessions synchronize');
 const c=await newPage(375);await join(c);await signup(c,'Test cook C');const d=await newPage(768);await join(d);check(await d.locator('[data-dish-id="mac"]').isDisabled(),'Fourth account sees Full');
 await a.click('#refreshMenuBtn');await a.locator('[data-dish-id="mac"]').click();await a.click('#releaseDish');await a.locator('#modalBackdrop').waitFor({state:'hidden'});await d.click('#refreshMenuBtn');await d.waitForFunction(()=>!document.querySelector('[data-dish-id="mac"]').disabled);await signup(d,'Test cook D');check(tables.thanksgiving_dishes.find(d=>d.id==='mac').signups.length===3,'Released slot reclaimed');
 failClaim=true;await a.locator('[data-dish-id="ham"]').click();await a.fill('#claimName','Test failure');await a.locator('#claimForm button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not save'));check(await a.locator('#modalBackdrop').isVisible(),'Failure keeps form open');await a.click('#modalClose');
 await a.click('#addDishBtn');await a.fill('#newDishName','Test custom dish');await a.locator('#dishForm button').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_dishes.some(d=>d.label==='Test custom dish'),'Custom dish saved');
 await a.reload();await a.waitForFunction(()=>isShared&&menuReady);check(await a.locator('#familyPortal').isHidden(),'Mock session restores');
 tables.thanksgiving_dishes.push({event_id:'ellsworth-thanksgiving-2026',id:'long',label:'L'.repeat(90),category:'Other family favorites',signups:[{slot:1,user_id:'fixture',assignee:'N'.repeat(75),note:'X'.repeat(130)}]});await a.click('#refreshMenuBtn');await a.waitForFunction(()=>combinedMenu().some(d=>d.id==='long'));
 await mkdir(new URL('artifacts/',import.meta.url),{recursive:true});
 for(const width of [375,430,768,1024,1440]){await a.setViewportSize({width,height:1000});check(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow at ${width}px`);await a.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await a.screenshot({animations:'disabled',path:new URL(`artifacts/${width}.png`,import.meta.url).pathname,fullPage:true});}
 await a.setViewportSize({width:375,height:1000});await a.locator('#houseMorePhotos summary').click();await a.locator('[data-house-photo="7"]').click();check((await a.locator('#housePhotoCaption').innerText()).startsWith('8 / 8'),'Additional outdoor photo reachable');await a.keyboard.press('ArrowRight');check((await a.locator('#housePhotoCaption').innerText()).startsWith('1 / 8'),'Gallery keyboard wrap');check((await a.locator('#lightboxImage').getAttribute('alt')).includes('Exterior'),'Source room labels used in lightbox');
 await a.locator('#lightboxImage').evaluate(el=>{for(const [type,x,y] of [['touchstart',300,150],['touchend',100,155]])el.dispatchEvent(new TouchEvent(type,{changedTouches:[new Touch({identifier:1,target:el,clientX:x,clientY:y})]}));});check((await a.locator('#housePhotoCaption').innerText()).startsWith('2 / 8'),'Swipe changes photo');
 await a.keyboard.press('Tab');await a.keyboard.press('Tab');await a.keyboard.press('Tab');check(await a.locator('#lightboxClose').evaluate(el=>el===document.activeElement),'Lightbox traps focus');await a.keyboard.press('Escape');check(await a.locator('[data-house-photo="7"]').evaluate(el=>el===document.activeElement),'Lightbox restores focus');await a.locator('#houseMorePhotos summary').click();
 await a.click('#addPhotoUrlBtn');await a.fill('#photoUrl','https://example.test/synthetic.jpg');await a.fill('#photoAlt','Synthetic family photo');await a.locator('#photoUrlForm button').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_photos.length===1,'Photo link saved');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/uPgAAAAASUVORK5CYII=','base64');await a.setInputFiles('#photoUpload',{name:'synthetic.png',mimeType:'image/png',buffer:png});await a.waitForFunction(()=>photos.length===2);check(uploads===1&&tables.thanksgiving_photos.length===2,'Synthetic upload compressed and indexed');await a.click('#photoNext');check((await a.locator('#slideCount').innerText())==='2 / 2','Slideshow next');await a.click('#photoPause');
 await a.click('#addGameBtn');await a.fill('#gameName','Test game');await a.fill('#gameDesc','Synthetic description');await a.locator('#gameForm button').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_games.some(g=>g.name==='Test game'),'Game suggestion saved');
 check(await a.evaluate(()=>!parseTikTok('https://tiktok.com.evil.test/@x/video/1234567890123456789')&&!parseTikTok('http://www.tiktok.com/@x/video/1234567890123456789')&&!parseTikTok('https://www.tiktok.com/@x/video/1234567890123456789/extra')),'TikTok rejects invalid URLs');
 for(const [i,id] of ['1234567890123456789','1234567890123456790'].entries()){await a.fill('#tikUrl',`https://www.tiktok.com/@test/video/${id}?tracking=test`);await a.locator('#tikForm button').click();await a.waitForFunction(n=>tikPlaylist.length===n,i+1);}
 check(await a.locator('#tikLoad').count()===0,'No extra Play video button');check(await a.locator('#tiktokGrid iframe').count()===1,'One embedded player ready without a loading click');check((await a.locator('#tikPlayer').getAttribute('src')).includes('autoplay=0&loop=0'),'Autoplay disabled');check(await a.locator('#tikNext').isEnabled(),'Next is available before any playback');check(await a.locator('.tik-fallback').count()===0,'Blocked/unlocked fallback text removed');
 const firstSrc=await a.locator('#tikPlayer').getAttribute('src'),previousPlayer=await a.locator('#tikPlayer').elementHandle();await a.evaluate(()=>{window.retiredTikWindow=document.querySelector('#tikPlayer').contentWindow;});
 await a.click('#tikNext');check(!(await previousPlayer.evaluate(el=>el.isConnected)),'Skipping unloads previous frame');check(await a.locator('#tikPlayer').count()===1&&(await a.locator('#tikPlayer').getAttribute('src'))!==firstSrc,'Can skip without playing the current clip');check(await a.locator('#tikNext').isEnabled(),'Next clip can also be skipped immediately');check((await a.locator('#tikPlayer').getAttribute('src')).includes('autoplay=0&loop=0'),'Skipping does not autoplay the next clip');
 await a.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://www.tiktok.com',source:window.retiredTikWindow,data:{'x-tiktok-player':true,type:'onPlayerError'}})));check(!(await a.locator('#tikStatus').innerText()).includes('unavailable'),'Retired iframe messages ignored');
 await a.click('#tikNext');check(await a.locator('#tikPlayer').getAttribute('src')===firstSrc,'Skipping wraps to the first video');
 const send=async(origin,source=true)=>a.evaluate(({origin,source})=>window.dispatchEvent(new MessageEvent('message',{origin,source:source?document.querySelector('#tikPlayer').contentWindow:window,data:{'x-tiktok-player':true,type:'onPlayerError'}})),{origin,source});
 await send('https://evil.test');await send('https://www.tiktok.com',false);check(!(await a.locator('#tikStatus').innerText()).includes('unavailable'),'Wrong message origin and source ignored');
 await send('https://www.tiktok.com');check((await a.locator('#tikStatus').innerText()).includes('unavailable')&&await a.locator('#tikNext').isEnabled(),'Unavailable clips remain skippable');
 await a.evaluate(()=>document.querySelector('#tikPlayer').dataset.retained='yes');await a.evaluate(()=>refreshTiktoks());check(await a.locator('#tikPlayer').getAttribute('data-retained')==='yes','Refresh preserves player');check((await a.locator('#tikStatus').innerText()).includes('unavailable'),'Refresh preserves error feedback');await a.click('#tikNext');check(!(await a.locator('#tikStatus').innerText()).includes('unavailable'),'Skipping clears the previous clip error');
 await a.click('#menuToggle');check(await a.locator('#navLinks').isVisible(),'Mobile nav opens');await a.locator('.nav-link[href="#menu"]').click();check(await a.locator('#navLinks').isHidden(),'Mobile nav closes');
 const reduced=await newPage(430,{reducedMotion:'reduce'});check(await reduced.locator('.falling-leaves').evaluate(el=>getComputedStyle(el).display==='none'),'Reduced motion hides leaves');check(await reduced.evaluate(()=>playing===false),'Reduced motion pauses slideshow');
 await checkFamilyPlanning(a,b);await checkLocalPlanning();
 await a.click('#startTv');await a.evaluate(()=>document.querySelector('#leaveFamilyBtn').click());await a.waitForFunction(()=>!document.querySelector('#familyPortal').hidden);check(await a.locator('#familyPortal').isVisible(),'Disconnect shows family access');check(await a.locator('#tiktokGrid iframe').count()===0,'Disconnect unloads video');check(!(await a.locator('#rsvpList').innerText()).includes('Synthetic household'),'Disconnect clears private RSVPs');check(await a.locator('#photoExtras').isHidden(),'Disconnect clears photo activity');check(await a.locator('#tvSlideshow').isHidden(),'Disconnect closes an active TV slideshow');
 await a.fill('#tikUrl','');await a.locator('#tikUrl').press('Enter');check(await a.locator('#familyPortal').evaluate(el=>el===document.activeElement),'Disconnect routes away from text inputs to invitation instructions');
 check(!errors.length,`No browser exceptions: ${errors.join(', ')}`);
 console.log(`PASS: ${checks} Chromium checks at 375, 430, 768, 1024 and 1440px. Supabase/media mocked; no physical mobile-browser or live playback validation.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
