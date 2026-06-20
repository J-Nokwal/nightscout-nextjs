"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CarePortalForm } from "./CarePortalForm";
import { ManualEntryForm } from "./ManualEntryForm";

const TABS = [
  { id: "treatment", label: "Treatment" },
  { id: "manual-bg", label: "Manual BG Entry" },
];

export default function NewTreatmentPage() {
  const [tab, setTab] = useState<string>("treatment");
  useRouter(); // ensure client-side navigation works

  return (
    <div className="p-4 md:p-6 max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Log</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b pb-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`text-sm px-3 py-1.5 rounded-t transition-colors ${
              tab === id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "treatment" && <CarePortalForm />}
      {tab === "manual-bg" && <ManualEntryForm />}
    </div>
  );
}
