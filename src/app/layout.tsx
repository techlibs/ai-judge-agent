import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
        <div className="fixed bottom-4 right-4 z-50">
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 shadow-sm">
            Spec Kit
          </span>
        </div>
        {children}
      </body>
    </html>
  );
}
