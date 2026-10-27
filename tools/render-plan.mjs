#!/usr/bin/env node
// Local CLI only. No listener, API key, network requests, or shell interpolation.
import {readFile,realpath,stat,unlink} from 'node:fs/promises';
import {resolve,basename,sep} from 'node:path';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {checkPlan} from '../src/edit-plan.js';
import {drawFrame,releaseDrawBuffers} from '../src/timeline.js';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const [planFile,assetDir,output]=process.argv.slice(2);
if(!planFile||!assetDir||!output)throw new Error('Usage: node tools/render-plan.mjs plan.json assets-dir new-output.mp4');
const text=await readFile(planFile,'utf8');if(text.length>20000)throw new Error('Plan too large');
const p=checkPlan(JSON.parse(text)),root=await realpath(assetDir),out=resolve(output);
try{await stat(out);throw new Error('Output exists; choose a new output name');}catch(e){if(e.code!=='ENOENT')throw e;}
async function asset(ref,max){
 if(ref.name!==basename(ref.name))throw new Error('Invalid asset name');
 const path=await realpath(resolve(root,ref.name));if(!path.startsWith(root+sep))throw new Error('Asset outside approved directory');
 const s=await stat(path);if(s.size!==ref.size||s.size>max)throw new Error('Asset size mismatch/limit');return path;
}
const clips=[];
for(const c of p.clips){
 if(!/\.(png|jpe?g)$/i.test(c.asset.name))throw new Error('Only PNG/JPEG images are accepted');
 const path=await asset(c.asset,15*1024**2),image=await loadImage(path);if(image.width*image.height>50_000_000)throw new Error('Image too large');
 const scale=Math.min(1,1920/Math.max(image.width,image.height)),bitmap=createCanvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));bitmap.getContext('2d').drawImage(image,0,0,bitmap.width,bitmap.height);clips.push({...c,bitmap});
}
const audio=await asset(p.audio,40*1024**2);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',audio],{encoding:'utf8'});
if(probe.status!==0)throw new Error('Cannot probe audio');const length=Number(JSON.parse(probe.stdout).format.duration);
if(!Number.isFinite(length)||p.settings.audioStart>=length)throw new Error('Audio start outside source');
const h=Number(p.settings.resolution),w=h*16/9,total=clips.reduce((s,c)=>s+c.seconds,0),canvas=createCanvas(w,h);
globalThis.document={createElement:()=>createCanvas(w,h)};
const args=['-v','error','-nostdin','-n','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-ss',String(p.settings.audioStart),'-i',audio,'-map','0:v','-map','1:a','-af','apad','-t',String(total),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',out];
const child=spawn('ffmpeg',args,{stdio:['pipe','inherit','inherit']});const done=once(child,'close');let failed;
child.stdin.on('error',e=>{failed=e;});
const watchdog=setTimeout(()=>child.kill('SIGKILL'),300000);
try{
 for(let f=0;f<total*30;f++){
  if(failed)throw failed;drawFrame(canvas,clips,f/30,Number(p.settings.transition));
  if(!child.stdin.write(canvas.toBuffer('image/png')))await once(child.stdin,'drain');
  if(f%150===0)console.log(`Rendered ${f/30}/${total}s`);
 }
 child.stdin.end();const [code]=await done;if(code!==0)throw new Error('FFmpeg failed');
 if((await stat(out)).size>80*1024**2)throw new Error('Output exceeds 80MiB');
 console.log(JSON.stringify({output:out,total,frames:total*30,renderer:'shared drawFrame + native Canvas + FFmpeg',note:'Not browser MediaRecorder; fonts/codecs may differ'}));
}catch(e){child.kill('SIGKILL');await unlink(out).catch(()=>{});throw e;}finally{clearTimeout(watchdog);releaseDrawBuffers(canvas);}
