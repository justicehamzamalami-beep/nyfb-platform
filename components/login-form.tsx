"use client";
import { FormEvent,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function LoginForm(){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  const data=new FormData(e.currentTarget);
  try{
   const supabase=createClient();
   const {data:authData,error}=await supabase.auth.signInWithPassword({email:String(data.get("email")).trim().toLowerCase(),password:String(data.get("password"))});
   if(error)throw error;
   const userId=authData.user.id;
   const [{data:profile},{data:assignments}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",userId).single(),
    supabase.from("coordinator_assignments").select("role").eq("user_id",userId)
   ]);
   const role=profile?.role||assignments?.[0]?.role||"member";
   const isAdmin=role==="national_admin"||assignments?.some(a=>a.role==="national_admin");
   const isCoordinator=["ward_coordinator","lga_coordinator","state_coordinator"].includes(role)||assignments?.some(a=>["ward_coordinator","lga_coordinator","state_coordinator"].includes(a.role));
   router.replace(isAdmin?"/admin":isCoordinator?"/coordinator":"/member");
  }catch(err){setMessage(err instanceof Error?err.message:"Unable to sign in. Please try again.");}
  finally{setBusy(false);}
 }
 return <main className="form-shell"><section className="form-card"><Link className="back-home" href="/">← Back to NYFB home</Link><div className="brand" style={{marginTop:28}}><b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div><h1>Welcome back.</h1><p>Sign in to access your NYFB membership account.</p><form onSubmit={submit}><div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" required autoComplete="email"/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password"/></div><div style={{textAlign:"right",marginTop:2,marginBottom:10,fontSize:11}}><Link href="/forgot-password" style={{color:"var(--green)",fontWeight:700}}>Forgot password?</Link></div>{message&&<div role="alert" className="form-message form-error">{message}</div>}<button className="btn form-submit" disabled={busy}>{busy?"Signing in…":"Sign in"} ↗</button></form><div className="form-foot">New to NYFB? <Link href="/join">Apply for membership</Link></div></section></main>;
}
