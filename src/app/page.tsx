import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">IPE City Grants</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        AI Judge System for Grant Proposal Evaluation
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/grants/submit">Submit Proposal</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/grants">View Proposals</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/operator">Operator Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
