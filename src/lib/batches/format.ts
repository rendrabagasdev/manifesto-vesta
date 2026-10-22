const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatIdr(value: number): string {
  return idrFormatter.format(value);
}

export function formatKg(value: number): string {
  return `${numberFormatter.format(value)} kg`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(Math.round(value));
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateTimeFormatter.format(date);
}

export function dateInputValue(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function dateCompact(date = new Date()): string {
  return dateInputValue(date).replaceAll("-", "");
}

export function initials(name: string | null | undefined, fallback = "V"): string {
  if (!name?.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
