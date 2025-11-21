"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

import type { Route } from "next";

type Status = "pending" | "preparing" | "ready" | "completed" | "cancelled";

type Order = {
  id: number;
  status: Status;
  createdAt: string;
  totalCents: number;
  isPaid?: boolean;
  items: Array<{
    id: number;
    itemName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
};

type DateFilterPreset = "today" | "yesterday" | "last7" | "custom";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [preset, setPreset] = useState<DateFilterPreset>("today");
  const [from, setFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    fetch("/api/shop/orders?limit=500")
      .then((r) => r.json())
      .then((body) => {
        const rows: Order[] = (body?.data?.orders || []).map((o: any) => ({
          id: o.id,
          status: (o.status || "pending") as Status,
          createdAt: o.createdAt,
          totalCents: o.totalCents ?? 0,
          isPaid: Boolean(o.isPaid || o.paid),
          items: (o.items || []).map((it: any) => ({
            id: it.id,
            itemName: it.itemName,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
          })),
        }));
        setOrders(rows);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    if (orders.length === 0) return [] as Order[];

    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    if (preset === "today") {
      fromDate = startOfDay(now);
      toDate = endOfDay(now);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      fromDate = startOfDay(y);
      toDate = endOfDay(y);
    } else if (preset === "last7") {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      fromDate = startOfDay(s);
      toDate = endOfDay(now);
    } else {
      fromDate = startOfDay(new Date(from));
      toDate = endOfDay(new Date(to));
    }

    return orders.filter((o) => {
      if (!(o.status === "completed" && o.isPaid)) return false;
      const d = new Date(o.createdAt);
      return d >= fromDate && d <= toDate;
    });
  }, [orders, preset, from, to]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((s, o) => s + (o.totalCents || 0), 0) / 100;
    const avgOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;

    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of filteredOrders) {
      for (const it of o.items) {
        const key = it.itemName;
        const prev = itemMap.get(key) || { name: it.itemName, qty: 0, revenue: 0 };
        prev.qty += it.quantity;
        prev.revenue += (it.unitPriceCents * it.quantity) / 100;
        itemMap.set(key, prev);
      }
    }
    const topItems = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      topItems,
    };
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted-foreground">Loading reports…</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setFilterOpen(true)}
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </div>
      <div className="mb-4 text-sm text-neutral-500">
        Showing data for{" "}
        {preset === "today"
          ? "Today"
          : preset === "yesterday"
          ? "Yesterday"
          : preset === "last7"
          ? "Last 7 days"
          : `${from} — ${to}`}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <Card className="bg-white h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.topItems.length === 0 && (
                <div className="text-sm text-neutral-400">No data.</div>
              )}
              <div className="space-y-3">
                {metrics.topItems.map((it) => (
                  <div key={it.name} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-neutral-500">{formatCurrency(it.revenue)}</div>
                    </div>
                    <div className="text-sm">{it.qty}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardContent className="py-4">
              <div className="text-xs text-neutral-500 mb-1">Orders</div>
              <div className="text-2xl font-semibold">{metrics.totalOrders}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="py-4">
              <div className="text-xs text-neutral-500 mb-1">Avg. Order Value</div>
              <div className="text-2xl font-semibold">{formatCurrency(metrics.avgOrderValue)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="py-4">
              <div className="text-xs text-neutral-500 mb-1">Revenue</div>
              <div className="text-2xl font-semibold">{formatCurrency(metrics.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="py-4">
              <div className="text-xs text-neutral-500 mb-1">Net Sales</div>
              <div className="text-2xl font-semibold">{formatCurrency(metrics.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="py-4">
              <div className="text-xs text-neutral-500 mb-1">Tax</div>
              <div className="text-2xl font-semibold">{formatCurrency(0)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {filterOpen && (
        <dialog open className="modal">
          <div className="modal-box max-w-md relative rounded-2xl bg-white border border-neutral-200">
            <button
              className="absolute right-2 top-2 inline-grid place-items-center size-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 focus:outline-none focus-visible:outline-none"
              onClick={() => setFilterOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Filter className="size-4" />
              <span>Filter</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-600 mb-1">Filter</div>
                <select
                  className="select select-bordered w-full"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as DateFilterPreset)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-neutral-600 mb-1">From</div>
                  <input
                    type="date"
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    disabled={preset !== "custom"}
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-600 mb-1">To</div>
                  <input
                    type="date"
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={preset !== "custom"}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline rounded-xl bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50"
                onClick={() => setFilterOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn bg-[#855439] border-[#855439] hover:bg-[#74452d] text-white rounded-xl"
                onClick={() => setFilterOpen(false)}
              >
                Apply
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setFilterOpen(false)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
