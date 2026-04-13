import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "IPE City Grants",
  description: "AI-powered grant evaluation for IPE City",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppShell>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </AppShell>
      </body>
    </html>
  );
}
