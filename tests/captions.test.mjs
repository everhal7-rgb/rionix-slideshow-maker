import test from 'node:test';import assert from 'node:assert/strict';
import {validCaption,captionLines,drawCaption} from '../src/captions.js';
import {drawFrame} from '../src/timeline.js';
import {makeProject,checkProject} from '../src/project.js';
const ctx={save(){},restore(){},fillRect(){},drawImage(){},beginPath(){},rect(){},clip(){},measureText:t=>({width:[...t].length*20}),strokeText(){},fillText(){}};
test('captions validate length and line breaks; wrap without dropping text',()=>{
 for(const s of [undefined,'','日本語\n歌詞','あ'.repeat(80)])assert.ok(validCaption(s));
 for(const s of [null,123,'あ'.repeat(81),'a\nb\nc\nd'])assert.ok(!validCaption(s));
 assert.deepEqual(captionLines(ctx,'あいうえお\nABC',60),['あいう','えお','ABC']);
 const text='👩‍👩‍👧‍👦あ';assert.equal(captionLines({measureText:t=>({width:t.length*20})},text,20)[0],'👩‍👩‍👧‍👦');
});
test('caption draws once after images and changes at exact timeline boundary',()=>{
 const words=[],canvas={width:1280,height:720,getContext:()=>({...ctx,fillText:t=>words.push(t)})};
 const clips=[{seconds:5,caption:'前半',bitmap:{width:100,height:100}},{seconds:10,caption:'後半',bitmap:{width:100,height:100}}];
 globalThis.document={createElement:()=>canvas};
 drawFrame(canvas,clips,4.8,.8);assert.deepEqual(words,['前半']);words.length=0;
 drawFrame(canvas,clips,5,.8);assert.deepEqual(words,['後半']);words.length=0;
 drawCaption(canvas,'');assert.deepEqual(words,[]);
});
test('caption survives project snapshot; legacy projects and invalid captions',()=>{
 const file=new File(['x'],'a.png',{type:'image/png'}),settings={resolution:'720',transition:'0.8',audioStart:80};
 const p=makeProject([{file,name:'a.png',seconds:60,motion:'out',caption:'曲名\nRIONIX PROJECT'}],null,settings);
 const copy=structuredClone(p);assert.equal(checkProject(copy).clips[0].caption,'曲名\nRIONIX PROJECT');
 delete copy.clips[0].caption;assert.equal(checkProject(copy),copy);
 copy.clips[0].caption=42;assert.throws(()=>checkProject(copy));
});
