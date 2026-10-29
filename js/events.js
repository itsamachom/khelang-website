/* Shared rendering for the deployed content snapshot. */
(async () => {
 const grid=document.getElementById('recent-events-container') || document.getElementById('events-grid');
 const detail=document.getElementById('event-content');
 const el=(tag,text,classes)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(classes)node.className=classes;return node;};
 const imagePath=value=>{if(typeof value!=='string')return '/logo.png';try{const u=new URL(value,location.origin);return ['http:','https:'].includes(u.protocol)?u.href:'/logo.png';}catch{return '/logo.png';}};
 const image=(src,alt,classes)=>{const img=el('img',null,classes);img.src=imagePath(src);img.alt=alt;img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src='/logo.png';};return img;};
 const date=e=>new Date(e.date+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
 try{
  if(grid){grid.setAttribute('aria-live','polite');grid.textContent='กำลังโหลดกิจกรรม…';}
  const response=await fetch('/content/events-index.json');
  if(!response.ok)throw new Error('โหลดรายการไม่ได้');
  const events=await response.json();
  if(grid){
   grid.replaceChildren();
   const selected=grid.id==='recent-events-container'?events.slice(0,6):events;
   if(!selected.length)grid.append(el('p','ยังไม่มีรายการกิจกรรม'));
   for(const event of selected){
    const card=el('article',null,'bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col');
    const link=el('a',null,'block');link.href='activity-detail.html?file='+encodeURIComponent(event.file);
    link.append(image(event.thumbnail,event.title,'w-full h-52 object-cover'));
    const content=el('div',null,'p-6 flex flex-col flex-1');
    content.append(el('p',date(event),'text-sm text-gray-600'),el('h3',event.title,'font-bold text-gray-900 text-lg my-3'),el('p',event.summary,'text-sm text-gray-600 leading-relaxed mb-4'));
    const more=el('a','อ่านรายละเอียดกิจกรรม →','text-green-800 font-bold mt-auto');more.href=link.href;
    content.append(more);card.append(link,content);grid.append(card);
   }
  }
  if(detail){
   const params=new URLSearchParams(location.search);const key=params.get('file')||params.get('id');
   const event=events.find(e=>e.file===key || e.file.replace(/\.json$/,'')===key || e.file.replace(/\.json$/,'.md')===key);
   if(!event)throw new Error('ไม่พบกิจกรรม');
   document.title=event.title+' - สมาคมธุรกิจท่องเที่ยวเมืองเขลางค์นคร';
   document.getElementById('event-title').textContent=event.title;
   document.getElementById('event-date').textContent=date(event)+(event.time?' · '+event.time:'');
   document.getElementById('event-location').textContent=event.location||'จังหวัดลำปาง';
   const cover=document.getElementById('event-cover');cover.replaceWith(image(event.thumbnail,event.title,'w-full max-h-[500px] object-cover'));
   const body=document.getElementById('event-body');
   if(window.marked && window.DOMPurify)body.innerHTML=DOMPurify.sanitize(marked.parse(event.body||event.summary||''));
   else {body.textContent=event.body||event.summary||'';body.style.whiteSpace='pre-wrap';}
   if(event.gallery.length){
    document.getElementById('gallery-section').classList.remove('hidden');
    const gallery=document.getElementById('event-gallery');
    for(const src of event.gallery){const a=el('a');a.href=imagePath(src);a.target='_blank';a.rel='noopener';a.append(image(src,event.title,'w-full h-48 object-cover rounded-lg'));gallery.append(a);}
   }
  }
 }catch(error){
  console.error(error);const target=grid||detail;target.replaceChildren(el('p','ไม่สามารถโหลดกิจกรรมได้ กรุณาลองใหม่อีกครั้ง'));
  const retry=el('button','ลองใหม่','underline p-4');retry.onclick=()=>location.reload();target.append(retry);
  const back=el('a','ดูกิจกรรมทั้งหมด');back.href='events.html';target.append(back);
 }
})();
