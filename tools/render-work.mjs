#!/usr/bin/env node
// Consume only the exact bundle downloaded from the application. No remote fetch.
import {readFile,writeFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyWorkBundle} from '../src/work-export.js';
const [input,output,expectedId]=process.argv.slice(2);
if(!input||!output||!expectedId)throw new Error('Usage: node tools/render-work.mjs downloaded.rionix.json new.mp4 full-snapshot-sha256');
const out=resolve(output),receipt=out+'.receipt.json';
for(const f of [out,receipt]){try{await stat(f);throw new Error('Output exists: '+f);}catch(e){if(e.code!=='ENOENT')throw e;}}
if((await stat(input)).size>115*1024**2)throw new Error('Bundle too large');
const source=await readFile(input),bundle=JSON.parse(source),verified=await verifyWorkBundle(bundle);
if(verified.snapshotSha256!==expectedId)throw new Error('Selected preview snapshot differs');
const dir=await mkdtemp(join(tmpdir(),'rionix-work-'));
try{
 for(const a of verified.assets)await writeFile(join(dir,a.name),a.bytes,{flag:'wx'});
 const planFile=join(dir,'__render-plan.json');await writeFile(planFile,JSON.stringify(verified.plan),{flag:'wx'});
 const script=new URL('./render-plan.mjs',import.meta.url);
 await new Promise((res,rej)=>{const c=spawn(process.execPath,[script.pathname,planFile,dir,out],{stdio:'inherit'});c.on('error',rej);c.on('close',code=>code===0?res():rej(new Error('Render failed '+code)));});
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const renderSources={};for(const name of ['src/timeline.js','src/captions.js','src/edit-plan.js','src/work-export.js','tools/render-plan.mjs'])renderSources[name]=sha(await readFile(new URL('../'+name,import.meta.url)));
 await writeFile(receipt,JSON.stringify({format:'rionix-render-receipt',version:1,snapshotSha256:verified.snapshotSha256,bundleSha256:sha(source),outputSha256:sha(await readFile(out)),profile:bundle.profile,plan:verified.plan,assets:bundle.assets.map(({base64,...a})=>a),renderSources,note:'Shared timeline, 30fps, H.264/AAC. Rasterization/fonts can differ from browser; user approval is a separate conversation step.'},null,2),{flag:'wx'});
 console.log(JSON.stringify({output:out,receipt,snapshotSha256:verified.snapshotSha256}));
}finally{await rm(dir,{recursive:true,force:true});}
