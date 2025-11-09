"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ChipProps = React.ComponentProps<"button"> & {
  selected?: boolean;
};

export function Chip({ selected = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-state={selected ? "on" : "off"}
      className={cn(className)}
      {...props}
    />
  );
}
