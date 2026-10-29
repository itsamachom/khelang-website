import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const source=await readFile('admin/image-upload.js','utf8');
function helpers(){const context={window:{},crypto:webcrypto,Intl,Date,File};vm.runInNewContext(source,context);return context.window.KhelangImages;}
test('each activity gets a unique persistent folder key',()=>{
 const {folderKey}=helpers();const a=folderKey(),b=folderKey();
 assert.match(a,/^\d{4}-\d{2}-\d{2}-event-[a-f0-9-]{36}$/);assert.notEqual(a,b);
});
test('unsupported and oversized input is rejected before decoding/upload',async()=>{
 const {optimize}=helpers();
 await assert.rejects(optimize(new File(['x'],'image.heic',{type:'image/heic'})),/JPG/);
 await assert.rejects(optimize(new File([new Uint8Array(21*1024*1024)],'image.jpg',{type:'image/jpeg'})),/20 MB/);
});
test('draft assets use CMS folder lookup, legacy image URLs remain intact',()=>{
 const {assetSource}=helpers();const key='2026-10-29-event-test';const entry={getIn:()=>key};
 const getAsset=path=>'resolved:'+path;
 assert.equal(assetSource(`/images/events/${key}/photo.webp`,getAsset,entry),'resolved:photo.webp');
 assert.equal(assetSource('/images/events/old.jpg',getAsset,entry),'resolved:/images/events/old.jpg');
});
