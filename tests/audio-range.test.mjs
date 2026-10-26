import test from 'node:test';import assert from 'node:assert/strict';
import {audioRange,seekAudio} from '../src/audio-range.js';
test('audio range rejects invalid starts and reports silence at track end',()=>{
 for(const v of ['', ' ',NaN,Infinity,-1,120,121])assert.throws(()=>audioRange(v,120,30));
 assert.deepEqual(audioRange('80',120,30),{start:80,end:110,silence:0});
 assert.deepEqual(audioRange(110.5,120,30),{start:110.5,end:120,silence:20.5});
 assert.deepEqual(audioRange(0,120,15),{start:0,end:15,silence:0});
});
test('seek waits for completion, supports cancellation and timeout',async()=>{
 globalThis.document=new EventTarget();document.hidden=false;
 const el=new EventTarget();el.pause=()=>{};el.currentTime=0;
 let resolved=false;const pending=seekAudio(el,80).then(()=>{resolved=true;});
 await Promise.resolve();assert.equal(resolved,false);assert.equal(el.currentTime,80);
 el.dispatchEvent(new Event('seeked'));await pending;assert.equal(resolved,true);
 const ctl=new AbortController();const cancelled=seekAudio(el,30,ctl.signal);ctl.abort();await assert.rejects(cancelled,/中止/);
 await assert.rejects(seekAudio(el,40,undefined,5),/読み込めません/);
 document.hidden=true;await assert.rejects(seekAudio(el,50),/非表示/);
});
