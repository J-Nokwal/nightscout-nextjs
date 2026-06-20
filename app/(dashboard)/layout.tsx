import Link from "next/link";
import { DesktopSidebar, MobileSidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <MobileSidebar />
          <span className="font-semibold">{process.env.CUSTOM_TITLE || "Nightscout"}</span>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <footer className="hidden md:flex items-center justify-end gap-4 px-6 py-1 border-t text-xs text-muted-foreground">
          <span>Nightscout — Not a medical device</span>
          <Link href="/disclaimer" className="underline underline-offset-2 hover:text-foreground">
            Medical Disclaimer
          </Link>
        </footer>
      </div>
    </div>
  );
}
