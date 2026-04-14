import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OperatorDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Operator Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage evaluations and monitor system health
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>System Status</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              AI judges and evaluation pipeline are active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Quick Actions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/grants/submit">Submit Test Proposal</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/api/health">Health Check</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Network</CardDescription>
            <CardTitle>Base Sepolia</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">6 contracts deployed</Badge>
            <a
              href="https://sepolia.basescan.org/address/0xa86D6684De7878C36F03697657702A86D13028d8"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-xs text-primary hover:underline"
            >
              View on Basescan
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
