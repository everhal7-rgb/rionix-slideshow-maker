import {duration,validate,draw} from './timeline.js';
import {loadImages,loadAudio,disposeImages,disposeAudio} from './assets.js';
import {Renderer,capability} from './renderer.js';
const $=id=>document.getElementById(id), renderer=new Renderer();
let clips=[],audio=null,busy=false,resultURL=null,resultBlob=null,controller;
const support=capability();
$('capability').textContent=support.error||'このブラウザーはMP4録画対応を申告しています。実際の生成で確認します。';
function status(text,error=false){$('status').textContent=text;$('status').className=error?'status error':'status';}
function clearResult(){if(resultURL)URL.revokeObjectURL(resultURL);resultURL=null;resultBlob=null;$('result').hidden=true;$('video').removeAttribute('src');$('video').load();}
function setBusy(value){busy=value;$('editor').disabled=value;$('preview').disabled=value||clips.length!==3||!audio;$('generate').disabled=value||clips.length!==3||!audio||!!support.error;$('cancel').hidden=!value||!controller;}
function update(){
  $('clips').replaceChildren();
  clips.forEach((clip,index)=>{
    const row=document.createElement('article');row.className='clip';
    const img=document.createElement('img');img.src=clip.thumb;img.alt=`画像${index+1}`;
    const body=document.createElement('div');body.className='clipbody';
    const title=document.createElement('strong');title.textContent=`${index+1}. ${clip.name}`;
    const label=document.createElement('label');label.textContent='表示時間（秒）';
    const input=document.createElement('input');input.type='number';input.min=1;input.max=28;input.step=1;input.inputMode='numeric';input.value=clip.seconds;input.setAttribute('aria-label',`画像${index+1}の秒数`);
    input.oninput=()=>{clip.seconds=Number(input.value);clearResult();summary();};label.append(input);
    const buttons=document.createElement('div');buttons.className='move';
    for(const [delta,text] of [[-1,'↑ 前へ'],[1,'↓ 後へ']]){
      const button=document.createElement('button');button.type='button';button.textContent=text;button.disabled=index+delta<0||index+delta>=clips.length;
      button.setAttribute('aria-label',`画像${index+1}を${delta<0?'前':'後'}へ`);
      button.onclick=()=>{[clips[index],clips[index+delta]]=[clips[index+delta],clips[index]];clearResult();update();};buttons.append(button);
    }
    const motionLabel=document.createElement('label');motionLabel.textContent='画像の動き';
    const motion=document.createElement('select');motion.setAttribute('aria-label',`画像${index+1}の動き`);
    for(const [value,text] of [['none','動かさない'],['in','ゆっくり寄る'],['out','ゆっくり引く']]){const option=document.createElement('option');option.value=value;option.textContent=text;motion.append(option);}
    motion.value=clip.motion||'none';motion.onchange=()=>{clip.motion=motion.value;clearResult();draw($('canvas'),clips[0]);};motionLabel.append(motion);
    body.append(title,label,motionLabel,buttons);row.append(img,body);$('clips').append(row);
  });summary();draw($('canvas'),clips[0]);setBusy(busy);
}
function summary(){const total=duration(clips);$('total').textContent=`合計 ${total} 秒 / 15〜30秒`;
  let cursor=0;$('timeline').textContent=clips.map((c,i)=>{const start=cursor;cursor+=Number(c.seconds);return `${i+1}枚目 ${start}〜${cursor}秒`;}).join(' → ');
}
$('images').onchange=async e=>{setBusy(true);status('画像を読み込んでいます…');try{const next=await loadImages([...e.target.files]);disposeImages(clips);clips=next;clearResult();status('画像を読み込みました。');}catch(err){status(err.message,true);}finally{e.target.value='';setBusy(false);update();}};
$('audio').onchange=async e=>{setBusy(true);status('音声を読み込んでいます…');try{const next=await loadAudio(e.target.files[0]);disposeAudio(audio);audio=next;$('audioName').textContent=`${audio.name} / ${audio.element.duration.toFixed(1)}秒`;clearResult();status('音声を読み込みました。');}catch(err){status(err.message,true);}finally{e.target.value='';setBusy(false);}};
$('resolution').onchange=()=>{clearResult();};
$('transition').onchange=()=>{clearResult();};
async function run(record){
  if(busy)return;
  try{
    const total=validate(clips);if(!audio)throw new Error('音声を1本選んでください。');
    controller=new AbortController();setBusy(true);clearResult();
    $('canvas').width=record&&$('resolution').value==='1080'?1920:1280;$('canvas').height=$('canvas').width*9/16;
    $('progress').value=0;$('progress').max=total;
    status(record?'MP4を生成しています。画面を開いたままお待ちください。':'音声付きプレビュー中…');
    const blob=await renderer.run({canvas:$('canvas'),clips,audio,total,record,fadeSeconds:Number($('transition').value),signal:controller.signal,onProgress:t=>{$('progress').value=t;$('elapsed').textContent=`${t.toFixed(1)} / ${total} 秒`;}});
    if(blob){resultBlob=blob;resultURL=URL.createObjectURL(blob);$('video').src=resultURL;$('save').href=resultURL;$('save').download=`RIONIX_${new Date().toISOString().replace(/[:.]/g,'-')}.mp4`;$('result').hidden=false;$('size').textContent=`MP4 · ${(blob.size/1024**2).toFixed(1)} MB · ${$('canvas').width}×${$('canvas').height}`;status('MP4を生成しました。再生で映像・音声を確認してから保存してください。');}
    else status('プレビューが終わりました。');
  }catch(err){status(err.message||'処理に失敗しました。720pまたは別の素材で試してください。',true);}
  finally{setBusy(false);controller=null;}
}
$('preview').onclick=()=>run(false);$('generate').onclick=()=>run(true);$('cancel').onclick=()=>controller?.abort();
$('share').onclick=async()=>{if(!resultBlob)return;const file=new File([resultBlob],$('save').download,{type:'video/mp4'});try{if(!navigator.canShare?.({files:[file]}))throw new Error('この端末では共有保存に対応していません。「MP4を保存」を使ってください。');await navigator.share({files:[file],title:'RIONIX 動画'});}catch(e){if(e.name!=='AbortError')status(e.message,true);}};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
setBusy(false);
