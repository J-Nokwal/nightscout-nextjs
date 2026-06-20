"use client";

import { useEffect } from "react";
import { mutate } from "swr";

// Connects to /api/sse and revalidates SWR caches when new data arrives.
export function useRealtimeUpdates() {
  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const es = new EventSource("/api/sse");

    es.addEventListener("entries", () => {
      mutate((key) => typeof key === "string" && key.startsWith("/api/v3/entries"), undefined, { revalidate: true });
    });

    es.addEventListener("treatments", () => {
      mutate((key) => typeof key === "string" && key.startsWith("/api/v3/treatments"), undefined, { revalidate: true });
    });

    es.addEventListener("devicestatus", () => {
      mutate((key) => typeof key === "string" && key.startsWith("/api/v3/devicestatus"), undefined, { revalidate: true });
    });

    es.onerror = () => {
      // Browser will auto-reconnect; nothing to do
    };

    return () => es.close();
  }, []);
}
