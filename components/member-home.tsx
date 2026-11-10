"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Member = { member_number:string; full_name:string; status:string; state:string; lga:string; ward:string|null; reviewed_at:string|null };
type Announcement = { id:string; title:string; body:string; audience:string; target_state:string|null; published_at:string|null; created_at:string };

export default function MemberHome() {
  const [member,setMember]=useState<Member|null>(null);
  const [announcements,setAnnouncements]=useState<Announcement[]>([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const supabase=createClient();
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError||!user){window.location.replace("/login");return;}
        const [memberResult,announcementResult]=await Promise.all([
          supabase.from("members").select("member_number,full_name,status,state,lga,ward,reviewed_at").eq("user_id",user.id).maybeSingle(),
          supabase.from("announcements").select("id,title,body,audience,target_state,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(20)
        ]);
        if(memberResult.error)throw memberResult.error;
        if(active)setMember(memberResult.data as Member|null);
        if(active&&!announcementResult.error)setAnnouncements((announcementResult.data||[]) as Announcement[]);
      }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load your membership.");}
      finally{if(active)setBusy(false);}
    })();
    return()=>{active=false;};
  },[]);

  async function signOut(){const supabase=createClient();await supabase.auth.signOut();window.location.assign("/");}

  return (
    <main className="member-dashboard-shell">
      <section className="member-space">
        <div className="member-actions"><Link className="back-home" href="/">← NYFB home</Link><button onClick={signOut} className="back-home sign-out">Sign out</button></div>\n        <nav className="member-navigation" aria-label="Member navigation"><a href="#dashboard">Dashboard</a><a href="#profile">Profile</a><a href="#membership-card">Membership card</a><a href="#announcements">Announcements</a><Link href="/programmes">Programmes &amp; events</Link><a href="/#about">About NYFB</a><Link href="/forgot-password">Settings</Link><a href="mailto:nigerianyouthforbat@gmail.com">Help &amp; support</a></nav>
        <div className="brand member-brand" style={{marginTop:24}}><b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div>
        <div className="member-heading"><div><small>MEMBER PORTAL</small><h1 id="dashboard">Your NYFB dashboard</h1><p>Manage your membership, stay informed and take part in NYFB programmes.</p></div><span className="member-portal-tag">SECURE MEMBER AREA</span></div>
        {busy?<p>Loading your membership details…</p>:error?<div className="form-message form-error">{error}</div>:!member?<p>No membership record was found for this account.</p>:<>
          <p>Welcome, {member.full_name}. Here is your current membership record.</p>
          <div className="member-programme-link"><Link href="/programmes">Explore events, welfare, volunteer tasks and support groups →</Link></div><div className="member-summary" id="profile"><small>MEMBERSHIP NUMBER</small><h2>{member.member_number}</h2><p><strong>Status:</strong> <span className={"status status-"+member.status}>{member.status.toUpperCase()}</span></p><p><strong>Location:</strong> {member.lga}, {member.state}</p>{member.ward&&<p><strong>Ward:</strong> {member.ward}</p>}</div>
          <section className="member-announcements" id="announcements"><div className="member-section-head"><div><small>OFFICIAL UPDATES</small><h2>Announcements</h2></div><span>{announcements.length} updates</span></div>
            {announcements.length===0?<p className="no-announcements">There are no new announcements at the moment.</p>:announcements.map(item=><article key={item.id}><div className="announcement-date">{new Date(item.published_at||item.created_at).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div><h3>{item.title}</h3><p>{item.body}</p>{item.audience==="state"&&item.target_state&&<small>For members in {item.target_state}</small>}</article>)}
          </section>
          {member.status==="approved"?(
            <section className="membership-card-section" id="membership-card">
              <div className="membership-card" id="nyfb-membership-card">
                <div className="card-top"><div className="card-emblem">NY</div><div><strong>NIGERIAN YOUTH FOR BAT</strong><small>OFFICIAL MEMBERSHIP CARD</small></div><span className="card-approved">APPROVED</span></div>
                <div className="card-main"><div className="card-avatar">NYFB</div><div className="card-details"><small>MEMBER NAME</small><h2>{member.full_name}</h2><small>MEMBERSHIP ID</small><strong>{member.member_number}</strong><div className="card-location">{member.ward?member.ward+", ":""}{member.lga}, {member.state}</div></div></div>
                <div className="card-bottom"><span>VALID NYFB MEMBER</span><span>{member.reviewed_at?"ISSUED "+new Date(member.reviewed_at).toLocaleDateString("en-NG"):"OFFICIAL RECORD"}</span></div>
              </div>
              <button className="btn print-card" onClick={()=>window.print()}>Print / Save membership card</button>
              <p className="card-note">You can print this card or choose “Save as PDF” in your browser’s print options.</p>
            </section>
          ):<p className="membership-note">{member.status==="pending"?"Your application is awaiting review. Your official membership card will become available here once it is approved.":member.status==="rejected"?"Your application was not approved. Please contact your NYFB coordinator for further guidance.":"Your membership is currently suspended. Please contact the NYFB administration for assistance."}</p>}
        </>}
      </section>
      <style jsx>{`
        .member-dashboard-shell{min-height:100vh;background:#f3f6f2;padding:28px 24px 60px}
        .member-space{max-width:1180px;width:100%;margin:0 auto;background:#fff;border:1px solid #e3eae2;border-radius:18px;padding:28px 34px;box-shadow:0 18px 55px #1534240c}
        .member-actions{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid #edf1ec}
        .member-actions .back-home{font-size:11px;color:#176b47;font-weight:700}.sign-out{border:1px solid #e3eae2;background:#fff;padding:8px 13px;border-radius:7px;cursor:pointer}
        .member-brand{margin:22px 0 18px!important}
        .member-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:14px 0 24px}
        .member-heading>div>small{font-size:9px;font-weight:800;letter-spacing:1.8px;color:#176b47}
        .member-heading h1{font:800 clamp(27px,3.5vw,38px)/1.12 Manrope;margin:8px 0;color:#183b2b;letter-spacing:-1.3px}
        .member-heading p{font-size:12px;color:#748178;margin:0;line-height:1.7}
        .member-portal-tag{font-size:8px;letter-spacing:1px;font-weight:800;color:#477455;background:#edf5ed;padding:9px 12px;border-radius:20px;white-space:nowrap}
        .member-navigation{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 26px;padding:13px;background:#f5f8f4;border:1px solid #e7ede5;border-radius:12px}
        .member-navigation a{display:flex;align-items:center;justify-content:center;min-height:42px;padding:10px 12px;border-radius:8px;background:#fff;color:#315b43;font-size:11px;font-weight:700;text-decoration:none;border:1px solid #e5ebe4;transition:background .18s,border-color .18s,color .18s}
        .member-navigation a:hover{background:#176b47;color:white;border-color:#176b47}
        .member-programme-link{margin-top:18px}.member-programme-link a{display:block;padding:15px 18px;border-radius:9px;background:#176b47;color:white;font-size:12px;font-weight:700}
        .member-summary{background:#f3f7f1;border:1px solid #e5ece3;padding:23px;margin-top:22px;border-radius:12px}
        .member-summary small{color:#607269;letter-spacing:1px;font-size:9px}.member-summary h2{font-size:29px;margin:8px 0 18px;color:#176b47}.status{font-weight:800}.status-approved{color:#176b47}.status-pending{color:#9a6b13}.status-rejected,.status-suspended{color:#a33}
        .member-announcements{margin-top:30px}.member-section-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px}.member-section-head small{font-size:9px;letter-spacing:1.4px;color:#176b47;font-weight:800}.member-section-head h2{font:800 22px Manrope;margin:5px 0 0}.member-section-head>span{font-size:10px;color:#829087}
        .member-announcements article{padding:17px 0;border-bottom:1px solid #e7ece6}.announcement-date{font-size:9px;color:#8b988e}.member-announcements article h3{font:700 15px Manrope,Arial;margin:7px 0}.member-announcements article p,.no-announcements{font-size:12px;line-height:1.8;color:#647369;white-space:pre-wrap;margin:0}.member-announcements article>small{display:block;font-size:9px;color:#176b47;margin-top:8px}.no-announcements{padding:16px;background:#f3f6f1;border-radius:8px}
        .membership-note{margin-top:20px;padding:16px;background:#fff8e8;border-left:4px solid #c18a22;line-height:1.7}.membership-card-section{margin-top:30px}.membership-card{color:#fff;background:linear-gradient(125deg,#073c2a,#116443 58%,#d0a84c);border-radius:16px;padding:24px;min-height:250px;box-shadow:0 12px 30px #102d1a24;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;max-width:700px}
        .card-top{display:flex;align-items:center;gap:12px}.card-emblem{width:44px;height:44px;border:2px solid #e6c66f;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#f2d78a}.card-top strong,.card-top small{display:block}.card-top strong{font-size:13px;letter-spacing:1px}.card-top small{font-size:9px;opacity:.8;margin-top:4px;letter-spacing:1px}.card-approved{margin-left:auto;font-size:9px;letter-spacing:1px;border:1px solid #e6c66f;color:#ffe7a3;padding:6px 8px;border-radius:20px}
        .card-main{display:flex;gap:18px;align-items:center;margin:26px 0}.card-avatar{width:78px;height:94px;border:1px solid #ffffff88;border-radius:8px;display:grid;place-items:center;font-weight:800;color:#f2d78a;background:#ffffff12}.card-details small{display:block;font-size:8px;letter-spacing:1.5px;opacity:.8}.card-details h2{font-size:20px;margin:5px 0 12px}.card-details strong{display:block;font-size:14px;letter-spacing:1px;margin-top:4px}.card-location{font-size:11px;margin-top:9px;opacity:.9}.card-bottom{border-top:1px solid #ffffff55;padding-top:12px;display:flex;justify-content:space-between;gap:8px;font-size:8px;letter-spacing:1px}.print-card{margin-top:16px;width:min(100%,700px)}.card-note{font-size:12px;color:#607269}
        @media(max-width:760px){.member-dashboard-shell{padding:12px 10px 35px}.member-space{padding:20px 15px;border-radius:13px}.member-heading{display:block}.member-portal-tag{display:inline-block;margin-top:13px}.member-navigation{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:9px}.member-navigation a{font-size:10px;min-height:40px;padding:8px}.card-main{gap:12px}.card-details h2{font-size:17px}.card-top strong{font-size:10px}}
        @media print{@page{size:landscape;margin:10mm}body *{visibility:hidden!important}#nyfb-membership-card,#nyfb-membership-card *{visibility:visible!important}#nyfb-membership-card{position:absolute;left:0;top:0;width:90mm;min-height:57mm;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      `}</style>   </main>
  );
}
