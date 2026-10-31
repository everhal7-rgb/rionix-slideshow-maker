import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorkBundle,verifyWorkBundle,planText,requirePreview} from '../src/work-export.js';
const img=new File([new Uint8Array([1,2,3])],'image.png',{type:'image/png'}),audio=new File([new Uint8Array([4,5])],'song.mp3',{type:'audio/mpeg'});
const p={format:'rionix-edit-plan',version:1,clips:[{asset:{name:img.name,size:img.size},seconds:15,motion:'in',caption:'test'}],audio:{name:audio.name,size:audio.size},settings:{resolution:'720',transition:'0',audioStart:40}};
test('exact preview, assets and timeline round trip; changes require preview again',async()=>{
 const b=await makeWorkBundle(p,[img,audio],planText(p));const v=await verifyWorkBundle(b);
 assert.deepEqual(v.plan,p);assert.deepEqual(v.assets[0].bytes,new Uint8Array([1,2,3]));
 assert.throws(()=>requirePreview({...p,settings:{...p.settings,audioStart:41}},planText(p)));
 assert.throws(()=>requirePreview(p,null));
 await assert.rejects(makeWorkBundle(p,[img],planText(p)));
});
test('reject tampering with timing, media, profile, preview and hash',async()=>{
 const good=await makeWorkBundle(p,[img,audio],planText(p));
 for(const mutate of [b=>b.plan.clips[0].seconds=16,b=>b.assets[0].base64='BAID',b=>b.profile='unknown',b=>b.previewCompleted=false,b=>b.snapshotSha256='0'.repeat(64),b=>b.assets[0].name='../x',b=>b.assets.pop()]){
  const b=structuredClone(good);mutate(b);await assert.rejects(verifyWorkBundle(b));
 }
});
