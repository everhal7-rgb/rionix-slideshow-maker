import test from 'node:test';import assert from 'node:assert/strict';
import {makeProject,checkProject,restoreProject,projectError} from '../src/project.js';
const settings={resolution:'1080',transition:'0.8',audioStart:80};
test('snapshot retains source blobs and editing state, not runtime URLs',()=>{
 const file=new File(['image'],'a.png',{type:'image/png'}),music=new File(['music'],'a.mp3',{type:'audio/mpeg'});
 const p=makeProject([{file,name:'a.png',seconds:7,motion:'out'}],{file:music,name:'a.mp3',url:'blob:temporary'},settings);
 const copy=structuredClone(p);assert.equal(checkProject(copy),copy);assert.equal(copy.clips[0].seconds,7);assert.equal(copy.clips[0].motion,'out');assert.equal(copy.settings.audioStart,80);assert.equal(copy.audio.url,undefined);assert.equal(copy.audio.file.size,5);
});
test('unfinished project can be saved; incompatible/corrupt data is rejected',async()=>{
 assert.equal(makeProject([],null,settings).clips.length,0);
 for(const p of [null,{version:2,clips:[]}, {version:1,clips:[],settings:{...settings,audioStart:NaN}}])assert.throws(()=>checkProject(p));
 const p=makeProject([],null,settings);assert.deepEqual(await restoreProject(p),{clips:[],audio:null,settings});
 assert.match(projectError({name:'QuotaExceededError'}),/容量/);
});
