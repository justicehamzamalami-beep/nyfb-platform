"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NYFB_LOGO_URL = "https://brpqtdqejvlxsyzlyrfv.supabase.co/storage/v1/object/public/nyfb-site-media/website/logo/15fe9ad9-01c7-4bb6-873e-bc8ba989018d.jpg";

type Member = { member_number:string; full_name:string; status:string; state:string; lga:string; ward:string|null };

export default function MemberHome() {
  const [member,setMember]=useState<Member|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    const timeout=setTimeout(()=>{if(active){setError("Your dashboard is taking too long to load. Please refresh and try again.");setBusy(false);}},12000);
    (async()=>{
      try{
        const supabase=createClient();
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError||!user){window.location.replace("/login");return;}
        const {data,error:memberError}=await supabase.from("members").select("member_number,full_name,status,state,lga,ward").eq("user_id",user.id).maybeSingle();
        if(memberError)throw memberError;
        if(active)setMember(data as Member|null);
      }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load your membership.");}
      finally{if(active){setBusy(false);clearTimeout(timeout);}}
    })();
    return()=>{active=false;clearTimeout(timeout);};
  },[]);

  async function signOut(){const supabase=createClient();await supabase.auth.signOut();window.location.assign("/");}

  return <main className="member-dashboard-shell"><section className="member-space">
    <header className="topbar"><Link href="/" className="brand"><img src={NYFB_LOGO_URL} alt="NYFB logo"/><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></Link><button onClick={signOut} className="sign-out">Sign out</button></header>
    <nav className="member-nav" aria-label="Member dashboard">
      <Link href="/member" aria-current="page" className="active"><span>⌂</span>Overview</Link>
      <Link href="/member/bank-details"><span>₦</span>Bank account details</Link>
      <Link href="/member/profile"><span>◉</span>Profile</Link>
    </nav>
    <header className="page-heading"><small>MEMBER PORTAL</small><h1>Membership overview</h1><p>Your essential NYFB membership information in one place.</p></header>
    {busy?<p className="notice">Loading your membership details…</p>:error?<p className="notice error">{error}</p>:!member?<p className="notice">No membership record was found for this account.</p>:<>
      <section className="welcome"><div className="avatar">{member.full_name.trim().charAt(0).toUpperCase()}</div><div><span>WELCOME BACK</span><h2>{member.full_name}</h2><p>Your NYFB member account overview.</p></div></section>
      <section className="summary">
        <div><small>MEMBERSHIP NUMBER</small><strong>{member.member_number||"Pending"}</strong></div>
        <div><small>MEMBERSHIP STATUS</small><strong className={"status status-"+member.status}>{member.status.toUpperCase()}</strong></div>
        <div><small>LOCATION</small><strong>{[member.lga,member.state].filter(Boolean).join(", ")||"Not provided"}</strong></div>
        {member.ward&&<div><small>WARD</small><strong>{member.ward}</strong></div>}
      </section>
      <section className="quick-links"><Link href="/member/bank-details"><span>₦</span><div><strong>Bank account details</strong><small>View or update your submitted bank information</small></div><b>›</b></Link><Link href="/member/profile"><span>◉</span><div><strong>My profile</strong><small>View your personal and membership details</small></div><b>›</b></Link></section>
      {member.status!=="approved"&&<p className="notice">Your membership is {member.status}. Some member services will become available after approval.</p>}
    </>}
    <footer> NIGERIAN YOUTH FOR BAT · SECURE MEMBER PORTAL </footer>
  </section>
  <style jsx>{`
    .member-dashboard-shell{min-height:100vh;padding:24px 16px 48px;background:radial-gradient(ellipse at 15% 0%,#1b6a3a,#073d25 48%,#032719);color:#f4fff6}
    .member-space{max-width:980px;margin:auto;padding:26px 30px;background:linear-gradient(145deg,#064329,#04331f 65%,#022819);border:1px solid #2d8752;border-radius:18px;box-shadow:0 22px 65px #00170d88}
    .topbar{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #277449}
    .brand{display:flex;align-items:center;gap:11px;color:#fff;text-decoration:none;font-size:20px;font-weight:900}.brand img{width:46px;height:46px;object-fit:contain;background:#fff;border-radius:8px;padding:3px}.brand small{display:block;font-size:8px;letter-spacing:1px;color:#b8f5c9}
    .sign-out{padding:9px 14px;border:1px solid #4a9d69;border-radius:7px;background:#0c5934;color:#fff;font-weight:700;cursor:pointer}
    .member-nav{display:flex;gap:9px;margin:22px 0 30px;padding:7px;background:#022b1a;border:1px solid #267447;border-radius:10px}.member-nav a{flex:1;display:flex;align-items:center;justify-content:center;gap:9px;padding:12px 10px;border-radius:7px;color:#e8ffed;text-decoration:none;font-size:12px;font-weight:800}.member-nav a span{font-size:17px;color:#b8f5c9}.member-nav a:hover,.member-nav a.active{background:#b8f5c9;color:#04331f}.member-nav a.active span,.member-nav a:hover span{color:#04331f}
    .page-heading small{font-size:9px;font-weight:900;letter-spacing:1.8px;color:#a8edbb}.page-heading h1{font:800 clamp(26px,4vw,36px)/1.15 Manrope,Arial;margin:8px 0;color:#fff}.page-heading p{font-size:13px;color:#d6f3df;margin:0;line-height:1.6}
    .welcome{display:flex;align-items:center;gap:16px;margin:24px 0;padding:20px;background:#0a5632;border:1px solid #388a58;border-radius:12px}.avatar{width:58px;height:58px;flex:0 0 58px;display:grid;place-items:center;border-radius:50%;background:#b8f5c9;color:#07502e;font-size:25px;font-weight:900}.welcome span{font-size:8px;letter-spacing:1.4px;color:#b8f5c9;font-weight:900}.welcome h2{margin:5px 0;color:#fff;font-size:20px}.welcome p{margin:0;color:#d6f3df;font-size:12px}
    .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.summary>div{min-width:0;padding:17px;background:#0a5632;border:1px solid #277449;border-radius:10px}.summary small,.summary strong{display:block}.summary small{font-size:8px;letter-spacing:1px;color:#d5f4df;font-weight:900}.summary strong{margin-top:9px;color:#fff;font-size:15px;overflow-wrap:anywhere}.status-approved{color:#b7f3c7!important}.status-pending{color:#fff0a8!important}.status-rejected,.status-suspended{color:#ffb7b7!important}
    .quick-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.quick-links a{display:flex;align-items:center;gap:12px;padding:17px;background:#022b1a;border:1px solid #388a58;border-radius:10px;color:#fff;text-decoration:none}.quick-links a>span{width:38px;height:38px;display:grid;place-items:center;border-radius:8px;background:#0b5632;color:#b8f5c9;font-size:19px;font-weight:900}.quick-links a div{flex:1;min-width:0}.quick-links strong,.quick-links small{display:block}.quick-links strong{font-size:12px}.quick-links small{margin-top:5px;color:#cdebd7;font-size:10px;line-height:1.5}.quick-links a>b{font-size:22px;color:#b8f5c9}
    .notice{margin-top:18px;padding:14px;background:#0a5632;border:1px solid #388a58;border-radius:8px;color:#eaffef;font-size:12px;line-height:1.6}.notice.error{border-color:#b85b54;color:#ffd0c9}footer{margin-top:30px;padding-top:15px;border-top:1px solid #277449;color:#a9edbb;font-size:8px;letter-spacing:1.2px;text-align:center;font-weight:800}
    @media(max-width:600px){.member-space{padding:19px 14px;border-radius:13px}.member-dashboard-shell{padding:12px 9px 30px}.member-nav{gap:3px;padding:5px}.member-nav a{flex-direction:column;gap:4px;padding:10px 4px;font-size:10px}.quick-links{grid-template-columns:1fr}.welcome{padding:15px}.page-heading p{font-size:12px}}
  `}</style></main>;
}
