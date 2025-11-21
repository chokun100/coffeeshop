"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Image as ImageIcon, Plus, Search, Filter, X } from "lucide-react";
import TablesSettings from "./tables";
import { useStoreSettings } from "@/store/store-settings";

type MenuItem = {
  id: number;
  name: string;
  imageUrl: string | null;
  price: number;
  categoryName: string;
};

type MenuCategory = {
  id: number;
  name: string;
  items: MenuItem[];
};

type SettingsSection = "details" | "print" | "tables" | "menu" | "tax" | "payments";

export default function SettingsPage() {
  const { storeName, setStoreName } = useStoreSettings();
  const [section, setSection] = useState<SettingsSection>("details");
  const [storeNameInput, setStoreNameInput] = useState<string>(storeName);
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [enablePrint, setEnablePrint] = useState<boolean>(true);
  const [showStoreDetails, setShowStoreDetails] = useState<boolean>(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<"58mm" | "80mm">("80mm");
  const [printHeader, setPrintHeader] = useState<string>("");
  const [printFooter, setPrintFooter] = useState<string>("");
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [printToken, setPrintToken] = useState<boolean>(true);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Menu Management State
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    categoryId: "",
    newCategoryName: "",
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(n);

  const fetchMenu = () => {
    setLoading(true);
    fetch("/api/shop/menu")
      .then((res) => res.json())
      .then((body) => {
        const cats: MenuCategory[] = (body?.data?.categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          items: (c.items || []).map((it: any) => ({
            id: it.id,
            name: it.name,
            imageUrl: it.imageUrl || null,
            price: (it.priceCents ?? 0) / 100,
            categoryName: c.name,
          })),
        }));
        setCategories(cats);
        const v: Record<number, string> = {};
        for (const cat of cats) {
          for (const it of cat.items) v[it.id] = it.imageUrl || "";
        }
        setValues(v);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Load store details (name, address, phone) from API
  useEffect(() => {
    fetch("/api/shop/settings")
      .then((res) => res.json())
      .then((body) => {
        const settings = body?.data?.settings || {};
        const nameFromDb: string | undefined = settings.storeName;
        const addressFromDb: string | undefined = settings.address ?? undefined;
        const emailFromDb: string | undefined = settings.email ?? undefined;
        const phoneFromDb: string | undefined = settings.phone ?? undefined;
        const enablePrintFromDb: boolean | undefined = settings.enablePrint ?? undefined;
        const showStoreFromDb: boolean | undefined = settings.showStoreDetails ?? undefined;
        const showCustomerFromDb: boolean | undefined = settings.showCustomerDetails ?? undefined;
        const printFormatFromDb: string | undefined = settings.printFormat ?? undefined;
        const printHeaderFromDb: string | undefined = settings.printHeader ?? undefined;
        const printFooterFromDb: string | undefined = settings.printFooter ?? undefined;
        const showNotesFromDb: boolean | undefined = settings.showNotes ?? undefined;
        const printTokenFromDb: boolean | undefined = settings.printToken ?? undefined;
        const logoUrlFromDb: string | undefined = settings.logoUrl ?? undefined;
        if (nameFromDb && nameFromDb.trim()) {
          const normalized = nameFromDb.trim();
          setStoreName(normalized);
          setStoreNameInput(normalized);
        }
        if (typeof addressFromDb === "string") {
          setAddress(addressFromDb);
        }
        if (typeof emailFromDb === "string") {
          setEmail(emailFromDb);
        }
        if (typeof phoneFromDb === "string") {
          setPhone(phoneFromDb);
        }
        if (typeof enablePrintFromDb === "boolean") setEnablePrint(enablePrintFromDb);
        if (typeof showStoreFromDb === "boolean") setShowStoreDetails(showStoreFromDb);
        if (typeof showCustomerFromDb === "boolean") setShowCustomerDetails(showCustomerFromDb);
        if (printFormatFromDb === "58mm" || printFormatFromDb === "80mm") setPrintFormat(printFormatFromDb);
        if (typeof printHeaderFromDb === "string") setPrintHeader(printHeaderFromDb);
        if (typeof printFooterFromDb === "string") setPrintFooter(printFooterFromDb);
        if (typeof showNotesFromDb === "boolean") setShowNotes(showNotesFromDb);
        if (typeof printTokenFromDb === "boolean") setPrintToken(printTokenFromDb);
        if (typeof logoUrlFromDb === "string") setLogoUrl(logoUrlFromDb);
      })
      .catch(() => {
        // ignore, UI will fall back to current context/local values
      });
  }, [setStoreName]);

  const save = async (id: number, newUrl?: string) => {
    setSavingId(id);
    try {
      const imageUrl = (newUrl ?? values[id])?.trim() || null;
      await fetch(`/api/shop/menu/items/${id}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((it) => (it.id === id ? { ...it, imageUrl } : it)),
        })),
      );
      setValues((prev) => ({ ...prev, [id]: imageUrl || "" }));
    } finally {
      setSavingId(null);
    }
  };

  const clearImage = async (id: number) => {
    setValues((v) => ({ ...v, [id]: "" }));
    await save(id, "");
  };

  const openEdit = (it: MenuItem) => {
    setEditingId(it.id);
    setEditingName(it.name);
    setEditValue(values[it.id] ?? it.imageUrl ?? "");
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const json = await res.json();
      const url = json?.data?.url as string | undefined;
      if (url) {
        setEditValue(url);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 flex gap-6">
      {/* Left settings nav */}
      <aside className="hidden md:block w-56 shrink-0">
        <nav className="space-y-1">
          {[
            { key: "details", label: "Details" },
            { key: "print", label: "Print Settings" },
            { key: "tables", label: "Tables" },
            { key: "menu", label: "Menu Items" },
            { key: "tax", label: "Tax Setup" },
            { key: "payments", label: "Payment Types" },
          ].map((it) => (
            <button
              key={it.key}
              type="button"
              className={
                "w-full text-left rounded-lg px-3 py-2 text-sm " +
                (section === (it.key as SettingsSection)
                  ? "bg-neutral-100 text-neutral-900 border border-neutral-200"
                  : "text-neutral-700 hover:bg-neutral-50 border border-transparent")
              }
              onClick={() => setSection(it.key as SettingsSection)}
            >
              {it.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        {section === "details" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Store Details</h1>
              <p className="text-sm text-neutral-500 mt-1">Manage your store information and preferences.</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">General Information</h2>
                <p className="text-sm text-neutral-500 mt-1">Basic details about your coffee shop.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Store Name</label>
                    <Input
                      placeholder="e.g. Cafe Station"
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      className="bg-neutral-50 border-neutral-200 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Email</label>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-neutral-50 border-neutral-200 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Phone</label>
                    <Input
                      placeholder="+66 81 234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-neutral-50 border-neutral-200 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Currency</label>
                    <select className="select select-bordered w-full bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all">
                      <option>Thai Baht (฿)</option>
                      <option>US Dollar ($)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Address</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white transition-colors"
                    rows={3}
                    placeholder="123 Coffee Street, Bangkok, Thailand"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Digital Menu & QR</h2>
                <p className="text-sm text-neutral-500 mt-1">Settings for customer self-ordering.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                  <div>
                    <div className="font-medium text-neutral-900">Enable QR Menu</div>
                    <div className="text-sm text-neutral-500 mt-0.5">Allow customers to scan and view the digital menu.</div>
                  </div>
                  <input type="checkbox" className="toggle toggle-success" defaultChecked />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-white hover:bg-neutral-50">
                    Download QR Code
                  </Button>
                  <Button variant="outline" className="flex-1 bg-white hover:bg-neutral-50">
                    View Digital Menu
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                className="bg-amber-700 hover:bg-amber-800 text-white shadow-lg shadow-amber-900/20 min-w-32"
                type="button"
                onClick={async () => {
                  const trimmed = storeNameInput.trim() || "Cafe Station";
                  const trimmedAddress = address.trim() || null;
                  const trimmedEmail = email.trim() || null;
                  const trimmedPhone = phone.trim() || null;
                  try {
                    const res = await fetch("/api/shop/settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        storeName: trimmed,
                        address: trimmedAddress,
                        email: trimmedEmail,
                        phone: trimmedPhone,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to save settings");
                    const json = await res.json();
                    const nameFromDb: string | undefined = json?.data?.settings?.storeName;
                    const addressFromDb: string | undefined = json?.data?.settings?.address ?? undefined;
                    const emailFromDbRes: string | undefined = json?.data?.settings?.email ?? undefined;
                    const phoneFromDb: string | undefined = json?.data?.settings?.phone ?? undefined;

                    const normalized = nameFromDb?.trim() || trimmed;
                    setStoreName(normalized);
                    setStoreNameInput(normalized);
                    if (typeof addressFromDb === "string") setAddress(addressFromDb);
                    if (typeof emailFromDbRes === "string") setEmail(emailFromDbRes);
                    if (typeof phoneFromDb === "string") setPhone(phoneFromDb);
                  } catch {
                    // ถ้าเรียก API ไม่สำเร็จ ให้เก็บแค่ใน context/localStorage ไว้ใช้ชั่วคราว
                    setStoreName(trimmed);
                    setStoreNameInput(trimmed);
                    setAddress(address.trim());
                    setEmail(email.trim());
                    setPhone(phone.trim());
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {section === "print" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Print Settings</h1>
              <p className="text-sm text-neutral-500 mt-1">Configure receipt printing and layout.</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Receipt Configuration</h2>
                <p className="text-sm text-neutral-500 mt-1">Customize how your receipts look.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div>
                      <div className="font-medium text-neutral-900">Enable Print</div>
                      <div className="text-sm text-neutral-500 mt-0.5">Turn receipt printing on or off system-wide.</div>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-success"
                      checked={enablePrint}
                      onChange={(e) => setEnablePrint(e.target.checked)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                      <div>
                        <div className="font-medium text-neutral-900">Show Store Details</div>
                        <div className="text-xs text-neutral-500 mt-0.5">Include address & contact info.</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={showStoreDetails}
                        onChange={(e) => setShowStoreDetails(e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                      <div>
                        <div className="font-medium text-neutral-900">Show Customer Details</div>
                        <div className="text-xs text-neutral-500 mt-0.5">Include customer name/info.</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={showCustomerDetails}
                        onChange={(e) => setShowCustomerDetails(e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                      <div>
                        <div className="font-medium text-neutral-900">Show Item Notes</div>
                        <div className="text-xs text-neutral-500 mt-0.5">Include special requests.</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={showNotes}
                        onChange={(e) => setShowNotes(e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                      <div>
                        <div className="font-medium text-neutral-900">Print Queue Token</div>
                        <div className="text-xs text-neutral-500 mt-0.5">Include queue number (e.g., M01).</div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-sm"
                        checked={printToken}
                        onChange={(e) => setPrintToken(e.target.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Paper Format</label>
                    <select
                      className="select select-bordered w-full bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      value={printFormat}
                      onChange={(e) => setPrintFormat((e.target.value as "58mm" | "80mm") || "80mm")}
                    >
                      <option value="80mm">80mm (Standard Thermal)</option>
                      <option value="58mm">58mm (Compact)</option>
                    </select>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">Header Text</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white transition-colors"
                        rows={3}
                        placeholder="Welcome to Cafe Station"
                        value={printHeader}
                        onChange={(e) => setPrintHeader(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">Footer Text</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white transition-colors"
                        rows={3}
                        placeholder="Thank you, please come again!"
                        value={printFooter}
                        onChange={(e) => setPrintFooter(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Receipt Branding</h2>
                <p className="text-sm text-neutral-500 mt-1">Upload a logo to appear on your receipts.</p>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-6">
                  <div className="size-24 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center bg-neutral-50 overflow-hidden shrink-0">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="size-6 text-neutral-300 mx-auto mb-1" />
                        <span className="text-[10px] text-neutral-400">No logo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">Logo URL</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="bg-neutral-50 border-neutral-200 focus:bg-white"
                        />
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append("file", file);
                              const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                              const json = await res.json();
                              const url = json?.data?.url as string | undefined;
                              if (url) {
                                setLogoUrl(url);
                              }
                            };
                            input.click();
                          }}
                        >
                          Upload
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Recommended size: 200x200px. Supports JPG, PNG.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                className="bg-amber-700 hover:bg-amber-800 text-white shadow-lg shadow-amber-900/20 min-w-32"
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/shop/settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        enablePrint,
                        showStoreDetails,
                        showCustomerDetails,
                        printFormat,
                        printHeader: printHeader.trim() || null,
                        printFooter: printFooter.trim() || null,
                        showNotes,
                        printToken,
                        logoUrl: logoUrl.trim() || null,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to save settings");
                  } catch {
                    // ignore error, UI will keep local state
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {section === "tables" && <TablesSettings />}

        {section === "menu" && (
          <div className="max-w-5xl">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-lg font-bold text-neutral-900">Menu Management</h1>
                <p className="text-sm text-neutral-500">Manage your menu items, prices, and images.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                 {/* Search */}
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    <input 
                        type="text"
                        placeholder="Search items..." 
                        className="h-9 w-full sm:w-48 rounded-md border border-neutral-200 bg-white pl-9 pr-8 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                 </div>

                 {/* Filter Category */}
                 <div className="relative w-full sm:w-auto">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-500 pointer-events-none" />
                    <select 
                        className="select select-bordered select-sm w-full sm:w-auto pl-8 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                 </div>

                 {/* Sort */}
                 <select 
                    className="select select-bordered select-sm w-full sm:w-auto bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'price')}
                 >
                    <option value="name">Sort by Name</option>
                    <option value="price">Sort by Price</option>
                 </select>
                 
                <Button 
                  size="sm" 
                  className="bg-amber-700 hover:bg-amber-800 text-white shadow-sm ml-auto sm:ml-0"
                  onClick={() => {
                    setNewItem({ name: "", price: "", categoryId: "", newCategoryName: "" });
                    setIsCreatingCategory(false);
                    setShowAddModal(true);
                  }}
                >
                  <Plus className="size-4 mr-1" /> Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-8">
              {categories.map((category) => {
                 // Filter by category dropdown
                 if (filterCategory !== "all" && category.id.toString() !== filterCategory) {
                     return null;
                 }

                 // Filter items by search query
                 let filteredItems = category.items.filter(it => 
                    it.name.toLowerCase().includes(searchQuery.toLowerCase())
                 );

                 // Sort items
                 filteredItems = filteredItems.sort((a, b) => {
                    if (sortBy === 'name') return a.name.localeCompare(b.name);
                    if (sortBy === 'price') return a.price - b.price;
                    return 0;
                 });

                 if (filteredItems.length === 0) {
                     // If user is searching, show empty categories if they have no matches? 
                     // Usually better to hide empty categories in search results.
                     return null; 
                 }

                 return (
                <div key={category.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                        <h2 className="font-semibold text-neutral-800">{category.name}</h2>
                        <span className="text-xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{filteredItems.length} items</span>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
                    {filteredItems.map((it) => {
                        const preview = values[it.id] ?? it.imageUrl ?? "";
                        return (
                        <div
                            key={it.id}
                            className="group relative flex items-start gap-4 p-4 rounded-2xl border border-neutral-200 bg-white transition-all hover:shadow-md hover:border-amber-200"
                        >
                            <div className="relative size-24 shrink-0 rounded-xl bg-neutral-50 border border-neutral-100 overflow-hidden group-hover:border-amber-100">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                src={preview}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="grid place-items-center h-full text-neutral-300">
                                <ImageIcon className="size-8" />
                                </div>
                            )}
                                <button
                                    onClick={() => openEdit(it)}
                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                                >
                                    <div className="bg-white/90 p-1.5 rounded-full shadow-sm text-neutral-700">
                                        <Pencil className="size-4" />
                                    </div>
                                </button>
                            </div>

                            <div className="flex-1 min-w-0 py-1">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 truncate text-base">{it.name}</h3>
                                        <p className="text-sm font-medium text-amber-700 mt-0.5">{formatCurrency(it.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-neutral-400 hover:text-amber-700 hover:bg-amber-50"
                                            onClick={() => openEdit(it)}
                                            title="Edit Image"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => clearImage(it.id)}
                                            title="Remove Image"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                   <span className="inline-flex items-center px-2 py-1 rounded-md bg-neutral-50 text-xs font-medium text-neutral-600 border border-neutral-100">
                                     {it.categoryName}
                                   </span>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
                 );
              })}
              
              {categories.length === 0 && !loading && (
                  <div className="text-center py-12 text-neutral-400">
                      <div className="inline-flex p-4 rounded-full bg-neutral-50 mb-3">
                          <ImageIcon className="size-8 text-neutral-300" />
                      </div>
                      <p>No menu items found.</p>
                  </div>
              )}

              {categories.length > 0 && categories.every(c => {
                  if (filterCategory !== "all" && c.id.toString() !== filterCategory) return true;
                  return c.items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0;
              }) && (
                  <div className="text-center py-12 text-neutral-400">
                      <div className="inline-flex p-4 rounded-full bg-neutral-50 mb-3">
                          <Search className="size-8 text-neutral-300" />
                      </div>
                      <p>No items match your search.</p>
                      <Button variant="link" onClick={() => { setSearchQuery(""); setFilterCategory("all"); }}>Clear filters</Button>
                  </div>
              )}
            </div>

            {/* Add Item Modal */}
            {showAddModal && (
              <dialog open className="modal">
                <div className="modal-box max-w-lg relative rounded-2xl bg-white border border-neutral-200">
                  <button
                    className="absolute right-4 top-4 inline-grid place-items-center size-8 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
                    onClick={() => setShowAddModal(false)}
                  >
                    ✕
                  </button>
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-neutral-900">Add New Item</h3>
                    <p className="text-sm text-neutral-500 mt-1">Create a new menu item for your shop.</p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Item Name</label>
                            <Input
                                placeholder="e.g. Iced Latte"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                className="bg-neutral-50 border-neutral-200 focus:bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Price (THB)</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={newItem.price}
                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                className="bg-neutral-50 border-neutral-200 focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Category</label>
                        <select
                            className="select select-bordered w-full bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                            value={isCreatingCategory ? "new" : newItem.categoryId}
                            onChange={(e) => {
                                if (e.target.value === "new") {
                                    setIsCreatingCategory(true);
                                    setNewItem({ ...newItem, categoryId: "" });
                                } else {
                                    setIsCreatingCategory(false);
                                    setNewItem({ ...newItem, categoryId: e.target.value });
                                }
                            }}
                        >
                            <option value="" disabled>Select a category</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            <option value="new" className="font-semibold text-amber-700">+ Create New Category</option>
                        </select>
                    </div>

                    {isCreatingCategory && (
                        <div className="space-y-2 p-4 bg-amber-50/50 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-amber-900">New Category Name</label>
                            <Input
                                placeholder="e.g. Signature Drinks"
                                value={newItem.newCategoryName}
                                onChange={(e) => setNewItem({ ...newItem, newCategoryName: e.target.value })}
                                className="bg-white border-amber-200 focus:border-amber-400"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Image (Optional)</label>
                        <div className="flex items-center gap-3">
                            {editValue ? (
                                <div className="size-16 rounded-lg border border-neutral-200 overflow-hidden relative group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={editValue} alt="Preview" className="h-full w-full object-cover" />
                                    <button 
                                        onClick={() => setEditValue("")}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                    >
                                        <span className="text-xs">Remove</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="size-16 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-neutral-400">
                                    <ImageIcon className="size-6" />
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://..."
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="bg-neutral-50 border-neutral-200 focus:bg-white"
                                    />
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        Upload
                                    </Button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="modal-action mt-8 pt-4 border-t border-neutral-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button
                      className="bg-amber-700 hover:bg-amber-800 text-white min-w-24"
                      disabled={uploading || !newItem.name || !newItem.price || (!newItem.categoryId && !newItem.newCategoryName)}
                      onClick={async () => {
                        setUploading(true);
                        try {
                            let categoryId = newItem.categoryId;
                            
                            // 1. Create category if needed
                            if (isCreatingCategory && newItem.newCategoryName) {
                                const resCat = await fetch("/api/shop/menu/categories", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ name: newItem.newCategoryName })
                                });
                                if (!resCat.ok) throw new Error("Failed to create category");
                                const jsonCat = await resCat.json();
                                categoryId = jsonCat.data.category.id;
                            }

                            // 2. Create Item
                            const resItem = await fetch("/api/shop/menu/items", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    name: newItem.name,
                                    priceCents: Math.round(parseFloat(newItem.price) * 100),
                                    categoryId: Number(categoryId),
                                    imageUrl: editValue || null
                                })
                            });
                            if (!resItem.ok) throw new Error("Failed to create item");

                            // 3. Reset and Refresh
                            setShowAddModal(false);
                            setEditValue("");
                            fetchMenu(); // Reload menu
                        } catch (e) {
                            console.error(e);
                            alert("Failed to save item");
                        } finally {
                            setUploading(false);
                        }
                      }}
                    >
                      {uploading ? "Saving..." : "Create Item"}
                    </Button>
                  </div>
                </div>
                <form method="dialog" className="modal-backdrop" onClick={() => setShowAddModal(false)}>
                  <button>close</button>
                </form>
              </dialog>
            )}

            {/* Edit modal */}
            {editingId !== null && (
              <dialog open className="modal">
                <div className="modal-box max-w-md relative rounded-2xl bg-white border border-neutral-200">
                  <button
                    className="absolute right-2 top-2 inline-grid place-items-center size-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName("");
                      setEditValue("");
                    }}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                  <div className="border-b border-neutral-200 pb-3 mb-4">
                    <h3 className="font-semibold">Update Image</h3>
                    <p className="text-sm text-neutral-400 mt-1 truncate">{editingName}</p>
                  </div>
                  <div className="space-y-3">
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                    <div className="text-xs text-neutral-500">Leave empty to use default image.</div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileChange}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Upload image"}
                      </Button>
                    </div>
                  </div>
                  <div className="modal-action mt-6 -mx-6 px-6 py-4 bg-neutral-50 border-t border-neutral-200 rounded-b-2xl w-auto flex items-center gap-3 justify-end">
                    <Button variant="outline" onClick={() => { setEditingId(null); setEditingName(""); setEditValue(""); }}>Cancel</Button>
                    <Button
                      className="bg-amber-700 hover:bg-amber-800"
                      disabled={savingId === editingId}
                      onClick={async () => {
                        if (editingId === null) return;
                        await save(editingId, editValue);
                        setEditingId(null);
                        setEditingName("");
                        setEditValue("");
                      }}
                    >
                      {savingId === editingId ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
                <form method="dialog" className="modal-backdrop" onClick={() => { setEditingId(null); setEditingName(""); setEditValue(""); }}>
                  <button>close</button>
                </form>
              </dialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
