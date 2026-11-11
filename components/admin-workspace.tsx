"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Member = { id:string; user_id:string; member_number:string; full_name:string; email:string|null; phone:string; state:string; lga:string; ward:string|null; status:string; submitted_at:string; rejection_reason:string|null };
type BankAccount = {user_id:string;bank_name:string;account_number:string;account_name:string;verification_status:string;submitted_at:string};
type Assignment = { role:string; state:string|null; lga:string|null; ward:string|null };
type Announcement = { id:string; title:string; body:string; audience:string; target_state:string|null; published:boolean; published_at:string|null; created_at:string };
type Activity = { id:number; actor_id:string|null; action:string; entity_type:string; entity_id:string|null; details:Record<string,unknown>; created_at:string };
type Tab = "overview"|"members"|"announcements"|"activity"|"profile";
const allowed = ["ward_coordinator","lga_coordinator","state_coordinator","national_admin"];
const date = (value:string) => new Date(value).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
const stamp = (value:string) => new Date(value).toLocaleString("en-NG",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const initialForm = {title:"",body:"",audience:"all",target_state:""};

export default function AdminWorkspace(){
 const [members,setMembers]=useState<Member[]>([]);
 const [bankAccounts,setBankAccounts]=useState<BankAccount[]>([]);
 const [selectedIds,setSelectedIds]=useState<string[]>([]);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [activity,setActivity]=useState<Activity[]>([]);
 const [programmeCounts,setProgrammeCounts]=useState({events:0,tasks:0,groups:0,welfare:0,campus:0,attendance:0});
 const [role,setRole]=useState("member");
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [tab,setTab]=useState<Tab>("overview");
 const [filter,setFilter]=useState("pending");
 const [search,setSearch]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 const [form,setForm]=useState(initialForm);
 const supabase=useMemo(()=>createClient(),[]);
 const isNationalAdmin=role==="national_admin";

 async function load(){
  setLoading(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const [profileResult,assignmentResult,memberResult,announcementResult,activityResult,eventsResult,tasksResult,groupsResult,welfareResult,campusResult,attendanceResult,bankResult]=await Promise.all([
   supabase.from("profiles").select("role").eq("id",user.id).single(),
   supabase.from("coordinator_assignments").select("role,state,lga,ward").eq("user_id",user.id),
   supabase.from("members").select("id,user_id,member_number,full_name,email,phone,state,lga,ward,status,submitted_at,rejection_reason").order("submitted_at",{ascending:false}).limit(1000),
   supabase.from("announcements").select("id,title,body,audience,target_state,published,published_at,created_at").order("created_at",{ascending:false}).limit(100),
   supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,details,created_at").order("created_at",{ascending:false}).limit(30),
   supabase.from("events").select("id,status"),
   supabase.from("volunteer_tasks").select("id,status"),
   supabase.from("support_groups").select("id,status"),
   supabase.from("welfare_applications").select("id,status"),
   supabase.from("campus_mobilizers").select("id,status"),
   supabase.from("event_attendance").select("id"),
   supabase.from("member_bank_accounts").select("user_id,bank_name,account_number,account_name,verification_status,submitted_at").order("submitted_at",{ascending:false}).limit(1000)
  ]);
  if(profileResult.error){setError(profileResult.error.message);setLoading(false);return;}
  const pRole=profileResult.data?.role||"member";
  const assigned=(assignmentResult.data||[]) as Assignment[];
  const effectiveRole=pRole==="national_admin"?"national_admin":(assigned.find(a=>allowed.includes(a.role))?.role||pRole);
  setRole(effectiveRole);setAssignments(assigned);
  if(!allowed.includes(effectiveRole)){setError("Your account does not have coordinator or national administrator access.");setMembers([]);}
  else if(memberResult.error){setError(memberResult.error.message);}
  else setMembers((memberResult.data||[]) as Member[]);
  if(!bankResult.error)setBankAccounts((bankResult.data||[]) as BankAccount[]);
  if(!announcementResult.error)setAnnouncements((announcementResult.data||[]) as Announcement[]);
  if(!activityResult.error)setActivity((activityResult.data||[]) as Activity[]);
  setProgrammeCounts({events:eventsResult.data?.length||0,tasks:tasksResult.data?.length||0,groups:groupsResult.data?.length||0,welfare:welfareResult.data?.length||0,campus:campusResult.data?.length||0,attendance:attendanceResult.data?.length||0});
  setLoading(false);
 }
 useEffect(()=>{void load();const channel=supabase.channel("nyfb-admin-live").on("postgres_changes",{event:"*",schema:"public",table:"members"},()=>{void load();}).on("postgres_changes",{event:"*",schema:"public",table:"announcements"},()=>{void load();}).on("postgres_changes",{event:"*",schema:"public",table:"audit_logs"},()=>{void load();}).on("postgres_changes",{event:"*",schema:"public",table:"events"},()=>{void load();}).on("postgres_changes",{event:"*",schema:"public",table:"volunteer_tasks"},()=>{void load();}).on("postgres_changes",{event:"*",schema:"public",table:"event_attendance"},()=>{void load();}).subscribe();return()=>{void supabase.removeChannel(channel);};},[]);

 const counts={all:members.length,pending:members.filter(m=>m.status==="pending").length,approved:members.filter(m=>m.status==="approved").length,rejected:members.filter(m=>m.status==="rejected").length,suspended:members.filter(m=>m.status==="suspended").length};
 const visible=members.filter(m=>(filter==="all"||m.status===filter)&&[m.full_name,m.member_number,m.email||"",m.phone,m.state,m.lga,m.ward||""].join(" ").toLowerCase().includes(search.toLowerCase()));
 const recentMembers=members.slice(0,5);
 const publishedCount=announcements.filter(a=>a.published).length;
 const pendingCount=announcements.filter(a=>!a.published).length;
 const visiblePending=visible.filter(m=>m.status==="pending");
 const allVisiblePendingSelected=visiblePending.length>0&&visiblePending.every(m=>selectedIds.includes(m.id));

 async function decide(member:Member,status:"approved"|"rejected"|"suspended"){
  let reason:string|null=null;
  if(status==="rejected"){reason=window.prompt("Enter a reason for rejecting this application:");if(reason===null)return;if(!reason.trim()){setNotice("A rejection reason is required.");return;}}
  if(status==="suspended"&&!window.confirm("Suspend "+member.full_name+"'s membership?"))return;
  setBusy(member.id);setNotice("");setError("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error:updateError}=await supabase.from("members").update({status,reviewed_at:new Date().toISOString(),reviewed_by:user?.id,rejection_reason:reason}).eq("id",member.id);
  if(updateError)setError(updateError.message);
  else {
   if(status==="approved"){
    setNotice(member.member_number+" has been approved. No email notification was sent.");
   } else {
    const {data:emailResult,error:emailError}=await supabase.functions.invoke("send-member-status-email",{body:{member_id:member.id,status,reason}});
    if(emailError||emailResult?.error)setNotice(member.member_number+" has been "+status+", but the email notification was not sent. "+(emailResult?.error||emailError?.message||"Please try again later."));
    else setNotice(member.member_number+" has been "+status+" and the member has been notified by email.");
   }
   await load();
  }
  setBusy("");
 }

 async function approveSelected(){
  const ids=selectedIds.filter(id=>visiblePending.some(m=>m.id===id));
  if(!ids.length){setNotice("Select at least one pending application.");return;}
  if(!window.confirm("Approve "+ids.length+" selected application(s)?"))return;
  setSaving(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Your session has expired. Please sign in again.");setSaving(false);return;}
  const {data:updated,error:updateError}=await supabase.from("members").update({status:"approved",reviewed_at:new Date().toISOString(),reviewed_by:user.id,rejection_reason:null}).in("id",ids).eq("status","pending").select("id,member_number");
  if(updateError){setError(updateError.message);setSaving(false);return;}
  const approved=(updated||[]) as {id:string;member_number:string}[];
  setSelectedIds([]);
  setNotice(approved.length+" application(s) approved. No email notifications were sent.");
  await load();setSaving(false);
 }
 async function setBankVerification(item:BankAccount,status:"verified"|"rejected"){
  setBusy(item.user_id);setError("");setNotice("");
  const {error:updateError}=await supabase.from("member_bank_accounts").update({verification_status:status}).eq("user_id",item.user_id);
  if(updateError)setError(updateError.message);
  else {setNotice("Bank details marked "+status+".");await load();}
  setBusy("");
 }
 async function createAnnouncement(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  const payload={title:form.title.trim(),body:form.body.trim(),audience:form.audience,target_state:form.audience==="state"?form.target_state.trim():null,published:false,created_by:user?.id};
  const {error:insertError}=await supabase.from("announcements").insert(payload);
  if(insertError)setError(insertError.message);
  else {setForm(initialForm);setNotice("Announcement saved as a draft.");await load();}
  setSaving(false);
 }

 async function setAnnouncementPublished(item:Announcement,published:boolean){
  setBusy(item.id);setError("");setNotice("");
  const {error:updateError}=await supabase.from("announcements").update({published,published_at:published?new Date().toISOString():null}).eq("id",item.id);
  if(updateError)setError(updateError.message);
  else {setNotice(published?"Announcement published. It is now available to its selected audience.":"Announcement moved back to drafts.");await load();}
  setBusy("");
 }
 async function deleteAnnouncement(item:Announcement){
  if(!window.confirm("Permanently delete this announcement?"))return;
  setBusy(item.id);const {error:deleteError}=await supabase.from("announcements").delete().eq("id",item.id);
  if(deleteError)setError(deleteError.message);else {setNotice("Announcement deleted.");await load();}
  setBusy("");
 }
 function exportMembers(){
  const safe=(value:unknown)=>String(value??"").normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^\\x20-\\x7E]/g,"?");
  const wrap=(value:string,max:number)=>{const words=value.split(/\\s+/);const out:string[]=[];let line="";for(const word of words){if((line+" "+word).trim().length>max&&line){out.push(line);line=word;}else line=(line+" "+word).trim();}if(line)out.push(line);return out.length?out:[""];};
  const lines:string[]=["NYFB MEMBERSHIP REGISTER","Generated: "+new Date().toLocaleString("en-NG"),"Records in current view: "+visible.length,""];
  visible.forEach((m,index)=>{lines.push((index+1)+". "+safe(m.full_name)+"  |  "+safe(m.member_number));lines.push("   Email: "+safe(m.email||"Not provided")+"  |  Phone: "+safe(m.phone));lines.push("   Location: "+safe([m.ward,m.lga,m.state].filter(Boolean).join(", "))+"  |  Status: "+safe(m.status));lines.push("   Submitted: "+safe(date(m.submitted_at)));lines.push("");});
  const pages:string[][]=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48));if(!pages.length)pages.push(["NYFB MEMBERSHIP REGISTER","No records in this view."]);
  const objects:string[]=[];const add=(value:string)=>{objects.push(value);return objects.length;};
  const catalogId=add("<< /Type /Catalog /Pages 2 0 R >>");const pagesId=add("");
  const fontId=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");const pageIds:number[]=[];
  pages.forEach((page,pageIndex)=>{const stream=["BT","/F1 9 Tf","48 795 Td","13 TL",...page.flatMap((line,i)=>{const escaped=line.replace(/\\\\/g,"\\\\\\\\").replace(/\\(/g,"\\\\(").replace(/\\)/g,"\\\\)");return [i===0&&pageIndex===0?"/F1 14 Tf":(i===0?"/F1 11 Tf":"/F1 9 Tf"),"("+escaped+") Tj","T*"]; }),"ET"].join("\\n");const contentId=add("<< /Length "+stream.length+" >>\\nstream\\n"+stream+"\\nendstream");const pageId=add("<< /Type /Page /Parent "+pagesId+" 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 "+fontId+" 0 R >> >> /Contents "+contentId+" 0 R >>");pageIds.push(pageId);});
  objects[pagesId-1]="<< /Type /Pages /Kids ["+pageIds.map(id=>id+" 0 R").join(" ")+"] /Count "+pageIds.length+" >>";
  let pdf="%PDF-1.4\\n";const offsets=[0];objects.forEach((obj,index)=>{offsets.push(pdf.length);pdf+=(index+1)+" 0 obj\\n"+obj+"\\nendobj\\n";});const xref=pdf.length;pdf+="xref\\n0 "+(objects.length+1)+"\\n0000000000 65535 f \\n";offsets.slice(1).forEach(offset=>pdf+=String(offset).padStart(10,"0")+" 00000 n \\n");pdf+="trailer\\n<< /Size "+(objects.length+1)+" /Root "+catalogId+" 0 R >>\\nstartxref\\n"+xref+"\\n%%EOF";
  const blob=new Blob([pdf],{type:"application/pdf"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="NYFB-members-"+new Date().toISOString().slice(0,10)+".pdf";document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function signOut(){await supabase.auth.signOut();window.location.assign("/");}

 const nav: {id:Tab;label:string;icon:string}[]=[{id:"overview",label:"Dashboard",icon:"⌂"},{id:"members",label:"Membership",icon:"♙"},{id:"announcements",label:"Announcements",icon:"▤"},{id:"activity",label:"Activity log",icon:"◷"},{id:"profile",label:"My profile",icon:"◎"}];
 const audienceLabel=(a:string)=>({all:"Everyone",members:"All members",coordinators:"Coordinators",state:"Selected state"}[a]||a);
 return <main className="ny-admin">
  <aside className="ny-sidebar">
   <Link href="/" className="ny-brand"><span className="ny-mark">NY</span><span><b>NYFB</b><small>ADMINISTRATION</small></span></Link>
   <div className="ny-side-caption">MAIN WORKSPACE</div>
   <nav>{nav.map(item=><button key={item.id} className={tab===item.id?"active":""} onClick={()=>{setTab(item.id);setNotice("");setError("");}}><span>{item.icon}</span>{item.label}{item.id==="members"&&counts.pending>0?<i>{counts.pending}</i>:null}</button>)}</nav>
   <div className="ny-side-caption ny-side-group">PROGRAMME OPERATIONS</div>
   <Link href="/admin/programmes" className="ny-programme-link"><span className="ny-link-icon">▣</span><span className="ny-link-label">Programme management</span><b>→</b></Link>
   {isNationalAdmin&&<Link href="/admin/coordinators" className="ny-programme-link"><span className="ny-link-icon">♙</span><span className="ny-link-label">Coordinator management</span><b>→</b></Link>}\n   {isNationalAdmin&&<Link href="/admin/website" className="ny-programme-link"><span className="ny-link-icon">▧</span><span className="ny-link-label">Website content</span><b>→</b></Link>}
   <div className="ny-side-caption ny-side-group">ORGANISATION &amp; ACCOUNT</div>
   <Link href="/#about" className="ny-programme-link"><span className="ny-link-icon">ⓘ</span><span className="ny-link-label">About NYFB</span><b>→</b></Link>
   <Link href="/forgot-password" className="ny-programme-link"><span className="ny-link-icon">⚙</span><span className="ny-link-label">Account settings</span><b>→</b></Link>
   <a href="mailto:nigerianyouthforbat@gmail.com" className="ny-programme-link"><span className="ny-link-icon">?</span><span className="ny-link-label">Help &amp; support</span><b>→</b></a>
   <div className="ny-side-bottom"><div className="ny-user-avatar">NY</div><div><b>NYFB Workspace</b><small>{role.replaceAll("_"," ")} access</small></div><button aria-label="Sign out" onClick={signOut}>↗</button></div>
  </aside>
  <section className="ny-main">
   <header className="ny-topbar"><div><span>NYFB / </span>{nav.find(n=>n.id===tab)?.label}</div><div className="ny-top-actions"><span className="ny-live-dot">● Secure workspace</span><button onClick={()=>void load()}>↻ Refresh</button><button className="ny-top-signout" onClick={signOut}>Sign out</button></div></header>
   <div className="ny-content">
    <div className="ny-welcome"><div><div className="ny-eyebrow">NIGERIAN YOUTH FOR BAT · MANAGEMENT PORTAL</div><h1>{tab==="overview"?"Dashboard overview":tab==="members"?"Membership management":tab==="announcements"?"Announcements & broadcasts":tab==="activity"?"Administrative activity":"My profile"}</h1><p>{tab==="overview"?"Monitor membership, manage engagement and keep the organisation moving.":tab==="members"?"Review applications and manage member status across the organisation.":tab==="announcements"?"Prepare official updates and publish them to the right audience.":tab==="activity"?"A trace of recent administrative notifications and actions.":"Your NYFB administration account and assigned access."}</p></div><div className="ny-date-chip">{new Date().toLocaleDateString("en-NG",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
    {error&&<div className="ny-alert error">{error}</div>}{notice&&<div className="ny-alert">{notice}</div>}
    {loading?<div className="ny-loading"><span/>Loading your secure workspace…</div>:error&&members.length===0?<div className="ny-empty">Your account could not access this workspace. Please contact the platform administrator.</div>:<>
     {tab==="overview"&&<div className="ny-view">
      <div className="ny-stats">
       <article className="ny-stat"><div className="ny-stat-top"><span>Total registrations</span><b>♙</b></div><strong>{counts.all}</strong><small>All membership records</small></article>
       <article className="ny-stat warm"><div className="ny-stat-top"><span>Awaiting review</span><b>◷</b></div><strong>{counts.pending}</strong><small>Applications needing action</small></article>
       <article className="ny-stat green"><div className="ny-stat-top"><span>Approved members</span><b>✓</b></div><strong>{counts.approved}</strong><small>Eligible for membership card</small></article>
       <article className="ny-stat dark"><div className="ny-stat-top"><span>Published updates</span><b>▤</b></div><strong>{publishedCount}</strong><small>{pendingCount} drafts awaiting publication</small></article>
      </div>
      <section className="ny-panel ny-coverage"><div className="ny-panel-head"><div><h2>National engagement overview</h2><p>Programme activity and participation recorded across the NYFB network</p></div><Link className="ny-text-btn" href="/admin/programmes">Manage programmes →</Link></div><div className="ny-stats ny-engagement-stats"><article className="ny-stat"><div className="ny-stat-top"><span>Events</span><b>◷</b></div><strong>{programmeCounts.events}</strong><small>Published and draft records</small></article><article className="ny-stat"><div className="ny-stat-top"><span>Volunteer tasks</span><b>✓</b></div><strong>{programmeCounts.tasks}</strong><small>Campaign and service tasks</small></article><article className="ny-stat"><div className="ny-stat-top"><span>Support groups</span><b>♧</b></div><strong>{programmeCounts.groups}</strong><small>Applications and registrations</small></article><article className="ny-stat"><div className="ny-stat-top"><span>Welfare requests</span><b>♡</b></div><strong>{programmeCounts.welfare}</strong><small>Assistance applications</small></article><article className="ny-stat"><div className="ny-stat-top"><span>Campus mobilizers</span><b>⌂</b></div><strong>{programmeCounts.campus}</strong><small>Campus network applications</small></article><article className="ny-stat"><div className="ny-stat-top"><span>Event registrations</span><b>↗</b></div><strong>{programmeCounts.attendance}</strong><small>Recorded event RSVPs</small></article></div></section>
      <div className="ny-overview-grid">
       <section className="ny-panel ny-wide"><div className="ny-panel-head"><div><h2>Membership applications</h2><p>Latest submissions requiring attention</p></div><button className="ny-text-btn" onClick={()=>{setTab("members");setFilter("pending");}}>View all →</button></div>
        {recentMembers.length===0?<div className="ny-empty">No membership applications found.</div>:<div className="ny-table-wrap"><table><thead><tr><th>MEMBER</th><th>LOCATION</th><th>SUBMITTED</th><th>STATUS</th><th></th></tr></thead><tbody>{recentMembers.map(m=><tr key={m.id}><td><b>{m.full_name}</b><small>{m.member_number}</small></td><td>{m.lga}, {m.state}</td><td>{date(m.submitted_at)}</td><td><span className={"ny-status "+m.status}>{m.status}</span></td><td><button className="ny-row-btn" onClick={()=>{setTab("members");setSearch(m.member_number);setFilter("all");}}>Open</button></td></tr>)}</tbody></table></div>}
       </section>
       <section className="ny-panel"><div className="ny-panel-head"><div><h2>Quick actions</h2><p>Common administration tasks</p></div></div><div className="ny-quick-actions"><button onClick={()=>{setTab("members");setFilter("pending");setSearch("");}}><span>♙</span><b>Review applications</b><small>{counts.pending} pending review</small><i>→</i></button><button onClick={()=>setTab("announcements")}><span>▤</span><b>Create announcement</b><small>Reach members and coordinators</small><i>→</i></button><button onClick={()=>setTab("activity")}><span>◷</span><b>View activity log</b><small>Recent system notifications</small><i>→</i></button></div></section>
      </div>
      <section className="ny-panel ny-coverage"><div className="ny-panel-head"><div><h2>Membership status</h2><p>Current distribution of registered applications</p></div></div><div className="ny-progress-list">{[["Approved",counts.approved,"approved"],["Pending",counts.pending,"pending"],["Rejected",counts.rejected,"rejected"],["Suspended",counts.suspended,"suspended"]].map(([label,value,key])=><div className="ny-progress-row" key={key as string}><span>{label}</span><div><i className={key as string} style={{width:(counts.all?Number(value)/counts.all*100:0)+"%"}}/></div><b>{value}</b></div>)}</div></section>
     </div>}
     {tab==="members"&&<div className="ny-view"><div className="ny-filter-cards">{(["all","pending","approved","rejected","suspended"] as const).map(k=><button key={k} className={filter===k?"selected":""} onClick={()=>setFilter(k)}><small>{k.toUpperCase()}</small><b>{counts[k]}</b></button>)}</div><section className="ny-panel"><div className="ny-panel-head ny-member-toolbar"><div><h2>Member directory</h2><p>{visible.length} records match your current view</p></div><div className="ny-search-tools"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, phone, email or location…"/><button onClick={exportMembers}>↓ Download PDF</button></div></div>{filter==="pending"&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",margin:"0 0 14px"}}><label style={{fontSize:11,display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={allVisiblePendingSelected} onChange={e=>setSelectedIds(e.target.checked?Array.from(new Set([...selectedIds,...visiblePending.map(x=>x.id)])):selectedIds.filter(id=>!visiblePending.some(x=>x.id===id)))} /> Select all visible pending applications</label><button className="ny-primary" disabled={saving||selectedIds.length===0} onClick={()=>void approveSelected()}>{saving?"Approving…":"Approve selected ("+selectedIds.filter(id=>visiblePending.some(x=>x.id===id)).length+")"}</button></div>}<div className="ny-table-wrap"><table><thead><tr><th>SELECT</th><th>MEMBER DETAILS</th><th>CONTACT</th><th>LOCATION</th><th>DATE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{visible.map(m=><tr key={m.id}><td>{m.status==="pending"?<input type="checkbox" aria-label={"Select "+m.full_name} checked={selectedIds.includes(m.id)} onChange={e=>setSelectedIds(prev=>e.target.checked?[...prev,m.id]:prev.filter(id=>id!==m.id))}/>:<span className="ny-muted">—</span>}</td><td><b>{m.full_name}</b><small>{m.member_number}</small></td><td>{m.phone}<small>{m.email||"No email provided"}</small></td><td>{m.ward?m.ward+", ":""}{m.lga}, {m.state}</td><td>{date(m.submitted_at)}</td><td><span className={"ny-status "+m.status}>{m.status}</span></td><td><div className="ny-actions">{m.status==="pending"?<><button disabled={busy===m.id} onClick={()=>void decide(m,"approved")}>Approve</button><button className="danger" disabled={busy===m.id} onClick={()=>void decide(m,"rejected")}>Reject</button></>:m.status==="approved"?<button className="danger" disabled={busy===m.id} onClick={()=>void decide(m,"suspended")}>Suspend</button>:<span className="ny-muted">—</span>}</div></td></tr>)}</tbody></table>{visible.length===0&&<div className="ny-empty">No members match this search.</div>}</div></section><details className="ny-panel ny-bank-accordion"><summary className="ny-panel-head"><div><h2>Submitted bank details</h2><p>Restricted financial information · {bankAccounts.length} submission(s) · Click to view account records</p></div><span className="ny-bank-chevron" aria-hidden="true">⌄</span></summary><div className="ny-table-wrap"><table><thead><tr><th>USER ID</th><th>BANK</th><th>ACCOUNT NUMBER</th><th>ACCOUNT NAME</th><th>VERIFICATION</th><th>ACTION</th></tr></thead><tbody>{bankAccounts.map(item=><tr key={item.user_id}><td><b>{members.find(m=>m.user_id===item.user_id)?.full_name||"Member record"}</b><small>{members.find(m=>m.user_id===item.user_id)?.member_number||item.user_id}</small></td><td>{item.bank_name}</td><td>{item.account_number}</td><td>{item.account_name}</td><td><span className={"ny-status "+(item.verification_status==="verified"?"approved":item.verification_status==="rejected"?"rejected":"pending")}>{item.verification_status}</span></td><td><div className="ny-actions"><button disabled={busy===item.user_id} onClick={()=>void setBankVerification(item,"verified")}>Verify</button><button className="danger" disabled={busy===item.user_id} onClick={()=>void setBankVerification(item,"rejected")}>Reject</button></div></td></tr>)}</tbody></table>{bankAccounts.length===0&&<div className="ny-empty">No bank details have been submitted yet.</div>}</div></details></div>}
     {tab==="announcements"&&<div className="ny-view"><div className="ny-stats ny-ann-stats"><article className="ny-stat"><div className="ny-stat-top"><span>Total updates</span><b>▤</b></div><strong>{announcements.length}</strong><small>Saved announcements</small></article><article className="ny-stat green"><div className="ny-stat-top"><span>Published</span><b>✓</b></div><strong>{publishedCount}</strong><small>Visible to selected audiences</small></article><article className="ny-stat warm"><div className="ny-stat-top"><span>Drafts</span><b>◷</b></div><strong>{pendingCount}</strong><small>Not yet published</small></article></div>
      {isNationalAdmin&&<section className="ny-panel ny-compose"><div className="ny-panel-head"><div><h2>Create an announcement</h2><p>Draft first, review, then publish when ready.</p></div><span className="ny-draft-label">NEW DRAFT</span></div><form onSubmit={createAnnouncement}><label>Announcement title<input required maxLength={140} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. National membership registration update"/></label><label>Message<textarea required rows={5} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Write the official announcement…"/></label><div className="ny-form-row"><label>Audience<select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option value="all">Everyone</option><option value="members">All members</option><option value="coordinators">Coordinators</option><option value="state">Specific state</option></select></label>{form.audience==="state"&&<label>Target state<input required value={form.target_state} onChange={e=>setForm({...form,target_state:e.target.value})} placeholder="Enter state name"/></label>}<button disabled={saving} className="ny-primary" type="submit">{saving?"Saving…":"Save as draft →"}</button></div></form></section>}
      <section className="ny-panel"><div className="ny-panel-head"><div><h2>Broadcast library</h2><p>Manage saved announcements and publication status</p></div></div>{announcements.length===0?<div className="ny-empty">No announcements yet. Create your first draft above.</div>:<div className="ny-ann-list">{announcements.map(a=><article key={a.id}><div className="ny-ann-top"><span className={a.published?"ny-status approved":"ny-status pending"}>{a.published?"Published":"Draft"}</span><small>{date(a.created_at)}</small></div><h3>{a.title}</h3><p>{a.body}</p><div className="ny-ann-foot"><span>Audience: <b>{audienceLabel(a.audience)}{a.audience==="state"&&a.target_state?" · "+a.target_state:""}</b></span>{isNationalAdmin&&<div className="ny-actions">{a.published?<button className="secondary" disabled={busy===a.id} onClick={()=>void setAnnouncementPublished(a,false)}>Unpublish</button>:<button disabled={busy===a.id} onClick={()=>void setAnnouncementPublished(a,true)}>Publish</button>}<button className="danger" disabled={busy===a.id} onClick={()=>void deleteAnnouncement(a)}>Delete</button></div>}</div></article>)}</div>}</section>
     </div>}
     {tab==="profile"&&<div className="ny-view"><section className="ny-panel"><div className="ny-panel-head"><div><h2>Account profile</h2><p>Your current NYFB workspace access</p></div></div><div className="ny-profile-grid"><article><small>ACCESS ROLE</small><b>{role.replaceAll("_"," ")}</b></article><article><small>ASSIGNED AREA</small><b>{assignments.length?assignments.map(a=>[a.ward,a.lga,a.state].filter(Boolean).join(", ")).join(" · "):"National organisation scope"}</b></article><article><small>ACCOUNT SECURITY</small><b>Authenticated NYFB account</b><Link href="/forgot-password">Change or reset password →</Link></article></div></section></div>}\n     {tab==="activity"&&<div className="ny-view"><section className="ny-panel"><div className="ny-panel-head"><div><h2>Recent administrative activity</h2><p>Latest audit events recorded by the platform</p></div></div>{activity.length===0?<div className="ny-empty">No activity events have been recorded yet. Member status email notifications will appear here after delivery.</div>:<div className="ny-activity-list">{activity.map(item=><article key={item.id}><span className="ny-activity-icon">◷</span><div><b>{item.action.replaceAll("_"," ")}</b><p>{item.entity_type}{item.entity_id?" · "+item.entity_id:""}{item.details&&typeof item.details==="object"&&"status" in item.details?" · "+String(item.details.status):""}</p><small>{stamp(item.created_at)}</small></div></article>)}</div>}</section></div>}
    </>}
    <footer className="ny-footer"><span>NYFB DIGITAL ADMINISTRATION PLATFORM</span><span>Secure access · Role-based permissions</span></footer>
   </div>
  </section>
  <style jsx>{`
   .ny-engagement-stats{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:18px}.ny-engagement-stats .ny-stat{min-width:0}.ny-admin{--g:#126342;--deep:#0d3829;--gold:#caa85b;--ink:#1b3026;--muted:#78877d;--line:#e5ebe5;min-height:100vh;background:#f4f7f3;color:var(--ink);display:flex;font-family:Arial,sans-serif}
   .ny-sidebar{width:270px;background:var(--deep);color:white;min-height:100vh;padding:27px 17px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;flex-shrink:0}
   .ny-brand{display:flex;align-items:center;gap:12px;padding:0 9px 37px;color:white}.ny-mark{width:42px;height:42px;border-radius:12px;background:var(--gold);color:#173d2d;display:grid;place-items:center;font-weight:900;font-size:16px}.ny-brand b,.ny-brand small{display:block}.ny-brand b{font-size:17px;letter-spacing:1px}.ny-brand small{font-size:8px;letter-spacing:1.6px;color:#a9c2b2;margin-top:4px}.ny-side-caption{font-size:9px;letter-spacing:1.7px;color:#91ad9b;padding:0 12px 13px}.ny-sidebar nav{display:grid;gap:6px}.ny-sidebar nav button{display:flex;align-items:center;gap:13px;width:100%;padding:13px 12px;border:0;border-radius:8px;background:transparent;color:#c5d5ca;text-align:left;font-size:12px;cursor:pointer}.ny-sidebar nav button span{width:20px;font-size:18px;text-align:center}.ny-sidebar nav button.active{background:#ffffff16;color:#fff;box-shadow:inset 3px 0 var(--gold)}.ny-sidebar nav button i{font-style:normal;margin-left:auto;background:#d5b66b;color:#183d2d;border-radius:20px;padding:3px 7px;font-size:10px}.ny-programme-link{display:flex;justify-content:space-between;align-items:center;margin:7px 8px 0;padding:11px 12px;border:1px solid #ffffff18;border-radius:8px;color:#d8e5dc;font-size:10px;font-weight:600;transition:background .18s,border-color .18s}.ny-programme-link:hover{background:#ffffff12;border-color:#ffffff35}.ny-sidebar nav{margin-bottom:14px}.ny-sidebar nav button{min-height:42px}.ny-side-caption:not(:first-of-type){margin-top:12px}.ny-programme-link span{color:#c6df7b}.ny-side-bottom{margin-top:auto;border-top:1px solid #ffffff20;padding:19px 4px 0;display:flex;align-items:center;gap:10px}.ny-user-avatar{width:34px;height:34px;border-radius:50%;background:#d7bb78;color:#183d2d;display:grid;place-items:center;font-weight:800;font-size:11px}.ny-side-bottom b,.ny-side-bottom small{display:block}.ny-side-bottom b{font-size:11px}.ny-side-bottom small{font-size:9px;color:#9fb6a7;margin-top:4px;text-transform:capitalize}.ny-side-bottom>button{margin-left:auto;border:0;background:transparent;color:#c6d5cb;font-size:17px;cursor:pointer}
   .ny-main{min-width:0;flex:1}.ny-topbar{height:68px;background:#fff;border-bottom:1px solid var(--line);padding:0 38px;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700}.ny-topbar>div:first-child span{color:#9aa79d;font-weight:400}.ny-top-actions{display:flex;align-items:center;gap:17px}.ny-live-dot{font-size:10px;color:#477c5b}.ny-top-actions button{border:1px solid var(--line);background:#fff;border-radius:6px;padding:8px 11px;font-size:10px;color:#52665a;cursor:pointer}.ny-top-actions .ny-top-signout{color:#9a5146}
   .ny-content{max-width:1500px;margin:0 auto;padding:35px 38px 22px}.ny-welcome{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:28px}.ny-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.8px;color:var(--g)}.ny-welcome h1{font-size:clamp(25px,3vw,34px);letter-spacing:-1px;margin:10px 0 7px}.ny-welcome p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.ny-date-chip{font-size:10px;color:#65776b;background:#fff;border:1px solid var(--line);padding:10px 13px;border-radius:7px;white-space:nowrap}
   .ny-view{display:grid;gap:19px}.ny-profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ny-profile-grid article{background:#f5f8f4;border:1px solid #e7eee7;border-radius:8px;padding:16px;min-width:0}.ny-profile-grid small,.ny-profile-grid b,.ny-profile-grid a{display:block}.ny-profile-grid small{font-size:8px;letter-spacing:1px;color:#87968b}.ny-profile-grid b{font-size:12px;text-transform:capitalize;margin:9px 0;color:#2d4636;overflow-wrap:anywhere}.ny-profile-grid a{font-size:10px;color:#176b47}.ny-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.ny-stat{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px 19px;box-shadow:0 5px 20px #183b2705}.ny-stat-top{display:flex;justify-content:space-between;align-items:center;color:#718075;font-size:10px}.ny-stat-top b{width:29px;height:29px;border-radius:8px;background:#eef5ef;color:var(--g);display:grid;place-items:center;font-size:15px}.ny-stat>strong{display:block;font-size:32px;letter-spacing:-1px;margin:13px 0 5px}.ny-stat>small{font-size:10px;color:#91a096}.ny-stat.warm .ny-stat-top b{background:#fff5e4;color:#a77a25}.ny-stat.green .ny-stat-top b{background:#eaf5ed;color:#2c8050}.ny-stat.dark{background:#123f2e;color:white;border-color:#123f2e}.ny-stat.dark .ny-stat-top,.ny-stat.dark>small{color:#bad0c1}.ny-stat.dark .ny-stat-top b{background:#ffffff19;color:#e7d08f}
   .ny-overview-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:18px}.ny-panel{background:white;border:1px solid var(--line);border-radius:10px;padding:20px;min-width:0;box-shadow:0 5px 20px #183b2705}.ny-panel-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:17px}.ny-panel-head h2{font-size:15px;margin:0 0 5px;letter-spacing:-.2px}.ny-panel-head p{font-size:10px;color:var(--muted);margin:0}.ny-text-btn{border:0;background:transparent;color:var(--g);font-size:10px;font-weight:700;cursor:pointer}.ny-table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{font-size:8px;letter-spacing:1px;color:#94a097;font-weight:700;padding:11px 10px;border-bottom:1px solid var(--line)}td{font-size:10px;color:#65746a;padding:13px 10px;border-bottom:1px solid #eef1ed}td b,td small{display:block}td b{color:#293d31;font-size:10px}td small{font-size:9px;color:#98a39b;margin-top:4px}.ny-status{display:inline-flex;border-radius:30px;padding:5px 8px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;background:#f3f4f2;color:#6c796f}.ny-status.approved{background:#eaf5ed;color:#287248}.ny-status.pending{background:#fff4df;color:#9a711e}.ny-status.rejected,.ny-status.suspended{background:#fff0ed;color:#a14e40}.ny-row-btn{border:0;background:transparent;color:var(--g);font-size:10px;font-weight:700;cursor:pointer}.ny-quick-actions{display:grid}.ny-quick-actions button{position:relative;display:grid;grid-template-columns:35px 1fr;column-gap:10px;text-align:left;padding:12px 3px;border:0;border-bottom:1px solid #edf1ed;background:white;cursor:pointer}.ny-quick-actions button:last-child{border:0}.ny-quick-actions button>span{grid-row:span 2;width:31px;height:31px;border-radius:8px;background:#eef5ef;color:var(--g);display:grid;place-items:center}.ny-quick-actions b{font-size:10px;color:#2e4236}.ny-quick-actions small{font-size:9px;color:#95a197;margin-top:4px}.ny-quick-actions i{position:absolute;right:5px;top:19px;color:var(--g);font-style:normal}.ny-coverage{max-width:100%}.ny-progress-list{display:grid;gap:13px}.ny-progress-row{display:grid;grid-template-columns:90px 1fr 30px;align-items:center;gap:12px;font-size:10px;color:#67766c}.ny-progress-row>div{height:7px;border-radius:10px;background:#eff2ee;overflow:hidden}.ny-progress-row>div i{display:block;height:100%;border-radius:10px;background:#2c8554}.ny-progress-row>div i.pending{background:#d5a64a}.ny-progress-row>div i.rejected,.ny-progress-row>div i.suspended{background:#c57b6c}.ny-progress-row>b{text-align:right;color:#33483a}
   .ny-filter-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.ny-filter-cards button{background:#fff;border:1px solid var(--line);border-radius:8px;padding:13px;text-align:left;cursor:pointer}.ny-filter-cards button.selected{border-color:var(--g);box-shadow:0 0 0 1px var(--g)}.ny-filter-cards small,.ny-filter-cards b{display:block}.ny-filter-cards small{font-size:8px;letter-spacing:1px;color:#849187}.ny-filter-cards b{font-size:21px;margin-top:7px}.ny-search-tools{display:flex;gap:8px;align-items:center}.ny-search-tools input{width:min(100%,340px);border:1px solid var(--line);border-radius:6px;padding:10px 12px;font:11px Arial;outline-color:#9abca5}.ny-search-tools button{border:1px solid #cbded0;background:#f0f7f1;color:#276d43;border-radius:6px;padding:10px 12px;font-size:10px;font-weight:700;white-space:nowrap;cursor:pointer}.ny-actions{display:flex;gap:6px;flex-wrap:wrap}.ny-actions button{border:1px solid #c9dfce;background:#eef7f0;color:#276d43;border-radius:5px;padding:7px 9px;font-size:9px;font-weight:700;cursor:pointer}.ny-actions button.danger{border-color:#efd6d1;background:#fff7f5;color:#a34d40}.ny-actions button.secondary{border-color:#dce4dc;background:#f7f8f6;color:#65756a}.ny-actions button:disabled{opacity:.5;cursor:wait}.ny-muted{color:#a2aca5}
   .ny-ann-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.ny-compose form{display:grid;gap:14px}.ny-compose label{display:grid;gap:7px;font-size:10px;font-weight:700;color:#506256}.ny-compose input,.ny-compose textarea,.ny-compose select{width:100%;border:1px solid #dfe7df;border-radius:6px;padding:11px 12px;font:11px Arial;color:#253a2d;background:#fff;outline-color:#a4c5ad}.ny-compose textarea{resize:vertical;line-height:1.6}.ny-form-row{display:flex;align-items:flex-end;gap:12px}.ny-form-row label{flex:1}.ny-primary{border:0;border-radius:6px;background:var(--g);color:white;padding:12px 17px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap}.ny-primary:disabled{opacity:.6}.ny-draft-label{font-size:8px;letter-spacing:1px;color:#987329;background:#fff5df;padding:7px 9px;border-radius:20px}.ny-ann-list{display:grid;gap:10px}.ny-ann-list article{border:1px solid #edf1ed;border-radius:8px;padding:15px}.ny-ann-top,.ny-ann-foot{display:flex;align-items:center;justify-content:space-between;gap:12px}.ny-ann-top>small{font-size:9px;color:#9aa59d}.ny-ann-list h3{font-size:13px;margin:12px 0 6px}.ny-ann-list article>p{font-size:11px;color:#6c7b71;line-height:1.7;white-space:pre-wrap;margin:0 0 14px}.ny-ann-foot{border-top:1px solid #edf1ed;padding-top:12px;font-size:9px;color:#89968d}.ny-ann-foot b{color:#4d6254}.ny-ann-foot .ny-actions{margin-left:auto}
   .ny-activity-list{display:grid}.ny-activity-list article{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #edf1ed}.ny-activity-icon{width:32px;height:32px;border-radius:50%;background:#eef5ef;color:var(--g);display:grid;place-items:center;flex-shrink:0}.ny-activity-list b{font-size:11px;text-transform:capitalize}.ny-activity-list p{font-size:10px;color:#758279;margin:5px 0}.ny-activity-list small{font-size:9px;color:#9aa69d}.ny-alert{padding:12px 14px;border-radius:7px;background:#edf7ee;color:#2f7047;font-size:11px;line-height:1.5;margin-bottom:16px}.ny-alert.error{background:#fff0ed;color:#9b493e}.ny-loading,.ny-empty{padding:26px;text-align:center;color:#829087;font-size:11px}.ny-loading span{display:inline-block;width:13px;height:13px;border:2px solid #d5e3d8;border-top-color:var(--g);border-radius:50%;margin-right:9px;vertical-align:middle;animation:nyspin .8s linear infinite}@keyframes nyspin{to{transform:rotate(360deg)}}.ny-footer{display:flex;justify-content:space-between;gap:12px;padding:25px 2px 5px;color:#a0aaa2;font-size:8px;letter-spacing:1px}
   @media(max-width:1050px){.ny-sidebar{width:210px}.ny-content{padding:28px 22px}.ny-overview-grid{grid-template-columns:1fr}.ny-stats{grid-template-columns:repeat(2,1fr)}}
   @media(max-width:680px){.ny-admin{display:block}.ny-sidebar{position:relative;width:100%;height:auto;min-height:0;padding:14px 14px 12px;overflow:visible}.ny-brand{padding:0 4px 12px}.ny-sidebar nav{display:flex;overflow-x:auto;gap:4px;padding-bottom:7px}.ny-programme-link{display:inline-flex;width:auto;white-space:nowrap;margin:5px 4px 0;padding:9px 10px;font-size:9px}.ny-sidebar{overflow:hidden}.ny-sidebar nav button{width:auto;min-width:max-content;padding:10px}.ny-sidebar nav button span{font-size:15px}.ny-side-caption,.ny-side-bottom{display:none}.ny-sidebar .ny-side-group{display:none}.ny-sidebar .ny-programme-link{display:inline-flex;width:calc(50% - 8px);vertical-align:top;margin:5px 3px 0;padding:9px 8px;font-size:9px}.ny-sidebar .ny-link-icon{width:14px}.ny-sidebar .ny-programme-link b{font-size:11px}.ny-topbar{height:54px;padding:0 15px;position:sticky;top:0;z-index:5}.ny-top-actions{gap:7px}.ny-live-dot{display:none}.ny-top-actions button{font-size:9px;padding:7px}.ny-content{padding:23px 14px}.ny-welcome h1{font-size:27px}.ny-overview-grid{gap:12px}.ny-welcome{display:block}.ny-date-chip{display:inline-block;margin-top:13px}.ny-stats{gap:8px}.ny-stat{padding:13px}.ny-stat>strong{font-size:26px}.ny-stat>small{font-size:9px}.ny-panel{padding:14px}.ny-filter-cards{grid-template-columns:repeat(3,1fr)}.ny-member-toolbar{align-items:flex-start;flex-direction:column}.ny-search-tools{width:100%}.ny-search-tools input{width:100%}.ny-form-row{display:grid;grid-template-columns:1fr}.ny-ann-foot{align-items:flex-start;flex-direction:column}.ny-ann-foot .ny-actions{margin-left:0}.ny-footer{flex-direction:column}.ny-profile-grid{grid-template-columns:1fr}.ny-top-signout{display:none}}

   .ny-sidebar{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#ffffff35 transparent}
   .ny-side-group{margin-top:20px!important;padding:16px 12px 9px!important;border-top:1px solid #ffffff1c}
   .ny-programme-link{justify-content:flex-start!important;gap:10px!important;margin:5px 2px 0!important;padding:11px 10px!important;border:1px solid transparent!important}
   .ny-programme-link:hover{background:#ffffff12!important;border-color:#ffffff25!important}
   .ny-programme-link .ny-link-icon{width:20px;text-align:center;color:#c6df7b!important;font-size:14px}
   .ny-programme-link .ny-link-label{flex:1;color:#d8e5dc!important}
   .ny-programme-link b{font-size:13px;color:#c6df7b}
   .ny-sidebar nav{margin-bottom:0!important}
   .ny-sidebar nav button{min-height:44px}
   @media(max-width:1050px){.ny-sidebar{width:245px}}
   @media(max-width:680px){
    .ny-sidebar{position:relative;width:100%;height:auto;min-height:0;padding:14px 14px 12px;overflow:visible}
    .ny-side-caption,.ny-side-bottom,.ny-sidebar .ny-side-group{display:none!important}
    .ny-sidebar .ny-programme-link{display:inline-flex!important;width:calc(50% - 8px);vertical-align:top;margin:5px 3px 0!important;padding:9px 8px!important;font-size:9px}
    .ny-sidebar .ny-link-icon{width:14px}
    .ny-sidebar .ny-link-label{font-size:9px}
    .ny-sidebar nav{display:flex;overflow-x:auto;gap:4px;padding-bottom:7px}
    .ny-sidebar nav button{width:auto;min-width:max-content;padding:10px}
    .ny-topbar{position:sticky;top:0;z-index:5}
   }


  `}.ny-bank-accordion{overflow:hidden}.ny-bank-accordion>summary{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;padding:18px 20px;margin:0}.ny-bank-accordion>summary::-webkit-details-marker{display:none}.ny-bank-accordion>summary h2{margin:0}.ny-bank-accordion>summary p{margin:5px 0 0}.ny-bank-chevron{flex:0 0 auto;font-size:22px;line-height:1;transition:transform .2s ease}.ny-bank-accordion[open]>summary>.ny-bank-chevron{transform:rotate(180deg)}.ny-bank-accordion:not([open]){margin-bottom:16px}.ny-bank-accordion .ny-table-wrap{padding:0 18px 18px}@media(max-width:600px){.ny-bank-accordion>summary{padding:15px;align-items:flex-start}.ny-bank-accordion .ny-table-wrap{padding:0 10px 12px}}</style>
 </main>;
}