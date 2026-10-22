'use strict';
// Audio stays independent of persistence: a missing file or blocked speaker cannot fail a save.
function initFamilySound(){
  const controls=document.querySelector('#familySoundControls');
  const toggle=controls.querySelector('[data-sound-toggle]');
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return {play(){},stop(){}};
  let enabled=true,context,loading,active,resuming,generation=0;
  try{enabled=JSON.parse(localStorage.getItem('thanksgiving26_soundsEnabled')??'true')!==false;}catch{}
  function render(){toggle.textContent=enabled?'Sound on':'Sound off';toggle.setAttribute('aria-pressed',String(enabled));}
  function stop(){generation++;if(active){try{active.stop();}catch{}active=null;}}
  function loadClip(){
    if(!loading)loading=fetch(controls.dataset.soundSrc).then(response=>{if(!response.ok)throw new Error('Sound unavailable');return response.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).catch(()=>null);
    return loading;
  }
  function prepare(){
    if(!enabled||document.hidden)return;
    try{
      context||=new AudioContext();
      // This call must run during the tap/key gesture, before any database await.
      if(context.state!=='running')resuming=context.resume().catch(()=>{});
      loadClip();
    }catch{}
  }
  async function play(){
    stop();
    if(!enabled||!context||document.hidden)return false;
    const ticket=generation;
    try{
      await resuming;
      const buffer=await loadClip();
      if(!buffer||ticket!==generation||!enabled||document.hidden||context.state!=='running')return false;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=.7;source.connect(gain);gain.connect(context.destination);
      active=source;source.onended=()=>{source.disconnect();gain.disconnect();if(active===source)active=null;};
      try{source.start();return true;}catch{source.onended();return false;}
    }catch{return false;}
  }
  document.addEventListener('pointerdown',event=>{if(event.isTrusted)prepare();},{capture:true});
  document.addEventListener('keydown',event=>{if(event.isTrusted&&(event.key==='Enter'||event.key===' '))prepare();},{capture:true});
  document.addEventListener('submit',event=>{if(event.isTrusted)prepare();},{capture:true});
  toggle.addEventListener('click',()=>{
    enabled=!enabled;stop();
    try{localStorage.setItem('thanksgiving26_soundsEnabled',JSON.stringify(enabled));}catch{}
    render();if(enabled)prepare();
  });
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  render();controls.hidden=false;
  return {play,stop};
}
