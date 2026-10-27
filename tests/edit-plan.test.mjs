import test from 'node:test';import assert from 'node:assert/strict';
import {exportPlan,preparePlan,checkPlan} from '../src/edit-plan.js';
const file={name:'a.png',size:10},clips=[{file,seconds:15,motion:'none',caption:'old',bitmap:{}}],audio={file:{name:'a.wav',size:20},element:{duration:100}},settings={resolution:'720',transition:'0',audioStart:0};
test('structured edit plan can roundtrip and changes only editing fields',()=>{
 const p=exportPlan(clips,audio,settings);p.clips[0].caption='new';p.clips[0].motion='in';p.settings.audioStart=80;
 const next=preparePlan(JSON.stringify(p),clips,audio);assert.equal(next.clips[0].caption,'new');assert.equal(next.clips[0].bitmap,clips[0].bitmap);assert.equal(clips[0].caption,'old');assert.equal(next.settings.audioStart,80);
});
test('invalid and mismatched plans cannot mutate existing media',()=>{
 const p=exportPlan(clips,audio,settings);
 for(const mutate of [x=>x.clips[0].asset.name='../secret',x=>x.audio.size++,x=>x.clips[0].seconds=61,x=>x.clips[0].motion='script',x=>x.settings.audioStart=100,x=>x.clips[0].asset.size++,x=>x.clips=[]]){
  const copy=structuredClone(p);mutate(copy);assert.throws(()=>preparePlan(JSON.stringify(copy),clips,audio));
 }
 assert.throws(()=>preparePlan(' '.repeat(20001),clips,audio));assert.equal(clips[0].caption,'old');
 const clean=checkPlan({...p,url:'https://untrusted.test',script:'do not execute'});assert.equal(clean.script,undefined);assert.equal(clean.url,undefined);
});
