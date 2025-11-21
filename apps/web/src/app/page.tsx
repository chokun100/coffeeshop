"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Coffee,
  Search,
  Minus,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Chip } from "@/components/headless/chip";
import { Quantity } from "@/components/headless/quantity";
type Category = "All" | "Espresso" | "Milk" | "Iced" | "Seasonal";

type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  categories: Exclude<Category, "All">[];
  imageUrl?: string;
};

type OrderType = "dine_in" | "takeaway";

type Sugar = "none" | "less" | "normal" | "extra";

type CartItem = {
  key: string; // variant key (includes options)
  itemId: string;
  name: string;
  price: number; // base price (THB)
  sugar: Sugar;
  extraShotQty: number;
  notes?: string;
  quantity: number;
};

const EXTRA_SHOT_PRICE = 10; // THB
const MAX_EXTRA_SHOT = 3;

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);
}

export default function Home() {
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prefilledFromOrderId, setPrefilledFromOrderId] = useState<string | null>(null);

  // customization modal state
  const [customizing, setCustomizing] = useState<Item | null>(null);
  const sugarPercOptions = [0, 25, 50, 75, 100] as const;
  type SweetPct = typeof sugarPercOptions[number];
  const sugarFromPercent = (p: SweetPct): Sugar => (p <= 0 ? "none" : p <= 25 ? "less" : p <= 50 ? "normal" : "extra");
  const percentFromSugar = (s: Sugar): SweetPct => (s === "none" ? 0 : s === "less" ? 25 : s === "normal" ? 50 : 75);
  const sweetPctFromKey = (key: string): SweetPct => {
    const m = key.match(/\|s:(\d{1,3})\|/);
    if (!m) return 50 as SweetPct;
    const p = parseInt(m[1], 10);
    return (sugarPercOptions as readonly number[]).includes(p) ? (p as SweetPct) : (50 as SweetPct);
  };
  const [customSweetPct, setCustomSweetPct] = useState<SweetPct>(50);
  const [customShotQty, setCustomShotQty] = useState(0);
  const [customNotes, setCustomNotes] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [tables, setTables] = useState<{ id: number; name: string }[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [showTableSelectionModal, setShowTableSelectionModal] = useState(false);

  // Fetch menu from API
  useEffect(() => {
    setLoading(true);
    
    // Fetch tables
    fetch("/api/shop/tables")
      .then((r) => r.json())
      .then((body) => {
        const t = body?.data?.tables || [];
        setTables(t);
        if (t.length > 0) setSelectedTableId(t[0].id);
      })
      .catch(() => setTables([]));

    fetch("/api/shop/menu")
      .then((res) => res.json())
      .then((body) => {
        const categories = body.data?.categories ?? [];
        const flat: Item[] = [];
        for (const cat of categories) {
          for (const mi of cat.items ?? []) {
            flat.push({
              id: String(mi.id),
              name: mi.name,
              description: mi.description ?? "",
              price: mi.priceCents / 100, // convert cents to Baht
              categories: [cat.name as Exclude<Category, "All">],
              imageUrl: mi.imageUrl ?? undefined,
            });
          }
        }
        setItems(flat);
      })
      .catch((e) => console.error("Failed to fetch menu", e))
      .finally(() => setLoading(false));
  }, []);

  // If coming from /receipt/[id] with ?fromOrder=ID, preload that order into cart
  useEffect(() => {
    const fromOrder = searchParams.get("fromOrder");
    if (!fromOrder || prefilledFromOrderId === fromOrder) return;
    if (!items.length) return;

    (async () => {
      try {
        const res = await fetch(`/api/shop/orders/${fromOrder}`);
        if (!res.ok) return;
        const body = await res.json();
        const order = body?.data?.order;
        const orderItems: any[] = order?.items ?? [];
        if (!orderItems.length) return;

        const nextCart: CartItem[] = [];
        for (const it of orderItems) {
          const menu = items.find((m) => m.id === String(it.menuItemId));
          if (!menu) continue;

          const sugar: Sugar = (it.sugarLevel as Sugar) || "normal";
          const sugarPct = percentFromSugar(sugar);

          const rawNotes: string | undefined = it.notes ?? undefined;
          const extraMatch = rawNotes?.match(/extra\s*shot\s*x(\d+)/i);
          const extraShotQty = extraMatch ? parseInt(extraMatch[1], 10) || 0 : 0;
          let otherNotes = rawNotes || "";
          if (extraMatch) {
            otherNotes = otherNotes.replace(extraMatch[0], "").trim();
            otherNotes = otherNotes.replace(/^;\s*|\s*;$/g, "").trim();
          }
          const notes = otherNotes || undefined;

          const keyBase = `${menu.id}|s:${sugarPct}|x:${extraShotQty}|n:${notes ?? ""}`;
          const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const key = `${keyBase}|u:${uid}`;

          nextCart.push({
            key,
            itemId: String(menu.id),
            name: menu.name,
            price: menu.price,
            sugar,
            extraShotQty,
            notes,
            quantity: typeof it.quantity === "number" ? it.quantity : 1,
          });
        }

        if (nextCart.length > 0) {
          setCartItems(nextCart);
          setPrefilledFromOrderId(fromOrder);
        }
      } catch (e) {
        console.error("Failed to preload cart from order", e);
      }
    })();
  }, [searchParams, items, prefilledFromOrderId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const inCat = category === "All" || i.categories.includes(category);
      const inQuery =
        !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [category, query, items]);


  const openCustomize = (
    itemId: string,
    preset?: { sweetPct?: SweetPct; extraShotQty?: number; notes?: string; editKey?: string },
  ) => {
    const item = items.find((x) => x.id === itemId) || null;
    setCustomizing(item);
    setCustomSweetPct(preset?.sweetPct ?? 50);
    setCustomShotQty(preset?.extraShotQty ?? 0);
    setCustomNotes(preset?.notes ?? "");
    setEditingKey(preset?.editKey ?? null);
  };

  const addToCart = (itemId: string) => {
    const item = items.find((x) => x.id === itemId);
    if (!item) return;
    const defaultSweetPct: SweetPct = 50;
    const sugar = sugarFromPercent(defaultSweetPct);
    const key = `${item.id}|s:${defaultSweetPct}|x:0|n:`;
    setCartItems((prev) => {
      const idx = prev.findIndex((ci) => ci.key === key);
      if (idx === -1)
        return [
          ...prev,
          {
            key,
            itemId: item.id,
            name: item.name,
            price: item.price,
            sugar,
            extraShotQty: 0,
            notes: undefined,
            quantity: 1,
          },
        ];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };


  const clear = () => setCartItems([]);

  const lineItems = useMemo(() => {
    return cartItems
      .map((ci) => {
        const unit = ci.price + ci.extraShotQty * EXTRA_SHOT_PRICE;
        return { ...ci, unit, total: unit * ci.quantity };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cartItems]);

  const pendingRemoveItem = useMemo(
    () => lineItems.find((li) => li.key === pendingRemoveKey) ?? null,
    [lineItems, pendingRemoveKey],
  );

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const total = subtotal; // prices already include VAT


  const submitOrder = async () => {
    if (lineItems.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const tableName = tables.find((t) => t.id === selectedTableId)?.name || "Unknown Table";
      const payload = {
        customerName: tableName,
        orderType,
        items: lineItems.map((li) => ({
          menuItemId: Number(li.itemId),
          itemName: li.name,
          quantity: li.quantity,
          unitPriceCents: Math.round(li.unit * 100),
          size: "M",
          milkType: "none",
          sugarLevel: li.sugar,
          notes: [
            li.extraShotQty > 0 ? `extra shot x${li.extraShotQty}` : null,
            li.notes && li.notes.trim() ? li.notes.trim() : null,
          ]
            .filter(Boolean)
            .join("; ") || undefined,
        })),
      };
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      const id = body?.data?.order?.id as number | undefined;
      if (id) {
        setCartItems([]);
        router.push((`/receipt/${id}` as unknown) as Route);
      }
    } catch (e) {
      console.error("Failed to submit order", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
        Loading menu…
      </div>
    );
  }

  return (
    <div>
        <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search menu..."
                  className="pl-9 bg-white"
                />
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-2 px-2 border-b sm:static sm:bg-transparent sm:border-none sm:p-0">
              {(["All", "Espresso", "Milk", "Iced", "Seasonal"] as Category[]).map(
                (c) => (
                  <Chip
                    key={c}
                    selected={category === c}
                    onClick={() => setCategory(c)}
                    className={
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-all " +
                      (category === c
                        ? "bg-amber-900 text-white border-amber-900 shadow-sm"
                        : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900")
                    }
                  >
                    {c}
                  </Chip>
                ),
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCustomize(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openCustomize(item.id);
                    }
                  }}
                  className="group relative flex flex-col h-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-amber-200/50 active:scale-[0.98] cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100 shrink-0">
                    <img
                      src={item.imageUrl || "/images/default-menu.svg"}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/default-menu.svg";
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-neutral-900 truncate" title={item.name}>{item.name}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="text-sm font-bold text-amber-700">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="rounded-full bg-amber-50 p-1.5 text-amber-700 opacity-0 transition-opacity group-hover:opacity-100">
                        <Plus className="size-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="hidden lg:block col-span-12 lg:col-span-4 lg:sticky lg:top-6 lg:self-start space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-neutral-900">Current Order</h3>
                  <button
                    onClick={() => setShowTableSelectionModal(true)}
                    className="text-xs font-medium px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2"
                  >
                    <span>{tables.find(t => t.id === selectedTableId)?.name || "Select Table"}</span>
                    <span className="text-amber-600 text-[10px]">▼</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-200/50 rounded-xl">
                  <button
                    onClick={() => setOrderType("dine_in")}
                    className={`py-1.5 text-sm font-medium rounded-lg transition-all ${
                      orderType === "dine_in"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    Dine In
                  </button>
                  <button
                    onClick={() => setOrderType("takeaway")}
                    className={`py-1.5 text-sm font-medium rounded-lg transition-all ${
                      orderType === "takeaway"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    Takeaway
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-380px)] overflow-y-auto p-4 space-y-4 min-h-[200px]">
                {lineItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                      <Coffee className="size-6" />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">Your cart is empty</p>
                    <p className="text-xs text-neutral-400 mt-1">Add some delicious coffee!</p>
                  </div>
                )}

                {lineItems.map((li) => (
                  <div key={li.key} className="flex items-start justify-between group">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() =>
                        openCustomize(li.itemId, {
                          sweetPct: sweetPctFromKey(li.key),
                          extraShotQty: li.extraShotQty,
                          notes: li.notes,
                          editKey: li.key,
                        })
                      }
                    >
                      <div className="font-medium text-neutral-900 truncate">{li.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {sweetPctFromKey(li.key)}% sweet
                        {li.extraShotQty > 0 && ` • +${li.extraShotQty} shot`}
                        {li.notes && ` • ${li.notes}`}
                      </div>
                      <div className="text-sm font-semibold text-amber-700 mt-1">
                        {formatCurrency(li.unit)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-4">
                      <Quantity
                        value={li.quantity}
                        onChange={(v) =>
                          setCartItems((prev) => {
                            const next = prev.map((ci) =>
                              ci.key === li.key ? { ...ci, quantity: Math.max(0, v) } : ci,
                            );
                            return next.filter((ci) => ci.quantity > 0);
                          })
                        }
                      >
                        {({ dec, inc }) => (
                          <div className="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-200 p-1">
                            <button
                              type="button"
                              className="size-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-neutral-600"
                              onClick={() => {
                                if (li.quantity === 1) {
                                  setPendingRemoveKey(li.key);
                                  return;
                                }
                                dec();
                              }}
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="text-sm font-medium tabular-nums min-w-[1.25rem] text-center">
                              {li.quantity}
                            </span>
                            <button
                              type="button"
                              className="size-6 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-neutral-600"
                              onClick={inc}
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        )}
                      </Quantity>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-neutral-600">
                    <span>Subtotal (incl. VAT)</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-neutral-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base bg-amber-900 hover:bg-amber-800 text-white rounded-xl shadow-amber-900/20 shadow-lg"
                  disabled={lineItems.length === 0 || submitting}
                  onClick={submitOrder}
                >
                  {submitting ? "Processing..." : "Submit Order"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
        {/* Mobile Floating Cart Bar */}
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          {lineItems.length > 0 && (
            <button
              onClick={() => setShowMobileCart(true)}
              className="w-full bg-neutral-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-4 fade-in duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium">
                  {lineItems.reduce((a, b) => a + b.quantity, 0)} items
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs text-neutral-300">Total</span>
                  <span className="font-bold text-sm">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                View Order
              </div>
            </button>
          )}
        </div>

        {/* Mobile Cart Drawer */}
        {showMobileCart && (
          <dialog open className="modal modal-bottom sm:modal-middle">
            <div className="modal-box bg-[#FBF7F2] p-0 overflow-hidden max-h-[85vh] flex flex-col w-full">
              {/* Header */}
              <div className="p-4 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-lg">Current Order</h3>
                  <div className="mt-1">
                    <button
                        onClick={() => setShowTableSelectionModal(true)}
                        className="text-xs font-medium px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2"
                    >
                        <span>{tables.find(t => t.id === selectedTableId)?.name || "Select Table"}</span>
                        <span className="text-amber-600 text-[10px]">▼</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileCart(false)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              {/* Mobile List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-200/50 rounded-xl mb-4">
                  <button
                    onClick={() => setOrderType("dine_in")}
                    className={`py-1.5 text-sm font-medium rounded-lg transition-all ${
                      orderType === "dine_in"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    Dine In
                  </button>
                  <button
                    onClick={() => setOrderType("takeaway")}
                    className={`py-1.5 text-sm font-medium rounded-lg transition-all ${
                      orderType === "takeaway"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    Takeaway
                  </button>
                </div>

                {lineItems.map((li) => (
                  <div key={li.key} className="flex items-start justify-between group border-b border-neutral-100 pb-3 last:border-0">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() =>
                        openCustomize(li.itemId, {
                          sweetPct: sweetPctFromKey(li.key),
                          extraShotQty: li.extraShotQty,
                          notes: li.notes,
                          editKey: li.key,
                        })
                      }
                    >
                      <div className="font-medium text-neutral-900 truncate">{li.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {sweetPctFromKey(li.key)}% sweet
                        {li.extraShotQty > 0 && ` • +${li.extraShotQty} shot`}
                      </div>
                      <div className="text-sm font-semibold text-amber-700 mt-1">
                        {formatCurrency(li.unit)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-4">
                      <Quantity
                        value={li.quantity}
                        onChange={(v) =>
                          setCartItems((prev) => {
                            const next = prev.map((ci) =>
                              ci.key === li.key ? { ...ci, quantity: Math.max(0, v) } : ci,
                            );
                            return next.filter((ci) => ci.quantity > 0);
                          })
                        }
                      >
                        {({ dec, inc }) => (
                          <div className="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-200 p-1">
                            <button
                              type="button"
                              className="size-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-neutral-600"
                              onClick={() => {
                                if (li.quantity === 1) {
                                  setPendingRemoveKey(li.key);
                                  return;
                                }
                                dec();
                              }}
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="text-sm font-medium tabular-nums min-w-[1.25rem] text-center">
                              {li.quantity}
                            </span>
                            <button
                              type="button"
                              className="size-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-neutral-600"
                              onClick={inc}
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        )}
                      </Quantity>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-200 bg-white shrink-0 safe-area-bottom">
                <div className="space-y-2 mb-4">
                   <div className="flex justify-between text-base font-bold text-neutral-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base bg-amber-900 hover:bg-amber-800 text-white rounded-xl shadow-amber-900/20 shadow-lg"
                  disabled={lineItems.length === 0 || submitting}
                  onClick={submitOrder}
                >
                  {submitting ? "Processing..." : "Submit Order"}
                </Button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => setShowMobileCart(false)}>
              <button>close</button>
            </form>
          </dialog>
        )}

        {/* Table Selection Modal */}
        {showTableSelectionModal && (
          <dialog open className="modal">
            <div className="modal-box max-w-md relative rounded-2xl bg-white border border-neutral-200 p-6">
              <button 
                className="absolute right-4 top-4 inline-grid place-items-center size-8 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
                onClick={() => setShowTableSelectionModal(false)}
              >
                <X className="size-4" />
              </button>
              
              <h3 className="font-bold text-lg text-neutral-900 mb-1">Select Table</h3>
              <p className="text-sm text-neutral-500 mb-6">Choose a table for this order.</p>
              
              <div className="grid grid-cols-3 gap-3">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTableId(t.id);
                      setShowTableSelectionModal(false);
                    }}
                    className={`
                      relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                      ${selectedTableId === t.id 
                        ? "border-amber-600 bg-amber-50 text-amber-800 shadow-sm" 
                        : "border-neutral-100 bg-white text-neutral-600 hover:border-amber-200 hover:bg-neutral-50"
                      }
                    `}
                  >
                    <span className="text-lg font-bold">{t.name}</span>
                    {selectedTableId === t.id && (
                      <div className="absolute top-2 right-2 size-2 rounded-full bg-amber-600" />
                    )}
                  </button>
                ))}
                {tables.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        No tables available.
                    </div>
                )}
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => setShowTableSelectionModal(false)}>
              <button>close</button>
            </form>
          </dialog>
        )}

        {/* Customize Modal */}
        {customizing && (
          <dialog open className="modal">
            <div className="modal-box max-w-lg relative rounded-2xl bg-[#FBF7F2] border border-neutral-200">
              <button className="absolute right-2 top-2 inline-grid place-items-center size-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 focus:outline-none focus-visible:outline-none" onClick={() => { setCustomizing(null); setEditingKey(null); }} aria-label="Close">✕</button>
              <div className="border-b border-neutral-200 pb-3 mb-4">
                <h3 className="font-semibold">Customize {customizing.name}</h3>
                <p className="text-sm text-neutral-400 mt-1">Set sweetness and extra shots. Add notes if needed.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="text-sm font-medium mb-2 text-neutral-700">Sweetness</div>
                  <div className="flex flex-wrap gap-2">
                    {sugarPercOptions.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`btn btn-sm rounded-xl px-4 ${
                          customSweetPct === p
                            ? "bg-[#855439] hover:bg-[#74452d] text-white border-[#855439] shadow-sm"
                            : "btn-outline text-neutral-600 border-neutral-200 hover:bg-white hover:border-neutral-300"
                        } focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none ring-0`}
                        onClick={() => setCustomSweetPct(p)}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Choose sweetness level.</p>
                </div>
                <div className="my-4 border-t border-neutral-200" />

                <div>
                  <div className="text-sm font-medium mb-2 text-neutral-700">Extra Shot</div>
                  <div className="flex items-center gap-3 rounded-xl bg-[#F4EAE1] border border-amber-200 px-3 py-2">
                    <Coffee className="size-4 text-amber-700" />
                    <span className="flex-1">Additional espresso shot</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-grid place-items-center size-8 rounded-md border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:outline-none text-neutral-700"
                        onClick={() => setCustomShotQty((v) => Math.max(0, v - 1))}
                        disabled={customShotQty <= 0}
                      >
                        −
                      </button>
                      <span className="px-3 tabular-nums text-sm select-none min-w-4 text-center">{customShotQty}</span>
                      <button
                        type="button"
                        className="inline-grid place-items-center size-8 rounded-md border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:outline-none text-neutral-700"
                        onClick={() => setCustomShotQty((v) => Math.min(MAX_EXTRA_SHOT, v + 1))}
                        disabled={customShotQty >= MAX_EXTRA_SHOT}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">Add more intensity with extra shots.</p>
                </div>
                <div className="my-4 border-t border-neutral-200" />

                <div>
                  <div className="text-sm font-medium mb-2 text-neutral-700">Notes</div>
                  <textarea
                    className="textarea textarea-bordered w-full rounded-xl"
                    placeholder="Add any special instructions..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-action mt-8 -mx-6 px-6 py-4 bg-white/70 border-t border-neutral-200 rounded-b-2xl w-auto flex items-center gap-3 justify-between">
                <button className="btn btn-outline rounded-xl min-w-28 font-medium bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50" onClick={() => { setCustomizing(null); setEditingKey(null); }} type="button">Cancel</button>
                <button
                  className="btn bg-[#855439] border-[#855439] hover:bg-[#74452d] text-white shadow-md rounded-xl flex-1 justify-center h-12"
                  type="button"
                  onClick={() => {
                    if (!customizing) return;
                    const sugar = sugarFromPercent(customSweetPct);
                    const trimmed = customNotes.trim();
                    const baseKey = `${customizing.id}|s:${customSweetPct}|x:${customShotQty}|n:${trimmed}`;
                    setCartItems((prev) => {
                      if (editingKey) {
                        const uidMatch = editingKey.match(/\|u:([^|]+)$/);
                        const uid = uidMatch ? uidMatch[1] : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                        const newKey = `${baseKey}|u:${uid}`;
                        return prev.map((ci) =>
                          ci.key === editingKey
                            ? {
                                ...ci,
                                key: newKey,
                                sugar,
                                extraShotQty: customShotQty,
                                notes: trimmed || undefined,
                              }
                            : ci,
                        );
                      } else {
                        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                        const newKey = `${baseKey}|u:${uid}`;
                        return [
                          ...prev,
                          {
                            key: newKey,
                            itemId: customizing.id,
                            name: customizing.name,
                            price: customizing.price,
                            sugar,
                            extraShotQty: customShotQty,
                            notes: trimmed || undefined,
                            quantity: 1,
                          },
                        ];
                      }
                    });
                    setCustomizing(null);
                    setEditingKey(null);
                  }}
                >
                  <span className="mr-2 inline-flex items-center justify-center size-5 rounded-full border border-white/40 bg-white/10">
                    <Check className="size-3" />
                  </span>
                  {editingKey ? "Save Changes" : "Add to Order"}
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => { setCustomizing(null); setEditingKey(null); }}>
              <button>close</button>
            </form>
          </dialog>
        )}

        {/* Remove Item Confirm Modal */}
        {pendingRemoveItem && (
          <dialog open className="modal">
            <div className="modal-box max-w-sm relative rounded-2xl bg-[#FBF7F2] border border-neutral-200">
              <button
                className="absolute right-2 top-2 inline-grid place-items-center size-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 focus:outline-none focus-visible:outline-none"
                onClick={() => setPendingRemoveKey(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="pb-3 mb-4">
                <h3 className="font-semibold text-neutral-900">ลบรายการนี้หรือไม่?</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  {pendingRemoveItem.name} x{pendingRemoveItem.quantity}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-outline rounded-xl min-w-24 bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50"
                  onClick={() => setPendingRemoveKey(null)}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="btn bg-[#855439] border-[#855439] hover:bg-[#74452d] text-white rounded-xl min-w-24"
                  onClick={() => {
                    if (!pendingRemoveItem) return;
                    setCartItems((prev) => prev.filter((ci) => ci.key !== pendingRemoveItem.key));
                    setPendingRemoveKey(null);
                  }}
                >
                  ลบรายการ
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => setPendingRemoveKey(null)}>
              <button>close</button>
            </form>
          </dialog>
        )}
    </div>
  );
}
