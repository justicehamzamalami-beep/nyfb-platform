"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Member = {
 id:string; member_number:string; full_name:string; email:string|null; phone:string;
 state:string; lga:string; ward:string|null; status:string; submitted_at:string;
 rejection_reason:string|null;
};
type Assignment = { role:string; state:string|null; lga:string|null; ward:string|null };
const allowed = ["ward_coordinator","lga_coordinator","state_coordinator","national_admin"];
export default function AdminWorkspace(){
 const [members,setMembers]=useState<Member[]>([]);
 const [role,setRole]=useState("member");
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [filter,setFilter]=useState("pending");
 const [search,setSearch]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 const supabase=useMemo(()=>createClient(),[]);
 async function load(){
  setLoading(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const [profileResult,assignmentResult,memberResult]=await Promise.all([
   supabase.from("profiles").select("role").eq("id",user.id).single(),
   supabase.from("coordinator_assignments").select("role,state,lga,ward").eq("user_id",user.id),
   supabase.from("members").select("id,member_number,full_name,email,phone,state,lga,ward,status,submitted_at,rejection_reason").order("submitted_at",{ascending:false}).limit(500)
  ]);
  if(profileResult.error){setError(profileResult.error.message);setLoading(false);return;}
  const pRole=profileResult.data?.role||"member";
  const assigned=(assignmentResult.data||[]) as Assignment[];
  const effectiveRole=pRole==="national_admin"?"national_admin":(assigned.find(a=>allowed.includes(a.role))?.role||pRole);
  setRole(effectiveRole);setAssignments(assigned);
  if(!allowed.includes(effectiveRole)){setError("Your account does not have coordinator or national administrator access.");setMembers([]);}
  else if(memberResult.error){setError(memberResult.error.message);}
  else setMembers((memberResult.data||[]) as Member[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 const visible=members.filter(m=>(filter==="all"||m.status===filter)&&[m.full_name,m.member_number,m.email||"",m.phone,m.state,m.lga,m.ward||""].join(" ").toLowerCase().includes(search.toLowerCase()));
 async function decide(member:Member,status:"approved"|"rejected"|"suspended"){
  let reason:string|null=null;
  if(status==="rejected"){reason=window.prompt("Enter a reason for rejecting this application:");if(reason===null)return;if(!reason.trim()){setNotice("A rejection reason is required.");return;}}
  setBusy(member.id);setNotice("");setError("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error:updateError}=await supabase.from("members").update({status,reviewed_at:new Date().toISOString(),reviewed_by:user?.id,rejection_reason:reason}).eq("id",member.id);
  if(updateError)setError(updateError.message);
  else {
   const {data:emailResult,error:emailError}=await supabase.functions.invoke("send-member-status-email",{
    body:{member_id:member.id,status,reason}
   });
   if(emailError||emailResult?.error){
    setNotice(member.member_number+" has been "+status+", but the email notification was not sent. "+(emailResult?.error||emailError?.message||"Please try again later."));
   } else {
    setNotice(member.member_number+" has been "+status+" and the member has been notified by email.");
   }
   await load();
  }
  setBusy("");
 }
 async function signOut(){await supabase.auth.signOut();window.location.assign("/");}
 const counts={all:members.length,pending:members.filter(m=>m.status==="pending").length,approved:members.filter(m=>m.status==="approved").length,rejected:members.filter(m=>m.status==="rejected").length};
 return <main className="form-shell" style={{maxWidth:1180,margin:"0 auto",padding:"28px 18px"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><Link href="/" className="back-home">← NYFB home</Link><button className="back-home" onClick={signOut}>Sign out</button></div>
  <div style={{margin:"30px 0 24px"}}><div className="eyebrow">NYFB SECURE WORKSPACE</div><h1 style={{fontSize:"clamp(32px,5vw,52px)",margin:"12px 0"}}>{role==="national_admin"?"National administration":"Coordinator dashboard"}</h1><p style={{color:"#607269"}}>Review membership applications within your authorised organisational area.</p></div>
  {loading?<p>Loading secure workspace…</p>:error?<div className="form-message form-error">{error}</div>:<>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>{(["all","pending","approved","rejected"] as const).map(k=><button key={k} onClick={()=>setFilter(k)} style={{border:"1px solid #d8e1da",background:filter===k?"#176b47":"white",color:filter===k?"white":"#183b2d",padding:"12px 16px",borderRadius:8,cursor:"pointer"}}>{k.toUpperCase()} · {counts[k]}</button>)}</div>
   <input aria-label="Search members" placeholder="Search name, member number, phone, email or location…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:14,border:"1px solid #d8e1da",borderRadius:8,marginBottom:16}}/>
   {notice&&<p className="form-message">{notice}</p>}
   <div style={{display:"grid",gap:12}}>{visible.map(m=><article key={m.id} style={{background:"white",border:"1px solid #e1e8e2",borderRadius:12,padding:18,boxShadow:"0 4px 18px #102d1a08"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><small style={{color:"#607269"}}>{m.member_number} · {new Date(m.submitted_at).toLocaleDateString()}</small><h3 style={{margin:"7px 0"}}>{m.full_name}</h3><p style={{margin:"4px 0",color:"#52655b"}}>{m.phone} {m.email?"· "+m.email:""}</p><p style={{margin:"4px 0",color:"#52655b"}}>{m.ward?m.ward+", ":""}{m.lga}, {m.state}</p></div><strong style={{color:m.status==="approved"?"#176b47":m.status==="rejected"?"#a33":"#9a6b13"}}>{m.status.toUpperCase()}</strong></div>
    {m.rejection_reason&&<p style={{fontSize:13}}>Previous reason: {m.rejection_reason}</p>}
    {m.status==="pending"&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button disabled={busy===m.id} onClick={()=>decide(m,"approved")} className="btn">Approve</button><button disabled={busy===m.id} onClick={()=>decide(m,"rejected")} style={{padding:"11px 16px",border:"1px solid #a33",background:"white",color:"#a33",borderRadius:6,cursor:"pointer"}}>Reject</button></div>}
    {m.status==="approved"&&<button disabled={busy===m.id} onClick={()=>decide(m,"suspended")} style={{marginTop:12,padding:"9px 13px",border:"1px solid #a33",background:"white",color:"#a33",borderRadius:6,cursor:"pointer"}}>Suspend membership</button>}
   </article>)}{visible.length===0&&<p>No matching membership records.</p>}</div>
   {assignments.length>0&&<p style={{fontSize:12,color:"#607269",marginTop:24}}>Assigned scope: {assignments.map(a=>[a.role,a.ward,a.lga,a.state].filter(Boolean).join(" / ")).join("; ")}</p>}
  </>}
 </main>;
}
