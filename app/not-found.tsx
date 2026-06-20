import Link from "next/link";
import { NightscoutLogo } from "@/components/NightscoutLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <NightscoutLogo size={56} />
      <div className="space-y-2">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="text-xl font-semibold">Page not found</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="text-sm underline underline-offset-4 text-primary hover:text-primary/80"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
