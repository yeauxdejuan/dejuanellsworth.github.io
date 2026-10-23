// Synthetic shared HTTP fixtures. External hosts are mocked; no production data is touched.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=new URL('../',import.meta.url);
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#d6a34a"/><path d="M0 600 600 100 1200 600" fill="#b65a32"/></svg>';
const image='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
const tables={thanksgiving_dishes:[],thanksgiving_games:[],thanksgiving_tiktoks:[],thanksgiving_photos:[],thanksgiving_rsvps:[],thanksgiving_schedule:[
 {id:'00000000-2026-4000-8000-000000000001',event_id:'ellsworth-thanksgiving-2026',title:'Thanksgiving dinner',day:'2026-11-26',kind:'dinner',is_seed:true,start_time:null},
 {id:'00000000-2026-4000-8000-000000000002',event_id:'ellsworth-thanksgiving-2026',title:'Family game night',day:'2026-11-26',kind:'games',is_seed:true,start_time:null}
],thanksgiving_game_votes:[],thanksgiving_photo_details:[],thanksgiving_photo_reactions:[]};
const unavailableTables=new Set(),requestedTables=new Set();
let failClaim=false,holdClaim=null,failWriteTable=null,failReadTable=null,uploads=0,checks=0,rsvpWrites=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const stub=`window.supabase={createClient(){
const session=()=>JSON.parse(localStorage.getItem('testSession')||'null');
const request=async(body)=>{try{return await (await fetch('/__test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,user:session()?.user.id})})).json();}catch{return {data:null,error:{message:'Network error'}};}};
return {auth:{async getSession(){return {data:{session:session()},error:null};},async signInAnonymously(){const s={user:{id:crypto.randomUUID()}};localStorage.setItem('testSession',JSON.stringify(s));return {data:{session:s},error:null};},async signOut(){localStorage.removeItem('testSession');localStorage.removeItem('testMember');return {error:null};}},
async rpc(name,args){if(name==='is_ellsworth_member')return {data:localStorage.getItem('testMember')==='yes',error:null};if(name==='join_ellsworth_family'){if(args.p_code==='synthetic-rejected-code-2026')return {data:false,error:null};if(args.p_code==='synthetic-network-error-2026')return {data:null,error:{message:'Synthetic connection error'}};localStorage.setItem('testMember','yes');return {data:true,error:null};}return request({operation:'rpc',args});},
from(table){let operation='select',value=null,filters=[],conflict=null;const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},insert(v){operation='insert';value=v;return q;},upsert(v,options){operation='upsert';value=v;conflict=options?.onConflict;return q;},update(v){operation='update';value=v;return q;},delete(){operation='delete';return q;},then(ok,bad){return request({operation,table,value,filters,conflict}).then(ok,bad);}};return q;},
storage:{from(){return {async upload(){return request({operation:'upload'});},async createSignedUrl(){return {data:{signedUrl:${JSON.stringify(image)}},error:null};}};}}};}};`;
const server=createServer(async(req,res)=>{
try{
 if(req.url==='/__test'){
  let text='';for await(const c of req)text+=c;const b=JSON.parse(text);let data=null,error=null;if(b.table)requestedTables.add(b.table);
  if(unavailableTables.has(b.table)){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:'PGRST205',message:'Table missing from schema cache'}}));return;}
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
  else if(b.operation==='upsert'){const value=b.table==='thanksgiving_rsvps'?{...b.value,updated_at:new Date(Date.UTC(2026,9,22,18,30)+60000*(++rsvpWrites)).toISOString()}:b.value;const keys=b.conflict.split(',');const row=tables[b.table].find(r=>keys.every(k=>r[k]===value[k]));if(row){Object.assign(row,value);data=[row];}else{tables[b.table].push({...value});data=[value];}}
  else if(b.operation==='update'){data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));data.forEach(row=>Object.assign(row,b.value));}
  else if(b.operation==='delete'){data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));tables[b.table]=tables[b.table].filter(row=>!data.includes(row));}
  else data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error}));return;
 }
 const path=req.url==='/'?'index.html':req.url.slice(1).split('?')[0];
 if(!['index.html','assets/autumn-leaf.svg','assets/family-features.js','assets/family-features.css','assets/family-sound.js','assets/i-love-it.mp3'].includes(path)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',path.endsWith('svg')?'image/svg+xml':path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':path.endsWith('.mp3')?'audio/mpeg':'text/html');res.end(await readFile(new URL(path,root)));
}catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
const errors=[];
async function newPage(width=1440,options={}){
 const {localPreview=false,staleFeatureCache=false,soundProbe=false,...contextOptions}=options;
 const context=await browser.newContext({viewport:{width,height:1000},...contextOptions});
 if(soundProbe)await context.addInitScript(mode=>{
  window.soundProbe={starts:0,stops:0,resumes:0,decodes:0,durations:[]};
  const Native=window.AudioContext;
  if(mode==='unsupported'){window.AudioContext=undefined;window.webkitAudioContext=undefined;return;}
  window.AudioContext=class extends Native{
   resume(){window.soundProbe.resumes++;return mode==='blocked'?Promise.reject(new Error('Playback blocked')):super.resume();}
   decodeAudioData(...args){return mode==='decode-error'?Promise.reject(new Error('Invalid audio')):super.decodeAudioData(...args).then(buffer=>{window.soundProbe.decodes++;return buffer;});}
   createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source);source.start=(...args)=>{if(mode==='blocked')throw new Error('Playback blocked');start(...args);window.soundProbe.starts++;window.soundProbe.durations.push(source.buffer.duration);};source.stop=(...args)=>{stop(...args);window.soundProbe.stops++;};return source;}
  };
 },soundProbe);
 await context.route('**/*',async route=>{
  const u=route.request().url();if(localPreview&&u===url+'/'){const html=(await readFile(new URL('index.html',root),'utf8')).replace(/url: 'https:\/\/[^']+\.supabase.co'/,"url: ''");return route.fulfill({contentType:'text/html',body:html});}
  if(soundProbe==='missing-file'&&u.includes('/assets/i-love-it.mp3'))return route.fulfill({status:404,body:'Not found'});
  if(soundProbe==='missing-script'&&u.includes('/assets/family-sound.js'))return route.fulfill({contentType:'application/javascript',body:''});
  // The previous release attached a listener to the now-removed Family Plans button.
  // A returning browser may still have that response cached at the unversioned URL.
  if(staleFeatureCache&&u===url+'/assets/family-features.js')return route.fulfill({contentType:'application/javascript',body:"function initFamilyFeatures(){document.querySelector('#addScheduleBtn').addEventListener('click',()=>{});}"});
  if(u.startsWith(url)||u.startsWith('data:'))return route.continue();
  if(u.includes('/supabase.min.js'))return route.fulfill({contentType:'application/javascript',body:stub});
  if(u.startsWith('https://a0.muscache.com')||u.startsWith('https://example.test'))return route.fulfill({contentType:'image/svg+xml',body:svg});
  if(u.startsWith('https://fonts.'))return route.fulfill({contentType:'text/css',body:''});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock external media</title>'});
 });
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);return p;
}
async function join(p){await p.locator('#familyPortal').waitFor({state:'visible'});await p.fill('#familyCode','synthetic-test-code-only-2026');await p.click('#joinFamilyBtn');await p.waitForFunction(()=>isShared&&menuReady);}
async function checkSaveSounds(){
 const p=await newPage(375,{isMobile:true,hasTouch:true,soundProbe:true});
 const count=()=>p.evaluate(()=>window.soundProbe.starts);
 let expected=0;
 const sounded=async message=>{expected++;await p.waitForFunction(n=>window.soundProbe.starts===n,expected);check(await count()===expected,message);};
 const quiet=async message=>check(await count()===expected,message);
 check(await p.locator('#familySoundControls, [data-sound-toggle], [data-sound-preview], [data-sound-status]').count()===0,'No sound controls or test button reveal the surprise');
 check(!/a little .i love it.|sound on|sound off|preview sound/i.test(await p.locator('body').innerText()),'Visible page copy does not describe or announce the sound');await quiet('Page loads without autoplay');
 await p.fill('#familyCode','synthetic-rejected-code-2026');await p.click('#joinFamilyBtn');await p.waitForFunction(()=>!document.querySelector('#joinFamilyBtn').disabled);await quiet('Rejected code is silent');
 await join(p);await sounded('First successful code entry plays the approved MP3 once');
 check(await p.evaluate(()=>Math.abs(window.soundProbe.durations[0]-1.7)<.01),'Real browser decodes the trimmed 1.7-second MP3');
 await p.evaluate(()=>loadFamilyShared());await quiet('Refreshing all family records is silent');
 await p.click('#addDishBtn');await p.fill('#newDishName','Sound test dish');await p.locator('#dishForm button').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('A confirmed menu addition plays the surprise without a sound control');
 await p.evaluate(()=>localStorage.setItem('thanksgiving26_soundsEnabled','false'));
 await p.reload();await p.waitForFunction(()=>isShared&&menuReady);expected=0;await quiet('Restoring an existing member does not play the welcome sound');
 const dish=tables.thanksgiving_dishes.find(d=>d.label==='Sound test dish');
 let release;holdClaim=new Promise(resolve=>release=resolve);await p.locator(`[data-dish-id="${dish.id}"]`).click();await p.fill('#claimName','Sound test cook');await p.locator('#claimForm button[type=submit]').click();await quiet('Pending database confirmation is silent');release();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Confirmed dish reservation sounds once');
 check(await p.evaluate(()=>localStorage.getItem('thanksgiving26_soundsEnabled')==='false'),'The retired mute flag cannot silently disable the surprise after its control is removed');
 await p.locator(`[data-dish-id="${dish.id}"]`).click();await p.fill('#claimNote','Updated details');await p.locator('#claimForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Confirmed reservation edits sound once');
 failClaim=true;await p.locator(`[data-dish-id="${dish.id}"]`).click();await p.locator('#claimForm button[type=submit]').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not save'));await quiet('Rejected reservation saves are silent');await p.click('#modalClose');
 await p.locator(`[data-dish-id="${dish.id}"]`).click();await p.click('#releaseDish');await p.locator('#modalBackdrop').waitFor({state:'hidden'});await quiet('Removing a dish reservation is silent');
 await p.click('#addDishBtn');await p.fill('#newDishName','Audible new dish');await p.locator('#dishForm button').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Confirmed new menu items sound once');
 await p.click('#editRsvpBtn');await p.fill('#rsvpName','Sound test household');await p.locator('#rsvpForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Confirmed RSVP sounds once');
 await p.click('#editRsvpBtn');await p.fill('#rsvpNote','Sound test edit');failReadTable='thanksgiving_rsvps';await p.locator('#rsvpForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Confirmed RSVP update sounds even if its following refresh fails');await p.click('#refreshRsvpsBtn');await p.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled);
 await p.click('#editRsvpBtn');failWriteTable='thanksgiving_rsvps';await p.locator('#rsvpForm button[type=submit]').click();await p.waitForFunction(()=>document.querySelector('#featureFormError').textContent.includes('Could not save'));await quiet('Failed RSVP save is silent');await p.click('#modalClose');
 await p.click('#editRsvpBtn');await p.click('#removeRsvp');await p.locator('#modalBackdrop').waitFor({state:'hidden'});await quiet('Removing an RSVP is silent');
 await p.locator('[data-vote="builtin-uno"]').click();await p.waitForFunction(()=>document.querySelector('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true');await sounded('Adding a game vote sounds once');
 await p.locator('[data-vote="builtin-uno"]').click();await p.waitForFunction(()=>document.querySelector('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='false');await quiet('Removing a vote is silent');
 await p.click('#addPhotoUrlBtn');await p.fill('#photoUrl','https://example.test/sound-test.jpg');await p.locator('#photoUrlForm button').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Adding a photo link sounds once');
 await p.click('#editPhotoDetails');await p.fill('#photoDetailCaption','Sound test caption');await p.locator('#photoDetailsForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Saving a caption sounds once');
 await p.locator('[data-react="heart"]').click();await p.waitForFunction(()=>document.querySelector('[data-react="heart"]').getAttribute('aria-pressed')==='true');await sounded('Adding a photo reaction sounds once');
 await p.locator('[data-react="laugh"]').click();await p.waitForFunction(()=>document.querySelector('[data-react="laugh"]').getAttribute('aria-pressed')==='true');await sounded('Changing a photo reaction sounds once');
 await p.locator('[data-react="laugh"]').click();await p.waitForFunction(()=>document.querySelector('[data-react="laugh"]').getAttribute('aria-pressed')==='false');await quiet('Removing a reaction is silent');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/uPgAAAAASUVORK5CYII=','base64');
 await p.setInputFiles('#photoUpload',[{name:'sound-one.png',mimeType:'image/png',buffer:png},{name:'sound-two.png',mimeType:'image/png',buffer:png}]);await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('2 Ellsworth family photos saved'));await sounded('A batch of two photo uploads plays only one clip');
 failWriteTable='thanksgiving_photos';await p.setInputFiles('#photoUpload',{name:'failed-sound.png',mimeType:'image/png',buffer:png});await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('could not be uploaded'));await quiet('Uploaded bytes without a successful photo record are silent');
 await p.evaluate(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(key){if(key==='thanksgiving26_soundsEnabled')throw new DOMException('Blocked','SecurityError');return get.call(this,key);};Storage.prototype.setItem=function(key,value){if(key==='thanksgiving26_soundsEnabled')throw new DOMException('Blocked','SecurityError');return set.call(this,key,value);};});
 await p.click('#addGameBtn');await p.fill('#gameName','Sound test game');await p.locator('#gameForm button').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});await sounded('Adding a game suggestion sounds without accessing retired preference storage');
 const video='https://www.tiktok.com/@test/video/7777777777777777777';await p.fill('#tikUrl',video);await p.locator('#tikForm button').click();await p.waitForFunction(()=>document.querySelector('#tikUrl').value==='');await sounded('Adding a TikTok sounds once');
 await p.fill('#tikUrl',video);await p.locator('#tikForm button').click();await quiet('Duplicate TikTok validation is silent');
 for(const width of [375,1440]){await p.setViewportSize({width,height:1000});await p.locator('#memberStrip').scrollIntoViewIfNeeded();check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Family access fits without a sound settings row at ${width}px`);await p.screenshot({animations:'disabled',path:new URL(`artifacts/surprise-sound-${width}.png`,import.meta.url).pathname});}
 await p.context().close();
 for(const mode of ['missing-file','decode-error','blocked','unsupported','missing-script']){
  const dishId='sound-fallback-'+mode;tables.thanksgiving_dishes.push({id:dishId,label:'Audio fallback '+mode,category:'Other family favorites',event_id:'ellsworth-thanksgiving-2026',signups:[]});
  const q=await newPage(430,{soundProbe:mode});await join(q);await signup(q,'Audio fallback '+mode,dishId);
  check((await q.locator('#toast').innerText()).includes('sign-up is saved'),'Saving still succeeds with '+mode+' audio');check(await q.evaluate(()=>window.soundProbe.starts===0),'No playback succeeds with '+mode+' audio');
  if(['unsupported','missing-script'].includes(mode))check(await q.locator('#familySoundControls, [data-sound-toggle]').count()===0,'Unsupported audio does not expose any controls');
  await q.context().close();
 }
 for(const action of ['pagehide','disconnect']){
  const q=await newPage(430,{soundProbe:true});let releaseClip;const heldClip=new Promise(resolve=>releaseClip=resolve);await q.context().route('**/assets/i-love-it.mp3*',async route=>{await heldClip;await route.continue();});
  await join(q);check(await q.evaluate(()=>window.soundProbe.starts===0),'Join sound waits for its audio download');if(action==='disconnect')await q.click('#leaveFamilyBtn');else await q.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));releaseClip();await q.waitForFunction(()=>window.soundProbe.decodes===1);
  check(await q.evaluate(()=>window.soundProbe.starts===0),'A pending clip stays cancelled after '+action);await q.context().close();
 }
}
async function checkFamilyWelcome(){
 for(const width of [375,1440]){
  const p=await newPage(width,{isMobile:width===375,hasTouch:width===375});
  check(await p.locator('#familyWelcome').count()===0,'Visitors see no join celebration');
  for(const code of ['synthetic-rejected-code-2026','synthetic-network-error-2026']){
   await p.fill('#familyCode',code);await p.click('#joinFamilyBtn');await p.waitForFunction(()=>!document.querySelector('#joinFamilyBtn').disabled);
   check(await p.evaluate(()=>!isShared&&!document.querySelector('#familyWelcome')&&!localStorage.getItem('thanksgiving26_welcomeCelebrated')),'Rejected or unavailable code never celebrates or records success');
  }
  await join(p);
  check(await p.locator('.family-confetti').count()===28,'First successful join displays a brief confetti burst');
  check(await p.locator('.family-confetti').allTextContents().then(items=>items.includes('🦃')&&items.includes('Ellsworth')),'Confetti includes turkeys and Ellsworth text');
  check(await p.locator('#familyWelcome').evaluate(el=>el.getAttribute('aria-hidden')==='true'&&getComputedStyle(el).pointerEvents==='none'),'Decorative celebration ignores pointer input and screen readers');
  check(await p.evaluate(()=>localStorage.getItem('thanksgiving26_welcomeCelebrated')==='true'&&document.body.style.overflow!=='hidden'&&document.activeElement?.id!=='familyCode'),'Welcome is remembered without locking scrolling or focusing the code input');
  await mkdir(new URL('artifacts/',import.meta.url),{recursive:true});await p.screenshot({path:new URL(`artifacts/welcome-${width}.png`,import.meta.url).pathname});
  await p.locator('#familyWelcome').waitFor({state:'detached',timeout:6500});check(true,'Welcome automatically cleans up');
  await p.reload();await p.waitForFunction(()=>isShared&&menuReady);check(await p.locator('#familyWelcome').count()===0,'Returning session never replays welcome');
  await p.click('#leaveFamilyBtn');await join(p);check(await p.locator('#familyWelcome').count()===0,'Reentering the code in the same browser does not replay welcome');
  await p.context().close();
 }
 const reduced=await newPage(430,{reducedMotion:'reduce'});await join(reduced);
 check(await reduced.locator('.family-welcome-greeting').isVisible()&&await reduced.locator('.family-confetti').count()===28,'First-time welcome keeps its full confetti burst for all motion settings');
 check(await reduced.locator('.family-welcome-greeting').evaluate(el=>getComputedStyle(el).animationName==='family-welcome-greeting'),'Welcome greeting remains animated for all motion settings');
 await reduced.locator('#familyWelcome').waitFor({state:'detached',timeout:6500});check(true,'Welcome still automatically cleans up after five seconds');await reduced.context().close();
 const blocked=await newPage(430);await blocked.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='thanksgiving26_welcomeCelebrated')throw new DOMException('Blocked','SecurityError');return set.call(this,key,value);};});await join(blocked);
 check(await blocked.locator('#familyWelcome').isVisible()&&!(await blocked.locator('#toast').innerText()).includes('Storage is full'),'Unavailable preference storage does not interrupt joining or show an unrelated error');
 await blocked.click('#leaveFamilyBtn');check(await blocked.locator('#familyWelcome').count()===0,'Disconnect works during confetti and clears it');await join(blocked);check(await blocked.locator('#familyWelcome').count()===0,'In-memory preference prevents repeats when storage is blocked');await blocked.context().close();
 const existing=await newPage();await existing.evaluate(()=>{localStorage.setItem('testSession',JSON.stringify({user:{id:crypto.randomUUID()}}));localStorage.setItem('testMember','yes');});await existing.reload();await existing.waitForFunction(()=>isShared&&menuReady);
 check(await existing.locator('#familyWelcome').count()===0,'An existing member without a prior celebration preference is not treated as a new join');await existing.click('#leaveFamilyBtn');await join(existing);check(await existing.locator('#familyWelcome').count()===0,'An existing member reentering the code is still a returning member');await existing.context().close();
}
async function signup(p,name,dish='mac'){await p.locator(`[data-dish-id="${dish}"]`).click();await p.fill('#claimName',name);await p.fill('#claimNote','Synthetic test note');await p.locator('#claimForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});}
async function checkFeatureAssetVersions(p){
 for(const [path,selector,attribute] of [['assets/family-features.js','script[src*="family-features.js"]','src'],['assets/family-features.css','link[href*="family-features.css"]','href'],['assets/family-sound.js','script[src*="family-sound.js"]','src'],['assets/i-love-it.mp3','#familySoundScript','data-sound-src']]){
  const hash=createHash('sha256').update(await readFile(new URL(path,root))).digest('hex').slice(0,12);
  const assetUrl=new URL(await p.locator(selector).getAttribute(attribute),url);
  check(assetUrl.searchParams.get('v')===hash,`${path} URL matches its content so releases bypass stale cached assets`);
 }
}
async function checkRsvpRefreshWithCachedAssets(width){
 const p=await newPage(width,{staleFeatureCache:true,hasTouch:width<500,isMobile:width<500});
 await join(p);await p.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled);
 await p.click('#editRsvpBtn');await p.fill('#rsvpName',`Returning household ${width}`);await p.fill('#rsvpAdults','2');await p.fill('#rsvpChildren','1');await p.fill('#rsvpArrival','2026-11-25');await p.fill('#rsvpArrivalTime','18:30');await p.fill('#rsvpDietary','Vegetarian meals');await p.locator('#rsvpForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});
 const ownUser=await p.evaluate(()=>memberUserId),savedNotice=await p.locator('#rsvpSavedStatus').innerText();
 check(savedNotice.includes('Your RSVP is saved.')&&savedNotice.includes('Last updated')&&savedNotice.includes('PM CT'),'RSVP confirmation includes the server save time in Central');check(savedNotice.includes('1:'),'Known 18:xx UTC server time is displayed as 1:xx PM Central');
 for(let attempt=0;attempt<2;attempt++){
  await p.reload();await p.waitForFunction(()=>isShared&&familyFeatures&&document.querySelector('#editRsvpBtn').textContent==='Edit my RSVP');
  check(await p.locator('#rsvpSavedStatus').innerText()===savedNotice,'Saved confirmation and update time persist unchanged across reloads');
  check(await p.locator('#rsvpSavedStatus').evaluate(el=>Boolean(el.closest('[data-own-rsvp]'))&&el.previousElementSibling?.classList.contains('rsvp-departure')),'Reloaded confirmation stays in the current member’s card directly after departure');
  check((await p.locator('#rsvpList').innerText()).includes('Vegetarian meals'),'Dietary needs persist across reloads');
  check(await p.evaluate(()=>memberUserId)===ownUser,'Refresh restores the same family account');
  check((await p.locator('#rsvpList').innerText()).includes(`Returning household ${width}`),`Saved RSVP remains visible after refresh ${attempt+1} at ${width}px`);
  check((await p.locator('#rsvpSummary').innerText()).includes('3\nconfirmed guests'),'Refreshed RSVP retains household counts');
  check((await p.locator('#rsvpList').innerText()).includes('6:30 PM CT'),'Refreshed RSVP retains arrival details');
  await p.click('#refreshRsvpsBtn');await p.click('#editRsvpBtn');check(await p.inputValue('#rsvpName')===`Returning household ${width}`,'Refreshed RSVP can still be edited');check(await p.inputValue('#rsvpDietary')==='Vegetarian meals','Reloaded dietary needs are available for editing');await p.click('#modalClose');
 }
 check(tables.thanksgiving_rsvps.filter(r=>r.user_id===ownUser).length===1,'Refreshing never creates a duplicate RSVP');
 await p.click('#editRsvpBtn');await p.click('#removeRsvp');await p.locator('#modalBackdrop').waitFor({state:'hidden'});await p.context().close();
}
async function checkRequestedLayout(p){
 check(await p.locator('#faq details').count()===6,'Compact FAQ covers travel, packing, dietary needs, RSVPs and contact');
 await p.locator('#faq summary').first().click();check(await p.locator('#faq details').first().evaluate(el=>el.open),'FAQ expands with a click');await p.locator('#faq summary').first().press('Enter');check(!(await p.locator('#faq details').first().evaluate(el=>el.open)),'FAQ collapses with the keyboard');
 check((await p.locator('#faq').innerText()).includes('family group chat'),'FAQ directs relatives to the group chat for confirmed travel details');
 check(!(await p.locator('#memories .helper').innerText()).includes('preview'),'Family photo instructions omit implementation details');
 check(await p.locator('#nfl-games').evaluate(el=>el===document.querySelector('main').lastElementChild),'NFL Games is the final app section');
 check((await p.locator('#nfl-games h2').innerText()).trim()==='NFL Games.','Football heading is NFL Games');
 check(!(await p.locator('main').innerText()).toLowerCase().includes('weekend together'),'Weekend together wording removed');
 check(await p.locator('#nfl-games .football').count()===3,'Only the three Thursday games are shown');
 check(await p.locator('#weekend, #scheduleList, #addScheduleBtn, a[href="#weekend"]').count()===0,'Family Plans section, actions and navigation are removed');
 check(!(await p.locator('#nfl-games').innerText()).match(/Packers|Broncos|Saints|Friday|Sunday/),'Non-Thursday games excluded');
 check(JSON.stringify(await p.locator('#gamesGrid .game-card').evaluateAll(cards=>cards.map(c=>c.dataset.gameKey)))===JSON.stringify(['builtin-heads-up','builtin-uno','builtin-name-that-tune']),'Heads Up has a fresh vote key while UNO and Name That Tune retain theirs');
 check(!(await p.locator('#gamesGrid').innerText()).match(/Spades|Charades|Family Feud|Dominoes/),'Removed games are absent from the lineup');
 check(await p.evaluate(()=>AIRBNB_PHOTOS.length===26&&new Set(AIRBNB_PHOTOS).size===26),'All 26 distinct listing photo URLs are available');
 check(await p.locator('.hero-main>img').getAttribute('src')==='https://a0.muscache.com/im/pictures/hosting/Hosting-961414748638377724/original/be6bdd9c-c350-4f04-9f27-8736cf82b2f1.jpeg?im_w=1200','Holiday Home feature image uses the exterior photo');
 check(await p.locator('.property-mosaic [data-house-photo]').count()===5,'Five-photo house preview remains compact');
 check(await p.locator('#stay .stay-copy a, .stay-gallery-link').count()===0,'The listing and redundant photo links are removed');
 check(await p.locator('#house-gallery').evaluate(el=>el.parentElement.classList.contains('stay-photos')&&el.previousElementSibling.classList.contains('property-mosaic')),'House-photo dropdown follows the preview directly in the same column');
 check(await p.locator('#house-gallery h2, #house-gallery .eyebrow, #house-gallery .section-lead').count()===0,'House gallery has no extra heading or descriptive section');
 check(await p.locator('#house-gallery [data-house-photo]').count()===21,'Remaining 21 photos are in the additional gallery');
 check(await p.locator('#house-gallery img[src]').count()===0,'Collapsed categories do not request their thumbnails');
 check(!(await p.locator('#housePhotoCategories').evaluate(el=>el.open)),'Photo categories start inside one collapsed dropdown');check(await p.locator('#house-bedrooms summary').isHidden(),'Individual categories are hidden before opening the parent');
 await p.locator('#housePhotoCategories>summary').click();check(await p.locator('#house-bedrooms summary').isVisible(),'Opening the parent reveals category choices');check(await p.locator('#house-gallery img[src]').count()===0,'Opening only the parent does not load category photos');
 const groups=[['bedrooms','Bedrooms',4],['bathrooms','Bathrooms',6],['kitchen','Kitchen',1],['dining','Dining area',1],['outdoors','Outdoor areas',6],['laundry','Laundry',1],['hallways','Hallways & landing',2]];
 for(const [slug,name,count] of groups){
  const group=p.locator('#house-'+slug);check(!(await group.evaluate(el=>el.open)),name+' starts collapsed');check(await group.locator('[data-house-photo]').count()===count,name+' has the expected photo count');
  check(await group.locator('[data-house-photo]').evaluateAll((buttons,category)=>buttons.every(b=>AIRBNB_PHOTO_DETAILS[Number(b.dataset.housePhoto)].category===category),name),name+' contains correctly categorized photos');
  await group.locator('summary').click();await p.waitForFunction(slug=>!document.querySelector('#house-'+slug+' img[data-src]'),slug);check(await group.locator('img[src]').count()===count,name+' loads thumbnails when expanded');
  await group.locator('summary').press('Enter');check(!(await group.evaluate(el=>el.open)),name+' can be collapsed with the keyboard');
 }
 await p.locator('#housePhotoCategories>summary').press('Enter');check(await p.locator('#house-bedrooms summary').isHidden(),'Parent dropdown hides all categories with the keyboard');
 check(await p.locator('[data-house-photo]').count()===26,'Each listing photo has one gallery button');check(await p.locator('[data-house-photo]').evaluateAll(buttons=>new Set(buttons.map(b=>b.dataset.housePhoto)).size===26),'Gallery buttons have no duplicate photo indices');
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
 for(const [selector,label] of [['#editRsvpBtn','RSVP'],['[data-vote="builtin-heads-up"]','Game vote']]){await p.click(selector);await expectCode(label);}
 for(const value of ['', 'not-a-url', 'https://www.tiktok.com/@test/video/1234567890123456789']){
  await p.fill('#tikUrl',value);await p.locator('#tikForm button').click();await expectCode(`TikTok button with ${value?'entered':'empty'} URL`);
 }
 await p.fill('#tikUrl','');await p.locator('#tikUrl').scrollIntoViewIfNeeded();await p.locator('#tikUrl').press('Enter');await expectCode('TikTok keyboard submit');
 check(uploads===0&&tables.thanksgiving_photos.length===0&&tables.thanksgiving_tiktoks.length===0&&tables.thanksgiving_games.length===0,'Logged-out attempts do not save contributions');
}
async function checkMissingSetupRecovery(p){
 for(const table of ['thanksgiving_rsvps','thanksgiving_game_votes','thanksgiving_photo_details','thanksgiving_photo_reactions'])unavailableTables.add(table);
 await p.click('#refreshRsvpsBtn');await p.waitForFunction(()=>document.querySelector('#rsvpStatus').textContent.includes('Could not load')&&document.querySelector('#photoExtras .helper').textContent.includes('Could not load'));
 check(await p.locator('#editRsvpBtn').isDisabled(),'Missing RSVP table prevents false local saves');check(await p.locator('#editPhotoDetails').isDisabled(),'Missing caption table disables caption editing');check(await p.locator('[data-react="heart"]').isDisabled(),'Missing reactions table disables emoji buttons');
 unavailableTables.clear();await p.click('#refreshRsvpsBtn');await p.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled&&!document.querySelector('#editPhotoDetails').disabled&&!document.querySelector('[data-react="heart"]').disabled&&!document.querySelector('[data-vote="builtin-heads-up"]').disabled);
 check(await p.locator('#rsvpStatus').innerText()===''&&await p.locator('#photoExtras .helper').innerText()==='','Installing missing tables and refreshing restores feature controls');
}
async function checkFamilyPlanning(a,b){
 await a.click('#editRsvpBtn');check(await a.inputValue('#rsvpAdults')==='1','New RSVP counts the person submitting by default');await a.fill('#rsvpName','Synthetic household A');await a.fill('#rsvpAdults','2');await a.fill('#rsvpChildren','1');await a.fill('#rsvpDietary','Nut allergy & <vegetarian>');check((await a.locator('#rsvpDietaryHelp').innerText()).includes('Visible to joined family members'),'Dietary field explains who can see it');
 await a.fill('#rsvpArrival','2026-11-25');await a.fill('#rsvpArrivalTime','18:30');await a.fill('#rsvpDeparture','2026-11-24');
 await a.locator('#rsvpForm button[type=submit]').click();check((await a.locator('#featureFormError').innerText()).includes('Departure'),'RSVP rejects departure before arrival');check(tables.thanksgiving_rsvps.length===0,'Invalid RSVP not sent');
 await a.fill('#rsvpDeparture','2026-11-29');await a.fill('#rsvpDepartureTime','10:00');failWriteTable='thanksgiving_rsvps';await a.locator('#rsvpForm button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#featureFormError').textContent.includes('Could not save'));
 check(await a.locator('#modalBackdrop').isVisible()&&tables.thanksgiving_rsvps.length===0,'Failed RSVP stays open without success');check(await a.locator('#rsvpSavedStatus').isHidden(),'Failed first save does not show a saved confirmation');
 await a.locator('#rsvpForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 check((await a.locator('#rsvpSummary').innerText()).includes('3\nconfirmed guests'),'RSVP counts household adults and children');check((await a.locator('#rsvpList').innerText()).includes('6:30 PM CT'),'RSVP shows Central arrival time');check((await a.locator('#rsvpSavedStatus').innerText()).includes('Your RSVP is saved.'),'Successful RSVP has a persistent saved confirmation');check(await a.locator('#rsvpSavedStatus').evaluate(el=>Boolean(el.closest('[data-own-rsvp]'))&&el.previousElementSibling?.classList.contains('rsvp-departure')),'Save confirmation appears below departure inside the owning RSVP card');check(await a.locator('#rsvpList .rsvp-card:not([data-own-rsvp]) .rsvp-saved').count()===0,'Other households do not receive the member’s saved confirmation');check((await a.locator('#rsvpList').innerText()).includes('Nut allergy & <vegetarian>')&&await a.locator('#rsvpList vegetarian').count()===0,'Dietary needs render safely as text');
 await b.click('#refreshRsvpsBtn');await b.waitForFunction(()=>document.querySelector('#rsvpList').textContent.includes('Synthetic household A'));check((await b.locator('#editRsvpBtn').innerText()).includes('Add'),'Second member can add only their own RSVP');check((await b.locator('#rsvpList').innerText()).includes('Nut allergy & <vegetarian>'),'Dietary needs are shared with joined members');
 await b.click('#editRsvpBtn');await b.fill('#rsvpName','Synthetic household B');await b.selectOption('#rsvpResponse','maybe');await b.fill('#rsvpAdults','2');await b.locator('#rsvpForm button[type=submit]').click();await b.locator('#modalBackdrop').waitFor({state:'hidden'});check((await b.locator('#rsvpSavedStatus').innerText()).includes('PM CT')&&(await b.locator('#rsvpSavedStatus').innerText()).includes('1:'),'Server save time stays Central on a device in Tokyo');
 await a.click('#refreshRsvpsBtn');await a.waitForFunction(()=>document.querySelector('#rsvpSummary').textContent.includes('2possibly joining'));check(tables.thanksgiving_rsvps.length===2,'Independent household RSVPs coexist');for(const page of [a,b]){check(await page.locator('#rsvpSavedStatus').evaluate(el=>el.closest('[data-own-rsvp]')?.querySelector('h3').textContent.includes('· you')),'Each member’s confirmation is inside their own household card');check(await page.locator('#rsvpList .rsvp-card:not([data-own-rsvp]) .rsvp-saved').count()===0,'Another household’s card does not show the current member’s confirmation');}
 await a.click('#editRsvpBtn');check(await a.inputValue('#rsvpName')==='Synthetic household A','Own RSVP reopens with saved values');check(await a.inputValue('#rsvpDietary')==='Nut allergy & <vegetarian>','Dietary needs reopen with saved values');await a.fill('#rsvpDietary','');await a.fill('#rsvpAdults','3');await a.locator('#rsvpForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_rsvps.length===2&&tables.thanksgiving_rsvps.find(r=>r.household_name.endsWith('A')).adults===3,'Editing RSVP updates the existing household without duplication');check(tables.thanksgiving_rsvps.find(r=>r.household_name.endsWith('A')).dietary_needs==='','Dietary needs can be cleared');
 await a.click('#editRsvpBtn');await a.selectOption('#rsvpResponse','declined');await a.locator('#rsvpForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_rsvps.find(r=>r.household_name.endsWith('A')).adults===0,'Declined RSVP contributes no guests');check(await a.locator('#rsvpSavedStatus').evaluate(el=>Boolean(el.closest('[data-own-rsvp]'))),'Declined RSVP retains its confirmation inside the household card');check(await a.locator('[data-own-rsvp] .rsvp-departure').count()===0,'A declined RSVP does not invent travel details to position its confirmation');
 await a.click('#editRsvpBtn');await a.click('#removeRsvp');await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_rsvps.length===1,'Own RSVP can be removed');check(await a.locator('#rsvpSavedStatus').isHidden(),'Removing an RSVP clears its saved confirmation');
 check(await a.locator('#nfl-games .schedule-entry').count()===3,'Final NFL section shows Thursday games');check((await a.locator('[data-plan-id="nfl-chiefs-bills"]').innerText()).includes('7:20 PM CT'),'NFL kickoff stays in Central');
 const vote='[data-vote="builtin-heads-up"]';await a.locator(vote).click();await a.waitForFunction(()=>document.querySelector('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='true');
 await b.locator(vote).click();await b.waitForFunction(()=>document.querySelector('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='true');await a.click('#refreshRsvpsBtn');await a.waitForFunction(()=>document.querySelector('[data-game-key="builtin-heads-up"]').textContent.includes('2 votes'));check(tables.thanksgiving_game_votes.length===2,'Two members vote independently for a game');
 await a.locator('[data-vote="builtin-uno"]').click();await a.waitForFunction(()=>document.querySelector('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true');check(await a.locator('#gamesGrid .game-card').first().getAttribute('data-game-key')==='builtin-heads-up','Most popular games sort first');
 await a.locator(vote).click();await a.waitForFunction(()=>document.querySelector('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='false');check(tables.thanksgiving_game_votes.filter(v=>v.game_key==='builtin-heads-up').length===1,'Removing vote preserves another member’s vote');
 failWriteTable='thanksgiving_game_votes';await a.locator('[data-vote="builtin-name-that-tune"]').click();await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not change'));check(await a.locator('[data-vote="builtin-name-that-tune"]').getAttribute('aria-pressed')==='false','Failed vote not shown as saved');
 const photoId=await a.evaluate(()=>photos[slideIndex].id);await a.click('#editPhotoDetails');
 check(await a.locator('#photoDetailsForm input').count()===1&&await a.locator('#photoPeople, #photoDate').count()===0,'Photo editor has only a caption field');
 await a.fill('#photoDetailCaption','Family <together>');failWriteTable='thanksgiving_photo_details';await a.locator('#photoDetailsForm button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#featureFormError').textContent.includes('Could not save'));
 check(await a.locator('#modalBackdrop').isVisible()&&await a.inputValue('#photoDetailCaption')==='Family <together>','Failed caption save retains the form and entered caption');
 await a.locator('#photoDetailsForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 check(await a.locator('#photoCaption').innerText()==='Family <together>','Caption displays as text');check(await a.locator('#photoCaption together').count()===0,'Caption cannot inject markup');
 const detail=tables.thanksgiving_photo_details.find(d=>d.photo_id===photoId);check(!('people_names' in detail)&&!('date_taken' in detail),'Caption save does not submit names or dates');
 // Retain historical metadata in storage without displaying or requesting it in the editor.
 Object.assign(detail,{people_names:'Legacy private names',date_taken:'2024-11-28'});
 await b.evaluate(()=>refreshPhotos());await b.click('#refreshRsvpsBtn');await b.waitForFunction(()=>familyFeatures&&photos.length===2);await b.evaluate(id=>{slideIndex=photos.findIndex(p=>p.id===id);renderPhotos();},photoId);await b.waitForFunction(()=>document.querySelector('#photoCaption').textContent==='Family <together>');check(await b.locator('.photo-people').count()===0,'Historical names and dates are absent from the album');
 await b.click('#editPhotoDetails');check(await b.inputValue('#photoDetailCaption')==='Family <together>','Second member can reopen the shared caption');await b.fill('#photoDetailCaption','Updated family memory');await b.locator('#photoDetailsForm button[type=submit]').click();await b.locator('#modalBackdrop').waitFor({state:'hidden'});
 await a.click('#refreshRsvpsBtn');await a.waitForFunction(()=>document.querySelector('#photoCaption').textContent==='Updated family memory');check(detail.people_names==='Legacy private names'&&detail.date_taken==='2024-11-28','Caption-only updates preserve historical metadata in storage');
 await a.click('#editPhotoDetails');await a.fill('#photoDetailCaption','');await a.locator('#photoDetailsForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(await a.locator('#photoCaption').innerText()==='A little family love.','Members can clear a caption');
 await a.click('#editPhotoDetails');await a.fill('#photoDetailCaption','Family <together>');await a.locator('#photoDetailsForm button[type=submit]').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 failWriteTable='thanksgiving_photo_reactions';await a.locator('[data-react="heart"]').click();await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not save your reaction'));check(await a.locator('[data-react="heart"]').getAttribute('aria-pressed')==='false'&&tables.thanksgiving_photo_reactions.length===0,'Failed reaction is not shown as saved and can be retried');
 await a.locator('[data-react="heart"]').click();await a.waitForFunction(()=>document.querySelector('[data-react="heart"]').getAttribute('aria-pressed')==='true');await b.locator('[data-react="clap"]').click();await b.waitForFunction(()=>document.querySelector('[data-react="clap"]').getAttribute('aria-pressed')==='true');
 await a.locator('[data-react="laugh"]').click();await a.waitForFunction(()=>document.querySelector('[data-react="laugh"]').getAttribute('aria-pressed')==='true');check(tables.thanksgiving_photo_reactions.length===2,'Changing reaction replaces own reaction without duplicating it');await a.locator('[data-react="laugh"]').click();await a.waitForFunction(()=>document.querySelector('[data-react="laugh"]').getAttribute('aria-pressed')==='false');check(tables.thanksgiving_photo_reactions.length===1,'Removing reaction preserves another member’s reaction');
 if(await a.evaluate(()=>document.fullscreenEnabled)){await a.click('#startTv');await a.waitForFunction(()=>document.fullscreenElement?.id==='tvSlideshow');check(await a.evaluate(()=>document.fullscreenElement.id)==='tvSlideshow','Native fullscreen opens');await a.click('#tvExit');await a.waitForFunction(()=>!document.fullscreenElement);check(await a.locator('#tvSlideshow').isHidden(),'Native fullscreen exits cleanly');}
 await a.evaluate(()=>{document.querySelector('#tvSlideshow').requestFullscreen=()=>Promise.reject(new Error('Synthetic fullscreen unavailable'));});await a.click('#startTv');check(await a.locator('#tvSlideshow').isVisible(),'TV slideshow works when native fullscreen is unavailable');check(await a.locator('#tvCaption').innerText()==='Family <together>','TV slideshow includes photo caption');check(await a.locator('#tvPeople').count()===0,'TV slideshow displays captions without names or dates');
 const previous=await a.locator('#tvCount').innerText();await a.click('#tvNext');check(await a.locator('#tvCount').innerText()!==previous,'TV slideshow advances');await a.keyboard.press('ArrowLeft');check(await a.locator('#tvCount').innerText()===previous,'TV slideshow keyboard navigation');
 await a.click('#tvPause');check((await a.locator('#tvPause').innerText()).includes('Pause'),'TV slideshow play control');const beforeAuto=await a.locator('#tvCount').innerText();await a.waitForFunction(previous=>document.querySelector('#tvCount').textContent!==previous,beforeAuto,{timeout:8000});check(await a.locator('#tvCount').innerText()!==beforeAuto,'TV slideshow advances automatically');await a.click('#tvPause');check((await a.locator('#tvPause').innerText()).includes('Play'),'TV slideshow pause control');
 await a.keyboard.press('Escape');check(await a.locator('#tvSlideshow').isHidden(),'Escape exits TV slideshow');check(await a.locator('#startTv').evaluate(el=>el===document.activeElement),'TV slideshow restores focus after changing photos');
 failReadTable='thanksgiving_rsvps';await a.click('#refreshRsvpsBtn');await a.waitForFunction(()=>document.querySelector('#rsvpStatus').textContent.includes('Could not load'));check(await a.locator('#editRsvpBtn').isDisabled(),'Failed RSVP refresh disables writes');await a.click('#refreshRsvpsBtn');await a.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled);
 await a.reload();await a.waitForFunction(()=>isShared&&menuReady);await a.waitForFunction(()=>document.querySelector('#rsvpList').textContent.includes('Synthetic household B'));check((await a.locator('#rsvpList').innerText()).includes('Synthetic household B'),'Shared RSVPs survive page reload');
 for(const width of [375,430,768,1024,1440]){await a.setViewportSize({width,height:1000});check(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Populated family features fit at ${width}px`);check(await a.evaluate(()=>{const frame=document.querySelector('#memoryFrame').getBoundingClientRect(),caption=document.querySelector('#photoCaption').getBoundingClientRect(),extras=document.querySelector('#photoExtras').getBoundingClientRect();return caption.top>=frame.bottom&&extras.top>=caption.bottom&&[...document.querySelectorAll('#photoExtras button')].every(button=>button.getBoundingClientRect().top>=frame.bottom);}),`Caption, reactions and photo actions appear below the picture at ${width}px`);if(width===375||width===1440){await a.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await a.screenshot({animations:'disabled',path:new URL(`artifacts/features-${width}.png`,import.meta.url).pathname,fullPage:true});await a.locator('.memory-gallery').screenshot({animations:'disabled',path:new URL(`artifacts/photo-actions-below-${width}.png`,import.meta.url).pathname});}}
}
async function checkRsvpSaveReadFailure(p){
 await p.click('#editRsvpBtn');await p.fill('#rsvpName','Read failure household');await p.fill('#rsvpDietary','No dairy');failReadTable='thanksgiving_rsvps';await p.locator('#rsvpForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});
 check((await p.locator('#rsvpList').innerText()).includes('Read failure household'),'Confirmed save remains visible if the following refresh fails');check((await p.locator('#rsvpSavedStatus').innerText()).includes('Your last saved RSVP'),'Failed refresh distinguishes the last confirmed save from a fresh read');
 await p.click('#refreshRsvpsBtn');await p.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled);check((await p.locator('#rsvpSavedStatus').innerText()).includes('Your RSVP is saved.'),'Retry restores normal saved confirmation');
 tables.thanksgiving_rsvps.find(r=>r.household_name==='Read failure household').updated_at=null;await p.click('#refreshRsvpsBtn');await p.waitForFunction(()=>!document.querySelector('#rsvpSavedStatus').textContent.includes('Last updated'));check((await p.locator('#rsvpSavedStatus').innerText()).includes('Your RSVP is saved.'),'Legacy RSVP without a historical timestamp confirms saving without inventing a date');
 await p.click('#editRsvpBtn');failReadTable='thanksgiving_rsvps';await p.click('#removeRsvp');await p.locator('#modalBackdrop').waitFor({state:'hidden'});check(await p.locator('#rsvpSavedStatus').isHidden()&&!(await p.locator('#rsvpList').innerText()).includes('Read failure household'),'Successful removal clears cached RSVP even if the following refresh fails');await p.click('#refreshRsvpsBtn');await p.waitForFunction(()=>!document.querySelector('#editRsvpBtn').disabled);
}
async function checkUpdatedLineups(){
 const event_id='ellsworth-thanksgiving-2026';
 const retiredDishes=[{event_id,id:'rice',label:'Rice / dirty rice',category:'The sides',signups:[{slot:1,user_id:'legacy-cook',assignee:'Old rice cook',note:'Retain this signup'}]},{event_id,id:'potatoes',label:'Mashed potatoes / gravy',category:'The sides',signups:[{slot:1,user_id:'legacy-cook',assignee:'Old potato cook',note:''}]}];
 const retiredGame={event_id,id:'old-spades-suggestion',name:' Spades ',description:'Previously shared suggestion'};
 const retiredVote={event_id,game_key:'builtin-spades',user_id:'legacy-voter'};
 const before=JSON.stringify({retiredDishes,retiredGame,retiredVote});
 tables.thanksgiving_dishes.push(...retiredDishes);tables.thanksgiving_games.push(retiredGame);tables.thanksgiving_game_votes.push(retiredVote);
 const p=await newPage(375);await join(p);await p.waitForFunction(()=>!document.querySelector('[data-vote="builtin-heads-up"]').disabled);
 check(await p.locator('[data-game-key="builtin-spades"], [data-game-key="old-spades-suggestion"]').count()===0,'Shared Spades suggestions and built-in are hidden');
 check(await p.locator('[data-dish-id="rice"], [data-dish-id="potatoes"]').count()===0,'Retired shared dishes stay hidden despite saved signups');
 check(await p.locator('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='false'&&(await p.locator('[data-game-key="builtin-heads-up"]').innerText()).includes('0 votes'),'Heads Up does not inherit a stored Spades vote');
 check((await p.locator('[data-dish-id="jambalaya"]').locator('..').innerText()).includes('0/3 assigned'),'Shared Jambalaya does not inherit old dish signups');
 await signup(p,'Jambalaya cook','jambalaya');await p.locator('[data-vote="builtin-heads-up"]').click();await p.waitForFunction(()=>document.querySelector('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='true');
 await p.reload();await p.waitForFunction(()=>isShared&&menuReady&&document.querySelector('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='true');
 check((await p.locator('[data-dish-id="jambalaya"]').locator('..').innerText()).includes('Jambalaya cook'),'Jambalaya shared reservation persists after refresh');
 check(tables.thanksgiving_game_votes.some(v=>v.game_key==='builtin-heads-up'&&v.user_id!==retiredVote.user_id),'Heads Up saves votes under its own new key');
 check(JSON.stringify({retiredDishes,retiredGame,retiredVote})===before&&tables.thanksgiving_dishes.includes(retiredDishes[0])&&tables.thanksgiving_game_votes.includes(retiredVote),'Retired shared records remain intact');
 await p.context().close();
 tables.thanksgiving_dishes=[];tables.thanksgiving_games=[];tables.thanksgiving_game_votes=[];
}
async function checkLocalPlanning(){
 const p=await newPage(430,{localPreview:true});
 await p.evaluate(()=>{
  localStorage.setItem('thanksgiving26_games',JSON.stringify([{id:'builtin-spades',name:'Spades'},...games.filter(g=>g.name!=='Heads Up'),{id:'cached-custom',name:'Taboo'},{name:'Charades'},{name:'Family Feud'},{name:'Dominoes'}]));
  localStorage.setItem('thanksgiving26_menu',JSON.stringify([{id:'rice',label:'Rice / dirty rice',category:'The sides',assignee:'Legacy cook'},{id:'potatoes',label:'Mashed potatoes / gravy',category:'The sides',assignee:'Legacy cook'}]));
  localStorage.setItem('thanksgiving26_planning_votes',JSON.stringify([{game_key:'builtin-spades',user_id:'preview-device'},{game_key:'builtin-uno',user_id:'preview-device'}]));
 });
 await p.reload();
 check(!(await p.locator('#gamesGrid').innerText()).match(/Spades|Charades|Family Feud|Dominoes/),'Returning local previews hide removed games');
 check(await p.locator('[data-vote="builtin-name-that-tune"]').count()===1,'Legacy preview keeps Name That Tune vote key');
 check(await p.locator('[data-vote="builtin-heads-up"]').count()===1&&await p.locator('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='false','Old previews gain Heads Up without inheriting Spades votes');
 check(await p.locator('[data-game-key="cached-custom"]').count()===1&&await p.locator('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true','Updating cached starters preserves custom games and existing UNO votes');
 check(await p.locator('[data-dish-id="rice"], [data-dish-id="potatoes"]').count()===0,'Retired cached dishes do not return');
 check((await p.locator('[data-dish-id="jambalaya"]').locator('..').innerText()).includes('0/3 assigned'),'Local Jambalaya starts without retired reservations');
 await signup(p,'Local Jambalaya cook','jambalaya');await p.reload();
 check((await p.locator('[data-dish-id="jambalaya"]').locator('..').innerText()).includes('Local Jambalaya cook'),'Local Jambalaya reservation persists after reload');
 check(await p.evaluate(()=>load('menu',[]).filter(d=>['rice','potatoes'].includes(d.id)).length===2&&load('planning_votes',[]).some(v=>v.game_key==='builtin-spades')),'Updating preview lineups retains retired records');
 await p.click('#editRsvpBtn');await p.fill('#rsvpName','Local preview household');await p.fill('#rsvpDietary','Vegetarian');await p.locator('#rsvpForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});
 await p.locator('[data-vote="builtin-heads-up"]').click();await p.waitForFunction(()=>document.querySelector('[data-vote="builtin-heads-up"]').getAttribute('aria-pressed')==='true');await p.reload();
 check((await p.locator('#rsvpList').innerText()).includes('Local preview household'),'Local preview RSVP persists');check((await p.locator('#rsvpList').innerText()).includes('Vegetarian')&&(await p.locator('#rsvpSavedStatus').innerText()).includes('saved on this device'),'Local dietary needs and clearly labeled save time persist');check(await p.locator('[data-vote="builtin-uno"]').getAttribute('aria-pressed')==='true','Local preview vote persists');check((await p.locator('#rsvpStatus').innerText()).includes('Preview'),'Local data is labeled as device-only');await p.context().close();
}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 await checkUpdatedLineups();
 await checkFamilyWelcome();
 await checkRsvpRefreshWithCachedAssets(375);await checkRsvpRefreshWithCachedAssets(1440);
 const mobile=await newPage(375,{isMobile:true,hasTouch:true});await checkInvitationRouting(mobile);await mobile.context().close();
 const a=await newPage();await checkFeatureAssetVersions(a);await checkRequestedLayout(a);await checkInvitationRouting(a);await join(a);
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
 await a.setViewportSize({width:375,height:1000});await a.locator('#housePhotoCategories>summary').click();await a.locator('#house-hallways summary').click();await a.locator('[data-house-photo="25"]').click();check((await a.locator('#housePhotoCaption').innerText()).startsWith('26 / 26'),'Last categorized property photo is reachable');await a.keyboard.press('ArrowRight');check((await a.locator('#housePhotoCaption').innerText()).startsWith('1 / 26'),'Gallery keyboard wrap');check((await a.locator('#lightboxImage').getAttribute('alt')).includes('Exterior'),'Source room labels used in lightbox');
 await a.locator('#lightboxImage').evaluate(el=>{for(const [type,x,y] of [['touchstart',300,150],['touchend',100,155]])el.dispatchEvent(new TouchEvent(type,{changedTouches:[new Touch({identifier:1,target:el,clientX:x,clientY:y})]}));});check((await a.locator('#housePhotoCaption').innerText()).startsWith('2 / 26'),'Swipe changes photo');
 await a.keyboard.press('Tab');await a.keyboard.press('Tab');await a.keyboard.press('Tab');check(await a.locator('#lightboxClose').evaluate(el=>el===document.activeElement),'Lightbox traps focus');await a.keyboard.press('Escape');check(await a.locator('[data-house-photo="25"]').evaluate(el=>el===document.activeElement),'Lightbox restores focus');await a.locator('#house-hallways summary').click();await a.locator('#housePhotoCategories>summary').click();
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
 const reduced=await newPage(430,{reducedMotion:'reduce'});check(await reduced.locator('.falling-leaves').evaluate(el=>getComputedStyle(el).display!=='none'),'Leaves remain visible for all motion settings');check(await reduced.evaluate(()=>playing===true),'Photo slideshow starts playing for all motion settings');check(await reduced.locator('.credit-turkey').evaluateAll(items=>items.length===2&&items.every(el=>el.getAttribute('aria-hidden')==='true'&&getComputedStyle(el).animationName==='credit-turkey-sway')),'Decorative footer turkeys animate on both sides for all motion settings');check(await reduced.locator('.credit-name').evaluate(el=>getComputedStyle(el).animationName==='credit-gold-shimmer'),'Gold credit signature shimmers for all motion settings');
 await checkMissingSetupRecovery(a);await checkFamilyPlanning(a,b);await checkRsvpSaveReadFailure(a);await checkLocalPlanning();
 check(!requestedTables.has('thanksgiving_schedule'),'Removed Family Plans never fetches or writes schedule records');
 await a.click('#startTv');await a.evaluate(()=>document.querySelector('#leaveFamilyBtn').click());await a.waitForFunction(()=>!document.querySelector('#familyPortal').hidden);check(await a.locator('#familyPortal').isVisible(),'Disconnect shows family access');check(await a.locator('#tiktokGrid iframe').count()===0,'Disconnect unloads video');check(!(await a.locator('#rsvpList').innerText()).includes('Synthetic household'),'Disconnect clears private RSVPs');check(await a.locator('#rsvpSavedStatus').isHidden(),'Disconnect clears RSVP save status');check(await a.locator('#photoExtras').isHidden(),'Disconnect clears photo activity');check(await a.locator('#tvSlideshow').isHidden(),'Disconnect closes an active TV slideshow');
 await a.fill('#tikUrl','');await a.locator('#tikUrl').press('Enter');check(await a.locator('#familyPortal').evaluate(el=>el===document.activeElement),'Disconnect routes away from text inputs to invitation instructions');
 await checkSaveSounds();
 check(!errors.length,`No browser exceptions: ${errors.join(', ')}`);
 console.log(`PASS: ${checks} Chromium checks at 375, 430, 768, 1024 and 1440px. Supabase/media mocked; no physical mobile-browser or live playback validation.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
