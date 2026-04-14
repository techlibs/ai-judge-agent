import Link from "next/link";

const NAV_LINKS = [
  { href: "/grants", label: "Grants" },
  { href: "/grants/submit", label: "Submit Proposal" },
  { href: "/dashboard/operator", label: "Dashboard" },
] as const;

export function NavBar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold text-gray-900">
          IPE City Grants
        </Link>
        <nav className="flex gap-4 text-sm">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-gray-600 hover:text-gray-900"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
