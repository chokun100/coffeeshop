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

  // Fetch menu from API
  useEffect(() => {
    setLoading(true);
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
      const payload = {
        customerName: "Table 5",
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
        <div className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xl font-semibold">
              <div className="size-6 rounded-md bg-amber-800 flex items-center justify-center text-white">
                <Coffee className="size-4" />
              </div>
              <span>Cafe Station</span>
            </div>
            <div>
              <span className="rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-600">Internal Ordering</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Coffee Menu</h2>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search coffee"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(["All", "Espresso", "Milk", "Iced", "Seasonal"] as Category[]).map(
                (c) => (
                  <Chip
                    key={c}
                    selected={category === c}
                    onClick={() => setCategory(c)}
                    className={
                      "rounded-full border px-3 py-1 text-sm transition-colors " +
                      (category === c
                        ? "bg-neutral-100 text-neutral-900 border-neutral-200"
                        : "bg-white text-neutral-700 hover:bg-neutral-50")
                    }
                  >
                    {c}
                  </Chip>
                ),
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                  className="rounded-lg border bg-white p-4 shadow-sm cursor-pointer hover:bg-neutral-50 focus:outline-none focus-visible:outline-none"
                >
                  <img
                    src={item.imageUrl || "/images/default-menu.svg"}
                    alt={item.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/default-menu.svg";
                    }}
                    className="mb-3 h-28 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-500">
                      {formatCurrency(item.price)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-4">
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-full bg-neutral-100 px-1 py-0.5 text-[11px] border border-neutral-200 shadow-inner">
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded-full transition-colors ${
                          orderType === "dine_in"
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                        onClick={() => setOrderType("dine_in")}
                      >
                        Dine in
                      </button>
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded-full transition-colors ${
                          orderType === "takeaway"
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                        onClick={() => setOrderType("takeaway")}
                      >
                        Take away
                      </button>
                    </div>
                    <span className="rounded-full border bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600">Table 5</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {lineItems.length === 0 && (
                    <div className="text-sm text-muted-foreground">No items yet.</div>
                  )}

                  {lineItems.map((li) => (
                    <div key={li.key} className="flex items-start justify-between">
                      <div
                        className="min-w-0"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openCustomize(li.itemId, {
                              sweetPct: sweetPctFromKey(li.key),
                              extraShotQty: li.extraShotQty,
                              notes: li.notes,
                              editKey: li.key,
                            });
                          }
                        }}
                      >
                        <div className="truncate">{li.name}</div>
                        <div className="text-xs text-neutral-500">x{li.quantity} • sweet {sweetPctFromKey(li.key)}% {li.extraShotQty > 0 ? `• extra shot x${li.extraShotQty}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="tabular-nums text-neutral-700 w-16 text-right">
                          {formatCurrency(li.unit)}
                        </div>
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
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  if (li.quantity === 1) {
                                    setPendingRemoveKey(li.key);
                                    return;
                                  }
                                  dec();
                                }}
                              >
                                <Minus className="size-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={inc}>
                                <Plus className="size-4" />
                              </Button>
                            </>
                          )}
                        </Quantity>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            openCustomize(li.itemId, {
                              sweetPct: sweetPctFromKey(li.key),
                              extraShotQty: li.extraShotQty,
                              notes: li.notes,
                              editKey: li.key,
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal (incl. VAT 7%)</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3">
                <div className="flex gap-3">
                  <Button variant="outline" className="w-28" onClick={clear}>Clear</Button>
                  <Button
                    className="flex-1 bg-amber-700 hover:bg-amber-800"
                    disabled={lineItems.length === 0 || submitting}
                    onClick={submitOrder}
                  >
                    {submitting ? "Submitting..." : "Submit Order"}
                  </Button>
                </div>
                {submitted && (
                  <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    Order submitted. Preparing now.
                  </div>
                )}
              </CardFooter>
            </Card>
          </aside>
        </div>
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
