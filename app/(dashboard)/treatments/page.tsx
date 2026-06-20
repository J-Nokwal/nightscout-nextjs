import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TreatmentTable } from "./TreatmentTable";

export const dynamic = "force-dynamic";

export default async function TreatmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const treatments = await db.getTreatments({ count: 50 }).catch(() => []);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Treatments</h1>
        <Button render={<Link href="/treatments/new" />}>
          + Log Treatment
        </Button>
      </div>
      <TreatmentTable initialTreatments={treatments} />
    </div>
  );
}
