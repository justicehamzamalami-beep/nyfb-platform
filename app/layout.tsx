import type { Metadata } from "next";
import "./globals.css";
import WhatsAppCommunityButton from "@/components/whatsapp-community-button";

export const metadata: Metadata = {
  title: "NYFB | Nigerian Youth for BAT",
  description: "The official digital membership and engagement platform for Nigerian Youth for BAT.",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>
        <div role="status" aria-live="polite" style={{background:"#fff4d6",borderBottom:"1px solid #ead8a7",color:"#634c16",padding:"10px 16px",textAlign:"center",fontSize:12,lineHeight:1.6,fontWeight:700}}>
          NYFB NETWORK UPGRADE: We are improving network connectivity. Some users may experience slow loading or temporary connection issues. Membership registration remains OPEN.
        </div>
        {children}
        <WhatsAppCommunityButton />
      </body>
    </html>
  );
}
