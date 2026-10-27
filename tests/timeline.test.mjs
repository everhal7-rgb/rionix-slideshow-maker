import test from 'node:test';import assert from 'node:assert/strict';import {duration,validate,clipAt} from '../src/timeline.js';
const clips=[{id:'a',seconds:5},{id:'b',seconds:7},{id:'c',seconds:8}];
test('cut boundaries and end clamp',()=>{assert.equal(duration(clips),20);assert.equal(clipAt(clips,4.999).id,'a');assert.equal(clipAt(clips,5).id,'b');assert.equal(clipAt(clips,12).id,'c');assert.equal(clipAt(clips,20).id,'c');});
test('reject invalid durations/count; accept 15, 30 and 60',()=>{for(const seconds of [0,-1,1.5,NaN,Infinity,21])assert.throws(()=>validate([seconds,seconds,seconds].map(seconds=>({seconds}))));assert.throws(()=>validate([]));assert.equal(validate(clips.slice(1)),15);assert.equal(validate(clips),20);assert.equal(validate([5,5,5].map(seconds=>({seconds}))),15);assert.equal(validate([10,10,10].map(seconds=>({seconds}))),30);});

import {distributeTime} from '../src/timeline.js';
test('1 to 10 images fit all targets with integer durations, preserving order and motion',()=>{
 for(let n=1;n<=10;n++)for(const total of [15,30,60]){
  const list=Array.from({length:n},(_,i)=>({id:i,seconds:5,motion:'out'}));
  distributeTime(list,total);assert.equal(validate(list),total);
  assert.ok(Math.max(...list.map(c=>c.seconds))-Math.min(...list.map(c=>c.seconds))<=1);
  list.forEach((c,i)=>{assert.equal(c.id,i);assert.equal(c.motion,'out');});
 }
 assert.throws(()=>validate(Array.from({length:11},()=>({seconds:2}))));
 assert.throws(()=>distributeTime([],15));
});

test('60 second boundaries and total limit',()=>{
 assert.equal(validate([{seconds:60}]),60);
 assert.equal(validate([{seconds:30},{seconds:30}]),60);
 for(const list of [[{seconds:61}],[{seconds:30},{seconds:31}],[{seconds:14}]])assert.throws(()=>validate(list));
 const list=[{id:'a',seconds:20},{id:'b',seconds:20},{id:'c',seconds:20}];
 assert.equal(clipAt(list,39.999).id,'b');assert.equal(clipAt(list,40).id,'c');assert.equal(clipAt(list,60).id,'c');
});
