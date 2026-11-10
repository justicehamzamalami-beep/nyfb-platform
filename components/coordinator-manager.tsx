"use client";

import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

type Member={user_id:string;full_name:string;email:string|null;member_number:string;state:string;lga:string;ward:string|null;status:string};
type Assignment={id:string;user_id:string;role:string;state:string|null;lga:string|null;ward:string|null;created_at:string};
export default function CoordinatorManager(){
 const supabase=createClient();
 const [members,setMembers]=useState<Member[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [selected,setSelected]=useState("");
 const [role,setRole]=useState("state_coordinator");
 const [state,setState]=useState("");
 const [lga,setLga]=useState("");
 const [ward,setWard]=useState("");
 const [search,setSearch]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{void load();},[]);
 async function load(){
  setBusy(true);setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){window.location.assign("/login");return;}
  const {data:p,error:pe}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(pe||p?.role!=="national_admin"){setError("Only the National Administrator can appoint or remove coordinators.");setBusy(false);return;}
  const [m,a]=await Promise.all([
   supabase.from("members").select("user_id,full_name,email,member_number,state,lga,ward,status").eq("status","approved").order("full_name").limit(2000),
   supabase.from("coordinator_assignments").select("id,user_id,role,state,lga,ward,created_at").order("created_at",{ascending:false}).limit(1000)
  ]);
  if(m.error)setError(m.error.message);else setMembers((m.data||[]) as Member[]);
  if(a.error)setError(a.error.message);else setAssignments((a.data||[]) as Assignment[]);
  setBusy(false);
 }
 const chosen=members.find(m=>m.user_id===selected);
 async function add(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!chosen)return;
  setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  const payload={user_id:selected,role,state:state.trim(),lga:role==="state_coordinator"?null:lga.trim(),ward:role==="ward_coordinator"?ward.trim():null,assigned_by:user?.id};
  const {error:e2}=await supabase.from("coordinator_assignments").insert(payload);
  if(e2)setError(e2.message);else{setNotice(chosen.full_name+" has been appointed as "+role.replaceAll("_"," ")+".");setSelected("");setState("");setLga("");setWard("");await load();}
  setBusy(false);
 }
 async function remove(item:Assignment){
  if(!window.confirm("Remove this coordinator assignment?"))return;
  setBusy(true);setError("");setNotice("");
  const {error:e}=await supabase.from("coordinator_assignments").delete().eq("id",item.id);
  if(e)setError(e.message);else{setNotice("Coordinator assignment removed.");await load();}
  setBusy(false);
 }
 const filtered=members.filter(m=>[m.full_name,m.email||"",m.member_number,m.state,m.lga].join(" ").toLowerCase().includes(search.toLowerCase()));
 const memberFor=(id:string)=>members.find(m=>m.user_id===id);
 return <main className="cm-shell"><div className="cm-wrap"><header><Link href="/admin">← Administration</Link><b>NYFB · COORDINATOR MANAGEMENT</b><button onClick={()=>void load()}>↻ Refresh</button></header><section className="cm-title"><small>LEADERSHIP & ORGANISATIONAL STRUCTURE</small><h1>Build your<br/><em>national structure.</em></h1><p>Appoint approved members to state, LGA and ward coordinator positions. Each assignment grants access only to its defined area.</p></section>{error&&<div className="cm-error">{error}</div>}{notice&&<div className="cm-notice">{notice}</div>}
 <div className="cm-grid"><section className="cm-card"><h2>Appoint a coordinator</h2><form onSubmit={add}><label>Find an approved member<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email or membership ID"/></label><label>Select member<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose member</option>{filtered.map(m=><option key={m.user_id} value={m.user_id}>{m.full_name} · {m.member_number} · {m.lga}, {m.state}</option>)}</select></label>{chosen&&<div className="cm-selected"><b>{chosen.full_name}</b><small>{chosen.member_number} · {chosen.email||"No email"}</small><small>{chosen.lga}, {chosen.state}</small></div>}<label>Coordinator level<select value={role} onChange={e=>setRole(e.target.value)}><option value="state_coordinator">State Coordinator</option><option value="lga_coordinator">LGA Coordinator</option><option value="ward_coordinator">Ward Coordinator</option></select></label><label>State<input required value={state} onChange={e=>setState(e.target.value)} placeholder="State name"/></label>{role!=="state_coordinator"&&<label>Local Government Area<input required value={lga} onChange={e=>setLga(e.target.value)} placeholder="LGA name"/></label>}{role==="ward_coordinator"&&<label>Ward<input required value={ward} onChange={e=>setWard(e.target.value)} placeholder="Ward name"/></label>}<button disabled={busy||!chosen}>Confirm appointment</button></form><p className="cm-hint">Only approved members can be appointed. A member may hold more than one assignment where authorised.</p></section>
 <section className="cm-card"><h2>Current assignments <span>{assignments.length}</span></h2><div className="cm-assignment-list">{assignments.map(a=>{const m=memberFor(a.user_id);return <article key={a.id}><div><b>{m?.full_name||"Member account"}</b><small>{a.role.replaceAll("_"," ")} · {[a.ward,a.lga,a.state].filter(Boolean).join(", ")}</small><small>{m?.member_number||a.user_id.slice(0,8)}</small></div><button className="cm-remove" disabled={busy} onClick={()=>void remove(a)}>Remove</button></article>})}{assignments.length===0&&<p>No coordinator assignments have been created.</p>}</div></section></div><footer>NYFB National Administration · Coordinator permissions are enforced by database policies.</footer></div><style jsx>{`
 .cm-shell{min-height:100vh;background:#f2f6f1;padding:25px 18px 60px;color:#193729}.cm-wrap{max-width:1100px;margin:auto}.cm-wrap>header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dce5db;padding-bottom:18px;font-size:11px}.cm-wrap>header a,.cm-wrap>header button{color:#176b47;font-weight:700;background:none;border:0;cursor:pointer}.cm-title{padding:55px 0 30px;max-width:650px}.cm-title small{font-size:9px;letter-spacing:2px;color:#176b47;font-weight:800}.cm-title h1{font:900 clamp(40px,6vw,62px)/1.05 Manrope,Arial;letter-spacing:-2px;margin:15px 0}.cm-title h1 em{font-style:normal;color:#176b47}.cm-title p,.cm-hint{font-size:12px;line-height:1.8;color:#6b7b70}.cm-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.cm-card{background:white;border:1px solid #e0e8df;border-radius:12px;padding:24px}.cm-card h2{font:800 20px Manrope;margin:0 0 18px}.cm-card h2 span{font:700 11px Arial;color:#176b47;background:#e9f2e9;padding:5px 8px;border-radius:15px}.cm-card form{display:grid;gap:12px}.cm-card label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700}.cm-card input,.cm-card select{border:1px solid #dce5dc;border-radius:5px;padding:11px;font:12px 'DM Sans';background:white}.cm-card form>button{border:0;background:#176b47;color:white;border-radius:5px;padding:13px;font-size:11px;font-weight:700;cursor:pointer}.cm-selected{background:#eef5ed;padding:12px;border-radius:6px}.cm-selected b,.cm-selected small{display:block}.cm-selected small{font-size:9px;color:#69786e;margin-top:5px}.cm-assignment-list article{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:13px 0;border-bottom:1px solid #e8ede7}.cm-assignment-list article b,.cm-assignment-list article small{display:block}.cm-assignment-list article b{font-size:12px}.cm-assignment-list article small{font-size:9px;color:#758278;margin-top:5px}.cm-remove{border:1px solid #edd8d2;background:#fff6f3;color:#9b4736;padding:7px 9px;border-radius:5px;font-size:9px;font-weight:700;cursor:pointer}.cm-error,.cm-notice{padding:12px 15px;margin:12px 0;border-radius:6px;font-size:11px}.cm-error{background:#fff0ed;color:#923c2d}.cm-notice{background:#e8f5e9;color:#23623b}.cm-wrap footer{margin-top:35px;padding-top:18px;border-top:1px solid #dce5db;font-size:9px;color:#7b897f}.cm-hint{font-size:10px}
 @media(max-width:760px){.cm-grid{grid-template-columns:1fr}.cm-wrap>header b{font-size:9px}}
 `}</style></main>;
}
