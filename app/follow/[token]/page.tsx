import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { FollowDisplay } from "./FollowDisplay";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function FollowPage({ params }: PageProps) {
  const { token } = await params;
  const shareToken = process.env.SHARE_TOKEN;

  // Validate token — constant-time compare to prevent timing attacks
  if (!shareToken || token.length !== shareToken.length) return notFound();
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ shareToken.charCodeAt(i);
  }
  if (mismatch !== 0) return notFound();

  const entries = await db.getEntries({ count: 288 }).catch(() => []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="font-semibold text-sm">Nightscout · Read-only</span>
        <span className="text-xs text-muted-foreground">Live · updates every 60s</span>
      </div>
      <FollowDisplay initialEntries={entries} />
    </div>
  );
}
