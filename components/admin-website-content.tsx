"use client";

import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Item={id:string;content_type:"logo"|"executive"|"programme";title:string;subtitle:string|null;body:string|null;image_url:string|null;image_path:string|null;sort_order:number;is_published:boolean;created_at:string};
const empty={content_type:"executive" as Item["content_type"],title:"",subtitle:"",body:"",sort_order:"0",is_published:false};

export default function AdminWebsiteContent(){
 const supabase=createClient();
 const [items,setItems]=useState<Item[]>([]);
 const [role,setRole]=useState("member");
 const [form,setForm]=useState(empty);
 const [file,setFile]=useState<File|null>(null);
 const [editing,setEditing]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 useEffect(()=>{void load();},[]);
 async function load(){
  setLoading(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(profileError){setError(profileError.message);setLoading(false);return;}
  setRole(profile?.role||"member");
  if(profile?.role!=="national_admin"){setError("Only the National Admin can manage official website content.");setLoading(false);return;}
  const {data,error:queryError}=await supabase.from("site_content").select("*").order("content_type").order("sort_order").order("created_at",{ascending:false});
  if(queryError)setError(queryError.message);else setItems((data||[]) as Item[]);
  setLoading(false);
 }
 function reset(){setForm(empty);setFile(null);setEditing(null);}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError("");setNotice("");
  if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)){setError("Upload a JPG, PNG or WEBP image up to 10MB.");setSaving(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in again.");setSaving(false);return;}
  let image_url:string|null=null;let image_path:string|null=null;
  if(file){
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   image_path="website/"+form.content_type+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploadError}=await supabase.storage.from("nyfb-site-media").upload(image_path,file,{contentType:file.type,upsert:false});
   if(uploadError){setError("Image upload failed: "+uploadError.message);setSaving(false);return;}
   image_url=supabase.storage.from("nyfb-site-media").getPublicUrl(image_path).data.publicUrl;
  }
  const payload={content_type:form.content_type,title:form.title.trim(),subtitle:form.subtitle.trim()||null,body:form.body.trim()||null,sort_order:Number(form.sort_order)||0,is_published:form.is_published,...(file?{image_url,image_path}:{}),...(editing?{}:{created_by:user.id})};
  const result=editing
   ?await supabase.from("site_content").update(payload).eq("id",editing)
   :await supabase.from("site_content").insert(payload);
  if(result.error){
   if(image_path)await supabase.storage.from("nyfb-site-media").remove([image_path]);
   setError(result.error.message);
  }else{
   setNotice(editing?"Website content updated.":"Website content added.");
   reset();await load();
  }
  setSaving(false);
 }
 function edit(item:Item){
  setEditing(item.id);setForm({content_type:item.content_type,title:item.title,subtitle:item.subtitle||"",body:item.body||"",sort_order:String(item.sort_order),is_published:item.is_published});setFile(null);setNotice("");setError("");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function publish(item:Item,is_published:boolean){
  setError("");setNotice("");
  const {error:e}=await supabase.from("site_content").update({is_published}).eq("id",item.id);
  if(e)setError(e.message);else{setNotice(is_published?"Content published on the website.":"Content unpublished.");await load();}
 }
 async function remove(item:Item){
  if(!window.confirm("Delete this website content permanently?"))return;
  setError("");const {error:e}=await supabase.from("site_content").delete().eq("id",item.id);
  if(e){setError(e.message);return;}
  if(item.image_path)await supabase.storage.from("nyfb-site-media").remove([item.image_path]);
  setNotice("Website content deleted.");await load();
 }
 const grouped={logo:items.filter(x=>x.content_type==="logo"),executive:items.filter(x=>x.content_type==="executive"),programme:items.filter(x=>x.content_type==="programme")};
 return <main className="wc-shell"><div className="wc-wrap">
  <header className="wc-head"><Link href="/admin">← Main administration</Link><div><b>NYFB</b><small>WEBSITE CONTENT MANAGER</small></div><Link href="/" target="_blank">View website ↗</Link></header>
  <section className="wc-intro"><small>NATIONAL ADMINISTRATION</small><h1>Website <em>content.</em></h1><p>Upload and manage the official NYFB logo, executive profiles, biographies and programme photographs shown on the public website.</p><span>National Admin access only</span></section>
  {error&&<div className="wc-alert error">{error}</div>}{notice&&<div className="wc-alert">{notice}</div>}
  {loading?<div className="wc-empty">Loading website content…</div>:role!=="national_admin"?<div className="wc-empty">This workspace is restricted to the National Admin.</div>:<>
   <section className="wc-panel"><div className="wc-panel-title"><div><h2>{editing?"Edit website content":"Add website content"}</h2><p>Images are limited to JPG, PNG or WEBP, maximum 10MB.</p></div>{editing&&<button className="wc-secondary" type="button" onClick={reset}>Cancel edit</button>}</div>
    <form onSubmit={save}>
     <label>Content category<select value={form.content_type} onChange={e=>setForm({...form,content_type:e.target.value as Item["content_type"]})}><option value="logo">Official NYFB logo</option><option value="executive">Executive / leadership profile</option><option value="programme">Programme / event feature</option></select></label>
     <label>{form.content_type==="logo"?"Logo name / alt text":form.content_type==="executive"?"Executive full name":"Programme or event title"}<input required maxLength={140} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder={form.content_type==="logo"?"Official NYFB logo":form.content_type==="executive"?"Name of executive":"Programme title"}/></label>
     <label>{form.content_type==="executive"?"Official position":form.content_type==="programme"?"Date, venue or category":"Short label"}<input value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} maxLength={180} placeholder={form.content_type==="executive"?"e.g. National Chairman":form.content_type==="programme"?"e.g. National Youth Summit · Abuja":"Optional"}/></label>
     <label>{form.content_type==="executive"?"Biography":form.content_type==="programme"?"Programme description":"Description (optional)"}<textarea rows={5} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Write the biography or programme details…"/></label>
     <label>Upload picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{file?file.name:"Choose a clear image. Leave empty when editing to keep the current picture."}</small></label>
     <div className="wc-row"><label>Display order<input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></label><label className="wc-check"><input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/> Publish on public website</label></div>
     <button className="wc-primary" disabled={saving}>{saving?"Saving…":editing?"Update content":"Save website content"}</button>
    </form>
   </section>
   <div className="wc-groups">
    {(["logo","executive","programme"] as const).map(type=><section className="wc-panel" key={type}><div className="wc-panel-title"><div><h2>{type==="logo"?"Official logo":type==="executive"?"Executives & leadership":"Programmes & events"}</h2><p>{grouped[type].length} saved item(s)</p></div></div>
     {grouped[type].length===0?<div className="wc-empty">Nothing added here yet.</div>:<div className="wc-list">{grouped[type].map(item=><article key={item.id}>
      {item.image_url?<img src={item.image_url} alt={item.title}/>:<div className="wc-no-image">NO IMAGE</div>}
      <div className="wc-copy"><span className={item.is_published?"live":"draft"}>{item.is_published?"Published":"Draft"}</span><h3>{item.title}</h3>{item.subtitle&&<b>{item.subtitle}</b>}{item.body&&<p>{item.body}</p>}<small>Display order: {item.sort_order}</small><div className="wc-actions"><button onClick={()=>edit(item)}>Edit</button><button onClick={()=>void publish(item,!item.is_published)}>{item.is_published?"Unpublish":"Publish"}</button><button className="danger" onClick={()=>void remove(item)}>Delete</button></div></div>
     </article>)}</div>}
    </section>)}
   </div>
  </>}
  <footer>NYFB · Website content management · All changes are subject to public publication</footer>
 </div>
 <style jsx>{`
 .wc-shell{min-height:100vh;background:#f3f7f2;color:#1b3427;padding:24px 16px 60px;font-family:Arial,sans-serif}.wc-wrap{max-width:1000px;margin:auto}.wc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0b3928;color:#fff;border-radius:12px;padding:15px 18px}.wc-head a{color:#d9efdf;text-decoration:none;font-size:11px}.wc-head div{text-align:center}.wc-head b,.wc-head small{display:block}.wc-head b{font-size:17px;letter-spacing:2px}.wc-head small{font-size:8px;letter-spacing:1.5px;color:#b9d3c1;margin-top:4px}.wc-intro{padding:34px 4px 22px}.wc-intro>small{font-size:9px;letter-spacing:2px;color:#397b54;font-weight:800}.wc-intro h1{font-size:clamp(32px,5vw,48px);margin:9px 0}.wc-intro h1 em{color:#388254;font-style:normal}.wc-intro p{max-width:650px;color:#6b7b70;font-size:13px;line-height:1.7}.wc-intro span{display:inline-block;background:#e2f1e4;color:#287047;border-radius:20px;padding:7px 11px;font-size:9px;font-weight:700}.wc-panel{background:#fff;border:1px solid #e1e9e1;border-radius:12px;padding:20px;margin:16px 0;box-shadow:0 5px 20px #173a2608}.wc-panel-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.wc-panel-title h2{font-size:16px;margin:0 0 5px}.wc-panel-title p{font-size:10px;color:#849187;margin:0}.wc-panel form{display:grid;gap:13px}.wc-panel label{display:grid;gap:7px;font-size:10px;font-weight:700;color:#526458}.wc-panel input:not([type=checkbox]),.wc-panel textarea,.wc-panel select{width:100%;box-sizing:border-box;border:1px solid #dce6dc;border-radius:7px;padding:11px 12px;font:12px Arial;color:#233a2b;background:#fff}.wc-panel input[type=file]{font-size:11px}.wc-panel label small{font-size:9px;color:#8a978e;font-weight:400}.wc-panel textarea{resize:vertical;line-height:1.6}.wc-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center}.wc-check{display:flex!important;align-items:center;gap:9px!important}.wc-primary,.wc-secondary{border:0;border-radius:7px;padding:12px 16px;font-size:11px;font-weight:700;cursor:pointer}.wc-primary{background:#126342;color:white}.wc-primary:disabled{opacity:.5}.wc-secondary{background:#eef4ee;color:#476451}.wc-groups{display:grid;gap:4px}.wc-list{display:grid;gap:12px}.wc-list article{display:grid;grid-template-columns:150px 1fr;gap:16px;border:1px solid #e9eee8;border-radius:9px;padding:12px}.wc-list img,.wc-no-image{width:150px;height:130px;object-fit:contain;background:#f0f5f0;border-radius:7px}.wc-no-image{display:grid;place-items:center;color:#9aa69c;font-size:9px}.wc-copy h3{font-size:14px;margin:8px 0 5px}.wc-copy>b,.wc-copy p{font-size:11px;color:#66776b;line-height:1.6}.wc-copy p{white-space:pre-wrap}.wc-copy>small{font-size:9px;color:#95a198}.wc-copy>span{font-size:8px;font-weight:800;text-transform:uppercase;padding:5px 8px;border-radius:20px}.wc-copy>span.live{background:#e9f5eb;color:#28764a}.wc-copy>span.draft{background:#fff4df;color:#9a741e}.wc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.wc-actions button{border:1px solid #cbded0;background:#eff7f0;color:#276d43;border-radius:5px;padding:7px 10px;font-size:9px;font-weight:700;cursor:pointer}.wc-actions button.danger{border-color:#efd6d1;background:#fff7f5;color:#a34d40}.wc-empty{padding:25px;text-align:center;color:#87948a;font-size:11px}.wc-alert{padding:12px 14px;border-radius:7px;background:#eaf5eb;color:#2c7547;font-size:11px;margin:12px 0}.wc-alert.error{background:#fff0ed;color:#a14d40}.wc-wrap>footer{padding:22px 3px;color:#9aa69c;font-size:9px;letter-spacing:.5px}@media(max-width:600px){.wc-shell{padding:12px 10px 40px}.wc-head{padding:12px}.wc-head a{font-size:9px}.wc-panel{padding:14px}.wc-row{grid-template-columns:1fr}.wc-list article{grid-template-columns:90px 1fr;gap:10px;padding:9px}.wc-list img,.wc-no-image{width:90px;height:100px}.wc-actions button{padding:7px 8px}.wc-intro{padding-top:25px}}
 `}</style>
 </main>;
}
