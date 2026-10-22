'use strict';
// Audio stays independent of persistence: a missing file or blocked speaker cannot fail a save.
function initFamilySound(){
  const clipSrc=document.querySelector('#familySoundScript')?.dataset.soundSrc;
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext||!clipSrc)return {play(){},stop(){}};
  let context,loading,active,resuming,generation=0;
  function stop(){generation++;if(active){try{active.stop();}catch{}active=null;}}
  function loadClip(){
    if(!loading)loading=fetch(clipSrc).then(response=>{if(!response.ok)throw new Error('Sound unavailable');return response.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).catch(()=>null);
    return loading;
  }
  function prepare(){
    if(document.hidden)return;
    try{
      context||=new AudioContext();
      // This call must run during the tap/key gesture, before any database await.
      if(context.state!=='running')resuming=context.resume().catch(()=>{});
      loadClip();
    }catch{}
  }
  async function play(){
    stop();
    if(!context||document.hidden)return false;
    const ticket=generation;
    try{
      await resuming;
      const buffer=await loadClip();
      if(!buffer||ticket!==generation||document.hidden||context.state!=='running')return false;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=.7;source.connect(gain);gain.connect(context.destination);
      active=source;source.onended=()=>{source.disconnect();gain.disconnect();if(active===source)active=null;};
      try{source.start();return true;}catch{source.onended();return false;}
    }catch{return false;}
  }
  document.addEventListener('pointerdown',event=>{if(event.isTrusted)prepare();},{capture:true});
  document.addEventListener('keydown',event=>{if(event.isTrusted&&(event.key==='Enter'||event.key===' '))prepare();},{capture:true});
  document.addEventListener('submit',event=>{if(event.isTrusted)prepare();},{capture:true});
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return {play,stop};
}
