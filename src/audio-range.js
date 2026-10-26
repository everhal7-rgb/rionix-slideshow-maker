export function audioRange(value, length, total) {
  const start = typeof value === 'string' && !value.trim() ? NaN : Number(value);
  if (!Number.isFinite(start) || start < 0) throw new Error('音声の開始位置を0以上の秒数で入力してください。');
  if (!Number.isFinite(length) || start >= length) throw new Error('開始位置は音声の長さより前にしてください。');
  const end = Math.min(length, start + total);
  return {start, end, silence: Math.max(0, total - (length - start))};
}
export function seekAudio(element, start, signal, timeoutMs = 10000) {
  element.pause();
  return new Promise((resolve,reject) => {
    let timer;
    const done = error => {
      clearTimeout(timer);element.removeEventListener('seeked',ready);element.removeEventListener('error',failed);
      signal?.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',hidden);
      error ? reject(error) : resolve();
    };
    const ready = () => {
      if (Math.abs(element.currentTime - start) > .1) done(new Error('指定位置へ移動できませんでした。別のMP3で試してください。'));
      else done();
    };
    const failed = () => done(new Error('音声の指定位置を読み込めません。別のMP3で試してください。'));
    const cancel = () => done(new Error('中止しました。設定はそのままです。'));
    const hidden = () => {if(document.hidden)done(new Error('画面が非表示になったため中止しました。Chromeを前面にしてください。'));};
    element.addEventListener('seeked',ready);element.addEventListener('error',failed);
    signal?.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',hidden);
    timer=setTimeout(failed,timeoutMs);
    if(signal?.aborted){cancel();return;}
    if(document.hidden){hidden();return;}
    if(!element.seeking && Math.abs(element.currentTime-start)<.001){ready();return;}
    try{element.currentTime=start;}catch{failed();}
  });
}
