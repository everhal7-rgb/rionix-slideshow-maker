import test from 'node:test';import assert from 'node:assert/strict';import {duration,validate,clipAt} from '../src/timeline.js';
const clips=[{id:'a',seconds:5},{id:'b',seconds:7},{id:'c',seconds:8}];
test('cut boundaries and end clamp',()=>{assert.equal(duration(clips),20);assert.equal(clipAt(clips,4.999).id,'a');assert.equal(clipAt(clips,5).id,'b');assert.equal(clipAt(clips,12).id,'c');assert.equal(clipAt(clips,20).id,'c');});
test('reject invalid durations/count; accept 15 and 30',()=>{for(const seconds of [0,-1,1.5,NaN,Infinity,11])assert.throws(()=>validate([seconds,seconds,seconds].map(seconds=>({seconds}))));assert.throws(()=>validate([]));assert.equal(validate(clips.slice(1)),15);assert.equal(validate(clips),20);assert.equal(validate([5,5,5].map(seconds=>({seconds}))),15);assert.equal(validate([10,10,10].map(seconds=>({seconds}))),30);});

import {distributeTime} from '../src/timeline.js';
test('1 to 10 images fit either target with integer durations, preserving order and motion',()=>{
 for(let n=1;n<=10;n++)for(const total of [15,30]){
  const list=Array.from({length:n},(_,i)=>({id:i,seconds:5,motion:'out'}));
  distributeTime(list,total);assert.equal(validate(list),total);
  assert.ok(Math.max(...list.map(c=>c.seconds))-Math.min(...list.map(c=>c.seconds))<=1);
  list.forEach((c,i)=>{assert.equal(c.id,i);assert.equal(c.motion,'out');});
 }
 assert.throws(()=>validate(Array.from({length:11},()=>({seconds:2}))));
 assert.throws(()=>distributeTime([],15));
});
