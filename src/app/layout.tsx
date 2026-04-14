import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ErrorTracker } from "@/components/error-tracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IPE City Grants — AI-Evaluated, On-Chain Verified",
  description: "Submit grant proposals and receive transparent AI evaluation with on-chain proof via ERC-8004.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ErrorTracker />
        <header className="border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/grants" className="font-bold text-lg">
                IPE City
              </Link>
              <span className="rounded-full bg-purple-900/50 px-2 py-0.5 text-xs font-medium text-purple-300 ring-1 ring-purple-700">
                Superpowers
              </span>
            </div>
            <nav className="flex gap-4 text-sm">
              <Link href="/grants" className="text-muted-foreground hover:text-foreground">
                Grants
              </Link>
              <Link href="/grants/submit" className="text-muted-foreground hover:text-foreground">
                Submit
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
