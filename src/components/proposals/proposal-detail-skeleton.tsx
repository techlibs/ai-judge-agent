"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function ProposalDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />

      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Separator />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
