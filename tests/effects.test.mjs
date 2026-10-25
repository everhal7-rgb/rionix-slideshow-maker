import test from 'node:test';import assert from 'node:assert/strict';
import {sceneAt,zoomAt,duration} from '../src/timeline.js';
const clips=[{id:'a',seconds:5},{id:'b',seconds:5},{id:'c',seconds:5}];
test('fade enters during outgoing tail and keeps total length',()=>{
 assert.equal(sceneAt(clips,4.1,.8).length,1);
 const mid=sceneAt(clips,4.6,.8);assert.equal(mid.length,2);assert.ok(Math.abs(mid[1].opacity-.5)<1e-10);
 assert.equal(sceneAt(clips,5,.8)[0].clip.id,'b');assert.equal(duration(clips),15);
 assert.equal(sceneAt(clips,15,.8)[0].clip.id,'c');assert.equal(sceneAt(clips,15,.8).length,1);
});
test('zoom progression is continuous across dissolve boundary',()=>{
 const before=sceneAt(clips,4.999999,.8)[1];const after=sceneAt(clips,5,.8)[0];
 assert.ok(Math.abs(before.progress-after.progress)<1e-6);
 assert.equal(zoomAt('in',0),1);assert.equal(zoomAt('in',1),1.08);
 assert.equal(zoomAt('out',0),1.08);assert.equal(zoomAt('out',1),1);
 assert.equal(zoomAt('none',.6),1);
});
test('short clip fades do not overlap or jump',()=>{
 const short=[{id:'a',seconds:1},{id:'b',seconds:1},{id:'c',seconds:13}];
 assert.equal(sceneAt(short,.49,.8).length,1);
 assert.ok(Math.abs(sceneAt(short,.75,.8)[1].opacity-.5)<1e-10);
 assert.ok(Math.abs(sceneAt(short,.999999,.8)[1].progress-sceneAt(short,1,.8)[0].progress)<1e-6);
});
test('cut preserves legacy boundaries, reordered clips use new order',()=>{
 assert.equal(sceneAt(clips,4.99,0).length,1);assert.equal(sceneAt(clips,5,0)[0].clip.id,'b');
 assert.equal(sceneAt([...clips].reverse(),0,.8)[0].clip.id,'c');assert.deepEqual(sceneAt([],0,.8),[]);
});
