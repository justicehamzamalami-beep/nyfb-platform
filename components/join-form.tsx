"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Registration is taking too long. Please try again.")), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export default function JoinForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{text:string;error?:boolean}|null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const v = Object.fromEntries(form.entries());
    const referralCode = new URLSearchParams(window.location.search).get("ref")?.trim() || "";
    try {
      const registrationKey = localStorage.getItem("nyfb-registration-device-token") || (localStorage.setItem("nyfb-registration-device-token", crypto.randomUUID()), localStorage.getItem("nyfb-registration-device-token"));
      const supabase = createClient();
      const {data,error} = await withTimeout(supabase.auth.signUp({
        email: String(v.email).trim().toLowerCase(),
        password: String(v.password),
        options: { emailRedirectTo: "https://nigerianyouthforbat.org/auth/callback", data: {
          full_name: String(v.full_name).trim(), phone: String(v.phone).trim(),
          nin_number: String(v.nin_number || "").trim(),
          gender: String(v.gender||""), date_of_birth: String(v.date_of_birth||""),
          state: String(v.state).trim(), lga: String(v.lga).trim(),
          ward: String(v.ward||"").trim(), occupation: String(v.occupation||"").trim(),
          referral_code: referralCode,
          browser_registration_key: localStorage.getItem("nyfb-registration-device-token") || ""
        }}
      }),20000);
      if(error) throw error;
      setMessage({text:data.session
        ? "Your account and membership application have been created successfully. You can now sign in."
        : "Your registration has been received. If email confirmation is enabled, confirm your email before signing in."});
      formElement.reset();
    } catch(err) {
      setMessage({text:err instanceof Error?err.message:"Registration could not be completed. Please try again.",error:true});
    } finally { setBusy(false); }
  }
  return <main className="form-shell"><section className="form-card">
    <Link className="back-home" href="/">← Back to NYFB home</Link>
    <div className="brand" style={{marginTop:28}}><b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div>
    <h1>Join the movement.</h1><p>Complete the form to create your member account and submit your NYFB membership application.</p>
    <form onSubmit={submit}><div className="form-grid">
      <div className="field full"><label htmlFor="full_name">Full name *</label><input id="full_name" name="full_name" autoComplete="name" required maxLength={120} placeholder="Enter your full name"/></div>
      <div className="field"><label htmlFor="email">Email address *</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></div>
      <div className="field"><label htmlFor="phone">Phone number *</label><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={25} placeholder="080..."/></div>
      <div className="field"><label htmlFor="nin_number">NIN Number</label><input id="nin_number" name="nin_number" type="text" inputMode="numeric" autoComplete="off" minLength={11} maxLength={11} pattern="[0-9]{11}" placeholder="Enter your 11-digit NIN"/></div>
      <div className="field"><label htmlFor="password">Password *</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters"/></div>
      <div className="field"><label htmlFor="gender">Gender</label><select id="gender" name="gender" defaultValue=""><option value="">Select gender</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></div>
      <div className="field"><label htmlFor="date_of_birth">Date of birth</label><input id="date_of_birth" name="date_of_birth" type="date"/></div>
      <div className="field"><label htmlFor="occupation">Occupation</label><input id="occupation" name="occupation" placeholder="Student, business owner..."/></div>
      <div className="field"><label htmlFor="state">State *</label><input id="state" name="state" required placeholder="State of residence"/></div>
      <div className="field"><label htmlFor="lga">Local government area *</label><input id="lga" name="lga" required placeholder="Your LGA"/></div>
      <div className="field full"><label htmlFor="ward">Ward</label><input id="ward" name="ward" placeholder="Your ward (if known)"/></div>
    </div>
    <p style={{fontSize:11,lineHeight:1.7}}>By submitting, you confirm that the information provided is accurate and consent to its use for NYFB membership administration. Your NIN is stored separately and is not displayed on your public membership card.</p>
    {message&&<div role="status" className={message.error?"form-message form-error":"form-message"}>{message.text}</div>}
    <button className="btn form-submit" type="submit" disabled={busy}>{busy?"Submitting application…":"Create account & apply"} ↗</button></form>
    <div className="form-foot">Already registered? <Link href="/login">Sign in</Link></div>
  </section></main>;
}
