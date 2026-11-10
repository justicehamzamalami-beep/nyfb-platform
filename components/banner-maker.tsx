"use client";

import { useEffect,useRef,useState } from "react";
import Link from "next/link";

export default function BannerMaker(){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [name,setName]=useState("");
 const [state,setState]=useState("");
 const [photo,setPhoto]=useState<HTMLImageElement|null>(null);
 const [error,setError]=useState("");
 function loadPhoto(file?:File){
  if(!file)return;
  if(!file.type.startsWith("image/")){setError("Please select an image file.");return;}
  const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{setPhoto(img);setError("");URL.revokeObjectURL(url);};
  img.onerror=()=>{setError("The selected image could not be loaded.");URL.revokeObjectURL(url);};
  img.src=url;
 }
 function draw(){
  const canvas=canvasRef.current;if(!canvas)return;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  canvas.width=1080;canvas.height=1350;
  const grad=ctx.createLinearGradient(0,0,1080,1350);grad.addColorStop(0,"#073c2a");grad.addColorStop(.62,"#176b47");grad.addColorStop(1,"#0a2d22");
  ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);
  ctx.strokeStyle="rgba(222,194,113,.35)";ctx.lineWidth=3;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(940,180,150+i*90,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle="#d5bd75";ctx.font="bold 28px Arial";ctx.fillText("NIGERIAN YOUTH FOR BAT",90,115);
  ctx.fillStyle="#ffffff";ctx.font="900 104px Arial";ctx.fillText("I AM",90,310);ctx.fillStyle="#d7c27c";ctx.fillText("NYFB",90,425);
  ctx.fillStyle="#e9f0e9";ctx.font="32px Arial";ctx.fillText("UNITED IN PURPOSE. CONNECTED FOR IMPACT.",90,490);
  ctx.fillStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.roundRect(90,570,900,520,28);ctx.fill();
  if(photo){
   const size=430;const x=325,y=610;ctx.save();ctx.beginPath();ctx.roundRect(x,y,size,size,20);ctx.clip();
   const scale=Math.max(size/photo.width,size/photo.height);const w=photo.width*scale,h=photo.height*scale;ctx.drawImage(photo,x+(size-w)/2,y+(size-h)/2,w,h);ctx.restore();
  }else{
   ctx.strokeStyle="#d7c27c";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(325,610,430,430,20);ctx.stroke();
   ctx.fillStyle="#d7c27c";ctx.font="bold 28px Arial";ctx.textAlign="center";ctx.fillText("ADD YOUR PHOTO",540,830);ctx.textAlign="left";
  }
  ctx.fillStyle="#ffffff";ctx.font="bold 50px Arial";ctx.textAlign="center";ctx.fillText(name.trim().toUpperCase()||"YOUR NAME",540,1150);
  ctx.fillStyle="#d7c27c";ctx.font="30px Arial";ctx.fillText((state.trim()?state.trim().toUpperCase()+" STATE":"NIGERIA"),540,1205);
  ctx.textAlign="left";ctx.fillStyle="#ffffff";ctx.font="bold 25px Arial";ctx.fillText("LEADERSHIP  ·  SERVICE  ·  DEVELOPMENT",90,1300);
  ctx.fillStyle="#d7c27c";ctx.font="bold 26px Arial";ctx.textAlign="right";ctx.fillText("NYFB",990,1300);
 }
 useEffect(()=>{draw();},[name,state,photo]);
 function download(){draw();const canvas=canvasRef.current;if(!canvas)return;const link=document.createElement("a");link.download="NYFB-personal-banner.png";link.href=canvas.toDataURL("image/png");link.click();}
 return <main className="banner-shell"><div className="banner-wrap"><header><Link href="/">← NYFB home</Link><b>NYFB · BANNER STUDIO</b></header><section className="banner-intro"><small>SHOW YOUR NYFB PRIDE</small><h1>Your voice.<br/><em>Your community.</em></h1><p>Create a personalised NYFB banner for your social media profile and community updates.</p></section><div className="banner-workspace"><section className="banner-controls"><label>Your full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" maxLength={70}/></label><label>Your state<input value={state} onChange={e=>setState(e.target.value)} placeholder="e.g. Kaduna" maxLength={40}/></label><label>Upload your photograph<input type="file" accept="image/*" onChange={e=>loadPhoto(e.target.files?.[0])}/></label><p>Your photograph stays in your browser and is not uploaded to NYFB.</p>{error&&<div className="banner-error">{error}</div>}<button onClick={download}>Download banner · PNG</button><small>1080 × 1350 pixels · Instagram, Facebook and WhatsApp friendly</small></section><div className="banner-preview"><canvas ref={canvasRef} width={540} height={675}/><button onClick={draw}>Refresh preview</button></div></div></div><style jsx>{`
 .banner-shell{min-height:100vh;background:#f3f6f1;padding:24px 18px 60px;color:#193729}.banner-wrap{max-width:1100px;margin:auto}.banner-wrap header{display:flex;justify-content:space-between;border-bottom:1px solid #dce5db;padding-bottom:18px;font-size:11px}.banner-wrap header a{color:#176b47;font-weight:700}.banner-intro{padding:55px 0 28px}.banner-intro small{font-size:9px;letter-spacing:2px;color:#176b47;font-weight:800}.banner-intro h1{font:900 clamp(40px,6vw,66px)/1.05 Manrope,Arial;letter-spacing:-2px;margin:15px 0}.banner-intro h1 em{font-style:normal;color:#176b47}.banner-intro p{font-size:13px;color:#6a7a6e;line-height:1.8}.banner-workspace{display:grid;grid-template-columns:350px 1fr;gap:28px;align-items:start}.banner-controls,.banner-preview{background:white;border:1px solid #e0e8df;border-radius:12px;padding:22px}.banner-controls label{display:flex;flex-direction:column;gap:7px;margin-bottom:15px;font-size:11px;font-weight:700}.banner-controls input{border:1px solid #dce5dc;border-radius:5px;padding:12px;font:12px 'DM Sans';max-width:100%}.banner-controls p,.banner-controls>small{font-size:10px;color:#748177;line-height:1.7}.banner-controls button,.banner-preview button{width:100%;border:0;background:#176b47;color:white;border-radius:5px;padding:14px;font-size:11px;font-weight:700;cursor:pointer;margin:12px 0}.banner-preview canvas{width:100%;height:auto;display:block;border-radius:7px;background:#073c2a}.banner-preview button{background:#eaf2e9;color:#176b47}.banner-error{background:#fff0ed;color:#923c2d;padding:10px;font-size:11px}.banner-preview{max-width:580px;margin:auto}
 @media(max-width:760px){.banner-workspace{grid-template-columns:1fr}.banner-preview{width:100%}.banner-wrap header b{font-size:9px}}
 `}</style></main>;
}
