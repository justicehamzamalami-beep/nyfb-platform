"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

type Row={
 id:string; member_user_id:string; verification_status:"pending"|"verified"|"no_pvc"|"unable_to_verify";
 verification_method:string|null; verified_at:string|null; updated_at:string;
 members:{full_name:string;member_number:string;state:string;lga:string;ward:string|null;phone:string}|null;
};
const label=(s:string)=>({pending:"Pending",verified:"Verified",no_pvc:"No PVC",unable_to_verify:"Unable to verify"}[s]||s);
export default function PvcVerificationWorkspace(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<Row[]>([]);
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("pending");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [area,setArea]=useState("");
 async function load(){
  setLoading(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const [profile,assignments]=await Promise.all([
   supabase.from("profiles").select("role").eq("id",user.id).maybeSingle(),
   supabase.from("coordinator_assignments").select("role,state,lga").eq("user_id",user.id).eq("role","lga_coordinator")
  ]);
  if(profile.error||assignments.error){setError(profile.error?.message||assignments.error?.message||"Could not load coordinator permissions.");setLoading(false);return;}
  if(profile.data?.role!=="national_admin"&&(!assignments.data||assignments.data.length===0)){setError("This workspace is for appointed Local Government Coordinators only.");setLoading(false);return;}
  if(assignments.data?.[0])setArea([assignments.data[0].lga,assignments.data[0].state].filter(Boolean).join(", "));
  const allRows:Row[]=[];
  for(let from=0;from<30000;from+=1000){
   const result=await supabase.from("pvc_verifications").select("id,member_user_id,verification_status,verification_method,verified_at,updated_at,members!inner(full_name,member_number,state,lga,ward,phone)").order("updated_at",{ascending:false}).range(from,from+999);
   if(result.error){setError(result.error.message);setLoading(false);return;}
   allRows.push(...((result.data||[]) as unknown as Row[]));
   if((result.data||[]).length<1000)break;
  }
  setRows(allRows);
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 async function mark(row:Row,status:"verified"|"no_pvc"|"unable_to_verify"){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Your session has expired. Please sign in again.");return;}
  setBusy(row.id);setError("");setNotice("");
  const {error:e}=await supabase.from("pvc_verifications").update({
   verification_status:status,verification_method:"physical_sighting",
   verified_by:user.id,verified_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq("id",row.id);
  if(e)setError(e.message);
  else{setNotice(row.members?.member_number+" updated: "+label(status)+". No card number or image was recorded.");await load();}
  setBusy("");
 }
 const filtered=rows.filter(r=>(filter==="all"||r.verification_status===filter)&&[
  r.members?.full_name||"",r.members?.member_number||"",r.members?.phone||"",r.members?.lga||"",r.members?.ward||""
 ].join(" ").toLowerCase().includes(search.toLowerCase()));
 const pending=rows.filter(r=>r.verification_status==="pending").length;
 const verified=rows.filter(r=>r.verification_status==="verified").length;
 return <main className="pvc-shell"><div className="pvc-wrap">
  <header><Link href="/coordinator">← Coordinator workspace</Link><b>NYFB · PVC KYC</b><button onClick={()=>void load()}>↻ Refresh</button></header>
  <section className="pvc-heading"><small>MEMBERSHIP VERIFICATION PROGRAMME</small><h1>PVC <em>verification</em></h1><p>Local Government Coordinators should sight the member’s original PVC in person and record only the outcome. Do not photograph, photocopy, write down, message, or upload the VIN or card image.</p>{area&&<span className="pvc-area">Assigned area: {area}</span>}</section>
  {error&&<div className="pvc-alert">{error}</div>}{notice&&<div className="pvc-success">{notice}</div>}
  <section className="pvc-stats"><article><b>{rows.length}</b><span>Members in scope</span></article><article><b>{pending}</b><span>Awaiting verification</span></article><article><b>{verified}</b><span>Verified</span></article></section>
  <section className="pvc-list"><div className="pvc-tools"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, member ID, phone or ward"/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="pending">Pending</option><option value="verified">Verified</option><option value="no_pvc">No PVC</option><option value="unable_to_verify">Unable to verify</option><option value="all">All records</option></select></div>
  {loading?<p className="pvc-empty">Loading assigned members…</p>:filtered.length===0?<p className="pvc-empty">No members found in this category.</p>:filtered.map(row=><article className="pvc-row" key={row.id}><div className="pvc-person"><b>{row.members?.full_name||"Member"}</b><span>{row.members?.member_number} · {row.members?.lga}{row.members?.ward?", "+row.members.ward:""}</span><small>{row.members?.phone||"No phone recorded"} · <strong>{label(row.verification_status)}</strong></small></div><div className="pvc-actions"><button disabled={!!busy||row.verification_status==="verified"} onClick={()=>void mark(row,"verified")}>PVC sighted</button><button className="pvc-secondary" disabled={!!busy||row.verification_status==="no_pvc"} onClick={()=>void mark(row,"no_pvc")}>No PVC</button><button className="pvc-muted" disabled={!!busy||row.verification_status==="unable_to_verify"} onClick={()=>void mark(row,"unable_to_verify")}>Unable to verify</button></div></article>)}
  </section>
  <footer>NYFB KYC · Verification outcome only · VINs and PVC images are not collected or stored.</footer>
 </div><style jsx>{`
 .pvc-shell{min-height:100vh;background:#f3f7f2;color:#183b2b;padding:24px 16px 55px}.pvc-wrap{max-width:1080px;margin:auto}.pvc-wrap>header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce7dc;padding-bottom:16px;font-size:11px}.pvc-wrap>header a,.pvc-wrap>header button{border:0;background:none;color:#176b47;font-weight:800;text-decoration:none;cursor:pointer}.pvc-heading{padding:44px 0 24px;max-width:720px}.pvc-heading small{font-size:9px;letter-spacing:2px;font-weight:900;color:#176b47}.pvc-heading h1{font:900 clamp(38px,6vw,58px)/1.05 Manrope,Arial;margin:12px 0}.pvc-heading h1 em{font-style:normal;color:#176b47}.pvc-heading p{font-size:12px;line-height:1.8;color:#68796d}.pvc-area{display:inline-block;background:#e5f1e6;padding:8px 12px;border-radius:5px;font-size:10px;font-weight:800}.pvc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:15px 0}.pvc-stats article,.pvc-list{background:#fff;border:1px solid #e0e9df;border-radius:9px;padding:18px}.pvc-stats b,.pvc-stats span{display:block}.pvc-stats b{font-size:25px}.pvc-stats span{font-size:10px;color:#758278;margin-top:5px}.pvc-list{padding:0 18px}.pvc-tools{display:flex;gap:10px;padding:16px 0;border-bottom:1px solid #e6ece5}.pvc-tools input,.pvc-tools select{padding:11px;border:1px solid #dce5dc;border-radius:5px;background:white;font-size:11px}.pvc-tools input{flex:1;min-width:0}.pvc-row{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:16px 0;border-bottom:1px solid #edf1ec}.pvc-person b,.pvc-person span,.pvc-person small{display:block}.pvc-person b{font-size:13px}.pvc-person span,.pvc-person small{font-size:10px;color:#718075;margin-top:5px}.pvc-person strong{color:#176b47}.pvc-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.pvc-actions button{border:0;background:#176b47;color:white;border-radius:5px;padding:9px 10px;font-size:9px;font-weight:800;cursor:pointer}.pvc-actions .pvc-secondary{background:#edf4e9;color:#38613f}.pvc-actions .pvc-muted{background:#f1f2ef;color:#626d63}.pvc-actions button:disabled{opacity:.45;cursor:not-allowed}.pvc-empty{padding:25px;text-align:center;color:#78857b;font-size:11px}.pvc-alert,.pvc-success{padding:12px;margin:12px 0;border-radius:6px;font-size:11px}.pvc-alert{background:#fff0ed;color:#923c2d}.pvc-success{background:#e8f5e9;color:#23623b}.pvc-wrap footer{margin-top:22px;padding-top:14px;border-top:1px solid #dce7dc;font-size:9px;color:#7c897f}@media(max-width:700px){.pvc-row{align-items:flex-start;flex-direction:column}.pvc-actions{justify-content:flex-start}.pvc-tools{flex-direction:column}.pvc-stats{gap:7px}.pvc-stats article{padding:12px}.pvc-stats b{font-size:20px}}
 `}</style></main>;
}
