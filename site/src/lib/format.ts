export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function formatExactDate(iso: string, doy: number | null): string {
  // iso is YYYY-MM-DD
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return `${iso}, doy ${doy ?? ""}`.trim();
  const day = d.getUTCDate();
  const month = d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const ord = ordinal(day);
  const doyStr = doy != null ? `, doy ${doy}` : "";
  return `${ord} ${month} ${year}, ${weekday}${doyStr}`;
}

export function isoFromYearDoy(year: number, doy: number): string {
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(doy);
  return d.toISOString().slice(0, 10);
}
