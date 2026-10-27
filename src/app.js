import {exportPlan,preparePlan} from './edit-plan.js';
import {makeProject,restoreProject,projectStore,projectError} from './project.js';
import {audioRange} from './audio-range.js';
import {duration,validate,draw,distributeTime} from './timeline.js';
import {loadImages,loadAudio,disposeImages,disposeAudio} from './assets.js';
import {Renderer,capability} from './renderer.js';
const $=id=>document.getElementById(id), renderer=new Renderer();
let clips=[],audio=null,busy=false,resultURL=null,resultBlob=null,controller;
let dirty=false;
const support=capability();
$('capability').textContent=support.error||'このブラウザーはMP4録画対応を申告しています。実際の生成で確認します。';
function status(text,error=false){$('status').textContent=text;$('status').className=error?'status error':'status';}
function clearResult(changed=true){if(changed){dirty=true;$('projectStatus').textContent='未保存の変更があります。「この端末に保存」を押してください。';}if(resultURL)URL.revokeObjectURL(resultURL);resultURL=null;resultBlob=null;$('result').hidden=true;$('video').removeAttribute('src');$('video').load();}
function setBusy(value){
  busy=value;$('getPlan').disabled=value;$('applyPlan').disabled=value;$('editPlan').disabled=value;$('saveProject').disabled=value||(!clips.length&&!audio);$('loadProject').disabled=value;let valid=true;try{validate(clips);if(audio)audioRange($('audioStart').value,audio.element.duration,duration(clips));}catch{valid=false;}
  $('editor').disabled=value;$('images').disabled=value||clips.length>=10;
  $('fit15').disabled=value||!clips.length;$('fit30').disabled=value||!clips.length;$('fit60').disabled=value||!clips.length;
  $('preview').disabled=value||!valid||!audio;
  $('generate').disabled=value||!valid||!audio||!!support.error;
  $('cancel').hidden=!value||!controller;
}
function update(){
  $('clips').replaceChildren();
  clips.forEach((clip,index)=>{
    const row=document.createElement('article');row.className='clip';
    const img=document.createElement('img');img.src=clip.thumb;img.alt=`画像${index+1}`;
    const body=document.createElement('div');body.className='clipbody';
    const title=document.createElement('strong');title.textContent=`${index+1}. ${clip.name}`;
    const label=document.createElement('label');label.textContent='表示時間（秒）';
    const input=document.createElement('input');input.type='number';input.min=1;input.max=60;input.step=1;input.inputMode='numeric';input.value=clip.seconds;input.setAttribute('aria-label',`画像${index+1}の秒数`);
    input.oninput=()=>{clip.seconds=Number(input.value);clearResult();summary();setBusy(busy);};label.append(input);
    const buttons=document.createElement('div');buttons.className='move';
    for(const [delta,text] of [[-1,'↑ 前へ'],[1,'↓ 後へ']]){
      const button=document.createElement('button');button.type='button';button.textContent=text;button.disabled=index+delta<0||index+delta>=clips.length;
      button.setAttribute('aria-label',`画像${index+1}を${delta<0?'前':'後'}へ`);
      button.onclick=()=>{[clips[index],clips[index+delta]]=[clips[index+delta],clips[index]];clearResult();update();};buttons.append(button);
    }
    const remove=document.createElement('button');remove.type='button';remove.textContent='削除';remove.setAttribute('aria-label',`画像${index+1}を削除`);
    remove.onclick=()=>{disposeImages(clips.splice(index,1));clearResult();update();status('画像を削除しました。合計時間を確認してください。');};buttons.append(remove);
    const motionLabel=document.createElement('label');motionLabel.textContent='画像の動き';
    const motion=document.createElement('select');motion.setAttribute('aria-label',`画像${index+1}の動き`);
    for(const [value,text] of [['none','動かさない'],['in','ゆっくり寄る'],['out','ゆっくり引く']]){const option=document.createElement('option');option.value=value;option.textContent=text;motion.append(option);}
    motion.value=clip.motion||'none';motion.onchange=()=>{clip.motion=motion.value;clearResult();draw($('canvas'),clips[0]);};motionLabel.append(motion);
    const captionLabel=document.createElement('label');captionLabel.textContent='字幕・歌詞（任意）';
    const caption=document.createElement('textarea');caption.rows=3;caption.maxLength=80;caption.value=clip.caption||'';caption.placeholder='この画像に添える言葉';caption.setAttribute('aria-label',`画像${index+1}の字幕`);
    caption.oninput=()=>{clip.caption=caption.value;clearResult();summary();setBusy(busy);draw($('canvas'),clip);};captionLabel.append(caption);
    const captionHint=document.createElement('p');captionHint.className='hint';captionHint.textContent='80文字以内・改行は2回まで。下部に白文字＋黒縁で表示。長い文章は自動で折り返し・縮小します。';
    body.append(title,label,motionLabel,captionLabel,captionHint,buttons);row.append(img,body);$('clips').append(row);
  });if(!clips.length){const empty=document.createElement('p');empty.textContent='画像を追加してください。';$('clips').append(empty);}summary();draw($('canvas'),clips[0]);setBusy(busy);
}
function summary(){$('imageCount').textContent=`${clips.length} / 10枚`;let issue='';try{validate(clips);}catch(e){issue=e.message;}$('validation').textContent=issue;const total=duration(clips);$('total').textContent=`合計 ${total} 秒 / 15〜60秒`;
  let cursor=0;$('timeline').textContent=clips.map((c,i)=>{const start=cursor;cursor+=Number(c.seconds);return `${i+1}枚目 ${start}〜${cursor}秒`;}).join(' → ');audioSummary();
}
function audioSummary(){
  $('audioRange').className='hint';
  if(!audio){$('audioRange').textContent='音声を選ぶと使用区間を表示します。';return;}
  try{const r=audioRange($('audioStart').value,audio.element.duration,duration(clips));
    $('audioRange').textContent=`曲の ${r.start.toFixed(1)}〜${r.end.toFixed(1)}秒を使用`+(r.silence>0?` · 最後の${r.silence.toFixed(1)}秒は無音`:'')+'。映像は1枚目から始まります。';
  }catch(e){$('audioRange').textContent=e.message;$('audioRange').className='hint error';}
}
$('audioStart').oninput=()=>{clearResult();audioSummary();setBusy(busy);};
$('images').onchange=async e=>{
  const files=[...e.target.files];if(!files.length)return;
  setBusy(true);status('画像を読み込んでいます…');
  try{const next=await loadImages(files,clips.length);clips.push(...next);clearResult();status('画像を追加しました。合計が範囲外なら「15秒に配分」「30秒に配分」「60秒に配分」で調整できます。');}
  catch(err){status(err.message,true);}
  finally{e.target.value='';setBusy(false);update();}
};
for(const total of [15,30,60])$('fit'+total).onclick=()=>{distributeTime(clips,total);clearResult();update();status(`合計${total}秒に配分しました。各画像の秒数は個別に変更できます。`);};
$('audio').onchange=async e=>{if(!e.target.files.length)return;setBusy(true);status('音声を読み込んでいます…');try{const next=await loadAudio(e.target.files[0]);disposeAudio(audio);audio=next;$('audioStart').value='0';audioSummary();$('audioName').textContent=`${audio.name} / ${audio.element.duration.toFixed(1)}秒`;clearResult();status('音声を読み込みました。');}catch(err){status(err.message,true);}finally{e.target.value='';setBusy(false);}};
$('resolution').onchange=()=>{clearResult();};
$('transition').onchange=()=>{clearResult();};
async function run(record){
  if(busy)return;
  try{
    const total=validate(clips);if(!audio)throw new Error('音声を1本選んでください。');
    const audioStart=audioRange($('audioStart').value,audio.element.duration,total).start;
    controller=new AbortController();setBusy(true);clearResult(false);
    $('canvas').width=record&&$('resolution').value==='1080'?1920:1280;$('canvas').height=$('canvas').width*9/16;
    $('progress').value=0;$('progress').max=total;
    status(record?'MP4を生成しています。画面を開いたままお待ちください。':'音声付きプレビュー中…');
    const blob=await renderer.run({canvas:$('canvas'),clips,audio,total,record,audioStart,fadeSeconds:Number($('transition').value),signal:controller.signal,onProgress:t=>{$('progress').value=t;$('elapsed').textContent=`${t.toFixed(1)} / ${total} 秒`;}});
    if(blob){resultBlob=blob;resultURL=URL.createObjectURL(blob);$('video').src=resultURL;$('save').href=resultURL;$('save').download=`RIONIX_${new Date().toISOString().replace(/[:.]/g,'-')}.mp4`;$('result').hidden=false;$('size').textContent=`MP4 · ${(blob.size/1024**2).toFixed(1)} MB · ${$('canvas').width}×${$('canvas').height}`;status('MP4を生成しました。再生で映像・音声を確認してから保存してください。');}
    else status('プレビューが終わりました。');
  }catch(err){status(err.message||'処理に失敗しました。720pまたは別の素材で試してください。',true);}
  finally{setBusy(false);controller=null;}
}
$('preview').onclick=()=>run(false);$('generate').onclick=()=>run(true);$('cancel').onclick=()=>controller?.abort();
$('share').onclick=async()=>{if(!resultBlob)return;const file=new File([resultBlob],$('save').download,{type:'video/mp4'});try{if(!navigator.canShare?.({files:[file]}))throw new Error('この端末では共有保存に対応していません。「MP4を保存」を使ってください。');await navigator.share({files:[file],title:'RIONIX 動画'});}catch(e){if(e.name!=='AbortError')status(e.message,true);}};
window.addEventListener('beforeunload',e=>{if(busy||dirty){e.preventDefault();e.returnValue='';}});
setBusy(false);

$('saveProject').onclick=async()=>{
  if(busy)return;setBusy(true);$('projectStatus').textContent='素材と設定を保存しています…';
  try{
    if(!$('audioStart').value.trim())throw new Error('音声の開始位置を入力してから保存してください。');
    const project=makeProject(clips,audio,{resolution:$('resolution').value,transition:$('transition').value,audioStart:Number($('audioStart').value)});
    await projectStore('save',project);dirty=false;
    $('projectStatus').textContent=`保存しました（${new Date(project.savedAt).toLocaleString('ja-JP')}）。ページを閉じても「保存した編集を開く」で再開できます。`;
  }catch(e){$('projectStatus').textContent=projectError(e);}
  finally{setBusy(false);}
};
$('loadProject').onclick=async()=>{
  if(busy)return;
  if(dirty&&!confirm('未保存の変更を破棄して、保存した編集を開きますか？'))return;
  setBusy(true);$('projectStatus').textContent='保存した素材を読み込んでいます…';
  try{
    const project=await projectStore('load');if(!project)throw new Error('保存した編集はありません。素材を選んで「この端末に保存」を押してください。');
    const next=await restoreProject(project);
    disposeImages(clips);disposeAudio(audio);clips=next.clips;audio=next.audio;
    $('resolution').value=next.settings.resolution;$('transition').value=next.settings.transition;$('audioStart').value=next.settings.audioStart;
    $('audioName').textContent=audio?`${audio.name} / ${audio.element.duration.toFixed(1)}秒`:'音声はまだ選ばれていません。';
    clearResult(false);dirty=false;update();
    $('progress').value=0;$('elapsed').textContent='0 秒';
    $('projectStatus').textContent=`保存した編集を開きました（${new Date(project.savedAt).toLocaleString('ja-JP')}）。`;
    status('編集を再開できます。プレビューで確認してください。');
  }catch(e){$('projectStatus').textContent=projectError(e);}
  finally{setBusy(false);}
};

$('getPlan').onclick=()=>{try{$('editPlan').value=JSON.stringify(exportPlan(clips,audio,{resolution:$('resolution').value,transition:$('transition').value,audioStart:Number($('audioStart').value)}),null,2);$('planStatus').textContent='設定を取得しました。素材本体は含まれません。';}catch(e){$('planStatus').textContent=e.message;}};
$('applyPlan').onclick=()=>{if(busy)return;try{
 const next=preparePlan($('editPlan').value,clips,audio);
 const summary=next.clips.map((c,i)=>`${i+1}. ${c.name}: ${c.seconds}秒 / ${c.motion} / 字幕 ${c.caption||'なし'}`).join('\n');
 if(!confirm(`この設定を反映しますか？現在の未保存設定を置き換えます。\n${summary}\n音声開始 ${next.settings.audioStart}秒 / ${next.settings.resolution}p / フェード${next.settings.transition}秒`))return;
 clips=next.clips;$('resolution').value=next.settings.resolution;$('transition').value=next.settings.transition;$('audioStart').value=next.settings.audioStart;clearResult();update();$('planStatus').textContent='設定を反映しました。プレビューで確認してください。端末保存は手動です。';
 }catch(e){$('planStatus').textContent=e.message;}};
