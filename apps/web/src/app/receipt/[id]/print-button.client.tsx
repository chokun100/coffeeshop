"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      className="btn btn-outline"
      onClick={() => window.print()}
      type="button"
    >
      <Printer className="size-4" />
      Print
    </button>
  );
}
