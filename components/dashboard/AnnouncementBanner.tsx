"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Treatment } from "@/types/nightscout";

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // only show announcements < 24h old

export function AnnouncementBanner({ treatments }: { treatments: Treatment[] }) {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const active = treatments
    .filter((t) => {
      if (t.eventType !== "Announcement") return false;
      const mills = t.timestamp ?? new Date(t.created_at).getTime();
      return now - mills < MAX_AGE_MS;
    })
    .sort((a, b) => {
      const aT = a.timestamp ?? new Date(a.created_at).getTime();
      const bT = b.timestamp ?? new Date(b.created_at).getTime();
      return bT - aT;
    });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = active.filter((t) => t._id && !dismissed.has(t._id));
  if (!visible.length) return null;

  const latest = visible[0];

  return (
    <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg px-4 py-3 text-sm">
      <span className="text-yellow-600 dark:text-yellow-400 font-semibold shrink-0">📢</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-yellow-800 dark:text-yellow-200">Announcement</p>
        <p className="text-yellow-700 dark:text-yellow-300 break-words">
          {latest.notes ?? "(no message)"}
        </p>
        <p className="text-xs text-yellow-500 dark:text-yellow-500 mt-1">
          {latest.enteredBy ? `by ${latest.enteredBy} · ` : ""}
          {new Date(latest.timestamp ?? latest.created_at).toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      <button
        onClick={() => latest._id && setDismissed((prev) => new Set([...prev, latest._id!]))}
        className="text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-300 shrink-0 mt-0.5"
        aria-label="Dismiss announcement"
      >
        <X size={16} />
      </button>
    </div>
  );
}
