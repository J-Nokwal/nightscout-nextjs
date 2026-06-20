"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface Props {
  currentDate: string; // YYYY-MM-DD
}

function CalendarGrid({
  currentDate,
  onSelect,
}: {
  currentDate: string;
  onSelect: (date: string) => void;
}) {
  const today = isoDate(new Date());
  const [viewYear,  setViewYear]  = useState(() => parseInt(currentDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(currentDate.slice(5, 7)) - 1);

  const firstDay    = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow    = firstDay.getDay();
  const monthLabel  = firstDay.toLocaleDateString([], { month: "long", year: "numeric" });

  const todayDate   = new Date();
  const isCurrentMonth = viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none p-3 w-[280px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 text-center mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-[11px] text-muted-foreground py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr    = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isFuture   = dateStr > today;
          const isSelected = dateStr === currentDate;
          const isToday    = dateStr === today;

          if (isFuture) {
            return (
              <div key={i} className="aspect-square flex items-center justify-center text-xs text-muted-foreground/30">
                {day}
              </div>
            );
          }

          return (
            <button
              key={i}
              onClick={() => onSelect(dateStr)}
              className={cn(
                "aspect-square flex items-center justify-center text-xs rounded-lg transition-colors font-medium",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "ring-1 ring-primary text-primary hover:bg-primary/10"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Quick jump to today */}
      {!isCurrentMonth && (
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={() => onSelect(today)}
            className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Jump to today
          </button>
        </div>
      )}
    </div>
  );
}

export function HistoryCalendar({ currentDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Display label for the trigger button
  const displayLabel = new Date(currentDate + "T00:00:00").toLocaleDateString([], {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  function handleSelect(dateStr: string) {
    setOpen(false);
    router.push(`/history?date=${dateStr}`);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        ref={triggerRef}
        render={
          <Button variant="outline" size="sm" className="gap-2 font-medium" />
        }
      >
        <CalendarDays size={14} className="text-muted-foreground" />
        {displayLabel}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          sideOffset={8}
          align="start"
        >
          <PopoverPrimitive.Popup
            className={cn(
              "z-50 rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <CalendarGrid currentDate={currentDate} onSelect={handleSelect} />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
