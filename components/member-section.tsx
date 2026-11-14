"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import NotificationCenter from "@/components/notification-center";

const NYFB_LOGO_URL = "https://brpqtdqejvlxsyzlyrfv.supabase.co/storage/v1/object/public/nyfb-site-media/website/logo/15fe9ad9-01c7-4bb6-873e-bc8ba989018d.jpg";
function APCPartyLogo(){return <svg viewBox="0 0 100 112" role="img" aria-label="All Progressives Congress official square logo" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="98" height="110" rx="2" fill="#fff" stroke="#d8d8d8" strokeWidth="2"/><rect x="3" y="3" width="30" height="76" fill="#07843b"/><rect x="33" y="3" width="34" height="76" fill="#fff"/><rect x="67" y="3" width="30" height="76" fill="#1685c7"/><g stroke="#704321" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M48 70 L54 18 M52 31 L34 12 M53 30 L40 8 M55 28 L49 6 M56 29 L59 7 M57 32 L70 12 M54 35 L76 22 M51 36 L27 23"/><path d="M47 68 Q53 73 59 68"/></g><path d="M3 79 H97 V109 H3 Z" fill="#d71936"/><text x="50" y="101" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="24" fontWeight="900" fill="#fff">APC</text></svg>}
type Member={member_number:string;referral_code:string;full_name:string;status:string;state:string;lga:string;ward:string|null;reviewed_at:string|null};
type Notice={id:string;title:string;body:string;audience:string;target_state:string|null;published_at:string|null;created_at:string};
export default function MemberSection({section}:{section:"profile"|"rewards"|"announcements"|"settings"|"support"}){
const [member,setMember]=useState<Member|null>(null);const [notices,setNotices]=useState<Notice[]>([]);const [rewards,setRewards]=useState<any[]>([]);const [referrals,setReferrals]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [avatar,setAvatar]=useState("");const [message,setMessage]=useState("");const [ninNumber,setNinNumber]=useState("");const [ninSaved,setNinSaved]=useState(false);const [ninSaving,setNinSaving]=useState(false);const [ninMessage,setNinMessage]=useState("");
 useEffect(()=>{let live=true;(async()=>{try{const db=createClient();const {data:{session},error:auth}=await db.auth.getSession();const user=session?.user;if(auth||!user){window.location.replace("/login");return;}let cachedNotices:Notice[]|null=null;if(section==="announcements"){try{const cached=sessionStorage.getItem("nyfb-announcements-cache");if(cached){const parsed=JSON.parse(cached);if(Date.now()-parsed.savedAt<60000&&Array.isArray(parsed.data))cachedNotices=parsed.data as Notice[];}}catch{sessionStorage.removeItem("nyfb-announcements-cache");}}const [m,n,r,f,nin]=await Promise.all([db.from("members").select("member_number,referral_code,full_name,status,state,lga,ward,reviewed_at").eq("user_id",user.id).maybeSingle(),section==="announcements"&&!cachedNotices?db.from("announcements").select("id,title,body,audience,target_state,published_at,created_at").eq("published",true).order("published_at",{ascending:false}).limit(50):null,section==="rewards"?db.from("reward_transactions").select("amount_ngn,reward_type,description,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100):null,section==="rewards"?db.from("member_referrals").select("id,status,created_at").eq("referrer_user_id",user.id).order("created_at",{ascending:false}).limit(50):null,section==="profile"?db.from("member_nin_records").select("user_id").eq("user_id",user.id).maybeSingle():null]);if(m.error)throw m.error;if(live){setMember(m.data as Member|null);if(cachedNotices)setNotices(cachedNotices);else if(n){const noticeRows=(n.data||[]) as Notice[];setNotices(noticeRows);try{sessionStorage.setItem("nyfb-announcements-cache",JSON.stringify({savedAt:Date.now(),data:noticeRows}));}catch{}}if(r)setRewards(r.data||[]);if(f)setReferrals(f.data||[]);if(nin?.data?.user_id){setNinSaved(true);setNinNumber("");}if(section==="profile"){const {data:photoBlob}=await db.storage.from("nyfb-member-photos").download(user.id+"/profile");if(photoBlob&&live)setAvatar(URL.createObjectURL(photoBlob));}}}catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load this page.");}finally{if(live)setLoading(false);}})();return()=>{live=false}},[]);
 async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setMessage("Use JPG, PNG or WEBP up to 5MB.");return;}const db=createClient();const {data:{session}}=await db.auth.getSession();const user=session?.user;if(!user)return;const {error}=await db.storage.from("nyfb-member-photos").upload(user.id+"/profile",file,{upsert:true,contentType:file.type});if(error)setMessage(error.message);else{const {data:photoBlob, error:photoError}=await db.storage.from("nyfb-member-photos").download(user.id+"/profile");if(photoError||!photoBlob)throw photoError||new Error("Photo uploaded but could not be loaded.");setAvatar(URL.createObjectURL(photoBlob));setMessage("Profile photo updated.");}}
 async function saveNin(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setNinMessage("");if(!/^[0-9]{11}$/.test(ninNumber)){setNinMessage("Enter a valid 11-digit NIN.");return;}setNinSaving(true);try{const db=createClient();const {data:{session}}=await db.auth.getSession();const user=session?.user;if(!user)throw new Error("Please sign in again.");const {error}=await db.from("member_nin_records").upsert({user_id:user.id,nin_number:ninNumber,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;setNinSaved(true);setNinNumber("");setNinMessage("NIN number saved successfully.");}catch(err){setNinMessage(err instanceof Error?err.message:"Unable to save your NIN. Please try again.");}finally{setNinSaving(false);}}
 async function signOut(){const db=createClient();await db.auth.signOut();window.location.assign("/");}
 const titles={profile:"My profile",rewards:"Rewards & referrals",announcements:"Announcements",settings:"Account settings",support:"Help & support"};const descriptions={profile:"View and maintain your personal membership information.",rewards:"Track rewards, recognition and member referrals.",announcements:"Official updates and notices from NYFB.",settings:"Manage your sign-in and account security.",support:"Get assistance from the NYFB support team."};
 const referral=member?"https://nigerianyouthforbat.org/join?ref="+member.referral_code:"";
 return <main className="member-dashboard-shell"><section className="member-space"><div className="member-actions"><Link className="back-home" href="/">← NYFB home</Link><button className="back-home sign-out" onClick={signOut}>Sign out</button></div><div className="brand member-brand"><img src={NYFB_LOGO_URL} alt="NYFB official logo" /><span>NYFB<small>NIGERIAN YOUTH FOR BAT</small></span></div><NotificationCenter /><div className="member-dashboard-layout"><div className="member-main-content"><header className="member-heading"><div><small>MEMBER PORTAL</small><h1>{titles[section]}</h1><p>{descriptions[section]}</p></div><span className="member-portal-tag">SECURE MEMBER AREA</span></header>{loading?<p>Loading your information…</p>:error?<p className="form-message form-error">{error}</p>:!member?<p>No membership record was found for this account.</p>:<div className="member-section-page">
 {section==="profile"&&<div className="profile-content"><section className="member-summary"><div className="member-welcome-row"><div className="member-avatar-wrap">{avatar?<img src={avatar} className="member-avatar-photo" alt="Profile"/>:<span className="member-avatar-placeholder">{member.full_name[0]}</span>}</div><div><h2>{member.full_name}</h2><label className="photo-upload-button">Update profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} hidden/></label><small className="photo-help">JPG, PNG or WEBP, maximum 5MB</small>{message&&<small className="photo-message">{message}</small>}</div></div><p><strong>Membership number:</strong> {member.member_number}</p><p><strong>Full name:</strong> {member.full_name}</p><p><strong>Membership status:</strong> {member.status.toUpperCase()}</p><p><strong>State:</strong> {member.state}</p><p><strong>LGA:</strong> {member.lga}</p><p><strong>Ward:</strong> {member.ward||"Not provided"}</p></section>
 {member.status === "approved" ? (
  <section className="nyfb-id-wrap" aria-label="Official NYFB APC Ambassador identity card">
    <div className="nyfb-id-card" id="nyfb-profile-id-card">
      <div className="nyfb-id-frame">
        <div className="nyfb-id-header">
          <div className="nyfb-id-logos">
            <div className="nyfb-id-logo"><img src={NYFB_LOGO_URL} alt="NYFB official logo" /></div>
            <div className="nyfb-id-apc" aria-label="Official All Progressives Congress logo"><APCPartyLogo /></div>
          </div>
          <div className="nyfb-id-org">NIGERIAN YOUTH<br />FOR BAT<small>OFFICIAL IDENTIFICATION CARD</small></div>
          <span className="nyfb-id-verified">✓ VERIFIED</span>
        </div>
        <div className="nyfb-id-role">APC AMBASSADOR</div>
        <div className="nyfb-id-person">
          <div className="nyfb-id-photo">
            {avatar ? <img src={avatar} alt={member.full_name} /> : <span>{member.full_name.trim().charAt(0).toUpperCase()}</span>}
          </div>
          <div className="nyfb-id-name"><small>FULL NAME</small><strong>{member.full_name}</strong></div>
        </div>
        <div className="nyfb-id-number"><small>MEMBERSHIP IDENTIFICATION NUMBER</small><strong>{member.member_number}</strong></div>
        <div className="nyfb-id-location">
          <div><small>STATE</small><b>{member.state || "—"}</b></div>
          <div><small>LOCAL GOVERNMENT</small><b>{member.lga || "—"}</b></div>
          <div><small>WARD</small><b>{member.ward || "—"}</b></div>
        </div>
        <div className="nyfb-id-footer"><b>NYFB • APC AMBASSADOR</b><span>OFFICIAL MEMBER</span></div>
      </div>
    </div>

  </section>
) : null}</div>}

 {section==="rewards"&&<><div className="member-activity"><div><small>REWARD BALANCE</small><strong>₦{rewards.reduce((s,x)=>s+Number(x.amount_ngn||0),0).toLocaleString("en-NG")}</strong><span>Recorded rewards</span></div><div><small>REFERRALS</small><strong>{referrals.length}</strong><span>Total referrals</span></div><div><small>VERIFIED REFERRALS</small><strong>{referrals.filter(x=>x.status==="verified").length}</strong><span>Verified referrals</span></div></div>{member.status==="approved"&&<div className="member-referral-box"><div><small>YOUR REFERRAL CODE</small><h2>{member.referral_code}</h2><p>Share your personal invitation link with prospective members.</p><input readOnly value={referral} aria-label="Referral link" style={{width:"100%",padding:10,marginTop:10,borderRadius:6}}/></div><button onClick={()=>navigator.clipboard?.writeText(referral).then(()=>setMessage("Referral link copied."))}>Copy referral link</button></div>}{message&&<p role="status">{message}</p>}<h2>Reward history</h2>{rewards.length?rewards.map((x,i)=><article key={i} className="member-history-row"><strong>₦{Number(x.amount_ngn||0).toLocaleString("en-NG")}</strong><span>{x.description||x.reward_type}</span><small>{new Date(x.created_at).toLocaleDateString("en-NG")}</small></article>):<p>No reward transactions have been recorded yet.</p>}</>}
 {section==="announcements"&&<section className="member-announcements"><div className="member-section-head"><h2>Latest official updates</h2><span>{notices.length} updates</span></div>{notices.length?notices.map(x=><article key={x.id}><div className="announcement-date">{new Date(x.published_at||x.created_at).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div><h3>{x.title}</h3><p>{x.body}</p>{x.audience==="state"&&x.target_state&&<small>For members in {x.target_state}</small>}</article>):<p>No announcements are available at the moment.</p>}</section>}
 {section==="settings"&&<section className="member-summary"><h2>Account security</h2><p>Change your password or recover access to your NYFB account.</p><Link className="btn" href="/forgot-password">Change or reset password</Link><p style={{marginTop:20}}>Keep your sign-in details private and use a strong password.</p></section>}
 {section==="support"&&<section className="member-summary"><h2>Contact NYFB support</h2><p>For membership verification, profile corrections, account access or other portal issues, contact the support team.</p><p><strong>Email:</strong> nigerianyouthforbat@gmail.com</p><a className="btn" href="mailto:nigerianyouthforbat@gmail.com?subject=NYFB%20Member%20Portal%20Support">Email support team</a></section>}
 </div>}</div></div></section><style jsx global>{`
.nyfb-id-wrap{margin:28px auto 0;max-width:460px}
.nyfb-id-card{width:min(100%,360px);aspect-ratio:54/85.6;margin:0 auto;padding:10px;border-radius:22px;background:linear-gradient(145deg,#d7b85d,#f6e6ad 28%,#a9822f 100%);box-shadow:0 18px 42px #001b103d;box-sizing:border-box;color:#fff}
.nyfb-id-frame{height:100%;width:100%;box-sizing:border-box;border:1px solid #f6e7b4;border-radius:15px;padding:16px 14px;display:flex;flex-direction:column;justify-content:space-between;gap:10px;position:relative;overflow:hidden;background:radial-gradient(circle at 95% 0%,#176d45 0%,transparent 38%),linear-gradient(155deg,#03281b 0%,#075337 55%,#02281c 100%)}
.nyfb-id-frame:before{content:"";position:absolute;inset:5px;border:1px solid #d8bd6b66;border-radius:11px;pointer-events:none}
.nyfb-id-header,.nyfb-id-logos,.nyfb-id-person,.nyfb-id-location,.nyfb-id-footer{display:flex;align-items:center;position:relative;z-index:1}
.nyfb-id-header{flex-direction:column;gap:8px;text-align:center}
.nyfb-id-logos{gap:10px}
.nyfb-id-logo,.nyfb-id-apc{width:44px;height:44px;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;padding:4px;box-sizing:border-box}
.nyfb-id-logo img{width:100%;height:100%;object-fit:contain}
.nyfb-id-apc{flex-direction:column;gap:1px;color:#bd2437;font-weight:900;font-size:13px;border:1px solid #eee}
.nyfb-id-apc span{display:flex;width:29px;height:20px;border:1px solid #ddd}
.nyfb-id-apc i{flex:1;background:#168b45}.nyfb-id-apc i:nth-child(2){background:#fff}
.nyfb-id-org{font-size:13px;line-height:1.2;font-weight:900;letter-spacing:1.1px}
.nyfb-id-org small{display:block;font-size:6px;letter-spacing:1.5px;margin-top:4px;color:#d9c47c}
.nyfb-id-verified{font-size:7px;letter-spacing:1px;border:1px solid #d9c47c;border-radius:20px;padding:5px 9px;color:#f7e8b2}
.nyfb-id-role{text-align:center;position:relative;z-index:1;background:linear-gradient(90deg,#c5a34b,#f3dfa0,#c5a34b);color:#173523;font-size:12px;font-weight:900;letter-spacing:1.6px;padding:8px 5px;border-radius:5px}
.nyfb-id-person{flex-direction:column;gap:8px;text-align:center}
.nyfb-id-photo{width:88px;height:94px;border:2px solid #d8bd6b;border-radius:10px;overflow:hidden;background:#ffffff18;display:grid;place-items:center;font-size:25px;font-weight:900;color:#f5e8bb}
.nyfb-id-photo img{width:100%;height:100%;object-fit:cover}
.nyfb-id-name small,.nyfb-id-number small,.nyfb-id-location small{display:block;font-size:6px;letter-spacing:1.2px;color:#dfcf96;margin-bottom:4px}
.nyfb-id-name strong{font-size:14px;line-height:1.2;overflow-wrap:anywhere}
.nyfb-id-number{text-align:center;border-top:1px solid #d9bd6b77;border-bottom:1px solid #d9bd6b77;padding:8px 0;position:relative;z-index:1}
.nyfb-id-number strong{font-size:13px;letter-spacing:1.5px}
.nyfb-id-location{justify-content:space-between;align-items:flex-start;gap:7px;position:relative;z-index:1}
.nyfb-id-location>div{min-width:0;flex:1;text-align:center}
.nyfb-id-location b{display:block;font-size:8px;line-height:1.2;overflow-wrap:anywhere}
.nyfb-id-footer{justify-content:space-between;border-top:1px solid #d9bd6b88;padding-top:8px;font-size:6px;letter-spacing:.5px;color:#f3e7bd}
.nyfb-id-actions{text-align:center;margin-top:14px}.nyfb-id-actions .btn{background:#b8f5c9;color:#04331f;border:0}.nyfb-id-actions p{font-size:11px;color:#d6f3df}
@media(max-width:620px){.nyfb-id-card{width:min(100%,340px)}}
.member-brand>img{width:52px;height:52px;object-fit:contain;background:#fff;border-radius:9px;padding:3px}.member-section-page{min-width:0}.member-section-page>.member-summary{margin-top:0}.member-section-page h2{color:#fff}.member-section-page .member-history-row{display:grid;grid-template-columns:120px 1fr auto;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid #277449;color:#eaffef}.member-section-page .member-history-row strong{color:#b8f5c9}.member-section-page .member-history-row small{color:#c5e8d0}@media(max-width:760px){.member-dashboard-layout{display:block!important}.member-section-page .member-history-row{grid-template-columns:1fr;gap:5px}.member-section-page .member-activity{grid-template-columns:repeat(2,minmax(0,1fr))}}
`}</style></main>
}
