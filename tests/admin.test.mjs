import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile('admin/preview.js','utf8');
test('CMS preview accepts old single images, lists and unsaved upload assets',()=>{
 let preview;
 const context={window:{h:(tag,props,...children)=>({tag,props,children}),CMS:true},
 CMS:{registerPreviewTemplate:(name,fn)=>{preview=fn;},init(){}},
 document:{getElementById:()=>({hidden:false})}};
 vm.runInNewContext(source,context);
 for(const gallery of [undefined,'/images/events/img_0373.jpg',[],['/image.jpg'],{toArray:()=>[{get:key=>key==='image'?'/image.jpg':null}]}]){
  const data={title:'Test',thumbnail:'/upload.jpg',gallery};
  const assets=[];
  const tree=preview({entry:{get:()=>({get:key=>data[key]})},getAsset:path=>{assets.push(path);return 'blob:pending-upload';}});
  assert.equal(tree.tag,'article');
  assert.ok(assets.includes('/upload.jpg'));
  assert.ok(!JSON.stringify(tree).includes('[object Object]'));
  assert.ok(JSON.stringify(tree).includes('blob:pending-upload'));
 }
});
test('saved galleries match the Decap list widget shape',async()=>{
 const {readdir}=await import('node:fs/promises');
 for(const file of (await readdir('content/events')).filter(f=>f.endsWith('.json'))){
  const data=JSON.parse(await readFile('content/events/'+file,'utf8'));
  if(data.gallery!==undefined){assert.ok(Array.isArray(data.gallery),file);for(const image of data.gallery)assert.equal(typeof image,'string');}
 }
});
