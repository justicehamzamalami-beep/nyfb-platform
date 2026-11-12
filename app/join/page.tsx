import Link from "next/link";

export default function JoinPage() {
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"24px",background:"#f5f7f3"}}>
      <section style={{width:"min(100%,620px)",padding:"clamp(24px,5vw,44px)",background:"#fff",border:"1px solid #dfe8df",borderRadius:18,boxShadow:"0 18px 55px rgba(20,55,35,.08)",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 13px",borderRadius:999,background:"#fff5dc",color:"#80621d",fontSize:11,fontWeight:800,letterSpacing:1}}>PLATFORM UPGRADE IN PROGRESS</div>
        <div style={{margin:"28px auto 14px",width:58,height:58,borderRadius:16,display:"grid",placeItems:"center",background:"#eaf2eb",color:"#145b39",fontSize:28}}>↻</div>
        <h1 style={{margin:"0 0 12px",fontSize:"clamp(28px,5vw,40px)",lineHeight:1.15,color:"#173b2a"}}>NYFB Platform is being upgraded</h1>
        <p style={{margin:"0 auto",maxWidth:470,fontSize:15,lineHeight:1.8,color:"#627266"}}>Membership registration is temporarily closed while our IT team completes platform upgrades and system improvements.</p>
        <p style={{margin:"14px auto 0",maxWidth:470,fontSize:14,lineHeight:1.8,color:"#627266"}}>Existing members can continue to access their accounts. Thank you for your patience.</p>
        <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap",marginTop:28}}>
          <Link href="/login" style={{display:"inline-flex",padding:"12px 20px",borderRadius:9,background:"#075337",color:"#fff",fontWeight:700,textDecoration:"none"}}>Member login</Link>
          <Link href="/" style={{display:"inline-flex",padding:"12px 20px",borderRadius:9,border:"1px solid #d6e1d7",color:"#24583b",fontWeight:700,textDecoration:"none"}}>Back to homepage</Link>
        </div>
        <p style={{margin:"28px 0 0",fontSize:10,letterSpacing:1.4,fontWeight:800,color:"#829184"}}>NIGERIAN YOUTH FOR BAT · NYFB</p>
      </section>
    </main>
  );
}
