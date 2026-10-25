import {readFile,writeFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const sources=await Promise.all(['timeline','assets','renderer','app'].map(n=>read(`src/${n}.js`)));
const js=sources.map(s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n');
const template=await read('tools/template.html');
await writeFile(new URL('../index.html',import.meta.url),template.replace('/*STYLE*/',()=>'' ).replace('<style></style>',`<style>${await read('src/style.css')}</style>`).replace('/*APP*/',()=>js));
