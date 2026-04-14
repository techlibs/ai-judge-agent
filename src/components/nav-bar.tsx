import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/grants", label: "Grants" },
  { href: "/grants/submit", label: "Submit Proposal" },
  { href: "/dashboard/operator", label: "Dashboard" },
] as const;

export function NavBar() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold">
          IPE City Grants
        </Link>
        <nav className="flex gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Button key={href} variant="ghost" size="sm" asChild>
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
