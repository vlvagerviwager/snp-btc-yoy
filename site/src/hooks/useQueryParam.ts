import { useState, useEffect } from "react";
import type { Range } from "../lib/data";

export function useYearsParam(key: string, all: number[]): [number[], (v: number[]) => void] {
  const [selected, setSelected] = useState<number[]>(() => {
    const param = new URLSearchParams(window.location.search).get(key);
    if (param) {
      const parsed = param
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => all.includes(n));
      if (parsed.length) return parsed.sort((a, b) => a - b);
    }
    return [...all];
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected.length === all.length || selected.length === 0) url.searchParams.delete(key);
    else url.searchParams.set(key, selected.join(","));
    window.history.replaceState({}, "", url.toString());
  }, [selected, key, all]);
  return [selected, setSelected];
}

export function useRangeParam(key: string): [Range | null, (r: Range | null) => void] {
  const [range, setRange] = useState<Range | null>(() => {
    const v = new URLSearchParams(window.location.search).get(key) as Range | null;
    if (v && ["1d", "1w", "1m", "3m", "6m", "1y", "5y"].includes(v)) return v;
    return null;
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (range) url.searchParams.set(key, range);
    else url.searchParams.delete(key);
    window.history.replaceState({}, "", url.toString());
  }, [range, key]);
  return [range, setRange];
}
