"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-secondary px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="text-lg font-semibold tracking-tight"
          >
            IPE City Grants
          </Link>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            GSD
          </span>
        </div>
        <Link
          href="/proposals/new"
          className={buttonVariants({ size: "sm" })}
        >
          Submit Proposal
        </Link>
      </nav>

      <main className="flex-1 px-4 py-12 sm:px-0">{children}</main>

      <footer className="flex h-12 items-center justify-center border-t border-border text-sm text-muted-foreground">
        <p>
          Built for{" "}
          <a
            href="https://ipe.city"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            IPE City
          </a>
        </p>
      </footer>
    </div>
  );
}
