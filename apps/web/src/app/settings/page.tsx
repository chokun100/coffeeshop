"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Image as ImageIcon, Plus } from "lucide-react";
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

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(n);

  useEffect(() => {
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
          <div className="max-w-3xl">
            <div className="mb-4">
              <h1 className="text-lg font-semibold">Store Details</h1>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-neutral-700">Store Name</label>
                <Input
                  placeholder="Store name"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-neutral-700">Address</label>
                <textarea
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-neutral-700">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-neutral-700">Phone</label>
                <Input
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-neutral-700">Currency</label>
                <select className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
                  <option>Thai Baht (฿)</option>
                  <option>US Dollar ($)</option>
                </select>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm font-medium text-neutral-700">Enable QR Menu</div>
                  <div className="text-xs text-neutral-500 mt-0.5">Allow customers to scan and view the digital menu.</div>
                </div>
                <input type="checkbox" className="toggle toggle-success" defaultChecked />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  Download QR Code
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  View Digital Menu
                </Button>
              </div>
              <div>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
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
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {section === "print" && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <h1 className="text-lg font-semibold">Print Settings</h1>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700">Enable Print</div>
                  <div className="text-xs text-neutral-500 mt-0.5">เปิด/ปิด การพิมพ์ใบเสร็จจากระบบ</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={enablePrint}
                  onChange={(e) => setEnablePrint(e.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700">Show Store Details</div>
                  <div className="text-xs text-neutral-500 mt-0.5">แสดงชื่อร้าน / ที่อยู่ / เบอร์โทร บนใบเสร็จ</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={showStoreDetails}
                  onChange={(e) => setShowStoreDetails(e.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700">Show Customer Details</div>
                  <div className="text-xs text-neutral-500 mt-0.5">แสดงข้อมูลลูกค้าบนใบเสร็จ (ถ้ามี)</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={showCustomerDetails}
                  onChange={(e) => setShowCustomerDetails(e.target.checked)}
                />
              </div>

              <div>
                <label className="mb-1 block text-neutral-700">Format (Page Size)</label>
                <select
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                  value={printFormat}
                  onChange={(e) => setPrintFormat((e.target.value as "58mm" | "80mm") || "80mm")}
                >
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-neutral-700">Header</label>
                <textarea
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Text shown at the top of receipt"
                  value={printHeader}
                  onChange={(e) => setPrintHeader(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-neutral-700">Footer</label>
                <textarea
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Thank you for visiting"
                  value={printFooter}
                  onChange={(e) => setPrintFooter(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-neutral-700">Logo</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-md border border-dashed border-neutral-200 flex items-center justify-center bg-white overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-400">No logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
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
                      Browse...
                    </Button>
                    <Input
                      placeholder="https://..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700">Show Notes</div>
                  <div className="text-xs text-neutral-500 mt-0.5">แสดงโน้ตของแต่ละเมนูบนใบเสร็จ</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={showNotes}
                  onChange={(e) => setShowNotes(e.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-700">Print Token</div>
                  <div className="text-xs text-neutral-500 mt-0.5">แสดงเลขคิว (เช่น M01, M02) บนใบเสร็จ</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={printToken}
                  onChange={(e) => setPrintToken(e.target.checked)}
                />
              </div>

              <div>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
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
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {section === "tables" && <TablesSettings />}

        {section === "menu" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold">Menu</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Categories</Button>
                <Button size="sm" className="bg-amber-700 hover:bg-amber-800">
                  <Plus className="size-4 mr-1" /> New
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {categories.flatMap((c) => c.items.map((it) => ({ ...it, categoryName: it.categoryName || c.name }))).map((it) => {
                const preview = values[it.id] ?? it.imageUrl ?? "";
                return (
                  <div key={it.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-10 rounded-full bg-neutral-100 grid place-items-center overflow-hidden">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="size-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{it.name} <span className="text-neutral-500">- {formatCurrency(it.price ?? 0)}</span></div>
                        <div className="text-[11px] uppercase tracking-wide text-neutral-500">{it.categoryName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(it)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => clearImage(it.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}
