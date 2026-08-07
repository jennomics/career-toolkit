import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, DM_Mono } from "next/font/google";
import "./globals.css";
import DemoBanner from "@/components/DemoBanner";

const zen = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["300", "500"],
  variable: "--font-zen-var",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Career Toolkit",
  description: "Save job descriptions, track skills, build your resume",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${zen.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-paper text-ink font-zen">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
