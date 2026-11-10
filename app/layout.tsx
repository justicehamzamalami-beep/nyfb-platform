import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NYFB | Nigerian Youth for BAT", description: "The official digital membership and engagement platform for Nigerian Youth for BAT." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
