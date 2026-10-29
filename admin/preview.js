if (window.CMS) {
 const h = window.h;
 CMS.registerPreviewTemplate('events', ({entry, getAsset}) => {
  const data=entry.get('data');
  const asset=path=>window.KhelangImages?window.KhelangImages.assetSource(path,getAsset,entry):String(getAsset(path));
  const rawGallery=data.get('gallery');
  // Older entries used a single image string instead of a list.
  const gallery=!rawGallery?[]:typeof rawGallery==='string'?[rawGallery]:
   Array.isArray(rawGallery)?rawGallery:
   typeof rawGallery.toArray==='function'?rawGallery.toArray():[];
  const galleryPath=item=>typeof item==='string'?item:
   item && typeof item.get==='function'?item.get('image')||item.get('url'):
   item?.image||item?.url;
  return h('article',{style:{fontFamily:'sans-serif',padding:'28px',maxWidth:'800px',margin:'auto',lineHeight:1.8,color:'#23441e'}},
   h('p',null,'ตัวอย่างกิจกรรม • '+(data.get('date')||'')),
   h('h1',null,data.get('title')||'ชื่อกิจกรรม'),
   h('p',null,[data.get('time'),data.get('location')].filter(Boolean).join(' · ')),
   data.get('thumbnail')?h('img',{src:asset(data.get('thumbnail')),style:{width:'100%',maxHeight:'360px',objectFit:'cover'}}):h('p',null,'เลือกรูปปกกิจกรรม'),
   h('p',{style:{fontWeight:'bold'}},data.get('summary')),
   h('div',{style:{whiteSpace:'pre-wrap'}},data.get('body')),
   h('h2',null,'ภาพบรรยากาศ'),
   h('div',{style:{display:'flex',flexWrap:'wrap',gap:'10px'}},gallery.map(galleryPath).filter(Boolean).map((path,i)=>h('img',{key:i,src:asset(path),style:{width:'45%',objectFit:'cover'},alt:'ภาพบรรยากาศ'})))
  );
 });
 CMS.init();
 document.getElementById('cms-loading').hidden=true;
} else {
 document.getElementById('cms-loading').append(' เปิดระบบไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและโหลดหน้าใหม่');
}
