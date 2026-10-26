// Mocked lifecycle tests: these do NOT establish browser/Android codec support.
import test from 'node:test';import assert from 'node:assert/strict';
import {Renderer,capability} from '../src/renderer.js';
function setup({bad=false}={}) {
 globalThis.window={isSecureContext:true,AudioContext:class{}};
 globalThis.HTMLCanvasElement=class{};HTMLCanvasElement.prototype.captureStream=()=>{};
 globalThis.document=new EventTarget();document.hidden=false;
 let ended=0,paused=0,disconnected=0;
 const context=new EventTarget();context.state='running';
 Object.defineProperty(context,'currentTime',{get:()=>performance.now()/1000});
 context.createMediaStreamDestination=()=>({stream:{getAudioTracks:()=>[{stop(){ended++}}]}});
 context.createOscillator=()=>({connect:()=>({connect(){}}),start(){},stop(){},disconnect(){}});
 context.createGain=()=>({gain:{value:0},disconnect(){}});
 const element=new EventTarget();let started=null;let position=0;
 Object.defineProperty(element,'currentTime',{get:()=>started===null?position:position+performance.now()/1000-started,set:v=>{position=v;queueMicrotask(()=>element.dispatchEvent(new Event('seeked')));}});
 element.play=async()=>{started=performance.now()/1000;};element.pause=()=>{paused++};element.ended=false;element.duration=120;
 const source={connect(){},disconnect(){disconnected++}};
 class Recorder{
  static isTypeSupported(){return true;}
  constructor(){this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob([bad?'invalid':'ftyp avc1 mp4a '+'.'.repeat(2000)])});this.onstop();});}
 }
 globalThis.MediaRecorder=window.MediaRecorder=Recorder;
 const audio={element};const renderer=new Renderer();renderer.bind=async()=>{renderer.context=context;renderer.source=source;};
 const canvas={height:720,width:1280,getContext:()=>({fillRect(){},drawImage(){},save(){},restore(){},beginPath(){},rect(){},clip(){}}),captureStream:()=>({addTrack(){},getTracks:()=>[{stop(){ended++}}]})};
 const clips=[{seconds:1,bitmap:{width:1280,height:720}}];
 return {renderer,opts:{canvas,clips,audio,total:.12,record:true,onProgress(){}},counts:()=>({ended,paused,disconnected})};
}
test('capability refuses missing encoder',()=>{setup();MediaRecorder.isTypeSupported=()=>false;assert.match(capability().error,/対応していません/);});
test('recorder lifecycle cleans tracks and retains output',async()=>{const s=setup();const blob=await s.renderer.run(s.opts);assert.equal(blob.type,'video/mp4');assert.ok(s.counts().ended>0);assert.ok(s.counts().paused>0);assert.ok(s.counts().disconnected>=2);});
test('invalid output is not presented as MP4',async()=>{const s=setup({bad:true});await assert.rejects(s.renderer.run(s.opts),/確認できません/);assert.ok(s.counts().ended>0);});
test('cancellation rejects and cleans resources',async()=>{const s=setup();const controller=new AbortController();setTimeout(()=>controller.abort(),40);await assert.rejects(s.renderer.run({...s.opts,total:2,signal:controller.signal}),/中止/);assert.ok(s.counts().ended>0);});
test('backgrounding rejects instead of succeeding',async()=>{const s=setup();setTimeout(()=>{document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));},40);await assert.rejects(s.renderer.run({...s.opts,total:2}),/非表示/);});

test('nonzero audio start keeps video clock at zero in preview and export',async()=>{
 for(const record of [false,true]){const s=setup();const progress=[];
 const result=await s.renderer.run({...s.opts,record,audioStart:80,onProgress:t=>progress.push(t)});
 assert.ok(progress.length>1);assert.ok(progress[0]<.05);assert.equal(progress.at(-1),s.opts.total);
 assert.ok(s.opts.audio.element.currentTime>=80);assert.equal(!!result,record);
 }
});
