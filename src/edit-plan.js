import {validate} from './timeline.js';
const ref=f=>({name:f.name,size:f.size});
export function checkPlan(p){
 if(!p||p.format!=='rionix-edit-plan'||p.version!==1||!Array.isArray(p.clips))throw new Error('RIONIX編集設定 version 1 を指定してください。');
 const asset=a=>a&&typeof a.name==='string'&&a.name.length>0&&a.name.length<=255&&!/[\\/\x00-\x1f]/.test(a.name)&&Number.isSafeInteger(a.size)&&a.size>0;
 if(p.clips.some(c=>!asset(c.asset)||!['none','in','out'].includes(c.motion))||!asset(p.audio))throw new Error('素材名・サイズ・動きの設定が不正です。');
 validate(p.clips);
 if(new Set(p.clips.map(c=>c.asset.name)).size!==p.clips.length)throw new Error('同名画像は区別できません。素材名を変更してください。');
 if(!p.settings||!['720','1080'].includes(p.settings.resolution)||!['0','0.4','0.8'].includes(p.settings.transition)||!Number.isFinite(p.settings.audioStart)||p.settings.audioStart<0)throw new Error('出力設定が不正です。');
 return {format:p.format,version:1,clips:p.clips.map(c=>({asset:{name:c.asset.name,size:c.asset.size},seconds:Number(c.seconds),motion:c.motion,caption:c.caption||''})),audio:{name:p.audio.name,size:p.audio.size},settings:{resolution:p.settings.resolution,transition:p.settings.transition,audioStart:p.settings.audioStart}};
}
export function exportPlan(clips,audio,settings){if(!audio)throw new Error('音声を読み込んでください。');return checkPlan({format:'rionix-edit-plan',version:1,clips:clips.map(c=>({asset:ref(c.file),seconds:c.seconds,motion:c.motion,caption:c.caption||''})),audio:ref(audio.file),settings});}
export function preparePlan(text,clips,audio){
 if(text.length>20000)throw new Error('編集設定は20,000文字以下にしてください。');
 let p;try{p=checkPlan(JSON.parse(text));}catch(e){throw new Error('設定を読み込めません：'+e.message);}
 const same=(a,f)=>f&&a.name===f.name&&a.size===f.size;
 if(!same(p.audio,audio?.file))throw new Error('音声の名前・サイズが一致しません。同じ素材を読み込んでください。');
 if(p.clips.length!==clips.length)throw new Error('読み込んだ画像枚数と設定の枚数が一致しません。');
 const next=p.clips.map(c=>{const matches=clips.filter(x=>same(c.asset,x.file));if(matches.length!==1)throw new Error('画像が一致しないか重複しています：'+c.asset.name);return {...matches[0],seconds:c.seconds,motion:c.motion,caption:c.caption};});
 if(p.settings.audioStart>=audio.element.duration)throw new Error('音声の開始位置が曲の長さを超えています。');
 return {clips:next,settings:p.settings};
}
