"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MoreHorizontal, RefreshCw, Printer, CheckCircle2, XCircle } from "lucide-react";

type Status = "pending" | "preparing" | "ready" | "completed" | "cancelled";

type OrderSummary = {
  id: number;
  customerName: string;
  orderType: string;
  status: Status;
  createdAt: string;
  paid: boolean;
  items: Array<{ id: number; itemName: string; quantity: number }>;
};

function formatTime(d: string) {
  const dt = new Date(d);
  return dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, startRefresh] = useTransition();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    orderId: number;
    action: "cancel" | "complete";
  } | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  function loadOrders() {
    setLoading(true);
    fetch("/api/shop/orders?limit=50")
      .then((r) => r.json())
      .then((body) => {
        const rows: OrderSummary[] = (body?.data?.orders || []).map((o: any) => ({
          id: o.id,
          customerName: o.customerName || "WALKIN",
          orderType: o.orderType,
          status: (o.status || "pending") as Status,
          createdAt: o.createdAt,
          paid: Boolean(o.isPaid || o.paid),
          items: (o.items || []).map((it: any) => ({
            id: it.id,
            itemName: it.itemName,
            quantity: it.quantity,
          })),
        }));
        setOrders(rows);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Auto-hide toast after a short delay
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function updateStatus(id: number, next: Status) {
    startRefresh(async () => {
      try {
        const res = await fetch(`/api/shop/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error("Failed to update status");
        loadOrders();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const visibleOrders = useMemo(
    () => orders.filter((o) => o.status !== "completed" && o.status !== "cancelled"),
    [orders],
  );

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted-foreground">Loading orders…</div>
    );
  }

  return (
    <>
      {toast && (
        <div className="toast toast-end z-50">
          <div
            className={`alert ${
              toast.type === "success"
                ? "alert-success"
                : toast.type === "error"
                ? "alert-error"
                : "alert-info"
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Orders</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startRefresh(loadOrders)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          {refreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {visibleOrders.length === 0 && (
        <div className="text-sm text-muted-foreground">No orders yet.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleOrders.map((o) => (
          <Card key={o.id} className="bg-white relative">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {o.orderType === "dine_in" ? "Dine In" : "Takeaway"}
                </div>
                <div className="text-xs text-neutral-500 flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{formatTime(o.createdAt)}</span>
                  {o.paid && <span className="ml-2 text-emerald-600">• paid</span>}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-2 py-1 text-neutral-600 hover:bg-neutral-50"
                onClick={() => setOpenMenuId((prev) => (prev === o.id ? null : o.id))}
                aria-label="Actions"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-neutral-500">Token:</div>
                <div className="inline-flex items-center justify-center size-7 rounded-full bg-neutral-900 text-white text-xs font-medium">
                  {o.id}
                </div>
              </div>
              <div className="border-t my-1" />
              <div className="space-y-1 text-sm">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between">
                    <span>{it.itemName} x {it.quantity}</span>
                  </div>
                ))}
                {o.items.length === 0 && (
                  <div className="text-xs text-neutral-400">No item details.</div>
                )}
              </div>
            </CardContent>

            {openMenuId === o.id && (
              <div className="absolute right-3 top-12 z-10 rounded-xl border border-neutral-200 bg-white shadow-lg px-3 py-2 text-sm w-44">
                <div className="space-y-1">
                  <Link
                    href={`/receipt/${o.id}`}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-neutral-50"
                  >
                    <Printer className="size-4" />
                    <span>Print Receipt</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setOpenMenuId(null);
                      setConfirmAction({ orderId: o.id, action: "cancel" });
                    }}
                  >
                    <XCircle className="size-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                    onClick={() => {
                      setOpenMenuId(null);
                      setConfirmAction({ orderId: o.id, action: "complete" });
                    }}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Complete</span>
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      </div>

      {confirmAction && (
        <dialog open className="modal">
          <div className="modal-box max-w-sm rounded-2xl bg-base-100 border border-neutral-200">
            <div className="flex items-start gap-3">
              <div
                className={`inline-flex items-center justify-center rounded-full p-2 text-white ${
                  confirmAction.action === "cancel" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              >
                {confirmAction.action === "cancel" ? (
                  <XCircle className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">
                  {confirmAction.action === "cancel" ? "ยกเลิกออเดอร์นี้ใช่ไหม?" : "ปิดออเดอร์นี้เป็นเสร็จแล้ว?"}
                </h3>
                <p className="text-sm text-neutral-500">
                  {confirmAction.action === "cancel"
                    ? "ระบบจะเปลี่ยนสถานะเป็น Cancelled โดยไม่ลบข้อมูลออเดอร์ คุณยังสามารถดูประวัติย้อนหลังได้."
                    : "ระบบจะเปลี่ยนสถานะเป็น Completed และซ่อนออเดอร์นี้ออกจากหน้านี้."}
                </p>
              </div>
            </div>

            <div className="modal-action mt-5 flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmAction(null)}
              >
                ไม่เปลี่ยนแปลง
              </button>
              <button
                type="button"
                className={`btn ${
                  confirmAction.action === "cancel" ? "btn-error" : "btn-success"
                }`}
                onClick={() => {
                  const { orderId, action } = confirmAction;
                  const next: Status = action === "cancel" ? "cancelled" : "completed";
                  setConfirmAction(null);
                  updateStatus(orderId, next);
                  setToast({
                    type: action === "cancel" ? "info" : "success",
                    message:
                      action === "cancel"
                        ? "ยกเลิกออเดอร์เรียบร้อยแล้ว."
                        : "ออเดอร์ถูกบันทึกเป็นเสร็จแล้ว.",
                  });
                }}
              >
                ยืนยันการ{confirmAction.action === "cancel" ? "ยกเลิก" : "ปิดออเดอร์"}
              </button>
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => setConfirmAction(null)}
          >
            <button>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
