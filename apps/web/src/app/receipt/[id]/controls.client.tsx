"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type Status = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export default function Controls({
  orderId,
  status,
  mode,
}: {
  orderId: number;
  status: Status;
  mode?: "status" | "cancel";
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<Status>(status);
  const router = useRouter();

  async function updateStatus(next: Status) {
    if (pending || next === current) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error("Failed to update status");
        setCurrent(next);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (mode === "cancel") {
    return (
      <button
        className="btn btn-outline justify-start"
        onClick={() => {
          if (!confirm("Cancel this order?")) return;
          updateStatus("cancelled");
        }}
      >
        <Trash2 className="size-4 mr-2" /> Cancel Order
      </button>
    );
  }

  const tabs: Array<{ key: Status; label: string }> = [
    { key: "pending", label: "Pending" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tabs.map((t) => {
          const selected = current === t.key;
          return (
            <button
              key={t.key}
              className={`btn btn-sm rounded-md border ${
                selected
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
              disabled={pending}
              onClick={() => updateStatus(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current === "pending" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
          This order is in the queue. Barista will start preparing it shortly.
        </div>
      )}
      {current === "preparing" && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 px-3 py-2 text-sm">
          The order is being prepared. Please wait.
        </div>
      )}
      {current === "ready" && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
          The order is ready for pickup or serving.
        </div>
      )}
    </div>
  );
}
