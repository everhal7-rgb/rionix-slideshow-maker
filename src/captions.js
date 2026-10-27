// Captions are screen-fixed overlays, independent of image motion and fades.
export function validCaption(text) {
  return text === undefined || (typeof text === 'string' && text.length <= 80 && text.split('\n').length <= 3);
}
export function captionLines(ctx, text, maxWidth) {
  const lines=[];
  const segments=typeof Intl.Segmenter==='function' ? [...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(s=>s.segment) : Array.from(text);
  let line='';
  for(const char of segments){
    if(char==='\n'){lines.push(line);line='';continue;}
    if(line && ctx.measureText(line+char).width>maxWidth){lines.push(line);line=char;}else line+=char;
  }
  lines.push(line);return lines;
}
export function drawCaption(canvas, text) {
  if(!text?.trim())return;
  const ctx=canvas.getContext('2d'),h=canvas.height,w=canvas.width;
  ctx.save();ctx.globalAlpha=1;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  let size=Math.round(h*.05),lines;
  do {ctx.font=`700 ${size}px system-ui, sans-serif`;lines=captionLines(ctx,text,w*.86);if(lines.length<=3)break;size--;}while(size>h*.016);
  const step=size*1.35, bottom=h*.91;
  ctx.strokeStyle='#000';ctx.fillStyle='#fff';ctx.lineWidth=Math.max(2,size*.14);
  lines.forEach((line,i)=>{const y=bottom-(lines.length-1-i)*step;ctx.strokeText(line,w/2,y);ctx.fillText(line,w/2,y);});
  ctx.restore();
}
