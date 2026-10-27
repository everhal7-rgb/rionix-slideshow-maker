import {drawCaption,validCaption} from './captions.js';
export function duration(clips) { return clips.reduce((sum, c) => sum + Number(c.seconds), 0); }
export function validate(clips) {
  if (clips.length < 1 || clips.length > 10) throw new Error('画像を1〜10枚選んでください。');
  if (clips.some(c => !Number.isInteger(Number(c.seconds)) || c.seconds < 1 || c.seconds > 60)) throw new Error('各画像の時間は1〜60秒の整数にしてください。');
  if(clips.some(c=>!validCaption(c.caption)))throw new Error('字幕は80文字以内・改行は2回までにしてください。');
  const total = duration(clips);
  if (total < 15 || total > 60) throw new Error('合計時間を15〜60秒にしてください。');
  return total;
}
export function clipAt(clips, seconds) {
  let end = 0;
  return clips.find(c => seconds < (end += Number(c.seconds))) || clips.at(-1);
}
const clamp01 = n => Math.max(0, Math.min(1, n));
// A transition occupies the tail of the outgoing clip; total duration never changes.
export function sceneAt(clips, seconds, fadeSeconds = 0) {
  if (!clips.length) return [];
  const t = Math.max(0, seconds), fade = Math.max(0, Math.min(1, Number(fadeSeconds) || 0));
  let start = 0;
  for (let i = 0; i < clips.length; i++) {
    const length = Number(clips[i].seconds), end = start + length;
    const incoming = i ? Math.min(fade, Number(clips[i-1].seconds) / 2) : 0;
    const progress = clamp01((t - start + incoming) / (length + incoming));
    if (t < end || i === clips.length - 1) {
      const layers = [{clip: clips[i], progress, opacity: 1}];
      const outgoing = Math.min(fade, length / 2);
      if (i < clips.length - 1 && outgoing > 0 && t >= end - outgoing) {
        const elapsed = t - (end - outgoing);
        layers.push({clip: clips[i+1], progress: clamp01(elapsed / (Number(clips[i+1].seconds) + outgoing)), opacity: clamp01(elapsed / outgoing)});
      }
      return layers;
    }
    start = end;
  }
}
export function zoomAt(motion, progress) {
  const p = clamp01(progress);
  return motion === 'in' ? 1 + 0.08*p : motion === 'out' ? 1.08 - 0.08*p : 1;
}
function paint(canvas, clip, progress = 0) {
  const ctx = canvas.getContext('2d', {alpha: false});
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!clip) return;
  const img = clip.bitmap;
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale, h = img.height * scale;
  const zoom = zoomAt(clip.motion, progress);
  // Keep the original letterbox fixed; zoom crops only within the image rectangle.
  ctx.save(); ctx.beginPath();ctx.rect((canvas.width-w)/2,(canvas.height-h)/2,w,h);ctx.clip();
  ctx.drawImage(img, (canvas.width - w*zoom) / 2, (canvas.height - h*zoom) / 2, w*zoom, h*zoom);
  ctx.restore();
}
const fadeLayers = new WeakMap();
export function draw(canvas, clip) { paint(canvas, clip); drawCaption(canvas,clip?.caption); }
export function drawFrame(canvas, clips, seconds, fadeSeconds = 0) {
  const layers = sceneAt(clips, seconds, fadeSeconds);
  paint(canvas, layers[0]?.clip, layers[0]?.progress);
  if (layers.length >= 2 && layers[1].opacity > 0) {
  let layer = fadeLayers.get(canvas);
  if (!layer) { layer = document.createElement('canvas'); fadeLayers.set(canvas,layer); }
  if (layer.width !== canvas.width || layer.height !== canvas.height) {layer.width = canvas.width;layer.height = canvas.height;}
  paint(layer,layers[1].clip,layers[1].progress);
  const ctx = canvas.getContext('2d');ctx.save();ctx.globalAlpha=layers[1].opacity;ctx.drawImage(layer,0,0);ctx.restore();
  }
  drawCaption(canvas,clipAt(clips,seconds)?.caption);
}
export function releaseDrawBuffers(canvas) {
  const layer=fadeLayers.get(canvas);
  if(layer){layer.width=1;layer.height=1;fadeLayers.delete(canvas);}
}

export function distributeTime(clips, total) {
  if (!clips.length || clips.length > 10 || ![15,30,60].includes(total)) throw new Error('画像を1〜10枚選んでください。');
  const base = Math.floor(total / clips.length), extra = total % clips.length;
  clips.forEach((clip, i) => { clip.seconds = base + (i < extra ? 1 : 0); });
}
