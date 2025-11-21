import type { Metadata } from "next";
import Controls from "./controls.client";
import PrintButton from "./print-button.client";
import StatusWatcher from "./status-watcher.client";
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
  let settings: any | null = null;
  try {
    const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
    const res = await fetch(`${apiBase}/api/shop/orders/${id}`, { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      order = body?.data?.order ?? null;
    }
    const settingsRes = await fetch(`${apiBase}/api/shop/settings`, { cache: "no-store" });
    if (settingsRes.ok) {
      const body = await settingsRes.json();
      settings = body?.data?.settings ?? null;
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
    sugarLevel?: 'none' | 'less' | 'normal' | 'extra';
    notes?: string;
  }> = order.items ?? [];

  const subtotal = items.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0) / 100;
  const total = subtotal; // Prices already include VAT

  const status = (order.status as string) || "pending";
  const tableNumber = (order.customerName as string | undefined)?.match(/\d+/)?.[0] || "-";

  const storeName: string = (settings?.storeName as string | undefined)?.trim() || "Cafe Station";
  const logoUrl: string | undefined = (settings?.logoUrl as string | undefined) || undefined;
  const enablePrint: boolean = typeof settings?.enablePrint === "boolean" ? settings.enablePrint : true;
  const showStoreDetails: boolean = typeof settings?.showStoreDetails === "boolean" ? settings.showStoreDetails : true;
  const showCustomerDetails: boolean = typeof settings?.showCustomerDetails === "boolean" ? settings.showCustomerDetails : false;
  const printHeader: string | undefined = (settings?.printHeader as string | undefined)?.trim() || undefined;
  const printFooter: string | undefined = (settings?.printFooter as string | undefined)?.trim() || undefined;
  const showNotes: boolean = typeof settings?.showNotes === "boolean" ? settings.showNotes : true;
  const printToken: boolean = typeof settings?.printToken === "boolean" ? settings.printToken : true;
  const queueNumber: string | undefined = (order.queueNumber as string | undefined) || undefined;
  const address: string | undefined = (settings?.address as string | undefined)?.trim() || undefined;
  const phone: string | undefined = (settings?.phone as string | undefined)?.trim() || undefined;
  const email: string | undefined = (settings?.email as string | undefined)?.trim() || undefined;
  const printFormat: "58mm" | "80mm" = settings?.printFormat === "58mm" ? "58mm" : "80mm";
  const is58 = printFormat === "58mm";
  const customerName: string | undefined = (order.customerName as string | undefined) || undefined;

  const percentFromSugar = (s?: 'none' | 'less' | 'normal' | 'extra') =>
    s === 'none' ? 0 : s === 'less' ? 25 : s === 'normal' ? 50 : s === 'extra' ? 75 : undefined;

  return (
    <>
      <StatusWatcher orderId={order.id} initialStatus={status as any} />
      <div className="border-b bg-white print:hidden">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xl font-semibold">
            <div className="size-6 rounded-md bg-amber-800 flex items-center justify-center text-white overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Coffee className="size-4" />
              )}
            </div>
            <span>{storeName}</span>
          </div>
          <span className="rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-600">Receipt</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6 print:p-0 print:max-w-none">

      <div className="grid grid-cols-12 gap-6 print:gap-0">
        <section className="col-span-12 lg:col-span-8 print:col-span-12 flex justify-center print:px-0">
          <div
            className="rounded-xl border bg-white shadow-sm w-full max-w-xs print:max-w-none"
            style={{ width: printFormat === "58mm" ? "58mm" : "80mm" }}
          >
            <div
              className={`${is58 ? "px-3 py-4 text-[10px]" : "px-4 py-5 text-xs"} text-neutral-800`}
            >
              <div className="text-center mb-3 flex flex-col items-center gap-1.5">
                {logoUrl && (
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-200 inline-flex items-center justify-center">
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  </div>
                )}
                <div
                  className={`${is58 ? "text-[13px]" : "text-base"} font-bold tracking-[0.2em] uppercase`}
                >
                  {storeName}
                </div>
                {showStoreDetails && (address || phone || email) && (
                  <div className="mt-1 space-y-0.5">
                    {address && (
                      <div className={is58 ? "text-[10px]" : "text-[11px]"}>
                        Address: {address}
                      </div>
                    )}
                    {(phone || email) && (
                      <div className={is58 ? "text-[10px]" : "text-[11px]"}>
                        {phone && <span>Tel. {phone}</span>}
                        {phone && email && <span className="mx-1">•</span>}
                        {email && <span>{email}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {printHeader && (
                <div className="border-t border-dashed border-neutral-300 my-2" />
              )}
              {printHeader && (
                <div
                  className={`text-center whitespace-pre-line mb-2 ${
                    is58 ? "text-[10px]" : "text-[11px]"
                  }`}
                >
                  {printHeader}
                </div>
              )}

              <div className="border-t border-dashed border-neutral-300 my-2" />

              <div className="space-y-0.5 mb-2">
                <div className={`text-left ${is58 ? "text-[10px]" : "text-[11px]"}`}>
                   <div>Receipt No.: {order.id}</div>
                   {order.createdAt && (
                     <div>{new Date(order.createdAt).toLocaleString('th-TH')}</div>
                   )}
                   {!order.createdAt && (
                     <div>{new Date().toLocaleString('th-TH')}</div>
                   )}
                </div>

                {showCustomerDetails && (
                  <div className={`mt-1 ${is58 ? "text-[10px]" : "text-[11px]"}`}>
                    <div>
                      <span className="font-semibold">Table:</span> {tableNumber}
                    </div>
                    {customerName && (
                      <div>Host: {customerName}</div>
                    )}
                  </div>
                )}
                {printToken && queueNumber && (
                  <div className={is58 ? "text-[10px]" : "text-[11px]"}>
                    Token: {queueNumber}
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-neutral-300 my-2" />

              {items.map((it) => {
                const sugarPct = percentFromSugar(it.sugarLevel);
                const sugarText = typeof sugarPct === 'number' ? `sweet ${sugarPct}%` : undefined;
                const extraMatch = it.notes?.match(/extra\s*shot\s*x(\d+)/i);
                const extraText = extraMatch ? `extra shot x${extraMatch[1]}` : undefined;
                let otherNotes = it.notes || '';
                if (extraMatch) {
                  otherNotes = otherNotes.replace(extraMatch[0], '').trim();
                  otherNotes = otherNotes.replace(/^;\s*|\s*;$/g, '').trim();
                }
                const details = showNotes
                  ? [sugarText, extraText, otherNotes || undefined].filter(Boolean).join(' • ')
                  : '';
                return (
                  <div key={it.id} className="flex flex-col mb-3">
                    <div className={`font-medium text-left text-neutral-900 ${is58 ? "text-[11px]" : "text-xs"}`}>
                      {it.itemName}
                    </div>
                    <div className="flex justify-between items-start text-neutral-600">
                      <span className={`${is58 ? "text-[10px]" : "text-[11px]"}`}>
                         {it.quantity}x {formatCurrency(it.unitPriceCents / 100)}
                      </span>
                      <span
                        className={`tabular-nums font-medium text-neutral-900 ${
                          is58 ? "text-[10px]" : "text-[11px]"
                        }`}
                      >
                        {formatCurrency((it.unitPriceCents / 100) * it.quantity)}
                      </span>
                    </div>
                    {details && (
                      <div
                        className={`text-neutral-400 leading-snug mt-0.5 ${
                          is58 ? "text-[9px]" : "text-[10px]"
                        }`}
                      >
                        {details}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-t border-dashed border-neutral-300 my-2" />

              <div className={`space-y-0.5 ${is58 ? "text-[10px]" : "text-[11px]"}`}>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (7%):</span>
                  <span className="tabular-nums">{formatCurrency(0)}</span>
                </div>
                <div className={`flex justify-between font-bold mt-1.5 ${is58 ? "text-[13px]" : "text-sm"}`}>
                  <span>Total:</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>

              {printFooter && (
                <>
                  <div className="border-t border-dashed border-neutral-300 my-2" />
                  <div
                    className={`text-center text-neutral-600 whitespace-pre-line mb-1 ${
                      is58 ? "text-[10px]" : "text-[11px]"
                    }`}
                  >
                    {printFooter}
                  </div>
                </>
              )}

              <div className="border-t border-dashed border-neutral-300 my-2" />

              <div
                className={`text-center font-medium mb-1 text-neutral-600 ${
                  is58 ? "text-[10px]" : "text-[11px]"
                }`}
              >
                Thank you for visiting
              </div>
              <div className="mt-2 flex justify-center">
                <div className="h-8 w-40 bg-linear-to-r from-neutral-300 via-neutral-900 to-neutral-300 opacity-50 print:opacity-80" />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 print:hidden text-[10px]">
                {enablePrint && <PrintButton />}
                <a
                  href="/"
                  className="btn btn-xs bg-[#F4EAE1] border-[#F4EAE1] text-neutral-800 min-h-0 h-7 px-2"
                >
                  <ArrowLeft className="size-3 mr-1" /> Back
                </a>
              </div>
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-4 space-y-4 print:hidden">
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
              <div className="grid grid-cols-2 gap-3">
                <a
                  className="btn bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 w-full"
                  href={`/?fromOrder=${order.id}`}
                >
                  <RotateCcw className="size-4 mr-2" /> Modify Order
                </a>
                <Controls orderId={order.id} status={status as any} mode="cancel" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
