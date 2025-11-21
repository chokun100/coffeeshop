"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search as SearchIcon, Filter, Eye, Printer } from "lucide-react";

type OrderRow = {
  id: number;
  customerName: string;
  orderType: string;
  status: string;
  totalCents: number;
  createdAt: string;
  itemCount: number;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function InvoicesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/shop/orders?limit=200")
      .then((r) => r.json())
      .then((body) => {
        const rows: OrderRow[] = (body?.data?.orders || []).map((o: any) => ({
          id: o.id,
          customerName: o.customerName || "WALKIN",
          orderType: o.orderType,
          status: o.status,
          totalCents: o.totalCents ?? 0,
          createdAt: o.createdAt,
          itemCount: o.itemCount ?? 0,
        }));
        setOrders(rows);
      })
      .finally(() => setLoading(false));
  }, []);

  const todayInvoices = useMemo(() => {
    return orders.filter((o) => isToday(new Date(o.createdAt)));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return todayInvoices;
    return todayInvoices.filter((o) => {
      const idMatch = String(o.id).includes(q);
      const custMatch = o.customerName.toLowerCase().includes(q);
      return idMatch || custMatch;
    });
  }, [query, todayInvoices]);

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Invoices</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search Invoices"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600">Search</Button>
          <Button variant="outline" size="icon" aria-label="Filters">
            <Filter className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Showing Invoices for Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="border-b text-neutral-600">
                  <th className="px-3 py-2 text-left font-medium">Invoice ID</th>
                  <th className="px-3 py-2 text-left font-medium">Order IDs</th>
                  <th className="px-3 py-2 text-left font-medium">Tokens</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-3 py-2 text-right font-medium">Tax</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-left font-medium">Delivery Type</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  <th className="px-3 py-2 text-left font-medium">Table</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const total = (o.totalCents || 0) / 100;
                  const subtotal = total;
                  const tax = 0;
                  const dt = new Date(o.createdAt);
                  return (
                    <tr key={o.id} className="border-b hover:bg-neutral-50">
                      <td className="px-3 py-2">{o.id}</td>
                      <td className="px-3 py-2">{o.id}</td>
                      <td className="px-3 py-2">{o.itemCount}</td>
                      <td className="px-3 py-2">{dt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(subtotal)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(tax)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(total)}</td>
                      <td className="px-3 py-2">{o.orderType === "dine_in" ? "DINE IN" : "TAKEAWAY"}</td>
                      <td className="px-3 py-2">{o.customerName || "WALKIN"}</td>
                      <td className="px-3 py-2">N/A</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline" size="icon" aria-label="View">
                            <a href={`/receipt/${o.id}`}>
                              <Eye className="size-4" />
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="icon" aria-label="Print">
                            <a href={`/receipt/${o.id}`} target="_blank" rel="noreferrer">
                              <Printer className="size-4" />
                            </a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-neutral-500" colSpan={11}>No invoices for today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
