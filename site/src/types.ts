export type DataPoint = {
  doy: number;
  date: string; // "MM-DD"
  iso: string; // "YYYY-MM-DD"
  close: number;
  indexed: number; // close / jan1Close * 100
};

export type YearSeries = {
  year: number;
  points: DataPoint[];
  jan1Close: number;
};

export type Snapshot = {
  symbol: string;
  generatedAt: string;
  years: Record<string, YearSeries>;
  yearList: number[];
};
