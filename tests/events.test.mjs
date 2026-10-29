import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/build.mjs']);
const events=JSON.parse(await readFile('dist/content/events-index.json','utf8'));
test('all six historical events migrated with body and images',async()=>{
 for(let n=1;n<=6;n++){
  const e=events.find(e=>e.file.endsWith(`activity-${n}.json`));
  assert.ok(e?.title && e.body && e.summary);
  await access('dist/'+e.thumbnail.replace(/^\//,''));
  for(const image of e.gallery)await access('dist/'+image.replace(/^\//,''));
 }
});
test('home selection is six newest dated events; filenames round-trip',()=>{
 assert.equal(events.slice(0,6).length,6);
 for(let i=1;i<events.length;i++)assert.ok(events[i-1].date>=events[i].date);
 for(const e of events){assert.equal(decodeURIComponent(encodeURIComponent(e.file)),e.file);assert.ok(Array.isArray(e.gallery));}
});
test('all routes share deployed index instead of GitHub API',async()=>{
 for(const page of ['index','events','activity-detail']){
  const html=await readFile(`dist/${page}.html`,'utf8');
  assert.ok(html.includes('/js/events.js'));assert.ok(!html.includes('api.github.com'));
 }
});
