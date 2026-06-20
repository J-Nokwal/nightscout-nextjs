import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminActions } from "./AdminActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { role?: string })?.role !== "admin") {
    redirect("/dashboard");
  }

  const [entries, treatments, statuses, profiles] = await Promise.all([
    db.getEntries({ count: 1 }).catch(() => []),
    db.getTreatments({ count: 1 }).catch(() => []),
    db.getDeviceStatuses({ count: 1 }).catch(() => []),
    db.getProfiles().catch(() => []),
  ]);

  const lastModified = await db.getLastModified().catch(() => null);

  const counts = {
    entries:      entries.length > 0 ? "≥1" : "0",
    treatments:   treatments.length > 0 ? "≥1" : "0",
    devicestatus: statuses.length > 0 ? "≥1" : "0",
    profiles:     profiles.length,
  };

  const lastEntry = entries[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Admin Tools</h1>

      {/* Server info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Server Info</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Node.js</span>
            <span className="font-mono">{process.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environment</span>
            <span className="font-mono">{process.env.NODE_ENV}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DB Adapter</span>
            <span className="font-mono">{process.env.DB_ADAPTER ?? "mongo"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Redis Cache</span>
            <span className="font-mono">{process.env.REDIS_URL ? "enabled" : "disabled"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-mono">{Math.floor(process.uptime() / 3600)}h {Math.floor((process.uptime() % 3600) / 60)}m</span>
          </div>
        </CardContent>
      </Card>

      {/* Collection counts / last modified */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Database Collections</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.entries(counts).map(([name, count]) => {
            const lastMs = lastModified?.collections[name as keyof typeof lastModified.collections];
            return (
              <div key={name} className="flex justify-between items-center">
                <span className="text-muted-foreground capitalize">{name}</span>
                <div className="text-right">
                  {lastMs ? (
                    <span className="text-xs text-muted-foreground">
                      last: {new Date(lastMs).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{count} records</span>
                  )}
                </div>
              </div>
            );
          })}
          {lastEntry && (
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Last CGM reading</span>
              <span className="font-mono text-xs">
                {lastEntry.sgv} mg/dL · {new Date(lastEntry.date).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <AdminActions />
    </div>
  );
}
