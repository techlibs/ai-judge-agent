import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ErrorTracker } from "@/components/error-tracker";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "IPE City Grants - AI Judge System",
  description:
    "AI-powered grant evaluation system with transparent, on-chain scoring across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorTracker />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
