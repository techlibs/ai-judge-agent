import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">IPE City Grants</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI Judge System for Grant Proposal Evaluation
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/grants"
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          View Proposals
        </Link>
        <Link
          href="/grants/operator"
          className="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Operator Dashboard
        </Link>
      </div>
    </main>
  );
}
