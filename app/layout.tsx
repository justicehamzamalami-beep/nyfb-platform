import type { Metadata } from "next";
import "./globals.css";
import WhatsAppCommunityButton from "@/components/whatsapp-community-button";
export const metadata: Metadata = { title: "NYFB | Nigerian Youth for BAT", description: "The official digital membership and engagement platform for Nigerian Youth for BAT." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}<WhatsAppCommunityButton /></body></html>; }
