import {checkPlan} from './edit-plan.js';
export const WORK_PROFILE='rionix-shared-draw-v1-30fps';
export const WORK_MAX_BYTES=80*1024**2;
export const planText=plan=>JSON.stringify(checkPlan(plan));
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export function requirePreview(plan,previewText){if(planText(plan)!==previewText)throw new Error('現在の編集で音付きプレビューを最後まで再生してください。');}
export async function makeWorkBundle(plan,files,previewText){
 requirePreview(plan,previewText);const p=checkPlan(plan),refs=[...p.clips.map(c=>c.asset),p.audio];
 if(refs.reduce((n,r)=>n+r.size,0)>WORK_MAX_BYTES)throw new Error('Work用の素材合計は80MB以下にしてください。');
 if(new Set(refs.map(r=>r.name)).size!==refs.length)throw new Error('素材名が重複しています。');
 const assets=[];
 for(const ref of refs){
  const matches=files.filter(f=>f.name===ref.name&&f.size===ref.size);
  if(matches.length!==1)throw new Error('素材が一致しません：'+ref.name);
  const bytes=new Uint8Array(await matches[0].arrayBuffer());
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  assets.push({...ref,sha256:await sha256(bytes),base64:btoa(binary)});
 }
 const manifest={profile:WORK_PROFILE,plan:p,assets:assets.map(({base64,...a})=>a)};
 const snapshotSha256=await sha256(new TextEncoder().encode(JSON.stringify(manifest)));
 return {format:'rionix-work-bundle',version:1,...manifest,snapshotSha256,previewCompleted:true,assets};
}
export async function verifyWorkBundle(bundle){
 if(bundle?.format!=='rionix-work-bundle'||bundle.version!==1||bundle.profile!==WORK_PROFILE||bundle.previewCompleted!==true)throw new Error('Unsupported Work bundle/profile');
 const p=checkPlan(bundle.plan),refs=[...p.clips.map(c=>c.asset),p.audio];
 if(!Array.isArray(bundle.assets)||bundle.assets.length!==refs.length||new Set(refs.map(r=>r.name)).size!==refs.length||refs.reduce((n,r)=>n+r.size,0)>WORK_MAX_BYTES)throw new Error('Invalid assets/limit');
 const assets=[];
 for(let i=0;i<refs.length;i++){
  const a=bundle.assets[i],r=refs[i];
  if(a.name!==r.name||a.size!==r.size||typeof a.base64!=='string'||a.base64.length!==4*Math.ceil(r.size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64))throw new Error('Invalid asset data');
  const bytes=Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0));
  if(bytes.length!==r.size||await sha256(bytes)!==a.sha256)throw new Error('Asset checksum mismatch');
  assets.push({name:r.name,size:r.size,sha256:a.sha256,bytes});
 }
 const manifest={profile:WORK_PROFILE,plan:p,assets:assets.map(({bytes,...a})=>a)};
 if(await sha256(new TextEncoder().encode(JSON.stringify(manifest)))!==bundle.snapshotSha256)throw new Error('Snapshot checksum mismatch');
 return {plan:p,assets,snapshotSha256:bundle.snapshotSha256};
}
