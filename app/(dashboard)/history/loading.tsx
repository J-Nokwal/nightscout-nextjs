import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-16 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 text-center space-y-1">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-7 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 px-3 pb-2">
          <Skeleton className="h-[420px] w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
