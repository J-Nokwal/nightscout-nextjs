"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Maximize, Minimize, Settings2, Sun, SunDim } from "lucide-react";

interface Props {
  isCustom?: boolean;
}

interface MenuPos { x: number; y: number }

export function ClockContextMenu({ isCustom }: Props) {
  const router = useRouter();
  const [menu, setMenu]         = useState<MenuPos | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLock, setWakeLock] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [mounted, setMounted]   = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Fade hint after 4 seconds
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Release wake lock when page hides
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden" && wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  function openMenu(x: number, y: number) {
    const MENU_W = 210;
    const MENU_H = isCustom ? 250 : 210;
    setMenu({
      x: Math.min(x, window.innerWidth  - MENU_W - 8),
      y: Math.min(y, window.innerHeight - MENU_H - 8),
    });
  }

  // Right-click
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustom]);

  // Long-press start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchMoved.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) openMenu(touch.clientX, touch.clientY);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustom]);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    const onClick = () => setMenu(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click",   onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click",   onClick);
    };
  }, [menu]);

  // Attach listeners to document
  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("touchstart",  handleTouchStart, { passive: true });
    document.addEventListener("touchmove",   handleTouchMove,  { passive: true });
    document.addEventListener("touchend",    handleTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("touchstart",  handleTouchStart);
      document.removeEventListener("touchmove",   handleTouchMove);
      document.removeEventListener("touchend",    handleTouchEnd);
    };
  }, [handleContextMenu, handleTouchStart, handleTouchMove, handleTouchEnd]);

  async function toggleFullscreen() {
    setMenu(null);
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  }

  async function toggleWakeLock() {
    setMenu(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!("wakeLock" in nav)) return;
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLock(false);
    } else {
      try {
        const lock = await nav.wakeLock.request("screen");
        wakeLockRef.current = lock;
        setWakeLock(true);
        lock.addEventListener("release", () => { wakeLockRef.current = null; setWakeLock(false); });
      } catch { /* unsupported or denied */ }
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Fade-out hint */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs text-white/40 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: showHint ? 1 : 0 }}
      >
        Right-click or hold for options
      </div>

      {/* Context menu */}
      {menu && (
        <div
          className="fixed z-50 min-w-[210px] rounded-2xl overflow-hidden border border-white/10 bg-black/90 backdrop-blur-md shadow-2xl text-white text-sm"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={<ArrowLeft size={15} />} label="Exit to Clock List"
            onClick={() => { setMenu(null); router.push("/clock"); }} />
          <MenuItem icon={<LayoutDashboard size={15} />} label="Go to Dashboard"
            onClick={() => { setMenu(null); router.push("/dashboard"); }} />

          {isCustom && (
            <MenuItem icon={<Settings2 size={15} />} label="Edit Clock"
              onClick={() => { setMenu(null); router.push("/clock/builder"); }} />
          )}

          <div className="border-t border-white/10 mx-2 my-1" />

          <MenuItem
            icon={isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            onClick={toggleFullscreen}
          />
          <MenuItem
            icon={wakeLock ? <SunDim size={15} /> : <Sun size={15} />}
            label={wakeLock ? "Allow Screen Sleep" : "Keep Screen On"}
            onClick={toggleWakeLock}
            sublabel={wakeLock ? "Screen is locked awake" : undefined}
          />
        </div>
      )}
    </>,
    document.body,
  );
}

function MenuItem({
  icon, label, sublabel, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full text-left px-4 py-2.5 hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3"
      onClick={onClick}
    >
      <span className="opacity-60 shrink-0">{icon}</span>
      <span className="flex flex-col">
        <span>{label}</span>
        {sublabel && <span className="text-[10px] text-white/40">{sublabel}</span>}
      </span>
    </button>
  );
}
