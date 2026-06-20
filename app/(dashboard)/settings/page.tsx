import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const shareToken = process.env.SHARE_TOKEN ?? null;
  // Build share URL from request host
  let shareUrl: string | null = null;
  if (shareToken) {
    const reqHeaders = await headers();
    const host  = reqHeaders.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") ? "http" : "https";
    shareUrl = `${proto}://${host}/follow/${shareToken}`;
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <SettingsForm shareUrl={shareUrl} />
    </div>
  );
}
