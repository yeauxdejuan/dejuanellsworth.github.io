// Synthetic shared HTTP fixtures. External hosts are mocked; no production data is touched.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const root=new URL('../',import.meta.url);
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#d6a34a"/><path d="M0 600 600 100 1200 600" fill="#b65a32"/></svg>';
const image='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
const tables={thanksgiving_dishes:[],thanksgiving_games:[],thanksgiving_tiktoks:[],thanksgiving_photos:[]};
let failClaim=false,holdClaim=null,uploads=0,checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const stub=`window.supabase={createClient(){
const session=()=>JSON.parse(localStorage.getItem('testSession')||'null');
const request=async(body)=>{try{return await (await fetch('/__test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,user:session()?.user.id})})).json();}catch{return {data:null,error:{message:'Network error'}};}};
return {auth:{async getSession(){return {data:{session:session()},error:null};},async signInAnonymously(){const s={user:{id:crypto.randomUUID()}};localStorage.setItem('testSession',JSON.stringify(s));return {data:{session:s},error:null};},async signOut(){localStorage.removeItem('testSession');localStorage.removeItem('testMember');return {error:null};}},
async rpc(name,args){if(name==='is_ellsworth_member')return {data:localStorage.getItem('testMember')==='yes',error:null};if(name==='join_ellsworth_family'){localStorage.setItem('testMember','yes');return {data:true,error:null};}return request({operation:'rpc',args});},
from(table){let operation='select',value=null,filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},insert(v){operation='insert';value=v;return q;},then(ok,bad){return request({operation,table,value,filters}).then(ok,bad);}};return q;},
storage:{from(){return {async upload(){return request({operation:'upload'});},async createSignedUrl(){return {data:{signedUrl:${JSON.stringify(image)}},error:null};}};}}};}};`;
const server=createServer(async(req,res)=>{
try{
 if(req.url==='/__test'){
  let text='';for await(const c of req)text+=c;const b=JSON.parse(text);let data=null,error=null;
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
  else if(b.operation==='insert'){const row={...b.value,id:b.value.id||crypto.randomUUID()};if(b.table==='thanksgiving_dishes')row.signups=[];tables[b.table].push(row);}
  else data=tables[b.table].filter(row=>b.filters.every(([k,v])=>row[k]===v));
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error}));return;
 }
 const path=req.url==='/'?'index.html':req.url.slice(1).split('?')[0];
 if(!['index.html','assets/autumn-leaf.svg'].includes(path)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',path.endsWith('svg')?'image/svg+xml':'text/html');res.end(await readFile(new URL(path,root)));
}catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
const errors=[];
async function newPage(width=1440,options={}){
 const context=await browser.newContext({viewport:{width,height:1000},...options});
 await context.route('**/*',async route=>{
  const u=route.request().url();if(u.startsWith(url)||u.startsWith('data:'))return route.continue();
  if(u.includes('/supabase.min.js'))return route.fulfill({contentType:'application/javascript',body:stub});
  if(u.startsWith('https://a0.muscache.com')||u.startsWith('https://example.test'))return route.fulfill({contentType:'image/svg+xml',body:svg});
  if(u.startsWith('https://fonts.'))return route.fulfill({contentType:'text/css',body:''});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock external media</title>'});
 });
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);return p;
}
async function join(p){await p.locator('#familyPortal').waitFor({state:'visible'});await p.fill('#familyCode','synthetic-test-code-only-2026');await p.click('#joinFamilyBtn');await p.waitForFunction(()=>isShared&&menuReady);}
async function signup(p,name,dish='mac'){await p.locator(`[data-dish-id="${dish}"]`).click();await p.fill('#claimName',name);await p.fill('#claimNote','Synthetic test note');await p.locator('#claimForm button[type=submit]').click();await p.locator('#modalBackdrop').waitFor({state:'hidden'});}
async function checkInvitationRouting(p){
 let pickers=0;const onPicker=()=>pickers++;p.on('filechooser',onPicker);
 const expectCode=async label=>{
  check(await p.locator('#familyPortal').evaluate(el=>el===document.activeElement),`${label} focuses invitation instructions without activating an input`);
  await p.waitForFunction(()=>{const r=document.querySelector('#familyPortalTitle').getBoundingClientRect();return r.top>=80&&r.bottom<=innerHeight;});
  check(await p.locator('#modalBackdrop').isHidden(),`${label} leaves contribution forms closed`);
 };
 for(const label of await p.locator('label[for="photoUpload"]').all()){
  await label.click();await expectCode('Photo picker click');
  for(const key of ['Enter','Space']){await label.focus();await label.press(key);await expectCode(`Photo picker ${key}`);}
 }
 check(pickers===0,'Logged-out photo actions never open the file picker');p.off('filechooser',onPicker);
 await p.click('#addPhotoUrlBtn');await expectCode('Photo link');
 await p.click('#addGameBtn');await expectCode('Game suggestion');
 for(const value of ['', 'not-a-url', 'https://www.tiktok.com/@test/video/1234567890123456789']){
  await p.fill('#tikUrl',value);await p.locator('#tikForm button').click();await expectCode(`TikTok button with ${value?'entered':'empty'} URL`);
 }
 await p.fill('#tikUrl','');await p.locator('#tikUrl').press('Enter');await expectCode('TikTok keyboard submit');
 check(uploads===0&&tables.thanksgiving_photos.length===0&&tables.thanksgiving_tiktoks.length===0&&tables.thanksgiving_games.length===0,'Logged-out attempts do not save contributions');
}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const mobile=await newPage(375,{isMobile:true,hasTouch:true});await checkInvitationRouting(mobile);await mobile.context().close();
 const a=await newPage();await checkInvitationRouting(a);await join(a);
 await a.locator('#tikForm button').click();check(await a.locator('#tikUrl').evaluate(el=>el===document.activeElement&&!el.validity.valid),'Joined TikTok form still validates empty URLs');
 let release;holdClaim=new Promise(r=>release=r);await a.locator('[data-dish-id="mac"]').click();await a.fill('#claimName','Test cook A');await a.locator('#claimForm button[type=submit]').click();
 check(!(await a.locator('#toast').innerText()).includes('sign-up is saved'),'No success before database confirmation');check(await a.locator('#claimForm button[type=submit]').isDisabled(),'Double submission disabled');release();await a.locator('#modalBackdrop').waitFor({state:'hidden'});
 check((await a.locator('[data-dish-id="mac"]').locator('..').innerText()).includes('1/3 assigned'),'First signup count');
 const b=await newPage(430);await join(b);await signup(b,'Test cook B');await a.click('#refreshMenuBtn');await a.waitForFunction(()=>combinedMenu().find(d=>d.id==='mac').signups.length===2);
 check((await a.locator('#dishBoard').innerText()).includes('Test cook B'),'Independent sessions synchronize');
 const c=await newPage(375);await join(c);await signup(c,'Test cook C');const d=await newPage(768);await join(d);check(await d.locator('[data-dish-id="mac"]').isDisabled(),'Fourth account sees Full');
 await a.click('#refreshMenuBtn');await a.locator('[data-dish-id="mac"]').click();await a.click('#releaseDish');await a.locator('#modalBackdrop').waitFor({state:'hidden'});await d.click('#refreshMenuBtn');await d.waitForFunction(()=>!document.querySelector('[data-dish-id="mac"]').disabled);await signup(d,'Test cook D');check(tables.thanksgiving_dishes.find(d=>d.id==='mac').signups.length===3,'Released slot reclaimed');
 failClaim=true;await a.locator('[data-dish-id="ham"]').click();await a.fill('#claimName','Test failure');await a.locator('#claimForm button[type=submit]').click();await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not save'));check(await a.locator('#modalBackdrop').isVisible(),'Failure keeps form open');await a.click('#modalClose');
 await a.click('#addDishBtn');await a.fill('#newDishName','Test custom dish');await a.locator('#dishForm button').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_dishes.some(d=>d.label==='Test custom dish'),'Custom dish saved');
 await a.reload();await a.waitForFunction(()=>isShared&&menuReady);check(await a.locator('#familyPortal').isHidden(),'Mock session restores');
 tables.thanksgiving_dishes.push({event_id:'ellsworth-thanksgiving-2026',id:'long',label:'L'.repeat(90),category:'Other family favorites',signups:[{slot:1,user_id:'fixture',assignee:'N'.repeat(75),note:'X'.repeat(130)}]});await a.click('#refreshMenuBtn');await a.waitForFunction(()=>combinedMenu().some(d=>d.id==='long'));
 await mkdir(new URL('artifacts/',import.meta.url),{recursive:true});
 for(const width of [375,430,768,1024,1440]){await a.setViewportSize({width,height:1000});check(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow at ${width}px`);await a.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await a.screenshot({animations:'disabled',path:new URL(`artifacts/${width}.png`,import.meta.url).pathname,fullPage:true});}
 await a.setViewportSize({width:375,height:1000});await a.locator('[data-house-photo="4"]').click();check((await a.locator('#housePhotoCaption').innerText()).startsWith('5 / 5'),'Fifth photo reachable');await a.keyboard.press('ArrowRight');check((await a.locator('#housePhotoCaption').innerText()).startsWith('1 / 5'),'Gallery keyboard wrap');
 await a.locator('#lightboxImage').evaluate(el=>{for(const [type,x,y] of [['touchstart',300,150],['touchend',100,155]])el.dispatchEvent(new TouchEvent(type,{changedTouches:[new Touch({identifier:1,target:el,clientX:x,clientY:y})]}));});check((await a.locator('#housePhotoCaption').innerText()).startsWith('2 / 5'),'Swipe changes photo');
 await a.keyboard.press('Tab');await a.keyboard.press('Tab');await a.keyboard.press('Tab');check(await a.locator('#lightboxClose').evaluate(el=>el===document.activeElement),'Lightbox traps focus');await a.keyboard.press('Escape');check(await a.locator('[data-house-photo="4"]').evaluate(el=>el===document.activeElement),'Lightbox restores focus');
 await a.click('#addPhotoUrlBtn');await a.fill('#photoUrl','https://example.test/synthetic.jpg');await a.fill('#photoAlt','Synthetic family photo');await a.locator('#photoUrlForm button').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_photos.length===1,'Photo link saved');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/uPgAAAAASUVORK5CYII=','base64');await a.setInputFiles('#photoUpload',{name:'synthetic.png',mimeType:'image/png',buffer:png});await a.waitForFunction(()=>photos.length===2);check(uploads===1&&tables.thanksgiving_photos.length===2,'Synthetic upload compressed and indexed');await a.click('#photoNext');check((await a.locator('#slideCount').innerText())==='2 / 2','Slideshow next');await a.click('#photoPause');
 await a.click('#addGameBtn');await a.fill('#gameName','Test game');await a.fill('#gameDesc','Synthetic description');await a.locator('#gameForm button').click();await a.locator('#modalBackdrop').waitFor({state:'hidden'});check(tables.thanksgiving_games.some(g=>g.name==='Test game'),'Game suggestion saved');
 check(await a.evaluate(()=>!parseTikTok('https://tiktok.com.evil.test/@x/video/1234567890123456789')&&!parseTikTok('http://www.tiktok.com/@x/video/1234567890123456789')&&!parseTikTok('https://www.tiktok.com/@x/video/1234567890123456789/extra')),'TikTok rejects invalid URLs');
 for(const [i,id] of ['1234567890123456789','1234567890123456790'].entries()){await a.fill('#tikUrl',`https://www.tiktok.com/@test/video/${id}?tracking=test`);await a.locator('#tikForm button').click();await a.waitForFunction(n=>tikPlaylist.length===n,i+1);}
 check(await a.locator('#tikLoad').count()===0,'No extra Play video button');check(await a.locator('#tiktokGrid iframe').count()===1,'One embedded player ready without a loading click');check((await a.locator('#tikPlayer').getAttribute('src')).includes('autoplay=0&loop=0'),'Autoplay disabled');check(await a.locator('#tikNext').isDisabled(),'Next starts disabled');
 const send=async(type,value,origin='https://www.tiktok.com',source=true)=>a.evaluate(({type,value,origin,source})=>window.dispatchEvent(new MessageEvent('message',{origin,source:source?document.querySelector('#tikPlayer').contentWindow:window,data:{'x-tiktok-player':true,type,value}})),{type,value,origin,source});
 await send('onStateChange',0);check(await a.locator('#tikNext').isDisabled(),'Initial ended event ignored');await send('onStateChange',1);await send('onStateChange',0,'https://evil.test');await send('onStateChange',0,'https://www.tiktok.com',false);check(await a.locator('#tikNext').isDisabled(),'Wrong origin and source ignored');
 await a.evaluate(()=>document.querySelector('#tikPlayer').dataset.retained='yes');await a.evaluate(()=>refreshTiktoks());check(await a.locator('#tikPlayer').getAttribute('data-retained')==='yes','Refresh preserves player');await send('onStateChange',0);check(await a.locator('#tikNext').isEnabled(),'Completion unlocks Next');const previousPlayer=await a.locator('#tikPlayer').elementHandle();const previousSrc=await a.locator('#tikPlayer').getAttribute('src');await a.click('#tikNext');check(!(await previousPlayer.evaluate(el=>el.isConnected)),'Next unloads previous frame');check(await a.locator('#tikPlayer').count()===1&&(await a.locator('#tikPlayer').getAttribute('src'))!==previousSrc,'Next shows the next embedded player directly');check((await a.locator('#tikPlayer').getAttribute('src')).includes('autoplay=0&loop=0'),'Next video autoplay disabled');check(await a.locator('#tikNext').isDisabled(),'New video starts locked');await a.locator('.tik-fallback summary').click();await a.click('#tikManual');check(await a.locator('#tikNext').isEnabled(),'Manual navigation unlocks Next');check((await a.locator('#tikStatus').innerText()).includes('cannot be verified'),'Manual limitation visible');
 await a.click('#menuToggle');check(await a.locator('#navLinks').isVisible(),'Mobile nav opens');await a.locator('.nav-link[href="#menu"]').click();check(await a.locator('#navLinks').isHidden(),'Mobile nav closes');
 const reduced=await newPage(430,{reducedMotion:'reduce'});check(await reduced.locator('.falling-leaves').evaluate(el=>getComputedStyle(el).display==='none'),'Reduced motion hides leaves');check(await reduced.evaluate(()=>playing===false),'Reduced motion pauses slideshow');
 await a.click('#leaveFamilyBtn');check(await a.locator('#familyPortal').isVisible(),'Disconnect shows family access');check(await a.locator('#tiktokGrid iframe').count()===0,'Disconnect unloads video');
 await a.fill('#tikUrl','');await a.locator('#tikUrl').press('Enter');check(await a.locator('#familyPortal').evaluate(el=>el===document.activeElement),'Disconnect routes away from text inputs to invitation instructions');
 check(!errors.length,`No browser exceptions: ${errors.join(', ')}`);
 console.log(`PASS: ${checks} Chromium checks at 375, 430, 768, 1024 and 1440px. Supabase/media mocked; no physical mobile-browser or live playback validation.`);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
