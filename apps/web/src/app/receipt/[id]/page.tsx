import type { Metadata } from "next";
import Controls from "./controls.client";
import PrintButton from "./print-button.client";
import { Clock, ArrowLeft, BookOpen, Coffee, RotateCcw } from "lucide-react";

export const metadata: Metadata = {
  title: "Receipt",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);
}

export default async function ReceiptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let order: any | null = null;
  try {
    const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
    const res = await fetch(`${apiBase}/api/shop/orders/${id}`, { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      order = body?.data?.order ?? null;
    }
  } catch (_) {}

  if (!order) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="alert alert-error">
          <span>Order not found.</span>
        </div>
      </div>
    );
  }

  const items: Array<{
    id: number;
    itemName: string;
    quantity: number;
    unitPriceCents: number;
  }> = order.items ?? [];

  const subtotal = items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0) / 100;
  const taxRate = 0.07;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const status = (order.status as string) || "pending";
  const tableNumber = (order.customerName as string | undefined)?.match(/\d+/)?.[0] || "-";

  return (
    <>
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xl font-semibold">
            <div className="size-6 rounded-md bg-amber-800 flex items-center justify-center text-white">
              <Coffee className="size-4" />
            </div>
            <span>Cafe Station</span>
          </div>
          <span className="rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-600">Receipt</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Order Receipt</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1">
                  <span>Latest order</span>
                  <span>•</span>
                  <span>Just now</span>
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">Order #{order.id}</div>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                  <Clock className="size-3.5" /> Pending
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-md border border-amber-200 bg-[#F4EAE1] px-3 py-1">Table</span>
                <span className="rounded-md border border-neutral-200 bg-white px-3 py-1">{tableNumber}</span>
                <span className="rounded-md border border-amber-200 bg-[#F4EAE1] px-3 py-1">Barista</span>
                <span className="rounded-md border border-neutral-200 bg-white px-3 py-1">Auto-assign</span>
              </div>

              <div className="border-t" />

              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{it.itemName}</div>
                      <div className="text-sm text-neutral-500">x{it.quantity} • {formatCurrency(it.unitPriceCents / 100)}</div>
                    </div>
                    <div className="tabular-nums w-24 text-right">{formatCurrency((it.unitPriceCents / 100) * it.quantity)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t" />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-start gap-2">
                <PrintButton />
                <a href="/" className="btn bg-[#F4EAE1] border-[#F4EAE1] text-neutral-800"><ArrowLeft className="size-4 mr-1" /> Back to Menu</a>
                <a href="#" className="btn bg-[#855439] border-[#855439] text-white -mt-1"><BookOpen className="size-4 mr-1" /> View Recipe</a>
              </div>
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Order Status</div>
                <div className="text-xs text-neutral-500">Auto-updates</div>
              </div>
              <Controls orderId={order.id} status={status as any} />
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Actions</div>
                <div className="text-xs text-neutral-500">Manage</div>
              </div>
              <button className="btn btn-outline justify-start"><Clock className="size-4 mr-2" /> Snooze 5 min</button>
              <a className="btn btn-outline justify-start" href="/"><RotateCcw className="size-4 mr-2" /> Modify Order</a>
              <Controls orderId={order.id} status={status as any} mode="cancel" />
            </div>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
