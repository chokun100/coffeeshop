"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      className="btn bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50"
      onClick={() => window.print()}
      type="button"
    >
      <Printer className="size-4" />
      Print
    </button>
  );
}
