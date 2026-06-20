import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ActivityLog } from "./ActivityLog";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const activities = await db.getActivities({ count: 100 }).catch(() => []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Exercise, steps, and fitness events</p>
        </div>
      </div>
      <ActivityLog initialActivities={activities} />
    </div>
  );
}
