import {loadImages,loadAudio,disposeImages,disposeAudio} from './assets.js';
export function checkProject(p) {
  if(!p || p.version!==1 || !Array.isArray(p.clips) || p.clips.length>10) throw new Error('保存データの形式が違います。この版では読み込めません。');
  for(const c of p.clips) if(!(c.file instanceof Blob) || !['image/jpeg','image/png'].includes(c.file.type) || c.file.size>15*1024**2 || typeof c.name!=='string' || !Number.isFinite(c.seconds) || !['none','in','out'].includes(c.motion)) throw new Error('保存した画像・設定を読み込めません。');
  if(p.audio && (!(p.audio.file instanceof Blob) || p.audio.file.size>40*1024**2 || typeof p.audio.name!=='string')) throw new Error('保存した音声を読み込めません。');
  if(!p.settings || !['720','1080'].includes(p.settings.resolution) || !['0','0.4','0.8'].includes(p.settings.transition) || !Number.isFinite(p.settings.audioStart) || p.settings.audioStart<0) throw new Error('開始位置や出力設定を確認してください。');
  return p;
}
export function makeProject(clips,audio,settings) {
  return checkProject({version:1,savedAt:Date.now(),clips:clips.map(c=>({file:c.file,name:c.name,seconds:c.seconds,motion:c.motion})),audio:audio?{file:audio.file,name:audio.name}:null,settings});
}
export async function restoreProject(project) {
  const p=checkProject(project);let clips=[],audio=null;
  try{
    if(p.clips.length) clips=await loadImages(p.clips.map(c=>new File([c.file],c.name,{type:c.file.type})));
    clips.forEach((c,i)=>{c.seconds=p.clips[i].seconds;c.motion=p.clips[i].motion;});
    if(p.audio) audio=await loadAudio(new File([p.audio.file],p.audio.name,{type:p.audio.file.type}));
    return {clips,audio,settings:p.settings};
  }catch(e){disposeImages(clips);disposeAudio(audio);throw e;}
}
export function projectError(error) {
  return error?.name==='QuotaExceededError'?'端末の保存容量が足りません。画像を減らすか、端末の空き容量を増やしてください。以前の保存は維持されます。':(error?.message || '端末に保存できません。Chromeの通常モードとサイトデータの設定を確認してください。');
}
export function projectStore(action, project, dbName='rionix-slideshow-projects') {
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('このブラウザーでは端末保存を利用できません。Chromeの通常モードで開いてください。'));return;}
    const open=indexedDB.open(dbName,1);
    open.onupgradeneeded=()=>open.result.createObjectStore('projects');
    open.onerror=()=>reject(new Error('端末の保存領域を開けません。Chromeのサイトデータ設定を確認してください。'));
    open.onblocked=()=>reject(new Error('別のタブを閉じてから、もう一度お試しください。'));
    open.onsuccess=()=>{
      const db=open.result;db.onversionchange=()=>db.close();let tx,result;
      try{
        tx=db.transaction('projects',action==='save'?'readwrite':'readonly');
        const store=tx.objectStore('projects');
        const request=action==='save'?store.put(checkProject(project),'draft'):store.get('draft');
        request.onsuccess=()=>{result=request.result;};
        tx.oncomplete=()=>{db.close();resolve(action==='save'?project:result);};
        tx.onabort=()=>{db.close();reject(tx.error || new Error('保存処理に失敗しました。以前の保存は維持されます。'));};
        tx.onerror=()=>{};
      }catch(e){if(tx)tx.abort();db.close();reject(e);}
    };
  });
}
