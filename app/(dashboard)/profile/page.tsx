import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profiles = await db.getProfiles().catch(() => []);
  const active = profiles[0] ?? null;

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Treatment Profile</h1>
      <ProfileForm initial={active} />
    </div>
  );
}
