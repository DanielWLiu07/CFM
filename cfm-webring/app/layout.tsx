import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const arcadeClassic = localFont({
  src: "../public/fonts/arcadeclassic.ttf",
  variable: "--font-arcade",
});

export const metadata: Metadata = {
  title: "CFM Webring",
  description: "CFM Webring",
  icons: {
    icon: "/favicon_cfm.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${arcadeClassic.variable} antialiased bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
