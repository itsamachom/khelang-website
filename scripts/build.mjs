import {mkdir, readdir, readFile, writeFile, cp, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const events=[];
for(const file of (await readdir('content/events')).filter(f=>f.endsWith('.json'))){
 const data=JSON.parse(await readFile(`content/events/${file}`,'utf8'));
 if(!data.title || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !data.thumbnail) throw new Error(`Invalid event: ${file}`);
 let gallery=data.gallery || [];
 if(!Array.isArray(gallery)) gallery=[gallery];
 gallery=gallery.map(x=>typeof x==='string'?x:x.image||x.url).filter(Boolean);
 events.push({...data,gallery,file});
}
events.sort((a,b)=>b.date.localeCompare(a.date)||a.file.localeCompare(b.file));
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of await readdir('.')){
 if(file.endsWith('.html') || ['admin','content','css','js','images','logo.png','_headers'].includes(file)) await cp(file,path.join('dist',file),{recursive:true});
}
await writeFile('dist/content/events-index.json',JSON.stringify(events,null,2));
console.log(`Built ${events.length} events into dist/`);
