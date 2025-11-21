"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const STORE_NAME_KEY = "storeName";

export type StoreSettingsContextValue = {
  storeName: string;
  setStoreName: (name: string) => void;
};

const StoreSettingsContext = createContext<StoreSettingsContextValue | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [storeName, setStoreNameState] = useState<string>("Cafe Station");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = async () => {
      try {
        const res = await fetch("/api/shop/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const json = await res.json();
        const nameFromDb: string | undefined = json?.data?.settings?.storeName;
        const finalName = (nameFromDb && nameFromDb.trim()) || undefined;
        if (finalName) {
          setStoreNameState(finalName);
          window.localStorage.setItem(STORE_NAME_KEY, finalName);
          return;
        }
      } catch {
        // ignore and fall back to localStorage
      }

      const saved = window.localStorage.getItem(STORE_NAME_KEY);
      if (saved && saved.trim()) {
        setStoreNameState(saved);
      }
    };

    void load();
  }, []);

  const setStoreName = (name: string) => {
    setStoreNameState(name);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORE_NAME_KEY, name);
    }
  };

  return (
    <StoreSettingsContext.Provider value={{ storeName, setStoreName }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) throw new Error("useStoreSettings must be used within StoreSettingsProvider");
  return ctx;
}
