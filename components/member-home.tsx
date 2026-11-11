"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Member = { member_number:string; referral_code:string; full_name:string; status:string; state:string; lga:string; ward:string|null; reviewed_at:string|null };
type Announcement = { id:string; title:string; body:string; audience:string; target_state:string|null; published_at:string|null; created_at:string };

export default function MemberHome() {
  const [member,setMember]=useState<Member|null>(null);
  const [announcements,setAnnouncements]=useState<Announcement[]>([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const [stats,setStats]=useState({points:0,tasks:0,events:0,referrals:0,verifiedReferrals:0,wallet:0});
  const [avatarUrl,setAvatarUrl]=useState<string|null>(null);
  const [uploadingPhoto,setUploadingPhoto]=useState(false);
  const [photoMessage,setPhotoMessage]=useState("");
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const supabase=createClient();
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError||!user){window.location.replace("/login");return;}
        const lagosParts=new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
        const lagosDay=`${lagosParts.find(part=>part.type==="year")?.value}-${lagosParts.find(part=>part.type==="month")?.value}-${lagosParts.find(part=>part.type==="day")?.value}`;
        await supabase.from("reward_transactions").insert({user_id:user.id,amount_ngn:250,reward_type:"daily_login",description:"Daily NYFB member login reward",source_key:lagosDay});
        const [memberResult,announcementResult,taskResult,attendanceResult,referralResult,rewardResult]=await Promise.all([
          supabase.from("members").select("member_number,referral_code,full_name,status,state,lga,ward,reviewed_at").eq("user_id",user.id).maybeSingle(),
          supabase.from("announcements").select("id,title,body,audience,target_state,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(20),
          supabase.from("task_submissions").select("id,status,points_awarded").eq("user_id",user.id),
          supabase.from("event_attendance").select("id,checked_in_at,points_awarded").eq("user_id",user.id),
          supabase.from("member_referrals").select("id,status").eq("referrer_user_id",user.id),
          supabase.from("reward_transactions").select("amount_ngn,reward_type,created_at").eq("user_id",user.id)
        ]);
        if(memberResult.error)throw memberResult.error;
        if(active)setMember(memberResult.data as Member|null);
        if(active){const {data:{publicUrl}}=supabase.storage.from("nyfb-member-photos").getPublicUrl(`${user.id}/profile`);setAvatarUrl(`${publicUrl}?v=${Date.now()}`);}
        if(active&&!announcementResult.error)setAnnouncements((announcementResult.data||[]) as Announcement[]);
        if(active){
          const tasks=taskResult.error?[]:taskResult.data||[];
          const attendance=attendanceResult.error?[]:attendanceResult.data||[];
          const referrals=referralResult.error?[]:referralResult.data||[];
          setStats({
            points:tasks.reduce((sum,row)=>sum+(row.status==="approved"?Number(row.points_awarded||0):0),0)+attendance.reduce((sum,row)=>sum+(row.checked_in_at?Number(row.points_awarded||0):0),0),
            tasks:tasks.filter(row=>row.status==="approved").length,
            events:attendance.filter(row=>Boolean(row.checked_in_at)).length,
            referrals:referrals.length,
            verifiedReferrals:referrals.filter(row=>row.status==="verified").length,
            wallet:rewardResult.error?0:(rewardResult.data||[]).reduce((sum,row)=>sum+Number(row.amount_ngn||0),0)
          });
        }
      }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load your membership.");}
      finally{if(active)setBusy(false);}
    })();
    return()=>{active=false;};
  },[]);

  async function signOut(){const supabase=createClient();await supabase.auth.signOut();window.location.assign("/");}

  async function uploadProfilePhoto(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    if(!file)return;
    setPhotoMessage("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setPhotoMessage("Choose a JPG, PNG or WEBP image.");event.target.value="";return;}
    if(file.size>5*1024*1024){setPhotoMessage("The image must be 5MB or smaller.");event.target.value="";return;}
    setUploadingPhoto(true);
    try{
      const supabase=createClient();
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error("Please sign in again to upload your picture.");
      const path=`${user.id}/profile`;
      const {error:uploadError}=await supabase.storage.from("nyfb-member-photos").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
      if(uploadError)throw uploadError;
      const {data:{publicUrl}}=supabase.storage.from("nyfb-member-photos").getPublicUrl(path);
      setAvatarUrl(publicUrl+`?v=${Date.now()}`);
      setPhotoMessage("Profile picture updated successfully.");
    }catch(e){console.error("NYFB profile photo upload failed:",e);setPhotoMessage(e instanceof Error?e.message:"Unable to upload your picture. Check your connection and try again.");}
    finally{setUploadingPhoto(false);event.target.value="";}
  }

  return (
    <main className="member-dashboard-shell">
      <section className="member-space">
        <div className="member-actions"><Link className="back-home" href="/">← NYFB home</Link><button onClick={signOut} className="back-home sign-out">Sign out</button></div>

        <div className="brand member-brand" style={{marginTop:24}}><b>NY</b><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div>
        <button className="member-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="member-sidebar" onClick={()=>setMenuOpen(v=>!v)}><span>☰</span> Dashboard menu <span className="menu-toggle-state">{menuOpen?"Close":"Open"}</span></button>
        <div className="member-dashboard-layout">
          <aside className={"member-sidebar"+(menuOpen?" is-open":"")} id="member-sidebar">
            <div className="sidebar-label">MEMBER MENU</div>
            <a href="#dashboard" onClick={()=>setMenuOpen(false)}><span>⌂</span> Overview</a>
            <a href="#profile" onClick={()=>setMenuOpen(false)}><span>◉</span> My profile</a>
            <a href="#membership-card" onClick={()=>setMenuOpen(false)}><span>▣</span> Membership card</a>
            <a href="#rewards" onClick={()=>setMenuOpen(false)}><span>₦</span> Rewards &amp; referrals</a>
            <Link href="/programmes" onClick={()=>setMenuOpen(false)}><span>▤</span> Programmes &amp; events</Link>
            <a href="#announcements" onClick={()=>setMenuOpen(false)}><span>◷</span> Announcements</a>
            <Link href="/forgot-password" onClick={()=>setMenuOpen(false)}><span>⚙</span> Account settings</Link>
            <a href="mailto:nigerianyouthforbat@gmail.com" onClick={()=>setMenuOpen(false)}><span>✉</span> Help &amp; support</a>
            <div className="sidebar-footer">NIGERIAN YOUTH FOR BAT<br/><small>MEMBER PORTAL</small></div>
          </aside>
          <div className="member-main-content">
        <div className="member-heading"><div><small>MEMBER PORTAL</small><h1 id="dashboard">Your NYFB dashboard</h1><p>Manage your membership, stay informed and take part in NYFB programmes.</p></div><span className="member-portal-tag">SECURE MEMBER AREA</span></div>
        {busy?<p>Loading your membership details…</p>:error?<div className="form-message form-error">{error}</div>:!member?<p>No membership record was found for this account.</p>:<>
          <div className="member-welcome-row"><div className="member-avatar-wrap">{avatarUrl?<img src={avatarUrl} alt="Your profile" className="member-avatar-photo"/>:<span className="member-avatar-placeholder">{member.full_name.trim().charAt(0).toUpperCase()}</span>}</div><div className="member-welcome-copy"><p>Welcome, {member.full_name}. Here is your current membership record.</p><label className="photo-upload-button">{uploadingPhoto?"Uploading picture…":"Upload profile picture"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePhoto} disabled={uploadingPhoto}/></label><small className="photo-help">JPG, PNG or WEBP · Maximum 5MB</small>{photoMessage&&<small className="photo-message" role="status">{photoMessage}</small>}</div></div>
          <div className="member-programme-link"><Link href="/programmes">Explore events, welfare, volunteer tasks and support groups →</Link></div><div className="member-summary" id="profile"><small>MEMBERSHIP NUMBER</small><h2>{member.member_number}</h2><p><strong>Status:</strong> <span className={"status status-"+member.status}>{member.status.toUpperCase()}</span></p><p><strong>Location:</strong> {member.lga}, {member.state}</p>{member.ward&&<p><strong>Ward:</strong> {member.ward}</p>}</div>
          <section className="member-activity" id="rewards" aria-label="Your participation summary"><div><small>REWARD BALANCE</small><strong>₦{stats.wallet.toLocaleString("en-NG")}</strong><span>Approved cash rewards</span></div><div><small>RECOGNITION POINTS</small><strong>{stats.points.toLocaleString("en-NG")}</strong><span>Verified participation</span></div><div><small>COMPLETED TASKS</small><strong>{stats.tasks}</strong><span>Approved submissions</span></div><div><small>EVENTS ATTENDED</small><strong>{stats.events}</strong><span>Confirmed check-ins</span></div><div><small>REFERRALS</small><strong>{stats.referrals}</strong><span>{stats.verifiedReferrals} verified</span></div></section>
          {member.status==="approved"&&<section className="member-referral-box"><div><small>YOUR PERSONAL INVITATION CODE</small><h2>{member.referral_code}</h2><p>Earn ₦500 for each directly referred member after their membership is approved. Earn ₦100 when a member referred by your direct referral is approved.</p></div><button type="button" onClick={()=>navigator.clipboard.writeText(window.location.origin+"/join?ref="+member.referral_code)}>Copy referral link</button></section>}
          <section className="member-announcements" id="announcements"><div className="member-section-head"><div><small>OFFICIAL UPDATES</small><h2>Announcements</h2></div><span>{announcements.length} updates</span></div>
            {announcements.length===0?<p className="no-announcements">There are no new announcements at the moment.</p>:announcements.map(item=><article key={item.id}><div className="announcement-date">{new Date(item.published_at||item.created_at).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div><h3>{item.title}</h3><p>{item.body}</p>{item.audience==="state"&&item.target_state&&<small>For members in {item.target_state}</small>}</article>)}
          </section>
          {member.status==="approved"?(
            <section className="membership-card-section" id="membership-card">
              <div className="membership-card" id="nyfb-membership-card">
                <div className="card-top"><div className="card-emblem">NY</div><div><strong>NIGERIAN YOUTH FOR BAT</strong><small>OFFICIAL MEMBERSHIP CARD</small></div><span className="card-approved">APPROVED</span></div>
                <div className="card-main"><div className="card-avatar">{avatarUrl?<img src={avatarUrl} alt="Member profile" />:"NYFB"}</div><div className="card-details"><small>MEMBER NAME</small><h2>{member.full_name}</h2><small>MEMBERSHIP ID</small><strong>{member.member_number}</strong><div className="card-location">{member.ward?member.ward+", ":""}{member.lga}, {member.state}</div></div></div>
                <div className="card-bottom"><span>VALID NYFB MEMBER</span><span>{member.reviewed_at?"ISSUED "+new Date(member.reviewed_at).toLocaleDateString("en-NG"):"OFFICIAL RECORD"}</span></div>
              </div>
              <button className="btn print-card" onClick={()=>window.print()}>Print / Save membership card</button>
              <p className="card-note">You can print this card or choose “Save as PDF” in your browser’s print options.</p>
            </section>
          ):<p className="membership-note">{member.status==="pending"?"Your application is awaiting review. Your official membership card will become available here once it is approved.":member.status==="rejected"?"Your application was not approved. Please contact your NYFB coordinator for further guidance.":"Your membership is currently suspended. Please contact the NYFB administration for assistance."}</p>}
        </>}
          </div>
        </div>
      </section>
      <style jsx>{`
        .member-dashboard-shell{min-height:100vh;background:radial-gradient(ellipse at 15% 0%,#1b6a3a 0%,#073d25 48%,#032719 100%);padding:28px 24px 60px;color:#f4fff6}
        .member-space{max-width:1180px;width:100%;margin:0 auto;background:linear-gradient(145deg,#064329,#04331f 65%,#022819);border:1px solid #2d8752;border-radius:18px;padding:28px 34px;box-shadow:0 22px 65px #00170d88;color:#f4fff6}
        .member-actions{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid #277449}
        .member-actions .back-home{font-size:11px;color:#b8f5c9;font-weight:700}.sign-out{border:1px solid #4a9d69;background:#0c5934;color:#fff;padding:8px 13px;border-radius:7px;cursor:pointer}
        .member-brand{margin:22px 0 18px!important}
        .member-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:14px 0 24px}
        .member-heading>div>small{font-size:9px;font-weight:800;letter-spacing:1.8px;color:#a8edbb}
        .member-heading h1{font:800 clamp(27px,3.5vw,38px)/1.12 Manrope;margin:8px 0;color:#fff;letter-spacing:-1.3px}
        .member-heading p{font-size:12px;color:#d6f3df;margin:0;line-height:1.7}
        .member-portal-tag{font-size:8px;letter-spacing:1px;font-weight:800;color:#eaffef;background:#0c5934;border:1px solid #52a875;padding:9px 12px;border-radius:20px;white-space:nowrap}
        .member-menu-toggle{display:none}
        .member-dashboard-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px;align-items:start;margin-top:20px}
        .member-sidebar{position:sticky;top:18px;display:flex;flex-direction:column;gap:6px;padding:14px 11px;background:#022b1a;border:1px solid #267447;border-radius:12px;min-height:420px}
        .sidebar-label{font-size:9px;letter-spacing:1.5px;font-weight:900;color:#a9edbb;padding:8px 10px 12px}
        .member-sidebar a{display:flex;align-items:center;gap:11px;min-height:43px;padding:10px;border-radius:8px;color:#e8ffed;font-size:11px;font-weight:700;text-decoration:none;border:1px solid transparent;transition:background .18s,color .18s}
        .member-sidebar a span{display:grid;place-items:center;width:23px;height:23px;border-radius:6px;background:#0b5632;color:#b8f5c9;font-size:13px;font-weight:900}
        .member-sidebar a:hover,.member-sidebar a:focus{background:#a9edbb;color:#04331f;border-color:#d4ffe0}
        .member-sidebar a:hover span,.member-sidebar a:focus span{background:#04331f;color:#d4ffe0}
        .sidebar-footer{margin-top:auto;padding:16px 10px 7px;border-top:1px solid #277449;color:#d9f8e2;font-size:8px;line-height:1.8;letter-spacing:1px;font-weight:900}
        .sidebar-footer small{color:#a9edbb;font-size:8px}
        .member-main-content{min-width:0}
        .member-welcome-row{display:flex;align-items:center;gap:17px;margin:18px 0;padding:17px;background:#0a5632;border:1px solid #388a58;border-radius:12px}.member-avatar-wrap{width:76px;height:76px;flex:0 0 76px;border-radius:50%;overflow:hidden;border:2px solid #b7f3c7;background:#eaffef;display:grid;place-items:center}.member-avatar-photo{width:100%;height:100%;object-fit:cover}.member-avatar-placeholder{font-size:30px;font-weight:900;color:#07502e}.member-welcome-copy p{margin:0 0 10px;color:#fff;font-size:13px}.photo-upload-button{display:inline-flex;align-items:center;justify-content:center;background:#b9f3c8;color:#04331f;padding:9px 13px;border-radius:7px;font-size:10px;font-weight:800;cursor:pointer}.photo-upload-button input{display:none}.photo-help,.photo-message{display:block;font-size:9px;color:#d7f5df;margin-top:6px}.photo-message{color:#c5ffd4}
        .member-activity{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:18px}.member-activity>div{padding:17px;border:1px solid #277449;border-radius:10px;background:#0a5632}.member-activity small,.member-activity strong,.member-activity span{display:block}.member-activity small{font-size:8px;letter-spacing:1px;color:#d5f4df;font-weight:800}.member-activity strong{font-size:26px;color:#b8f5c9;margin:9px 0 4px}.member-activity span{font-size:9px;color:#d1eadd}
        .member-referral-box{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-top:18px;padding:19px;background:#022b1a;border:1px solid #388a58;border-radius:10px}.member-referral-box small{font-size:8px;letter-spacing:1.2px;color:#b8f5c9;font-weight:800}.member-referral-box h2{font-size:23px;letter-spacing:2px;margin:7px 0;color:#fff}.member-referral-box p{font-size:11px;line-height:1.7;color:#e1f3e6;margin:0}.member-referral-box button{flex:0 0 auto;background:#b8f5c9;color:#04331f;border:0;border-radius:7px;padding:12px 15px;font-size:10px;font-weight:800;cursor:pointer}.member-programme-link{margin-top:18px}.member-programme-link a{display:block;padding:15px 18px;border-radius:9px;background:linear-gradient(100deg,#a8edbb,#e5ffeb);color:#04331f;font-size:12px;font-weight:800}
        .member-summary{background:#0a5632;border:1px solid #388a58;padding:23px;margin-top:22px;border-radius:12px}
        .member-summary small{color:#d6f3df;letter-spacing:1px;font-size:9px}.member-summary h2{font-size:29px;margin:8px 0 18px;color:#c4f7d0}.status{font-weight:800}.status-approved{color:#b7f3c7}.status-pending{color:#fff0a8}.status-rejected,.status-suspended{color:#ffb7b7}
        .member-announcements{margin-top:30px}.member-section-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px}.member-section-head small{font-size:9px;letter-spacing:1.4px;color:#b8f5c9;font-weight:800}.member-section-head h2{font:800 22px Manrope;margin:5px 0 0;color:#fff}.member-section-head>span{font-size:10px;color:#d1eadd}
        .member-announcements article{padding:17px 0;border-bottom:1px solid #277449}.announcement-date{font-size:9px;color:#d1eadd}.member-announcements article h3{font:700 15px Manrope,Arial;margin:7px 0;color:#fff}.member-announcements article p,.no-announcements{font-size:12px;line-height:1.8;color:#e1f3e6;white-space:pre-wrap;margin:0}.member-announcements article>small{display:block;font-size:9px;color:#b8f5c9;margin-top:8px}.no-announcements{padding:16px;background:#0a5632;border-radius:8px}
        .membership-note{margin-top:20px;padding:16px;background:#0a5632;border:1px solid #388a58;border-left:4px solid #b8f5c9;color:#f0fff3;line-height:1.7}.membership-card-section{margin-top:30px}.membership-card{box-sizing:border-box;color:#fff;background:linear-gradient(125deg,#022819,#07502e 58%,#1b8a4a);border:1px solid #b8f5c9;border-radius:12px;padding:18px;min-height:0;aspect-ratio:85.6/54;width:min(100%,540px);box-shadow:0 12px 30px #00170d88;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
        .card-top{display:flex;align-items:center;gap:12px}.card-emblem{width:44px;height:44px;border:2px solid #c4f7d0;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#d8ffe1}.card-top strong,.card-top small{display:block}.card-top strong{font-size:13px;letter-spacing:1px}.card-top small{font-size:9px;opacity:.85;margin-top:4px;letter-spacing:1px}.card-approved{margin-left:auto;font-size:9px;letter-spacing:1px;border:1px solid #c4f7d0;color:#eaffef;padding:6px 8px;border-radius:20px}
        .card-main{display:flex;gap:18px;align-items:center;margin:26px 0}.card-avatar{width:78px;height:94px;border:1px solid #ffffff88;border-radius:8px;display:grid;place-items:center;overflow:hidden;font-weight:800;color:#d8ffe1;background:#ffffff12}.card-avatar img{width:100%;height:100%;object-fit:cover}.card-details small{display:block;font-size:8px;letter-spacing:1.5px;opacity:.85}.card-details h2{font-size:20px;margin:5px 0 12px}.card-details strong{display:block;font-size:14px;letter-spacing:1px;margin-top:4px}.card-location{font-size:11px;margin-top:9px;opacity:.9}.card-bottom{border-top:1px solid #ffffff55;padding-top:12px;display:flex;justify-content:space-between;gap:8px;font-size:8px;letter-spacing:1px}.print-card{margin-top:16px;width:min(100%,700px);background:#b8f5c9;border-color:#d4ffe0;color:#04331f}.card-note{font-size:12px;color:#d6f3df}
        @media(max-width:760px){.member-dashboard-layout{display:block;margin-top:12px}.member-menu-toggle{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;margin:0 0 10px;background:#b8f5c9;color:#04331f;border:0;border-radius:8px;font-size:12px;font-weight:900;text-align:left}.member-menu-toggle>span:first-child{font-size:17px}.menu-toggle-state{margin-left:auto;font-size:10px}.member-sidebar{display:none;position:static;min-height:0;margin-bottom:16px}.member-sidebar.is-open{display:flex}.sidebar-footer{margin-top:8px}.member-activity{grid-template-columns:repeat(2,minmax(0,1fr))}.member-referral-box{display:block}.member-referral-box button{margin-top:12px}.member-dashboard-shell{padding:12px 10px 35px}.member-space{padding:20px 15px;border-radius:13px}.member-heading{display:block}.member-portal-tag{display:inline-block;margin-top:13px}.member-navigation{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:9px}.member-navigation a{font-size:10px;min-height:40px;padding:8px}.card-main{gap:12px}.card-details h2{font-size:17px}.card-top strong{font-size:10px}.member-welcome-row{align-items:flex-start;padding:13px}.member-avatar-wrap{width:60px;height:60px;flex-basis:60px}}
        @media print{@page{size:85.6mm 54mm;margin:0}html,body{width:85.6mm!important;height:54mm!important;margin:0!important;padding:0!important;background:#fff!important}body *{visibility:hidden!important}#nyfb-membership-card,#nyfb-membership-card *{visibility:visible!important}#nyfb-membership-card{position:fixed!important;left:0!important;top:0!important;width:85.6mm!important;height:54mm!important;min-height:54mm!important;max-width:none!important;aspect-ratio:auto!important;box-sizing:border-box!important;margin:0!important;padding:3.5mm!important;border-radius:0!important;border:0.3mm solid #b8f5c9!important;box-shadow:none!important;overflow:hidden!important;break-inside:avoid!important;page-break-inside:avoid!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}.card-top{gap:2mm}.card-emblem{width:10mm;height:10mm;flex:0 0 10mm}.card-top strong{font-size:8pt}.card-top small,.card-approved{font-size:5.5pt}.card-main{gap:3mm;margin:3mm 0}.card-avatar{width:17mm;height:22mm;flex:0 0 17mm}.card-details h2{font-size:11pt;margin:1mm 0 2mm}.card-details strong{font-size:8pt}.card-details small,.card-location,.card-bottom{font-size:5.5pt}.card-bottom{padding-top:2mm}.membership-card-section,.print-card,.card-note{display:none!important}}
      `}</style>   </main>
  );
}
