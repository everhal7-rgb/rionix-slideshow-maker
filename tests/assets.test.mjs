import test from 'node:test';
import assert from 'node:assert/strict';
import {loadImages,disposeImages} from '../src/assets.js';
test('image batches append safely, reject capacity before decoding, and release failed batch',async()=>{
 const saved={createImageBitmap:globalThis.createImageBitmap,document:globalThis.document};
 const bitmaps=[];
 globalThis.createImageBitmap=async()=>{const b={width:1920,height:1080,closed:false,close(){this.closed=true;}};bitmaps.push(b);return b;};
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'thumb'})};
 const file={type:'image/jpeg',size:100,name:'photo.jpg'};
 try{
  const existing=await loadImages([file]);assert.equal(existing.length,1);assert.equal(existing[0].bitmap.closed,false);
  const added=await loadImages([file,file],existing.length);assert.equal(added.length,2);assert.equal(existing[0].bitmap.closed,false);
  const before=bitmaps.length;await assert.rejects(loadImages([file,file],9),/10枚/);assert.equal(bitmaps.length,before);
  await assert.rejects(loadImages([file,{...file,type:'image/gif'}],3),/JPEG/);
  assert.ok(bitmaps.slice(before).every(b=>b.closed));assert.equal(existing[0].bitmap.closed,false);
  globalThis.document.createElement=()=>{throw new Error('thumbnail failure');};
  const checkpoint=bitmaps.length;await assert.rejects(loadImages([file],3),/thumbnail failure/);assert.ok(bitmaps.slice(checkpoint).every(b=>b.closed));
  disposeImages([...existing,...added]);assert.ok(bitmaps.every(b=>b.closed));
 }finally{Object.assign(globalThis,saved);}
});
