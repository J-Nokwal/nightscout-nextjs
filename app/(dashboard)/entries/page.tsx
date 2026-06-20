import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EntryManager } from "./EntryManager";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ count?: string }>;
}

export default async function EntriesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { count: countParam } = await searchParams;
  const count = Math.min(Number(countParam ?? 100), 500);

  const entries = await db.getEntries({ count }).catch(() => []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">CGM Entries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View, edit, or delete raw glucose readings. Use to correct bad sensor values.
        </p>
      </div>
      <EntryManager initialEntries={entries} />
    </div>
  );
}
