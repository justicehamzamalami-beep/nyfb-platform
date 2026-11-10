"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
export default function JoinForm(){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState<{text:string;error?:boolean}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage(null);
  const formElement=event.currentTarget;
  const form=new FormData(formElement);const v=Object.fromEntries(form.entries());
  try{
   const supabase=createClient();
   const {error}=await supabase.auth.signUp({email:String(v.email).trim().toLowerCase(),password:String(v.password),options:{emailRedirectTo:`${window.location.origin}/auth/callback`,data:{
    full_name:String(v.full_name).trim(),phone:String(v.phone).trim(),gender:String(v.gender||""),
    date_of_birth:String(v.date_of_birth||""),state:String(v.state).trim(),lga:String(v.lga).trim(),
    ward:String(v.ward||"").trim(),occupation:String(v.occupation||"").trim()
   }}});
   if(error)throw error;
   setMessage({text:"Your account and membership application have been submitted. Check your email for a confirmation link. Your NYFB membership number is generated automatically."});
   formElement.reset();
  }catch(e){setMessage({text:e instanceof Error?e.message:"Registration could not be completed. Please try again.",error:true});}
  finally{setBusy(false);}
 }
 return <main className="form-shell"><section className="form-card"><Link className="back-home" href="/">← Back to NYFB home</Link><div className="brand" style={{marginTop:28}}><b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div><h1>Join the movement.</h1><p>Complete the form to create your member account and submit your NYFB membership application.</p>
 <form onSubmit={submit}><div className="form-grid">
 <div className="field full"><label htmlFor="full_name">Full name *</label><input id="full_name" name="full_name" autoComplete="name" required maxLength={120} placeholder="Enter your full name"/></div>
 <div className="field"><label htmlFor="email">Email address *</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></div>
 <div className="field"><label htmlFor="phone">Phone number *</label><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={25} placeholder="080..."/></div>
 <div className="field"><label htmlFor="password">Password *</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters"/></div>
 <div className="field"><label htmlFor="gender">Gender</label><select id="gender" name="gender" defaultValue=""><option value="">Select gender</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></div>
 <div className="field"><label htmlFor="date_of_birth">Date of birth</label><input id="date_of_birth" name="date_of_birth" type="date"/></div>
 <div className="field"><label htmlFor="occupation">Occupation</label><input id="occupation" name="occupation" placeholder="Student, business owner..."/></div>
 <div className="field"><label htmlFor="state">State *</label><input id="state" name="state" required placeholder="State of residence"/></div>
 <div className="field"><label htmlFor="lga">Local government area *</label><input id="lga" name="lga" required placeholder="Your LGA"/></div>
 <div className="field full"><label htmlFor="ward">Ward</label><input id="ward" name="ward" placeholder="Your ward (if known)"/></div>
 </div><p style={{fontSize:11,lineHeight:1.7}}>By submitting, you confirm that the information provided is accurate and consent to its use for NYFB membership administration.</p>
 {message&&<div role="status" className={message.error?"form-message form-error":"form-message"}>{message.text}</div>}
 <button className="btn form-submit" type="submit" disabled={busy}>{busy?"Submitting application…":"Create account & apply"} ↗</button></form><div className="form-foot">Already registered? <Link href="/login">Sign in</Link></div>
 </section></main>
}