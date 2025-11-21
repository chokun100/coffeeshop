"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Table = {
  id: number;
  name: string; // table label, e.g. "Table 1"
  maxSeats: number;
};

const MAX_SEATS = 8;

export default function TablesSettings() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/shop/tables")
      .then((r) => r.json())
      .then((body) => {
        const rows: Table[] = (body?.data?.tables || []).map((t: any) => ({
          id: t.id,
          name: t.name || `Table ${t.id}`,
          maxSeats: Math.min(MAX_SEATS, t.maxSeats ?? 2),
        }));
        setTables(rows);
      })
      .catch(() => {
        setTables([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateMaxSeats = (id: number, value: number) => {
    const v = Math.max(1, Math.min(MAX_SEATS, value || 0));
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, maxSeats: v } : t)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/shop/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables: tables.map((t) => ({ id: t.id, name: t.name, maxSeats: t.maxSeats })),
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-sm text-neutral-500">Loading tables…</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Tables</h2>
        <Button
          size="sm"
          className="bg-amber-700 hover:bg-amber-800"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-neutral-500">Set how many guests each table can seat (max {MAX_SEATS}).</p>

      {tables.length === 0 && (
        <div className="text-sm text-neutral-400">No tables configured.</div>
      )}

      <div className="space-y-3">
        {tables.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
          >
            <div className="text-sm font-medium">{t.name}</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500 text-xs">Max seats</span>
              <Input
                type="number"
                min={1}
                max={MAX_SEATS}
                value={t.maxSeats}
                onChange={(e) => updateMaxSeats(t.id, Number(e.target.value))}
                className="w-16 h-8 px-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
