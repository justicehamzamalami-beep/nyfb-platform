import JoinForm from "@/components/join-form";

export default function JoinPage() {
  return (
    <>
      <div role="status" aria-live="polite" style={{maxWidth:760,margin:"18px auto 0",padding:"12px 16px",borderRadius:10,border:"1px solid #ead8a7",background:"#fff8e8",color:"#70551a",fontSize:13,lineHeight:1.7}}>
        <strong>NETWORK UPGRADE NOTICE:</strong> We are currently upgrading our network and improving platform connectivity. Registration remains open, but you may experience slow loading, connection interruptions, or delays while submitting your application. If this happens, please check your connection and try again.
      </div>
      <JoinForm />
    </>
  );
}
