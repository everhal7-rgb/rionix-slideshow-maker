import '../src/app.js';
const $=id=>document.getElementById(id);
$('demo').onclick=async()=>{const b=$('demo');b.disabled=true;
 try{const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.fillStyle='#24396c';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#f5b64a';ctx.fillRect(600,100,450,450);const image=new File([await new Promise(r=>c.toBlob(r))],'demo.png',{type:'image/png'});
 const n=48000*20,buffer=new ArrayBuffer(44+n*2),v=new DataView(buffer),str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){const t=i/48000;v.setInt16(44+i*2,Math.round(8000*Math.exp(-(t%.5)*25)*Math.sin(2*Math.PI*440*t)),true);}
 for(const [id,file] of [['images',image],['audio',new File([buffer],'demo.wav',{type:'audio/wav'})]]){const dt=new DataTransfer();dt.items.add(file);$(id).files=dt.files;await $(id).onchange({target:$(id)});}
 $('fit15').click();b.textContent='テスト素材読み込み済み';
 }catch(e){b.textContent=e.message;b.disabled=false;}};
