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
  title: "CFM Webring — UWaterloo Computing & Financial Management",
  description:
    "An interactive 3D webring connecting Computing & Financial Management students at the University of Waterloo. Explore member portfolios, class galleries, and GitHub activity.",
  icons: {
    icon: "/favicon_cfm.png",
  },
  openGraph: {
    title: "CFM Webring",
    description:
      "A retro-arcade 3D webring for UWaterloo CFM students. Browse portfolios, connect with peers, and join the ring.",
    siteName: "CFM Webring",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CFM Webring",
    description:
      "A retro-arcade 3D webring for UWaterloo CFM students.",
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
