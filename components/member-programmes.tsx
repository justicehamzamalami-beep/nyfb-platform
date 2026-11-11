"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Member={full_name:string;phone:string;state:string;lga:string;ward:string|null;status:string};
type EventRow={id:string;title:string;description:string;venue:string|null;event_type:string;starts_at:string;ends_at:string|null;state:string|null;lga:string|null;status:string};
type TaskRow={id:string;title:string;description:string;instructions:string|null;points:number;reward_amount_ngn:number;due_at:string|null;state:string|null;lga:string|null};
type Submission={task_id:string;status:string};
type Campus={institution:string;status:string;referral_code:string};

const programmes=[["food_support","Food support"],["medical_care","Medical care"],["essential_care","Essential care"],["enterprise_support","Enterprise support"],["skills_training","Skills training"],["empowerment","Empowerment"],["other","Other"]];
const initialWelfare={programme:"food_support",household_size:"1",phone:"",address:"",state:"",lga:"",needs_summary:"",consent_given:false};

export default function MemberProgrammes(){
 const [member,setMember]=useState<Member|null>(null);
 const [events,setEvents]=useState<EventRow[]>([]);
 const [tasks,setTasks]=useState<TaskRow[]>([]);
 const [attendance,setAttendance]=useState<string[]>([]);
 const [submissions,setSubmissions]=useState<Submission[]>([]);
 const [campus,setCampus]=useState<Campus|null>(null);
 const [referralsCount,setReferralsCount]=useState(0);
 const [pointsTotal,setPointsTotal]=useState(0);
 const [tab,setTab]=useState("events");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [welfare,setWelfare]=useState(initialWelfare);
 const [group,setGroup]=useState({group_name:"",category:"community",description:"",contact_name:"",contact_email:"",contact_phone:"",state:"",lga:"",ward:""});
 const [campusForm,setCampusForm]=useState({institution:"",institution_type:"university",state:"",campus_location:""});
 const supabase=createClient();

 useEffect(()=>{void load();},[]);
 async function load(){
  setBusy(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const [m,e,t,a,s,c,referrals]=await Promise.all([
   supabase.from("members").select("full_name,phone,state,lga,ward,status").eq("user_id",user.id).maybeSingle(),
   supabase.from("events").select("id,title,description,venue,event_type,starts_at,ends_at,state,lga,status").eq("status","published").gte("starts_at",new Date(Date.now()-86400000).toISOString()).order("starts_at").limit(50),
   supabase.from("volunteer_tasks").select("id,title,description,instructions,points,reward_amount_ngn,due_at,state,lga").eq("status","published").order("created_at",{ascending:false}).limit(50),
   supabase.from("event_attendance").select("event_id,points_awarded").eq("user_id",user.id),
   supabase.from("task_submissions").select("task_id,status,points_awarded").eq("user_id",user.id),
   supabase.from("campus_mobilizers").select("institution,status,referral_code").eq("user_id",user.id).maybeSingle(),
   supabase.from("member_referrals").select("id").eq("referrer_user_id",user.id)
  ]);
  if(m.error){setError(m.error.message);setBusy(false);return;}
  const profile=m.data as Member|null;setMember(profile);
  if(profile){setWelfare(v=>({...v,phone:profile.phone,state:profile.state,lga:profile.lga}));setGroup(v=>({...v,contact_name:profile.full_name,contact_phone:profile.phone,state:profile.state,lga:profile.lga,ward:profile.ward||""}));setCampusForm(v=>({...v,state:profile.state}));}
  if(!e.error)setEvents((e.data||[]) as EventRow[]);
  if(!t.error)setTasks((t.data||[]) as TaskRow[]);
  if(!a.error){setAttendance((a.data||[]).map((x:any)=>x.event_id));setPointsTotal((a.data||[]).reduce((sum:number,x:any)=>sum+Number(x.points_awarded||0),0));}
  if(!s.error){setSubmissions((s.data||[]) as Submission[]);setPointsTotal(v=>v+(s.data||[]).reduce((sum:number,x:any)=>sum+Number(x.points_awarded||0),0));}
  if(!c.error)setCampus(c.data as Campus|null);
  if(!referrals.error)setReferralsCount((referrals.data||[]).length);
  setBusy(false);
 }
 async function rsvp(eventId:string){
  setBusy(true);setMessage("");setError("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error:e}=await supabase.from("event_attendance").insert({event_id:eventId,user_id:user?.id});
  if(e){setError(e.message);}else{setMessage("Your RSVP has been recorded.");await load();}
  setBusy(false);
 }
 async function submitTask(event:FormEvent<HTMLFormElement>,taskId:string){
  event.preventDefault();setBusy(true);setError("");setMessage("");
  const form=new FormData(event.currentTarget);const {data:{user}}=await supabase.auth.getUser();
  const {error:e}=await supabase.from("task_submissions").insert({task_id:taskId,user_id:user?.id,submission_note:String(form.get("note")||""),evidence_url:String(form.get("evidence")||"")||null});
  if(e)setError(e.message);else{setMessage("Your task submission has been sent for review.");await load();}
  setBusy(false);
 }
 async function submitWelfare(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error:e}=await supabase.from("welfare_applications").insert({...welfare,household_size:Number(welfare.household_size),user_id:user?.id});
  if(e)setError(e.message);else{setMessage("Your welfare application has been submitted securely.");setWelfare({...initialWelfare,phone:member?.phone||"",state:member?.state||"",lga:member?.lga||""});}
  setBusy(false);
 }
 async function submitGroup(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error:e}=await supabase.from("support_groups").insert({...group,submitted_by:user?.id});
  if(e)setError(e.message);else{setMessage("Your support group application has been submitted for verification.");setGroup(v=>({...v,group_name:"",description:"",contact_email:""}));}
  setBusy(false);
 }
 async function submitCampus(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  const referral_code="NYFB-CAMP-"+crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();
  const {error:e}=await supabase.from("campus_mobilizers").insert({...campusForm,user_id:user?.id,referral_code});
  if(e)setError(e.message);else{setMessage("Your campus mobilizer application has been submitted.");await load();}
  setBusy(false);
 }
 const allowed=member?.status==="approved";
 const tabs=[["events","Events"],["tasks","Volunteer tasks"],["welfare","Welfare support"],["groups","Support groups"],["campus","Campus network"]];
 return <main className="program-shell"><div className="program-wrap">
  <header className="program-header"><Link href="/member">← Member dashboard</Link><div className="program-brand"><b>NY</b><span>NYFB<small>PROGRAMMES & ENGAGEMENT</small></span></div></header>
  <div className="program-heading"><small>MEMBER ENGAGEMENT</small><h1>Get involved.<br/><em>Make an impact.</em></h1><p>Discover events, contribute your time, access available support and connect your organisation to the NYFB network.</p></div>
  {!allowed&&<div className="program-notice">Some programmes are available to approved members only. Your membership status is <strong>{member?.status||"being checked"}</strong>.</div>}
  <nav className="program-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?"selected":""} onClick={()=>{setTab(id);setMessage("");setError("");}}>{label}</button>)}</nav>
  {allowed&&<section className="member-stats"><div><small>VERIFIED POINTS</small><b>{pointsTotal}</b></div><div><small>EVENT RSVPS</small><b>{attendance.length}</b></div><div><small>TASK SUBMISSIONS</small><b>{submissions.length}</b></div><div><small>CAMPUS REFERRALS</small><b>{referralsCount}</b></div></section>}
  {message&&<div className="program-message">{message}</div>}{error&&<div className="program-error">{error}</div>}
  {busy&&!member?<p>Loading programmes…</p>:<>
   {tab==="events"&&<section className="program-grid">{events.length===0?<p className="program-empty">No upcoming events have been published yet.</p>:events.map(ev=><article className="program-card" key={ev.id}><small>{ev.event_type.replaceAll("_"," ").toUpperCase()}</small><h2>{ev.title}</h2><p>{ev.description}</p><div className="program-meta">{new Date(ev.starts_at).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}</div><div className="program-meta">{ev.venue||"Venue to be announced"}{ev.lga?", "+ev.lga:""}{ev.state?", "+ev.state:""}</div><button disabled={!allowed||busy||attendance.includes(ev.id)} onClick={()=>void rsvp(ev.id)}>{attendance.includes(ev.id)?"You are registered":allowed?"RSVP to attend":"Approval required"}</button></article>)}</section>}
   {tab==="tasks"&&<section className="program-grid">{tasks.length===0?<p className="program-empty">There are no open volunteer tasks right now.</p>:tasks.map(task=>{const submitted=submissions.find(s=>s.task_id===task.id);return <article className="program-card" key={task.id}><small>VOLUNTEER OPPORTUNITY · {task.points} POINTS{task.reward_amount_ngn>0?` · ₦${Number(task.reward_amount_ngn).toLocaleString("en-NG")} CASH REWARD`:""}</small><h2>{task.title}</h2><p>{task.description}</p>{task.instructions&&<p className="program-meta">{task.instructions}</p>}{task.reward_amount_ngn>0&&<p className="program-meta">Cash reward is credited only after your submission is approved by an authorised NYFB reviewer.</p>}{task.due_at&&<div className="program-meta">Deadline: {new Date(task.due_at).toLocaleDateString("en-NG")}</div>}{submitted?<div className="program-status">Submission: {submitted.status}</div>:<form onSubmit={e=>void submitTask(e,task.id)}><label>What did you complete?<textarea name="note" required rows={3}/></label><label>Evidence link (optional)<input name="evidence" type="url" placeholder="https://"/></label><button disabled={!allowed||busy}>{allowed?"Submit completed task":"Approval required"}</button></form>}</article>})}</section>}
   {tab==="welfare"&&<section className="program-form-card"><h2>Welfare and assistance application</h2><p>Submit a request for available NYFB support programmes. Approval is subject to verification and programme availability. Do not enter your NIN or bank details in this form.</p><form onSubmit={e=>void submitWelfare(e)} className="program-form"><label>Programme<select value={welfare.programme} onChange={e=>setWelfare({...welfare,programme:e.target.value})}>{programmes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Household size<input type="number" min="1" max="30" value={welfare.household_size} onChange={e=>setWelfare({...welfare,household_size:e.target.value})}/></label><label>Contact phone<input required value={welfare.phone} onChange={e=>setWelfare({...welfare,phone:e.target.value})}/></label><label>Residential address<input required value={welfare.address} onChange={e=>setWelfare({...welfare,address:e.target.value})}/></label><label>State<input required value={welfare.state} onChange={e=>setWelfare({...welfare,state:e.target.value})}/></label><label>LGA<input required value={welfare.lga} onChange={e=>setWelfare({...welfare,lga:e.target.value})}/></label><label className="wide">Explain the support you need<textarea required rows={4} value={welfare.needs_summary} onChange={e=>setWelfare({...welfare,needs_summary:e.target.value})}/></label><label className="wide consent-check"><input type="checkbox" required checked={welfare.consent_given} onChange={e=>setWelfare({...welfare,consent_given:e.target.checked})}/> I consent to NYFB using the information in this application to assess and administer the support request. I understand that access is restricted to authorised reviewers.</label><button disabled={!allowed||busy}>{allowed?"Submit welfare application":"Approved membership required"}</button></form></section>}
   {tab==="groups"&&<section className="program-form-card"><h2>Register a support group</h2><p>Connect a professional, religious, artisan, student, humanitarian or community organisation with NYFB.</p><form onSubmit={e=>void submitGroup(e)} className="program-form"><label>Group name<input required value={group.group_name} onChange={e=>setGroup({...group,group_name:e.target.value})}/></label><label>Category<select value={group.category} onChange={e=>setGroup({...group,category:e.target.value})}>{["professional","religious","artisan","humanitarian","community","student","other"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label><label className="wide">Description<textarea rows={3} value={group.description} onChange={e=>setGroup({...group,description:e.target.value})}/></label><label>Contact person<input required value={group.contact_name} onChange={e=>setGroup({...group,contact_name:e.target.value})}/></label><label>Contact email<input type="email" value={group.contact_email} onChange={e=>setGroup({...group,contact_email:e.target.value})}/></label><label>Contact phone<input required value={group.contact_phone} onChange={e=>setGroup({...group,contact_phone:e.target.value})}/></label><label>State<input required value={group.state} onChange={e=>setGroup({...group,state:e.target.value})}/></label><label>LGA<input required value={group.lga} onChange={e=>setGroup({...group,lga:e.target.value})}/></label><label>Ward<input value={group.ward} onChange={e=>setGroup({...group,ward:e.target.value})}/></label><button disabled={!allowed||busy}>{allowed?"Submit group registration":"Approved membership required"}</button></form></section>}
   {tab==="campus"&&<section className="program-form-card"><h2>Campus mobilisation network</h2><p>Students at recognised tertiary institutions can apply to volunteer as NYFB campus mobilizers. This is a volunteer role, not paid employment.</p>{campus?<div className="campus-result"><strong>{campus.institution}</strong><p>Status: {campus.status}</p>{campus.status==="approved"&&<><p>Registered referrals: <strong>{referralsCount}</strong></p><small>YOUR REFERRAL CODE</small><h3>{campus.referral_code}</h3><button onClick={()=>navigator.clipboard.writeText(window.location.origin+"/join?ref="+campus.referral_code)}>Copy invitation link</button></>}</div>:<form onSubmit={e=>void submitCampus(e)} className="program-form"><label>Institution name<input required value={campusForm.institution} onChange={e=>setCampusForm({...campusForm,institution:e.target.value})}/></label><label>Institution type<select value={campusForm.institution_type} onChange={e=>setCampusForm({...campusForm,institution_type:e.target.value})}>{["university","polytechnic","college_of_education","monotechnic","other"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label><label>State<input required value={campusForm.state} onChange={e=>setCampusForm({...campusForm,state:e.target.value})}/></label><label>Campus / town<input value={campusForm.campus_location} onChange={e=>setCampusForm({...campusForm,campus_location:e.target.value})}/></label><button disabled={!allowed||busy}>{allowed?"Apply as campus mobilizer":"Approved membership required"}</button></form>}</section>}
  </>}
  <footer className="program-footer">Nigerian Youth for BAT · Serve with integrity · Build communities</footer>
 </div>
 <style jsx>{`
 .program-shell{min-height:100vh;background:#f3f6f1;padding:26px 18px 60px;color:#193729}.program-wrap{max-width:1080px;margin:auto}.program-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dce6dc;padding-bottom:20px}.program-header>a{font-size:12px;color:#176b47;font-weight:700}.program-brand{display:flex;gap:10px;align-items:center;font-weight:900}.program-brand b{background:#176b47;color:white;border-radius:9px;width:38px;height:38px;display:grid;place-items:center}.program-brand small{display:block;font-size:8px;letter-spacing:1px;color:#718176}.program-heading{padding:60px 0 32px;max-width:640px}.program-heading>small{font-size:10px;letter-spacing:2px;color:#176b47;font-weight:800}.program-heading h1{font:800 clamp(38px,6vw,64px)/1.05 Manrope,Arial;letter-spacing:-2px;margin:15px 0}.program-heading h1 em{font-style:normal;color:#176b47}.program-heading p,.program-form-card>p{font-size:13px;line-height:1.8;color:#68786d}.program-notice,.program-message,.program-error{padding:13px 16px;margin:12px 0;border-radius:8px;font-size:12px;line-height:1.6}.program-notice{background:#fff4dc;color:#75561b}.program-message{background:#e8f5e9;color:#23623b}.program-error{background:#fff0ed;color:#923c2d}.member-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.member-stats div{background:white;border:1px solid #e0e8df;border-radius:8px;padding:15px}.member-stats small{display:block;font-size:8px;letter-spacing:1px;color:#718176;font-weight:800}.member-stats b{display:block;font:800 24px Manrope;color:#176b47;margin-top:7px}.program-tabs{display:flex;gap:7px;overflow:auto;padding:8px 0 18px;border-bottom:1px solid #dce6dc}.program-tabs button{white-space:nowrap;border:1px solid #d8e2d8;background:white;padding:11px 14px;border-radius:6px;font-size:11px;font-weight:700;color:#596b5f;cursor:pointer}.program-tabs button.selected{background:#176b47;border-color:#176b47;color:white}.program-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding-top:22px}.program-card,.program-form-card{background:white;border:1px solid #e0e8df;border-radius:12px;padding:22px}.program-card>small{font-size:9px;letter-spacing:1.4px;color:#176b47;font-weight:800}.program-card h2,.program-form-card h2{font:800 20px Manrope;margin:12px 0}.program-card p{font-size:12px;line-height:1.75;color:#69786e}.program-meta{font-size:10px;color:#718176;margin-top:8px}.program-card button,.program-form button,.campus-result button{margin-top:15px;border:0;background:#176b47;color:white;border-radius:5px;padding:12px 15px;font-size:11px;font-weight:700;cursor:pointer}.program-card button:disabled,.program-form button:disabled{opacity:.55;cursor:not-allowed}.program-card form label,.program-form label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:700;margin-top:12px}.program-card textarea,.program-card input,.program-form input,.program-form select,.program-form textarea{border:1px solid #dbe5db;border-radius:5px;padding:11px;font:12px 'DM Sans';width:100%;background:white}.program-form-card{margin-top:22px;max-width:820px}.program-form{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-top:18px}.program-form .wide{grid-column:1/-1}.program-form .consent-check{display:flex;flex-direction:row;align-items:flex-start;gap:9px;font-size:10px;line-height:1.6;font-weight:500}.program-form .consent-check input{width:auto;margin-top:2px}.program-form button{grid-column:1/-1;justify-self:start;min-width:190px}.program-empty{grid-column:1/-1;padding:25px;background:white;border-radius:8px;color:#65756a;font-size:13px}.program-status{margin-top:16px;color:#176b47;font-weight:700;font-size:12px}.campus-result{padding:20px;background:#eff6ee;border-radius:8px;margin-top:18px}.campus-result small{font-size:9px;letter-spacing:1px;color:#176b47}.campus-result h3{letter-spacing:2px}.program-footer{padding-top:35px;margin-top:40px;border-top:1px solid #dce6dc;color:#7b897e;font-size:10px}
 @media(max-width:650px){.member-stats{grid-template-columns:repeat(2,1fr)}.program-grid,.program-form{grid-template-columns:1fr}.program-form .wide{grid-column:auto}.program-form button{grid-column:auto}.program-heading{padding-top:42px}.program-brand small{font-size:7px}}
 `}</style></main>;
}
