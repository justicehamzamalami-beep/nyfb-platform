"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "@/components/notification-center";

const NYFB_LOGO_URL = "https://brpqtdqejvlxsyzlyrfv.supabase.co/storage/v1/object/public/nyfb-site-media/website/logo/15fe9ad9-01c7-4bb6-873e-bc8ba989018d.jpg";
const APC_LOGO_URL = "https://cdn.legit.ng/images/1120/c80c390d3b880d90.jpeg?v=1";

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
  const [referralMessage,setReferralMessage]=useState("");
  const [sendingCard,setSendingCard]=useState(false);
  const [cardEmailMessage,setCardEmailMessage]=useState("");

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const supabase=createClient();
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError||!user){window.location.replace("/login");return;}
        const memberResult=await supabase.from("members").select("member_number,referral_code,full_name,status,state,lga,ward,reviewed_at").eq("user_id",user.id).maybeSingle();
        if(memberResult.error)throw memberResult.error;
        if(memberResult.data?.status==="approved"){
          const lagosParts=new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
          const lagosDay=`${lagosParts.find(part=>part.type==="year")?.value}-${lagosParts.find(part=>part.type==="month")?.value}-${lagosParts.find(part=>part.type==="day")?.value}`;
          const {error:rewardInsertError}=await supabase.from("reward_transactions").insert({user_id:user.id,amount_ngn:250,reward_type:"daily_login",description:"Daily NYFB member login reward",source_key:lagosDay});
          if(rewardInsertError&&rewardInsertError.code!=="23505")console.warn("Daily login reward was not recorded:",rewardInsertError.message);
        }
        const [announcementResult,taskResult,attendanceResult,referralResult,rewardResult]=await Promise.all([
          supabase.from("announcements").select("id,title,body,audience,target_state,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(20),
          supabase.from("task_submissions").select("id,status,points_awarded").eq("user_id",user.id),
          supabase.from("event_attendance").select("id,checked_in_at,points_awarded").eq("user_id",user.id),
          supabase.from("member_referrals").select("id,status").eq("referrer_user_id",user.id),
          supabase.from("reward_transactions").select("amount_ngn,reward_type,created_at").eq("user_id",user.id)
        ]);
        if(memberResult.error)throw memberResult.error;
        if(active)setMember(memberResult.data as Member|null);
        if(active){const {data:photoBlob}=await supabase.storage.from("nyfb-member-photos").download(`${user.id}/profile`);if(photoBlob)setAvatarUrl(URL.createObjectURL(photoBlob));}
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

  useEffect(()=>{let channel:any;let timer:ReturnType<typeof setTimeout>|undefined;(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return;const refresh=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>window.location.reload(),350);};channel=supabase.channel("nyfb-member-live-"+user.id).on("postgres_changes",{event:"*",schema:"public",table:"members",filter:"user_id=eq."+user.id},refresh).on("postgres_changes",{event:"*",schema:"public",table:"announcements"},refresh).on("postgres_changes",{event:"*",schema:"public",table:"task_submissions",filter:"user_id=eq."+user.id},refresh).on("postgres_changes",{event:"*",schema:"public",table:"event_attendance",filter:"user_id=eq."+user.id},refresh).on("postgres_changes",{event:"*",schema:"public",table:"member_referrals",filter:"referrer_user_id=eq."+user.id},refresh).on("postgres_changes",{event:"*",schema:"public",table:"reward_transactions",filter:"user_id=eq."+user.id},refresh).subscribe();})();return()=>{if(timer)clearTimeout(timer);if(channel){void createClient().removeChannel(channel);}};},[]);

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
      const {data:photoBlob,error:photoError}=await supabase.storage.from("nyfb-member-photos").download(path);
      if(photoError||!photoBlob)throw photoError||new Error("Photo uploaded but could not be loaded.");
      setAvatarUrl(URL.createObjectURL(photoBlob));
      setPhotoMessage("Profile picture updated successfully.");
    }catch(e){console.error("NYFB profile photo upload failed:",e);setPhotoMessage(e instanceof Error?e.message:"Unable to upload your picture. Check your connection and try again.");}
    finally{setUploadingPhoto(false);event.target.value="";}
  }

  async function emailMembershipCard(){
    setSendingCard(true);
    setCardEmailMessage("");
    try{
      const supabase=createClient();
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error("Please sign in again and try once more.");
      const {data,error}=await supabase.functions.invoke("send-member-id-card",{body:{}});
      if(error)throw new Error(error.message||"Unable to send your ID card.");
      if(data?.error)throw new Error(data.error);
      setCardEmailMessage("Your digital ID card has been sent to "+(data?.recipient||"your registered email address")+". Please check your Gmail inbox and spam folder.");
    }catch(e){
      setCardEmailMessage(e instanceof Error?e.message:"Unable to email your ID card. Please try again.");
    }finally{
      setSendingCard(false);
    }
  }

  async function copyReferralLink(){
    if(!member?.referral_code)return;
    const link="https://nigerianyouthforbat.org/join?ref="+member.referral_code;
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(link);
      }else{
        const input=document.createElement("textarea");
        input.value=link;input.setAttribute("readonly","");
        input.style.position="fixed";input.style.opacity="0";input.style.left="-9999px";
        document.body.appendChild(input);input.select();input.setSelectionRange(0,input.value.length);
        const copied=document.execCommand("copy");document.body.removeChild(input);
        if(!copied)throw new Error("Copy command was blocked");
      }
      setReferralMessage("Referral link copied. Share it with your friends.");
    }catch{
      setReferralMessage("Copy was blocked. Please copy this link manually: "+link);
    }
  }

  return (
    <main className="member-dashboard-shell">
      <section className="member-space">
        <div className="member-actions"><Link className="back-home" href="/">← NYFB home</Link><button onClick={signOut} className="back-home sign-out">Sign out</button></div>

        <div className="brand member-brand" style={{marginTop:24}}><img src={NYFB_LOGO_URL} alt="NYFB official logo" /><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div>
        <button className="member-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="member-sidebar" onClick={()=>setMenuOpen(v=>!v)}><span>☰</span> Dashboard menu <span className="menu-toggle-state">{menuOpen?"Close":"Open"}</span></button>
        <NotificationCenter />
        <div className="member-dashboard-layout">
          <aside hidden={!menuOpen} aria-hidden={!menuOpen} className={"member-sidebar"+(menuOpen?" is-open":"")} id="member-sidebar">
            <div className="sidebar-label">MEMBER MENU</div>
            <Link href="/member" onClick={()=>setMenuOpen(false)}><span>⌂</span> Overview</Link>
            <Link href="/member/profile" onClick={()=>setMenuOpen(false)}><span>◉</span> My profile</Link>
            <Link href="/member/bank-details" onClick={()=>setMenuOpen(false)}><span>₦</span> Bank account information</Link>
            <Link href="/member/card" onClick={()=>setMenuOpen(false)}><span>▣</span> Membership card</Link>
            <Link href="/member/rewards" onClick={()=>setMenuOpen(false)}><span>₦</span> Rewards &amp; referrals</Link>
            <Link href="/programmes" onClick={()=>setMenuOpen(false)}><span>▤</span> Programmes &amp; events</Link>
            <Link href="/member/announcements" onClick={()=>setMenuOpen(false)}><span>◷</span> Announcements</Link>
            <Link href="/member/settings" onClick={()=>setMenuOpen(false)}><span>⚙</span> Account settings</Link>
            <Link href="/member/support" onClick={()=>setMenuOpen(false)}><span>✉</span> Help &amp; support</Link>
            <div className="sidebar-footer">NIGERIAN YOUTH FOR BAT<br/><small>MEMBER PORTAL</small></div>
          </aside>
          <div className="member-main-content">
        <div className="member-heading"><div><small>MEMBER PORTAL</small><h1 id="dashboard">Your NYFB dashboard</h1><p>Manage your membership, stay informed and take part in NYFB programmes.</p></div><span className="member-portal-tag">SECURE MEMBER AREA</span></div>
        {busy?<p>Loading your membership details…</p>:error?<div className="form-message form-error">{error}</div>:!member?<p>No membership record was found for this account.</p>:<>
          <div className="member-welcome-row"><div className="member-avatar-wrap">{avatarUrl?<img src={avatarUrl} alt="Your profile" className="member-avatar-photo"/>:<span className="member-avatar-placeholder">{member.full_name.trim().charAt(0).toUpperCase()}</span>}</div><div className="member-welcome-copy"><p>Welcome, {member.full_name}. Here is your current membership record.</p><label className="photo-upload-button">{uploadingPhoto?"Uploading picture…":"Upload profile picture"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePhoto} disabled={uploadingPhoto}/></label><small className="photo-help">JPG, PNG or WEBP · Maximum 5MB</small>{photoMessage&&<small className="photo-message" role="status">{photoMessage}</small>}</div></div>
          <div className="member-programme-link"><Link href="/programmes">Explore events, welfare, volunteer tasks and support groups →</Link></div><div className="member-summary" id="profile"><small>MEMBERSHIP NUMBER</small><h2>{member.member_number}</h2><p><strong>Status:</strong> <span className={"status status-"+member.status}>{member.status.toUpperCase()}</span></p><p><strong>Location:</strong> {member.lga}, {member.state}</p>{member.ward&&<p><strong>Ward:</strong> {member.ward}</p>}</div>
          <section className="member-activity" id="rewards" aria-label="Your participation summary"><div><small>REWARD BALANCE</small><strong>₦{stats.wallet.toLocaleString("en-NG")}</strong><span>Approved cash rewards</span></div><div><small>RECOGNITION POINTS</small><strong>{stats.points.toLocaleString("en-NG")}</strong><span>Verified participation</span></div><div><small>COMPLETED TASKS</small><strong>{stats.tasks}</strong><span>Approved submissions</span></div><div><small>EVENTS ATTENDED</small><strong>{stats.events}</strong><span>Confirmed check-ins</span></div><div><small>REFERRALS</small><strong>{stats.referrals}</strong><span>{stats.verifiedReferrals} verified</span></div></section>
          {member.status==="approved"&&<section className="member-referral-box"><div><small>YOUR PERSONAL INVITATION CODE</small><h2>{member.referral_code}</h2><p>Earn ₦500 for each directly referred member after their membership is approved. Earn ₦100 when a member referred by your direct referral is approved.</p></div><button type="button" onClick={copyReferralLink}>Copy referral link</button>{referralMessage&&<p className="referral-copy-message" role="status">{referralMessage}</p>}</section>}
          <section className="member-announcements" id="announcements"><div className="member-section-head"><div><small>OFFICIAL UPDATES</small><h2>Announcements</h2></div><span>{announcements.length} updates</span></div>
            {announcements.length===0?<p className="no-announcements">There are no new announcements at the moment.</p>:announcements.map(item=><article key={item.id}><div className="announcement-date">{new Date(item.published_at||item.created_at).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div><h3>{item.title}</h3><p>{item.body}</p>{item.audience==="state"&&item.target_state&&<small>For members in {item.target_state}</small>}</article>)}
          </section>
          {member.status==="approved"?(
            <section className="membership-card-section" id="membership-card">
              <div className="membership-card" id="nyfb-membership-card">
                <div className="card-top">
                  <div className="card-logos">
                    <div className="card-emblem"><img src={NYFB_LOGO_URL} alt="NYFB official logo" crossOrigin="anonymous" /></div>
                    <div className="apc-emblem"><img src={APC_LOGO_URL} alt="All Progressives Congress official logo" /></div>
                  </div>
                  <div className="card-brand-copy"><strong>NIGERIAN YOUTH FOR BAT</strong><small>OFFICIAL MEMBER IDENTIFICATION</small></div>
                  <span className="card-approved"><i/> VERIFIED</span>
                </div>
                <div className="card-role">APC AMBASSADOR</div>
                <div className="card-main">
                  <div className="card-avatar">{avatarUrl?<img src={avatarUrl} alt="Member profile" />:<span>{member.full_name.trim().charAt(0).toUpperCase()}</span>}</div>
                  <div className="card-details">
                    <small className="card-eyebrow">OFFICIAL MEMBERSHIP RECORD</small>
                    <small>FULL NAME</small><h2>{member.full_name}</h2>
                    <div className="card-id-block"><small>MEMBERSHIP ID</small><strong>{member.member_number}</strong></div>
                    <div className="card-location"><span>AREA OF MEMBERSHIP</span>{member.ward?member.ward+", ":""}{member.lga}, {member.state}</div>
                  </div>
                </div>
                <div className="card-bottom"><span><b>NYFB</b> · APC AMBASSADOR</span><span>{member.reviewed_at?"ISSUED "+new Date(member.reviewed_at).toLocaleDateString("en-NG"):"OFFICIAL RECORD"}</span></div>
              </div>

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
        .membership-note{margin-top:20px;padding:16px;background:#0a5632;border:1px solid #388a58;border-left:4px solid #b8f5c9;color:#f0fff3;line-height:1.7}.membership-card-section{margin-top:30px}.membership-card{position:relative;isolation:isolate;box-sizing:border-box;color:#fff;background:radial-gradient(circle at 91% 12%,#c9a84b33 0 18%,transparent 18.5%),linear-gradient(118deg,#031d16 0%,#06452c 48%,#087447 100%);border:1px solid #d5b75b;border-radius:17px;padding:20px 22px;min-height:0;aspect-ratio:85.6/54;width:min(100%,620px);box-shadow:0 18px 42px #00170d99;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}.membership-card:before{content:"";position:absolute;z-index:-1;inset:0;background:linear-gradient(135deg,transparent 0 57%,#d4b65a12 57.2% 68%,transparent 68.2%),radial-gradient(circle at 100% 100%,#b6e6c022,transparent 38%);pointer-events:none}.membership-card:after{content:"";position:absolute;z-index:-1;right:-55px;bottom:-125px;width:270px;height:270px;border:1px solid #d5b75b66;border-radius:50%;box-shadow:0 0 0 18px #d5b75b0b,0 0 0 38px #d5b75b0b}.card-top{display:flex;align-items:center;gap:12px;position:relative}.card-emblem{width:58px;height:58px;flex:0 0 58px;border:2px solid #d7bd69;border-radius:13px;display:grid;place-items:center;overflow:hidden;background:#fff;padding:4px;box-shadow:0 5px 15px #00190e66}.card-emblem img{width:100%;height:100%;object-fit:contain}.member-brand>img{width:52px;height:52px;object-fit:contain;background:#fff;border-radius:9px;padding:3px}.card-top strong,.card-top small{display:block}.card-top strong{font-size:clamp(10px,1.8vw,14px);letter-spacing:1.1px;font-weight:900}.card-top small{font-size:8px;opacity:.82;margin-top:5px;letter-spacing:1.4px}.card-approved{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:8px;letter-spacing:.7px;border:1px solid #d8c477;color:#fff6d7;background:#c6a64b20;padding:7px 9px;border-radius:20px;white-space:nowrap}.card-approved i{width:6px;height:6px;border-radius:50%;background:#d8c477;box-shadow:0 0 8px #f4db83}.card-main{display:flex;gap:18px;align-items:center;margin:15px 0;position:relative}.card-avatar{position:relative;width:91px;height:112px;flex:0 0 91px;border:2px solid #d5b75b;border-radius:10px;display:grid;place-items:center;overflow:hidden;font-weight:800;color:#d8ffe1;background:#ffffff12;box-shadow:0 7px 20px #00180f77}.card-avatar img{width:100%;height:100%;object-fit:cover}.card-avatar>span{font-size:15px}.card-avatar b{position:absolute;bottom:0;left:0;right:0;text-align:center;background:#03291fdd;color:#f7e9b0;font-size:7px;letter-spacing:1.5px;padding:4px}.card-details{min-width:0}.card-details small{display:block;font-size:7px;letter-spacing:1.4px;opacity:.82}.card-details .card-eyebrow{color:#e5cf83;font-size:7px;font-weight:800;margin-bottom:8px}.card-details h2{font-size:clamp(15px,2.5vw,22px);line-height:1.12;margin:4px 0 9px;overflow-wrap:anywhere}.card-id-block{display:inline-block;border-left:2px solid #d5b75b;padding:2px 0 2px 9px}.card-id-block strong{display:block;font-size:13px;letter-spacing:1.5px;margin-top:3px}.card-location{font-size:9px;margin-top:9px;opacity:.95;line-height:1.45}.card-location span{display:block;color:#e5cf83;font-size:7px;letter-spacing:1.1px;margin-bottom:2px}.card-bottom{border-top:1px solid #d5b75b88;padding-top:10px;display:flex;justify-content:space-between;gap:8px;font-size:7px;letter-spacing:.8px;color:#f5f1df}.card-bottom b{color:#e5cf83;font-size:9px}.print-card{margin-top:16px;width:min(100%,700px);background:#b8f5c9;border-color:#d4ffe0;color:#04331f}.card-note{font-size:12px;color:#d6f3df}
        @media(max-width:760px){.member-dashboard-layout{display:block;margin-top:12px}.member-menu-toggle{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;margin:0 0 10px;background:#b8f5c9;color:#04331f;border:0;border-radius:8px;font-size:12px;font-weight:900;text-align:left}.member-menu-toggle>span:first-child{font-size:17px}.menu-toggle-state{margin-left:auto;font-size:10px}.member-sidebar{display:none;position:static;min-height:0;margin-bottom:16px}.member-sidebar.is-open{display:flex}.sidebar-footer{margin-top:8px}.member-activity{grid-template-columns:repeat(2,minmax(0,1fr))}.member-referral-box{display:block}.member-referral-box button{margin-top:12px}.member-dashboard-shell{padding:12px 10px 35px}.member-space{padding:20px 15px;border-radius:13px}.member-heading{display:block}.member-portal-tag{display:inline-block;margin-top:13px}.member-navigation{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:9px}.member-navigation a{font-size:10px;min-height:40px;padding:8px}.card-main{gap:12px}.card-details h2{font-size:17px}.card-top strong{font-size:10px}.member-welcome-row{align-items:flex-start;padding:13px}.member-avatar-wrap{width:60px;height:60px;flex-basis:60px}}

        /* Final card layout overrides kept beside the component styles */
        .membership-card-section{width:100%!important;max-width:420px!important;margin:28px auto 0!important}
        .membership-card{width:min(100%,360px)!important;max-width:360px!important;min-height:0!important;aspect-ratio:54/85.6!important;box-sizing:border-box!important;padding:20px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;gap:12px!important;border:2px solid #d9bd69!important;border-radius:20px!important;background:radial-gradient(circle at 90% 5%,#167a4b 0%,transparent 35%),linear-gradient(155deg,#041f18 0%,#075035 58%,#03271c 100%)!important;box-shadow:0 18px 42px #06271d45!important;overflow:hidden!important;position:relative!important}
        .membership-card:before{content:"";position:absolute;inset:7px;border:1px solid #d9bd6955;border-radius:14px;pointer-events:none}
        .membership-card .card-top{display:flex!important;flex-direction:column!important;align-items:center!important;gap:9px!important;width:100%!important;text-align:center!important;position:relative!important;z-index:1!important}
        .membership-card .card-logos{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important}
        .membership-card .card-emblem,.membership-card .apc-emblem{width:48px!important;height:48px!important;flex:0 0 48px!important;border-radius:10px!important;background:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:4px!important;box-sizing:border-box!important}
        .membership-card .card-emblem img{width:100%!important;height:100%!important;object-fit:contain!important}
        .membership-card .apc-emblem{border:1px solid #e7e7e7!important;overflow:hidden!important}
        .membership-card .apc-emblem img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
        .membership-card .card-brand-copy strong{font-size:13px!important;letter-spacing:1px!important}
        .membership-card .card-brand-copy small{font-size:7px!important;letter-spacing:1.5px!important}
        .membership-card .card-approved{margin:0!important;font-size:8px!important}
        .membership-card .card-role{position:relative!important;z-index:1!important;text-align:center!important;color:#092b1d!important;background:linear-gradient(90deg,#d7b85b,#f5e5a7,#d7b85b)!important;border-radius:6px!important;padding:8px 10px!important;font-size:13px!important;font-weight:900!important;letter-spacing:2px!important}
        .membership-card .card-main{display:flex!important;flex-direction:column!important;gap:10px!important;align-items:center!important;text-align:center!important;margin:0!important;position:relative!important;z-index:1!important}
        .membership-card .card-avatar{width:88px!important;height:96px!important;flex:0 0 96px!important;border-radius:12px!important}
        .membership-card .card-details{width:100%!important;text-align:center!important}
        .membership-card .card-details h2{font-size:17px!important;margin:5px 0 9px!important}
        .membership-card .card-id-block{border-left:0!important;border-top:1px solid #d5b75b!important;padding:7px 0 0!important}
        .membership-card .card-id-block strong{font-size:14px!important}
        .membership-card .card-location{font-size:9px!important;margin-top:8px!important}
        .membership-card .card-bottom{position:relative!important;z-index:1!important;border-top:1px solid #d5b75b88!important;padding-top:9px!important;font-size:6px!important;letter-spacing:.4px!important}
        @media(max-width:620px){
          .membership-card{width:min(100%,360px)!important;aspect-ratio:54/85.6!important;min-height:0!important;padding:18px!important}
          .membership-card .card-top{display:flex!important;flex-direction:column!important;gap:8px!important}
          .membership-card .card-emblem,.membership-card .apc-emblem{width:44px!important;height:44px!important;flex-basis:44px!important}
          .membership-card .card-brand-copy strong{font-size:12px!important}
          .membership-card .card-brand-copy small{font-size:6px!important}
          .membership-card .card-approved{margin:0!important;padding:5px 7px!important;font-size:6px!important}
          .membership-card .card-main{display:flex!important;flex-direction:column!important;gap:8px!important;margin:0!important}
          .membership-card .card-avatar{width:80px!important;height:88px!important;flex-basis:88px!important}
          .membership-card .card-details h2{font-size:15px!important}
          .membership-card .card-bottom{font-size:6px!important;gap:6px!important}
        }


        /* NYFB portrait ID card redesign — matches the emailed PDF */
        .membership-card-section{max-width:430px!important;margin:30px auto 0!important}
        .membership-card{width:min(100%,330px)!important;max-width:330px!important;aspect-ratio:54/85.6!important;min-height:0!important;padding:16px 15px!important;gap:10px!important;border:2px solid #d4b45f!important;border-radius:15px!important;background:#f9f6e9!important;color:#172d20!important;box-shadow:0 16px 38px #00190e55!important}
        .membership-card:before{inset:5px!important;border:1px solid #c7aa5d88!important;border-radius:10px!important;background:none!important}
        .membership-card:after{display:none!important}
        .membership-card .card-top{margin:-16px -15px 0!important;padding:13px 10px 11px!important;min-height:94px!important;box-sizing:border-box!important;background:#062d1e!important;border-bottom:3px solid #d4b45f!important;gap:7px!important}
        .membership-card .card-logos{display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important}
        .membership-card .card-emblem,.membership-card .apc-emblem{width:39px!important;height:39px!important;flex:0 0 39px!important;border-radius:5px!important;background:#fff!important;border:1px solid #d4b45f!important;padding:3px!important;box-sizing:border-box!important}
        .membership-card .card-emblem img,.membership-card .apc-emblem img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
        .membership-card .card-brand-copy strong{display:block!important;color:#fff!important;font-size:11px!important;letter-spacing:.8px!important}
        .membership-card .card-brand-copy small{display:block!important;color:#e8d99e!important;font-size:6px!important;letter-spacing:1.1px!important}
        .membership-card .card-approved{margin:0!important;padding:4px 8px!important;color:#f9f0d2!important;border:1px solid #d4b45f!important;background:#ffffff10!important;font-size:6px!important}
        .membership-card .card-role{margin:0!important;text-align:center!important;color:#082b1d!important;background:linear-gradient(90deg,#c9a64d,#f0df9a,#c9a64d)!important;border-radius:3px!important;padding:7px 5px!important;font-size:10px!important;letter-spacing:1.5px!important}
        .membership-card .card-main{display:flex!important;flex-direction:column!important;align-items:center!important;gap:7px!important;margin:0!important;text-align:center!important}
        .membership-card .card-avatar{width:77px!important;height:80px!important;flex:0 0 80px!important;border:2px solid #c9a64d!important;border-radius:5px!important;background:#e7eadf!important;box-shadow:none!important}
        .membership-card .card-avatar img{width:100%!important;height:100%!important;object-fit:cover!important}
        .membership-card .card-details{width:100%!important;text-align:center!important;color:#172d20!important}
        .membership-card .card-details small{color:#637166!important;font-size:6px!important;letter-spacing:1px!important}
        .membership-card .card-details .card-eyebrow{color:#1c6843!important;margin-bottom:4px!important}
        .membership-card .card-details h2{color:#10291c!important;font-size:14px!important;line-height:1.15!important;margin:4px 0 7px!important}
        .membership-card .card-id-block{display:block!important;border:0!important;border-top:1px solid #d7c58c!important;padding:6px 0 0!important}
        .membership-card .card-id-block small{color:#637166!important}
        .membership-card .card-id-block strong{display:block!important;color:#075133!important;font-size:12px!important;letter-spacing:1.2px!important;margin-top:3px!important}
        .membership-card .card-location{color:#243b2d!important;font-size:7px!important;line-height:1.3!important;margin-top:6px!important}
        .membership-card .card-location span{color:#637166!important;font-size:6px!important;margin-bottom:2px!important}
        .membership-card .card-bottom{border-top:1px solid #d7c58c!important;padding-top:7px!important;color:#31513c!important;font-size:5.5px!important;letter-spacing:.25px!important}
        .membership-card .card-bottom b{color:#075133!important}
        .print-card{display:block!important;width:min(100%,330px)!important;margin:16px auto 0!important;background:#c9a64d!important;border:1px solid #e5d49a!important;color:#092b1d!important}
        .card-note{text-align:center!important;color:#d6f3df!important;font-size:11px!important;line-height:1.6!important}
        @media(max-width:620px){.membership-card{width:min(100%,330px)!important;padding:14px 13px!important}.membership-card .card-top{margin:-14px -13px 0!important}.membership-card .card-avatar{width:72px!important;height:75px!important;flex-basis:75px!important}.membership-card .card-details h2{font-size:13px!important}}

`}</style>   </main>
  );
}
