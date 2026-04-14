import Link from "next/link";

export default function OperatorDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Operator Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage evaluations and monitor system health
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* System Status Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">System Status</h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-lg font-semibold text-gray-900">
              Operational
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            AI judges and evaluation pipeline are active
          </p>
        </div>

        {/* Quick Actions Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Quick Actions</h3>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/grants/submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Submit Test Proposal
            </Link>
            <Link
              href="/api/health"
              className="rounded-md border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Health Check
            </Link>
          </div>
        </div>

        {/* Network Info Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Network</h3>
          <div className="mt-2">
            <span className="text-lg font-semibold text-gray-900">
              Base Sepolia
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            6 contracts deployed and verified
          </p>
          <a
            href="https://sepolia.basescan.org/address/0xa86D6684De7878C36F03697657702A86D13028d8"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-500"
          >
            View on Basescan
          </a>
        </div>
      </div>
    </div>
  );
}
