import Link from "next/link";

export default function GrantNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-gray-900">Proposal Not Found</h1>
      <p className="text-gray-600">
        The proposal you are looking for does not exist or has been removed.
      </p>
      <Link
        href="/grants"
        className="text-blue-600 underline underline-offset-4 hover:text-blue-500"
      >
        Back to all proposals
      </Link>
    </main>
  );
}
