/* Files are processed locally before entering Decap's normal draft-media pipeline. */
(() => {
 const MAX_BYTES=20*1024*1024;
 const TARGET_BYTES=500*1024;
 const uuid=()=>crypto.randomUUID();
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const folderKey=()=>`${today()}-event-${uuid()}`;
 async function optimize(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('รองรับ JPG, PNG และ WebP กรุณาแปลง HEIC หรือ GIF ก่อนอัปโหลด');
  if(file.size>MAX_BYTES)throw new Error('กรุณาเลือกรูปขนาดไม่เกิน 20 MB');
  let bitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('เปิดรูปไม่ได้ กรุณาลองไฟล์ JPG หรือ PNG อื่น');}
  try{
   if(bitmap.width*bitmap.height>60_000_000)throw new Error('ภาพมีความละเอียดสูงเกินไป กรุณาย่อภาพก่อนอัปโหลด');
   const ratio=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('เบราว์เซอร์ไม่รองรับการย่อภาพ');
   ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const encode=quality=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('บีบอัดภาพไม่สำเร็จ')),'image/webp',quality));
   let blob=await encode(.8);
   for(const quality of [.7,.6]){if(blob.size<=TARGET_BYTES)break;blob=await encode(quality);}
   for(let pass=0;blob.size>TARGET_BYTES && pass<4;pass++){
    canvas.width=Math.max(1,Math.round(canvas.width*.85));canvas.height=Math.max(1,Math.round(canvas.height*.85));
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);blob=await encode(.7);
   }
   if(blob.type!=='image/webp')throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebP กรุณาใช้ Chrome, Edge หรือ Firefox รุ่นปัจจุบัน');
   // Keep already-small originals when converting would make them larger.
   const keepOriginal=ratio===1 && canvas.width===bitmap.width && file.size<blob.size;
   const output=keepOriginal?file:blob;
   const extension=keepOriginal?({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]):'webp';
   const result=new File([output],`photo-${Date.now()}-${uuid()}.${extension}`,{type:output.type});
   return {file:result,width:canvas.width,height:canvas.height,originalSize:file.size};
  }finally{bitmap.close();}
 }
 const assetSource=(path,getAsset,entry,field)=>{
  const key=entry?.getIn(['data','media_key']);
  const lookup=key && typeof path==='string' && path.startsWith(`/images/events/${key}/`)?path.split('/').pop():path;
  return String(getAsset(lookup,field));
 };
 window.KhelangImages={optimize,folderKey,assetSource};
 if(!window.CMS)return;
 const h=window.h;
 const FolderControl=window.createClass({
  componentDidMount(){if(!this.props.value)this.props.onChange(folderKey());},
  render(){return h('p',{style:{fontSize:'12px',color:'#52614b'}},this.props.value?'รูปใหม่จะเก็บแยกในโฟลเดอร์ของกิจกรรมนี้โดยอัตโนมัติ':'กำลังเตรียมที่เก็บรูป…');}
 });
 const ImageControl=window.createClass({
  getInitialState(){return {busy:false,error:'',message:''};},
  componentWillUnmount(){this.unmounted=true;},
  isValid(){return !this.state.busy && !this.state.error;},
  async upload(event){
   const input=event.target;const file=input.files?.[0];input.value='';if(!file||this.state.busy)return;
   this.setState({busy:true,error:'',message:'กำลังย่อรูป…'});
   try{
    const entry=this.props.getEntry?this.props.getEntry():this.props.entry;
    const key=entry?.getIn(['data','media_key']);
    if(!/^\d{4}-\d{2}-\d{2}-event-[a-f0-9-]{36}$/.test(key||''))throw new Error('โฟลเดอร์กิจกรรมยังไม่พร้อม กรุณารอสักครู่แล้วลองอีกครั้ง');
    const result=await optimize(file);
    if(this.unmounted)return;
    // Decap identifies draft media by content hash, not filename. Reuse the
    // draft path for identical content so another field cannot orphan its URL.
    const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const hash=await digest(result.file);
    const current=this.props.getEntry?this.props.getEntry():this.props.entry;
    const draftFiles=current?.get('mediaFiles')?.toArray()||[];
    let reused;
    for(const candidate of draftFiles){
     const source=candidate.get('file');
     if(candidate.get('draft') && source?.size===result.file.size && typeof source.arrayBuffer==='function' && await digest(source)===hash){reused=candidate;break;}
    }
    const saved=reused?{payload:{path:reused.get('path')}}:await this.props.onPersistMedia(result.file,{field:this.props.field});
    const media=saved?.payload?.file?.path?saved.payload.file:saved?.payload;
    if(!media?.path || !media.path.startsWith(`images/events/${key}/`))throw new Error('บันทึกรูปไม่สำเร็จ กรุณาลองใหม่');
    if(this.unmounted)return;
    this.props.onChange('/'+media.path);
    this.setState({busy:false,error:'',message:`พร้อมบันทึก: ${Math.round(file.size/1024)} → ${Math.round(result.file.size/1024)} KB (${result.width} × ${result.height}) กดเผยแพร่เพื่อบันทึกกิจกรรมพร้อมรูป`});
   }catch(error){if(!this.unmounted)this.setState({busy:false,error:error.message,message:''});}
  },
  render(){
   const {value,getAsset,field,forID}=this.props;
   return h('div',{style:{padding:'14px',border:'1px solid #ccd6c7',borderRadius:'8px'}},
    value?h('img',{src:assetSource(value,getAsset,this.props.getEntry?this.props.getEntry():this.props.entry,field),alt:'รูปกิจกรรม',style:{display:'block',maxWidth:'100%',maxHeight:'240px',marginBottom:'12px'}}):null,
    h('label',{htmlFor:forID,style:{display:'block',fontWeight:'bold',marginBottom:'8px'}},value?'เปลี่ยนรูปภาพ':'เลือกรูปภาพ'),
    h('input',{id:forID,type:'file',accept:'image/jpeg,image/png,image/webp',disabled:this.state.busy,onChange:this.upload}),
    h('p',{style:{fontSize:'12px'}},'JPG / PNG / WebP ไม่เกิน 20 MB • ย่อด้านยาวไม่เกิน 1,920 px • ตั้งชื่ออัตโนมัติ'),
    h('p',{'aria-live':'polite',style:{fontSize:'12px',color:this.state.error?'#b42318':'#23441e'}},this.state.error||this.state.message),
    value?h('button',{type:'button',disabled:this.state.busy,onClick:()=>{this.props.onChange('');this.setState({error:'',message:''});}},'นำรูปออกจากช่องนี้'):null
   );
  }
 });
 CMS.registerWidget('event-folder',FolderControl);
 CMS.registerWidget('event-image',ImageControl,CMS.getWidget('image').preview);
})();
