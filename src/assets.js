export async function loadImages(files, existingCount = 0) {
  if (!files.length || files.length + existingCount > 10) throw new Error('画像は合計10枚までです。追加する枚数を減らしてください。');
  const clips = [];
  try {
    for (const file of files) {
      if (!['image/jpeg','image/png'].includes(file.type)) throw new Error('画像はJPEGまたはPNGを選んでください。');
      if (file.size > 15 * 1024 ** 2) throw new Error('画像は1枚15MB以下にしてください。');
      // Decode sequentially; keep only a 1920px thumbnail for rendering.
      const original = await createImageBitmap(file);
      try {
        if (original.width * original.height > 50_000_000) throw new Error('画像が大きすぎます。5000万画素以下に縮小してください。');
        const scale = Math.min(1, 1920 / Math.max(original.width, original.height));
        const bitmap = await createImageBitmap(original, {resizeWidth:Math.max(1,Math.round(original.width*scale)),resizeHeight:Math.max(1,Math.round(original.height*scale)),resizeQuality:'high'});
        const clip={id:crypto.randomUUID(),name:file.name,file,bitmap,seconds:5,motion:'in',caption:''};
        clips.push(clip);
        const thumb = document.createElement('canvas'); thumb.width=240; thumb.height=135;
        const ctx=thumb.getContext('2d'); const s=Math.min(240/bitmap.width,135/bitmap.height);
        ctx.drawImage(bitmap,(240-bitmap.width*s)/2,(135-bitmap.height*s)/2,bitmap.width*s,bitmap.height*s);
        clip.thumb=thumb.toDataURL('image/jpeg',0.7);
      } finally {original.close();}
    }
    return clips;
  } catch (e) { disposeImages(clips); throw e; }
}
export function disposeImages(clips) { for (const c of clips) c.bitmap.close(); }
export async function loadAudio(file) {
  if (!file || (!file.type.startsWith('audio/') && !/\.mp3$/i.test(file.name))) throw new Error('MP3などの音声ファイルを選んでください。');
  if (file.size > 40*1024**2) throw new Error('音声は40MB以下にしてください。');
  const url=URL.createObjectURL(file), element=new Audio(); element.preload='auto'; element.src=url;
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>done(new Error('音声を読み込めません。別のMP3で試してください。')),15000);
      function done(err){ clearTimeout(timer); element.onloadedmetadata=null; element.onerror=null; err?reject(err):resolve(); }
      element.onloadedmetadata=()=>done(); element.onerror=()=>done(new Error('この音声形式は再生できません。MP3を選んでください。'));
    });
    if (!Number.isFinite(element.duration)||element.duration<=0) throw new Error('音声の長さを取得できません。別のMP3を選んでください。');
    return {name:file.name,file,url,element};
  } catch(e){element.removeAttribute('src'); element.load();URL.revokeObjectURL(url);throw e;}
}
export function disposeAudio(audio){if(audio){audio.element.pause();audio.element.removeAttribute('src');audio.element.load();URL.revokeObjectURL(audio.url);}}
