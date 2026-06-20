import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-screen px-4 py-4 md:px-6 gap-4">
      {/* CGM detail skeleton */}
      <Card className="flex-shrink-0">
        <CardContent className="pt-6 flex flex-col items-center gap-3">
          <Skeleton className="h-24 w-40" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[420px] w-full" />
        </CardContent>
      </Card>
      {/* Device status skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
