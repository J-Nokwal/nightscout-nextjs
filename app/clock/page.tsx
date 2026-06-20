import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";

const BUILT_IN_CLOCKS = [
  {
    href: "/clock/bgclock",
    label: "BG Clock",
    desc: "Minimal black screen — just the number, arrow, and delta",
    preview: "bg-black text-white",
  },
  {
    href: "/clock/clock-color",
    label: "Color Clock",
    desc: "Full-screen colored background based on alarm level",
    preview: "bg-green-800 text-white",
  },
  {
    href: "/clock/clock",
    label: "Clock + BG",
    desc: "Digital clock with BG value beneath it",
    preview: "bg-black text-green-400",
  },
];

export default function ClockIndexPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="fixed top-4 left-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Dashboard
      </Link>

      <h1 className="text-2xl font-bold">Clock Views</h1>
      <p className="text-muted-foreground text-sm">
        Full-screen displays optimized for bedside, phone, or tablet mounting.
      </p>

      <div className="grid gap-4 w-full max-w-md">
        {/* Built-in clocks */}
        {BUILT_IN_CLOCKS.map(({ href, label, desc, preview }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-xl border p-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`w-16 h-10 rounded flex items-center justify-center text-sm font-bold ${preview}`}>
                126
              </div>
              <div>
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          </Link>
        ))}

        {/* Custom clock */}
        <div className="rounded-xl border p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-10 rounded flex items-center justify-center text-sm font-bold bg-slate-900 text-emerald-400">
              126
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-1.5">
                Custom Clock
                <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded font-normal">New</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Fully configurable — font, colors, layout, and which elements to show
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Link
              href="/clock/custom"
              className="flex-1 text-center text-sm py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Open Clock
            </Link>
            <Link
              href="/clock/builder"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <Settings2 size={13} />
              Configure
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
