import {drawFrame,releaseDrawBuffers} from './timeline.js';
export const MIME_TYPES=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1.42E028,mp4a.40.2'];
export function capability(){
  if (!window.isSecureContext) return {error:'HTTPSのURLをChromeで開いてください。'};
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream || !window.AudioContext) return {error:'このブラウザーには必要な録画機能がありません。Android Chromeを更新してください。'};
  const mime=MIME_TYPES.find(m=>MediaRecorder.isTypeSupported(m));
  return mime?{mime}:{error:'この端末ではH.264＋AACのMP4録画に対応していません。Chromeを更新して再確認してください。別形式をMP4と偽って保存することはありません。'};
}
export class Renderer {
  constructor(){this.context=null;this.audio=null;this.source=null;this.cancel=null;}
  async bind(audio){
    if(this.audio!==audio){
      if(this.context) await this.context.close();
      this.context=new AudioContext();this.audio=audio;
      this.source=this.context.createMediaElementSource(audio.element);
    }
    await this.context.resume();
    if(this.context.state!=='running') throw new Error('音声処理を開始できません。もう一度ボタンを押してください。');
  }
  async run({canvas,clips,audio,total,record,signal,onProgress,fadeSeconds=0}){
    const support=capability(); if(record&&support.error)throw new Error(support.error);
    let stream,recorder,dest,osc,gain,wake,timer,deadline,hidden,abort,stateChange,stalled,recDone;
    let stopped=false, failure=null, chunks=[], bytes=0;
    const contextPromise=this.bind(audio);
    try{
      await contextPromise;
      const context=this.context, el=audio.element;
      this.source.disconnect(); el.currentTime=0; el.volume=1;
      // Keep audio stream alive after a short source ends, padding the remainder with silence.
      if(record){
        dest=context.createMediaStreamDestination(); this.source.connect(dest);
        osc=context.createOscillator();gain=context.createGain();gain.gain.value=0;
        osc.connect(gain).connect(dest);osc.start();
        drawFrame(canvas,clips,0,fadeSeconds);stream=canvas.captureStream(30);
        for(const track of dest.stream.getAudioTracks())stream.addTrack(track);
        recorder=new MediaRecorder(stream,{mimeType:support.mime,videoBitsPerSecond:canvas.height===1080?8_000_000:4_500_000,audioBitsPerSecond:160_000});
        recDone=new Promise((resolve,reject)=>{
          recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>80*1024**2) stop(new Error('出力が80MBを超えました。720pで再試行してください。'));}};
          recorder.onerror=e=>stop(new Error('MP4エンコーダーが停止しました。720pで再試行してください。'+(e.error?.message||'')));
          recorder.onstop=()=>resolve();
        });
      } else this.source.connect(context.destination);
      const stop=err=>{
        if(stopped)return;stopped=true;failure=err||null;
        el.pause(); if(recorder&&recorder.state!=='inactive')recorder.stop();
      };
      this.cancel=()=>stop(new Error('中止しました。設定はそのままです。'));
      abort=()=>this.cancel?.();signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted)abort();
      hidden=()=>{if(document.hidden)stop(new Error('画面が非表示になったため中止しました。Chromeを前面にしたまま再試行してください。'));};
      document.addEventListener('visibilitychange',hidden);
      stateChange=()=>{if(context.state!=='running')stop(new Error('音声処理が一時停止しました。Chromeを前面にして再試行してください。'));};
      context.addEventListener('statechange',stateChange);
      stalled=()=>stop(new Error('音声の読み込みが停止しました。別のMP3で試してください。'));
      el.addEventListener('error',stalled);
      try{wake=await navigator.wakeLock?.request('screen');}catch{}
      if(stopped)throw failure;
      if(recorder)recorder.start(1000);
      const before=context.currentTime;
      await Promise.race([el.play(),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('音声を開始できません。別のMP3で試してください。')),10000);})]);
      clearTimeout(deadline);
      const start=context.currentTime-el.currentTime;
      if(start-before>0.25)throw new Error('音声の開始が遅れました。読み込み後にもう一度生成してください。');
      let last=performance.now();
      await new Promise(resolve=>{
        const tick=()=>{
          if(stopped){resolve();return;}
          const now=performance.now(), t=context.currentTime-start;
          if(now-last>350){stop(new Error('端末の描画が追いつきませんでした。720pに変更し、他のアプリを閉じて再試行してください。'));resolve();return;}
          last=now;
          // A media stall cannot silently create a desynchronized "successful" file.
          if(!el.ended && Math.abs(el.currentTime-t)>0.25){stop(new Error('音声同期が乱れたため中止しました。もう一度生成してください。'));resolve();return;}
          if(t>=total){stop();onProgress(total);resolve();return;}
          drawFrame(canvas,clips,Math.max(0,t),fadeSeconds);onProgress(Math.max(0,t));
          timer=setTimeout(tick,1000/30);
        };tick();
      });
      if(recDone)await Promise.race([recDone,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('録画の終了に失敗しました。再試行してください。')),10000);})]);
      if(failure)throw failure;
      if(!record)return null;
      const blob=new Blob(chunks,{type:'video/mp4'});
      const header=new TextDecoder('latin1').decode(await blob.slice(0,1024*1024).arrayBuffer());
      if(blob.size<1000 || !header.includes('ftyp') || !header.includes('avc1') || !header.includes('mp4a'))throw new Error('H.264＋AACのMP4を確認できませんでした。この端末では生成できない可能性があります。');
      return blob;
    } finally{
      releaseDrawBuffers(canvas);stopped=true;clearTimeout(timer);clearTimeout(deadline);this.cancel=null;
      audio.element.pause();
      if(recorder&&recorder.state!=='inactive')recorder.stop();
      stream?.getTracks().forEach(t=>t.stop());osc?.stop();osc?.disconnect();gain?.disconnect();this.source?.disconnect();
      document.removeEventListener('visibilitychange',hidden);signal?.removeEventListener('abort',abort);
      this.context?.removeEventListener('statechange',stateChange);audio.element.removeEventListener('error',stalled);
      await wake?.release().catch(()=>{});
    }
  }
}
