"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Status = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export default function StatusWatcher({
  orderId,
  initialStatus,
  intervalMs = 3000,
}: {
  orderId: number;
  initialStatus: Status;
  intervalMs?: number;
}) {
  const router = useRouter();
  const last = useRef<Status>(initialStatus);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    last.current = initialStatus;
  }, [initialStatus]);

  useEffect(() => {
    function shouldStop(s: Status) {
      return s === "completed" || s === "cancelled";
    }

    async function tick(signal: AbortSignal) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
        const res = await fetch(`${apiBase}/api/shop/orders/${orderId}`, { cache: "no-store", signal });
        if (!res.ok) return;
        const body = await res.json();
        const next: Status | undefined = body?.data?.order?.status;
        if (!next) return;
        if (next !== last.current) {
          last.current = next;
          router.refresh();
          if (shouldStop(next)) {
            stoppedRef.current = true;
            if (timerRef.current) window.clearInterval(timerRef.current);
          }
        } else if (shouldStop(next)) {
          stoppedRef.current = true;
          if (timerRef.current) window.clearInterval(timerRef.current);
        }
      } catch (_) {}
    }

    const controller = new AbortController();
    tick(controller.signal);
    if (!stoppedRef.current) {
      timerRef.current = window.setInterval(() => {
        tick(controller.signal);
      }, intervalMs);
    }
    return () => {
      controller.abort();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [orderId, intervalMs, router]);

  return null;
}
