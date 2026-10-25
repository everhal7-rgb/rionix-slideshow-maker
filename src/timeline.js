export function duration(clips) { return clips.reduce((sum, c) => sum + Number(c.seconds), 0); }
export function validate(clips) {
  if (clips.length !== 3) throw new Error('画像を3枚選んでください。');
  if (clips.some(c => !Number.isInteger(Number(c.seconds)) || c.seconds < 1 || c.seconds > 28)) throw new Error('各画像の時間は1〜28秒の整数にしてください。');
  const total = duration(clips);
  if (total < 15 || total > 30) throw new Error('合計時間を15〜30秒にしてください。');
  return total;
}
export function clipAt(clips, seconds) {
  let end = 0;
  return clips.find(c => seconds < (end += Number(c.seconds))) || clips.at(-1);
}
export function draw(canvas, clip) {
  const ctx = canvas.getContext('2d', {alpha: false});
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!clip) return;
  const img = clip.bitmap;
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}
