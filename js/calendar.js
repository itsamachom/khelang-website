/* Google hosts the calendar and its recurring events; no API key is needed. */
(() => {
 const mounts=[...document.querySelectorAll('[data-google-calendar]')];
 if(!mounts.length)return;
 function calendarID(input){
  const value=typeof input==='string'?input.trim():'';
  if(!value)return '';
  let id=value;
  if(/^https?:/i.test(value)){
   const url=new URL(value);
   if(url.protocol!=='https:' || url.hostname!=='calendar.google.com')throw new Error('Invalid calendar URL');
   id=url.searchParams.get('src')||url.searchParams.get('cid')||'';
   if(id && !id.includes('@')){
    try{id=atob(id.replace(/-/g,'+').replace(/_/g,'/'));}catch{throw new Error('Invalid calendar ID');}
   }
  }
  if(!/^[a-zA-Z0-9_.+%-]+@[a-zA-Z0-9.-]+$/.test(id))throw new Error('Invalid calendar ID');
  return id;
 }
 function embedURL(id,mode){
  const url=new URL('https://calendar.google.com/calendar/embed');
  const params={src:id,ctz:'Asia/Bangkok',hl:'th',mode,showTitle:'0',showPrint:'0',showCalendars:'0',showTz:'0',showTabs:'0',showNav:'1',showDate:'1',wkst:'2',bgcolor:'#ffffff',color:'#23441e'};
  Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));return url.href;
 }
 const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
 async function load(){
  try{
   const response=await fetch('/content/settings/calendar.json');
   if(!response.ok)throw new Error('Calendar settings unavailable');
   const config=await response.json();const id=calendarID(config.calendar_id);
   for(const mount of mounts){
    mount.replaceChildren();
    if(!id){mount.append(node('p','กำหนดการกิจกรรมอยู่ระหว่างจัดเตรียม กรุณาติดต่อสมาคมเพื่อสอบถามกำหนดการ','calendar-message'));continue;}
    const full=mount.dataset.googleCalendar==='full';
    if(full){document.getElementById('calendar-heading').textContent=config.title||'ปฏิทินกิจกรรมสมาคม';document.getElementById('calendar-description').textContent=config.description||'ติดตามกำหนดการของสมาคม';}
    const frame=node('iframe',null,full?'google-calendar google-calendar-full':'google-calendar google-calendar-agenda');
    frame.title=full?'ปฏิทินกิจกรรมสมาคมจาก Google Calendar':'กำหนดการกิจกรรมที่กำลังจะมาถึงจาก Google Calendar';
    frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
    let mode=full && !matchMedia('(max-width: 640px)').matches?'MONTH':'AGENDA';
    const tabs=full?node('div',null,'calendar-views'):null;
    if(tabs){
     tabs.setAttribute('role','group');tabs.setAttribute('aria-label','รูปแบบปฏิทิน');
     for(const [view,label] of [['MONTH','รายเดือน'],['AGENDA','รายการกำหนดการ']]){
      const button=node('button',label);button.type='button';button.dataset.calendarView=view;
      button.setAttribute('aria-pressed',String(mode===view));
      button.onclick=()=>{mode=view;frame.src=embedURL(id,mode);tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));};tabs.append(button);
     }
     mount.append(tabs);
    }
    frame.src=embedURL(id,mode);mount.append(frame);
    const actions=node('div',null,'calendar-actions');
    const open=node('a','เปิดใน Google Calendar','calendar-button');
    open.href='https://calendar.google.com/calendar/embed?src='+encodeURIComponent(id)+'&ctz=Asia%2FBangkok&hl=th';open.target='_blank';open.rel='noopener noreferrer';
    const subscribe=node('a','ติดตามปฏิทินบนมือถือ','calendar-button calendar-button-primary');
    subscribe.href='https://calendar.google.com/calendar/u/0?cid='+encodeURIComponent(btoa(id));subscribe.target='_blank';subscribe.rel='noopener noreferrer';
    actions.append(open,subscribe);mount.append(actions);
    mount.append(node('p','เวลาไทย (กรุงเทพฯ) · หากปฏิทินไม่แสดง ให้ลองเปิดใน Google Calendar','calendar-footnote'));
   }
  }catch(error){
   console.error('Calendar unavailable',error);
   for(const mount of mounts){mount.replaceChildren(node('p','ไม่สามารถโหลดปฏิทินได้ในขณะนี้ กรุณาลองอีกครั้ง','calendar-message'));
    const retry=node('button','ลองอีกครั้ง','calendar-button');retry.type='button';retry.onclick=load;mount.append(retry);
   }
  }
 }
 load();
})();
