const PALETTE = [
  "border-l-slate text-slate-700",
  "border-l-amber text-amber-600",
  "border-l-[#5B6B78] text-ink-600",
  "border-l-success text-success",
  "border-l-danger text-danger",
];

export function sampleTypeChipClass(sampleType: string): string {
  let hash = 0;
  for (let i = 0; i < sampleType.length; i++) hash = (hash * 31 + sampleType.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
