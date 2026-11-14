export type Currency = "EUR" | "GBP";

export function formatRate(rate: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "EUR" ? "en-IE" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: rate % 1 === 0 ? 0 : 2,
  }).format(rate);
}

export function currencySymbol(c: Currency) {
  return c === "EUR" ? "€" : "£";
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Dublin",
  }).format(new Date(iso));
}

export function formatTime(t: string): string {
  return t.slice(0, 5);
}

export function shiftHours(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return Math.max(0, (toMin(end) - toMin(start)) / 60);
}

export function todayISO(): string {
  // Ireland/UK local date
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date());
}

export function isShiftExpired(s: { shift_date: string; application_deadline: string }): boolean {
  return s.shift_date < todayISO() || new Date(s.application_deadline).getTime() <= Date.now();
}

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
