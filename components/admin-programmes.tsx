"use client";

import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EventItem={id:string;title:string;starts_at:string;state:string|null;lga:string|null;status:string;venue:string|null;attendance_points:number};
type TaskItem={id:string;title:string;points:number;reward_amount_ngn:number;state:string|null;lga:string|null;status:string};
type ReviewItem={id:string;status:string;state?:string|null;lga?:string|null;ward?:string|null;created_at?:string;[key:string]:any};
type Tab="events"|"attendance"|"tasks"|"submissions"|"groups"|"welfare"|"campus";
const date=(v?:string)=>v?new Date(v).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}):"Date unavailable";

export default function AdminProgrammes(){
 const supabase=createClient();
 const [tab,setTab]=useState<Tab>("events");
 const [role,setRole]=useState("member");
 const [events,setEvents]=useState<EventItem[]>([]);
 const [attendees,setAttendees]=useState<any[]>([]);
 const [tasks,setTasks]=useState<TaskItem[]>([]);
 const [submissions,setSubmissions]=useState<any[]>([]);
 const [groups,setGroups]=useState<ReviewItem[]>([]);
 const [welfare,setWelfare]=useState<ReviewItem[]>([]);
 const [campus,setCampus]=useState<ReviewItem[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [eventForm,setEventForm]=useState({title:"",description:"",venue:"",event_type:"community",starts_at:"",ends_at:"",state:"",lga:"",ward:"",status:"published"});
 const [taskForm,setTaskForm]=useState({title:"",description:"",instructions:"",points:"10",reward_amount_ngn:"0",state:"",lga:"",ward:"",due_at:"",status:"published"});

 useEffect(()=>{void load();},[]);
 async function load(){
  setBusy(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const [p,a,e,t,s,g,w,c,att]=await Promise.all([
   supabase.from("profiles").select("role").eq("id",user.id).single(),
   supabase.from("coordinator_assignments").select("role,state,lga,ward").eq("user_id",user.id),
   supabase.from("events").select("id,title,starts_at,state,lga,status,venue,attendance_points").order("starts_at",{ascending:false}).limit(100),
   supabase.from("volunteer_tasks").select("id,title,points,reward_amount_ngn,state,lga,status").order("created_at",{ascending:false}).limit(100),
   supabase.from("task_submissions").select("id,task_id,user_id,submission_note,evidence_url,status,created_at,volunteer_tasks(title,points,state,lga)").order("created_at",{ascending:false}).limit(100),
   supabase.from("support_groups").select("id,group_name,category,contact_name,contact_phone,state,lga,ward,status,created_at").order("created_at",{ascending:false}).limit(100),
   supabase.from("welfare_applications").select("id,programme,household_size,phone,address,state,lga,needs_summary,status,created_at").order("created_at",{ascending:false}).limit(100),
   supabase.from("campus_mobilizers").select("id,institution,institution_type,state,status,created_at,referral_code").order("created_at",{ascending:false}).limit(100),
   supabase.from("event_attendance").select("id,event_id,user_id,rsvped_at,checked_in_at,points_awarded,events(title,attendance_points)").order("rsvped_at",{ascending:false}).limit(500)
  ]);
  if(p.error){setError(p.error.message);setBusy(false);return;}
  const assignments=a.data||[];
  const effective=p.data?.role==="national_admin"?"national_admin":(assignments[0]?.role||p.data?.role||"member");
  setRole(effective);
  if(!["national_admin","state_coordinator","lga_coordinator","ward_coordinator"].includes(effective)){setError("Your account does not have access to programme administration.");setBusy(false);return;}
  if(!e.error)setEvents(e.data||[]);if(!t.error)setTasks(t.data||[]);if(!s.error)setSubmissions(s.data||[]);if(!g.error)setGroups(g.data||[]);if(!w.error)setWelfare(w.data||[]);if(!c.error)setCampus(c.data||[]);
  if(!att.error){const rows=att.data||[];const ids=Array.from(new Set(rows.map((x:any)=>x.user_id)));let memberRows:any[]=[];if(ids.length){const mr=await supabase.from("members").select("user_id,full_name,member_number").in("user_id",ids);if(!mr.error)memberRows=mr.data||[];}const byUser=new Map(memberRows.map((m:any)=>[m.user_id,m]));setAttendees(rows.map((x:any)=>({...x,member:byUser.get(x.user_id)})));}
  const first=assignments[0];if(first){setEventForm(v=>({...v,state:first.state||"",lga:first.lga||"",ward:first.ward||""}));setTaskForm(v=>({...v,state:first.state||"",lga:first.lga||"",ward:first.ward||""}));}
  setBusy(false);
 }
 async function createEvent(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  const payload={...eventForm,starts_at:new Date(eventForm.starts_at).toISOString(),ends_at:eventForm.ends_at?new Date(eventForm.ends_at).toISOString():null,created_by:user?.id,state:eventForm.state||null,lga:eventForm.lga||null,ward:eventForm.ward||null};
  const {error:e2}=await supabase.from("events").insert(payload);
  if(e2)setError(e2.message);else{setNotice("Event created.");setEventForm(v=>({...v,title:"",description:"",venue:"",starts_at:"",ends_at:""}));await load();}
  setBusy(false);
 }
 async function createTask(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  const payload={...taskForm,points:Number(taskForm.points),reward_amount_ngn:Number(taskForm.reward_amount_ngn),due_at:taskForm.due_at?new Date(taskForm.due_at).toISOString():null,created_by:user?.id,state:taskForm.state||null,lga:taskForm.lga||null,ward:taskForm.ward||null};
  const {error:e2}=await supabase.from("volunteer_tasks").insert(payload);
  if(e2)setError(e2.message);else{setNotice("Volunteer task created.");setTaskForm(v=>({...v,title:"",description:"",instructions:"",due_at:""}));await load();}
  setBusy(false);
 }
 async function review(table:"support_groups"|"welfare_applications"|"campus_mobilizers",item:any,status:string){
  if(status==="rejected"&&!window.confirm("Reject this application?"))return;
  setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  let patch:any={status};
  if(table==="support_groups"||table==="welfare_applications")patch={...patch,reviewed_by:user?.id,reviewed_at:new Date().toISOString()};
  if(table==="campus_mobilizers")patch={...patch,reviewed_by:user?.id,reviewed_at:new Date().toISOString(),approved_by:status==="approved"?user?.id:null,approved_at:status==="approved"?new Date().toISOString():null};
  const {error:e}=await supabase.from(table).update(patch).eq("id",item.id);
  if(e)setError(e.message);else{setNotice("Application status updated.");await load();}
  setBusy(false);
 }
 async function checkIn(item:any){
  if(item.checked_in_at)return;
  setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  const points=Number(item.events?.attendance_points||0);
  const {error:e}=await supabase.from("event_attendance").update({checked_in_at:new Date().toISOString(),checked_in_by:user?.id,points_awarded:points}).eq("id",item.id);
  if(e)setError(e.message);else{setNotice("Attendee checked in. "+points+" points awarded.");await load();}
  setBusy(false);
 }
 async function reviewSubmission(item:any,status:"approved"|"rejected"){
  setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  const points=status==="approved"?Number(item.volunteer_tasks?.points||0):0;
  const {error:e}=await supabase.from("task_submissions").update({status,points_awarded:points,reviewed_by:user?.id,reviewed_at:new Date().toISOString()}).eq("id",item.id);
  if(e)setError(e.message);else{setNotice(status==="approved"?"Task approved. Any configured cash reward has been credited to the member wallet.":"Task submission rejected.");await load();}
  setBusy(false);
 }
 const tabs:[Tab,string][]=[["events","Events"],["attendance","Attendance"],["tasks","Volunteer tasks"],["submissions","Task reviews"],["groups","Support groups"],["welfare","Welfare applications"],["campus","Campus mobilizers"]];
 const counts=[events.length,attendees.filter(x=>!x.checked_in_at).length,tasks.length,submissions.filter(x=>x.status==="submitted").length,groups.filter(x=>x.status==="pending").length,welfare.filter(x=>x.status==="pending"||x.status==="under_review").length,campus.filter(x=>x.status==="pending").length];
 return <main className="ap-shell"><div className="ap-wrap"><header className="ap-header"><Link href="/admin">← Main administration</Link><div><b>NYFB</b><small>PROGRAMME MANAGEMENT</small></div><button onClick={()=>void load()}>↻ Refresh</button></header>
 <section className="ap-title"><small>ENGAGEMENT · WELFARE · COMMUNITY</small><h1>Programmes<br/><em>management.</em></h1><p>Create opportunities and manage programme applications within your assigned organisational area.</p><span className="ap-role">{role.replaceAll("_"," ")}</span></section>
 {error&&<div className="ap-error">{error}</div>}{notice&&<div className="ap-notice">{notice}</div>}
 <nav className="ap-tabs">{tabs.map(([id,label],i)=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}<i>{counts[i]}</i></button>)}</nav>
 {busy&&<p className="ap-loading">Working…</p>}
 {tab==="events"&&<section className="ap-layout"><div className="ap-panel"><h2>Create an event</h2><form onSubmit={createEvent}><label>Event title<input required value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})}/></label><label>Description<textarea required rows={3} value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></label><label>Event type<select value={eventForm.event_type} onChange={e=>setEventForm({...eventForm,event_type:e.target.value})}>{["community","training","meeting","outreach","conference","other"].map(x=><option key={x}>{x}</option>)}</select></label><label>Venue<input value={eventForm.venue} onChange={e=>setEventForm({...eventForm,venue:e.target.value})}/></label><label>Start date & time<input type="datetime-local" required value={eventForm.starts_at} onChange={e=>setEventForm({...eventForm,starts_at:e.target.value})}/></label><label>End date & time<input type="datetime-local" value={eventForm.ends_at} onChange={e=>setEventForm({...eventForm,ends_at:e.target.value})}/></label><div className="ap-row"><label>State<input value={eventForm.state} onChange={e=>setEventForm({...eventForm,state:e.target.value})}/></label><label>LGA<input value={eventForm.lga} onChange={e=>setEventForm({...eventForm,lga:e.target.value})}/></label></div><label>Ward (optional)<input value={eventForm.ward} onChange={e=>setEventForm({...eventForm,ward:e.target.value})}/></label><label>Publication<select value={eventForm.status} onChange={e=>setEventForm({...eventForm,status:e.target.value})}><option value="published">Publish immediately</option><option value="draft">Save draft</option></select></label><button disabled={busy}>Create event</button></form></div><div className="ap-panel"><h2>Events register</h2>{events.map(x=><article className="ap-item" key={x.id}><b>{x.title}</b><small>{date(x.starts_at)} · {x.venue||"Venue TBA"}</small><small>{[x.lga,x.state].filter(Boolean).join(", ")||"National"} · {x.status} · {x.attendance_points} attendance points</small></article>)}{events.length===0&&<p>No events recorded yet.</p>}</div></section>}
 {tab==="tasks"&&<section className="ap-layout"><div className="ap-panel"><h2>Create a volunteer task</h2><form onSubmit={createTask}><label>Task title<input required value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/></label><label>Description<textarea required rows={3} value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})}/></label><label>Instructions<textarea rows={3} value={taskForm.instructions} onChange={e=>setTaskForm({...taskForm,instructions:e.target.value})}/></label><div className="ap-row"><label>Points<input type="number" min="0" max="10000" value={taskForm.points} onChange={e=>setTaskForm({...taskForm,points:e.target.value})}/></label><label>Cash reward (₦)<input type="number" min="0" max="1000000" value={taskForm.reward_amount_ngn} onChange={e=>setTaskForm({...taskForm,reward_amount_ngn:e.target.value})}/></label></div><label>Deadline<input type="datetime-local" value={taskForm.due_at} onChange={e=>setTaskForm({...taskForm,due_at:e.target.value})}/></label></div><div className="ap-row"><label>State<input value={taskForm.state} onChange={e=>setTaskForm({...taskForm,state:e.target.value})}/></label><label>LGA<input value={taskForm.lga} onChange={e=>setTaskForm({...taskForm,lga:e.target.value})}/></label></div><label>Ward (optional)<input value={taskForm.ward} onChange={e=>setTaskForm({...taskForm,ward:e.target.value})}/></label><label>Publication<select value={taskForm.status} onChange={e=>setTaskForm({...taskForm,status:e.target.value})}><option value="published">Publish immediately</option><option value="draft">Save draft</option></select></label><button disabled={busy}>Create task</button></form></div><div className="ap-panel"><h2>Volunteer tasks</h2>{tasks.map(x=><article className="ap-item" key={x.id}><b>{x.title}</b><small>{x.points} points · ₦{Number(x.reward_amount_ngn||0).toLocaleString("en-NG")} cash reward · {[x.lga,x.state].filter(Boolean).join(", ")||"National"}</small><small>{x.status}</small></article>)}</div></section>}
 {tab==="attendance"&&<section className="ap-list"><h2>Event RSVP & attendance register</h2><p>Confirm attendance at the event and award its configured contribution points.</p>{attendees.map(x=><article className="ap-item" key={x.id}><b>{x.member?.full_name||"Member account"}</b><small>{x.member?.member_number||x.user_id.slice(0,8)} · {x.events?.title||"Event"}</small><small>RSVP: {date(x.rsvped_at)} · {x.checked_in_at?"Checked in "+date(x.checked_in_at):"Not yet checked in"}</small>{x.checked_in_at?<small>{x.points_awarded} points recorded</small>:<div className="ap-actions"><button onClick={()=>void checkIn(x)} disabled={busy}>Check in & award {x.events?.attendance_points||0} points</button></div>}</article>)}{attendees.length===0&&<p>No event RSVPs have been recorded yet.</p>}</section>}
 {tab==="submissions"&&<section className="ap-list"><h2>Volunteer task submissions</h2>{submissions.map(x=><article className="ap-item" key={x.id}><b>{x.volunteer_tasks?.title||"Volunteer task"}</b><small>Submitted {date(x.created_at)} · {x.status}</small><p>{x.submission_note}</p>{x.evidence_url&&<a href={x.evidence_url} target="_blank" rel="noreferrer">View evidence ↗</a>}{x.status==="submitted"&&<div className="ap-actions"><button onClick={()=>void reviewSubmission(x,"approved")} disabled={busy}>Approve & award points</button><button className="secondary" onClick={()=>void reviewSubmission(x,"rejected")} disabled={busy}>Reject</button></div>}</article>)}{submissions.length===0&&<p>No submissions yet.</p>}</section>}
 {tab==="groups"&&<section className="ap-list"><h2>Support group registrations</h2>{groups.map(x=><article className="ap-item" key={x.id}><b>{x.group_name}</b><small>{x.category} · {x.contact_name} · {x.contact_phone}</small><small>{[x.ward,x.lga,x.state].filter(Boolean).join(", ")} · {x.status}</small>{x.status==="pending"&&<div className="ap-actions"><button onClick={()=>void review("support_groups",x,"approved")} disabled={busy}>Approve</button><button className="secondary" onClick={()=>void review("support_groups",x,"rejected")} disabled={busy}>Reject</button></div>}</article>)}{groups.length===0&&<p>No support group applications yet.</p>}</section>}
 {tab==="welfare"&&<section className="ap-list"><h2>Welfare applications</h2><p className="ap-privacy">Applications contain private personal information. Only authorised reviewers should access them. Do not export or share application details outside approved processes.</p>{welfare.map(x=><article className="ap-item" key={x.id}><b>{String(x.programme).replaceAll("_"," ")}</b><small>{x.household_size} household members · {x.phone}</small><small>{x.address} · {x.lga}, {x.state}</small><p>{x.needs_summary}</p><small>{x.status} · {date(x.created_at)}</small>{["pending","under_review"].includes(x.status)&&<div className="ap-actions"><button onClick={()=>void review("welfare_applications",x,"under_review")} disabled={busy}>Mark reviewing</button><button onClick={()=>void review("welfare_applications",x,"approved")} disabled={busy}>Approve</button><button className="secondary" onClick={()=>void review("welfare_applications",x,"rejected")} disabled={busy}>Reject</button></div>}</article>)}{welfare.length===0&&<p>No welfare applications yet.</p>}</section>}
 {tab==="campus"&&<section className="ap-list"><h2>Campus mobilizer applications</h2>{campus.map(x=><article className="ap-item" key={x.id}><b>{x.institution}</b><small>{x.institution_type} · {x.state} · {x.status}</small>{x.status==="pending"&&<div className="ap-actions"><button onClick={()=>void review("campus_mobilizers",x,"approved")} disabled={busy}>Approve</button><button className="secondary" onClick={()=>void review("campus_mobilizers",x,"rejected")} disabled={busy}>Reject</button></div>}</article>)}{campus.length===0&&<p>No campus applications yet.</p>}</section>}
 <footer className="ap-footer">NYFB · Programme administration · Access is controlled by database permissions</footer></div>
 <style jsx>{`
 .ap-shell{min-height:100vh;background:#f2f6f1;color:#193729;padding:25px 18px 60px}.ap-wrap{max-width:1120px;margin:auto}.ap-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce5db;padding-bottom:18px}.ap-header>a,.ap-header button{font-size:11px;color:#176b47;font-weight:700;background:none;border:0;cursor:pointer}.ap-header>div{display:flex;gap:10px;align-items:center;font-size:18px}.ap-header small{font-size:8px;letter-spacing:1px;color:#7a897e}.ap-title{padding:55px 0 30px;max-width:650px;position:relative}.ap-title>small{font-size:9px;letter-spacing:2px;color:#176b47;font-weight:800}.ap-title h1{font:800 clamp(38px,5vw,60px)/1.05 Manrope,Arial;letter-spacing:-2px;margin:15px 0}.ap-title h1 em{font-style:normal;color:#176b47}.ap-title p{font-size:13px;line-height:1.8;color:#68786d}.ap-role{display:inline-block;background:#e0ede1;color:#176b47;border-radius:20px;padding:7px 12px;font-size:9px;text-transform:uppercase}.ap-tabs{display:flex;gap:7px;overflow:auto;border-bottom:1px solid #dce5db;padding:10px 0 17px}.ap-tabs button{white-space:nowrap;background:white;border:1px solid #dce5db;border-radius:6px;padding:11px 13px;font-size:10px;font-weight:700;color:#52665a;cursor:pointer}.ap-tabs button.active{background:#176b47;color:white;border-color:#176b47}.ap-tabs i{font-style:normal;margin-left:7px;background:#e9f0e8;border-radius:12px;padding:3px 6px;color:#176b47}.ap-tabs button.active i{background:#ffffff28;color:white}.ap-error,.ap-notice{padding:13px 16px;margin:14px 0;font-size:12px;border-radius:7px}.ap-error{background:#fff0ed;color:#913c2e}.ap-notice{background:#e8f5e9;color:#23623b}.ap-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;padding-top:22px}.ap-panel,.ap-list{background:white;border:1px solid #e0e8df;border-radius:11px;padding:22px;margin-top:22px}.ap-panel h2,.ap-list h2{font:800 20px Manrope;margin:0 0 18px}.ap-panel form{display:grid;gap:11px}.ap-panel label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700}.ap-panel input,.ap-panel textarea,.ap-panel select{border:1px solid #dce5dc;border-radius:5px;padding:11px;font:12px 'DM Sans';width:100%;background:white}.ap-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ap-panel form>button,.ap-actions button{border:0;background:#176b47;color:white;border-radius:5px;padding:11px 14px;font-size:10px;font-weight:700;cursor:pointer}.ap-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.ap-actions .secondary{background:#f4eee8;color:#84562d}.ap-item{padding:15px 0;border-bottom:1px solid #e7ece6}.ap-item:last-child{border-bottom:0}.ap-item b,.ap-item small{display:block}.ap-item b{font:700 13px Manrope}.ap-item small{font-size:9px;color:#758278;margin-top:6px}.ap-item p{font-size:11px;line-height:1.7;color:#66756b}.ap-item a{font-size:10px;color:#176b47;font-weight:700}.ap-list{margin-top:22px}.ap-list>p{font-size:11px;color:#69786e;line-height:1.7}.ap-privacy{background:#fff7e6;padding:11px;border-radius:6px}.ap-loading{font-size:11px;color:#68786d}.ap-footer{margin-top:40px;border-top:1px solid #dce5db;padding-top:18px;font-size:9px;color:#819087}
 @media(max-width:760px){.ap-layout{grid-template-columns:1fr}.ap-header>div{display:none}.ap-title{padding-top:38px}}
 `}</style></main>;
}
