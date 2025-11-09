"use client";

import * as React from "react";

export type QuantityRender = (args: {
  value: number;
  canDec: boolean;
  canInc: boolean;
  dec: () => void;
  inc: () => void;
}) => React.ReactNode;

export type QuantityProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  children: QuantityRender;
};

export function Quantity({ value, onChange, min = 0, max = Number.POSITIVE_INFINITY, children }: QuantityProps) {
  const canDec = value > min;
  const canInc = value < max;

  const dec = React.useCallback(() => {
    if (!canDec) return;
    onChange(Math.max(min, value - 1));
  }, [canDec, min, onChange, value]);

  const inc = React.useCallback(() => {
    if (!canInc) return;
    onChange(Math.min(max, value + 1));
  }, [canInc, max, onChange, value]);

  return <>{children({ value, canDec, canInc, dec, inc })}</>;
}
