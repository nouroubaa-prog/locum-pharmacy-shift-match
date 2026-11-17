import { distanceKm } from "./locations";

// Transparent, deterministic match score. No AI, no hidden factors.
// It is guidance only and never decides eligibility.
export const MATCH_WEIGHTS = {
  location: 35,
  availability: 25,
  rate: 20,
  registration: 20,
} as const;

export interface MatchLocum {
  base_lat: number | null;
  base_lng: number | null;
  radius_km: number;
  available_days: number[]; // 0 = Sunday … 6 = Saturday
  available_from: string | null; // YYYY-MM-DD
  available_until: string | null;
  preferred_rate: number | null;
  preferred_currency: "EUR" | "GBP";
  psi_number: string | null;
  gphc_number: string | null;
}

export interface MatchShift {
  lat: number | null;
  lng: number | null;
  shift_date: string; // YYYY-MM-DD
  hourly_rate: number;
  currency: "EUR" | "GBP";
  required_registration: "PSI" | "GPhC";
}

export interface MatchFactor {
  key: keyof typeof MATCH_WEIGHTS;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface MatchResult {
  score: number;
  factors: MatchFactor[];
  distanceKm: number | null;
}

/** Weekday for a YYYY-MM-DD date, computed in UTC so it never shifts with the viewer's timezone. */
export function weekdayOf(date: string): number {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function computeMatch(locum: MatchLocum, shift: MatchShift): MatchResult {
  const factors: MatchFactor[] = [];

  // Location (35)
  let dist: number | null = null;
  if (locum.base_lat == null || locum.base_lng == null || shift.lat == null || shift.lng == null) {
    factors.push({
      key: "location",
      label: "Location",
      points: 0,
      max: 35,
      detail: "Location unknown",
    });
  } else {
    dist = distanceKm(locum.base_lat, locum.base_lng, shift.lat, shift.lng);
    const radius = Math.max(1, locum.radius_km);
    let pts = 0;
    let detail: string;
    if (dist <= radius) {
      pts = 35 * (1 - 0.5 * (dist / radius));
      detail = `${Math.round(dist)} km away, within your ${radius} km radius`;
    } else if (dist <= radius * 2) {
      pts = 5;
      detail = `${Math.round(dist)} km away, outside your ${radius} km radius`;
    } else {
      detail = `${Math.round(dist)} km away, well outside your radius`;
    }
    factors.push({ key: "location", label: "Location", points: Math.round(pts), max: 35, detail });
  }

  // Availability (25 = 15 weekday + 10 date window)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const wd = weekdayOf(shift.shift_date);
  const dayOk = locum.available_days.includes(wd);
  const afterFrom = !locum.available_from || shift.shift_date >= locum.available_from;
  const beforeUntil = !locum.available_until || shift.shift_date <= locum.available_until;
  const windowOk = afterFrom && beforeUntil;
  factors.push({
    key: "availability",
    label: "Availability",
    points: (dayOk ? 15 : 0) + (windowOk ? 10 : 0),
    max: 25,
    detail: `${days[wd]} ${dayOk ? "is" : "is not"} one of your days; ${windowOk ? "inside" : "outside"} your available dates`,
  });

  // Rate (20)
  if (locum.preferred_rate == null || locum.preferred_rate <= 0) {
    factors.push({
      key: "rate",
      label: "Rate",
      points: 10,
      max: 20,
      detail: "No preferred rate set",
    });
  } else if (locum.preferred_currency !== shift.currency) {
    factors.push({
      key: "rate",
      label: "Rate",
      points: 0,
      max: 20,
      detail: `Paid in ${shift.currency}, you prefer ${locum.preferred_currency}`,
    });
  } else if (shift.hourly_rate >= locum.preferred_rate) {
    factors.push({
      key: "rate",
      label: "Rate",
      points: 20,
      max: 20,
      detail: "Meets or beats your preferred rate",
    });
  } else if (shift.hourly_rate >= locum.preferred_rate * 0.9) {
    factors.push({
      key: "rate",
      label: "Rate",
      points: 10,
      max: 20,
      detail: "Within 10% of your preferred rate",
    });
  } else {
    factors.push({
      key: "rate",
      label: "Rate",
      points: 0,
      max: 20,
      detail: "Below your preferred rate",
    });
  }

  // Registration (20)
  const hasReg =
    shift.required_registration === "PSI"
      ? !!locum.psi_number?.trim()
      : !!locum.gphc_number?.trim();
  factors.push({
    key: "registration",
    label: "Registration",
    points: hasReg ? 20 : 0,
    max: 20,
    detail: hasReg
      ? `${shift.required_registration} number on your profile (self-declared)`
      : `Requires a ${shift.required_registration} number on your profile`,
  });

  const score = factors.reduce((s, f) => s + f.points, 0);
  return { score: Math.max(0, Math.min(100, score)), factors, distanceKm: dist };
}

export function matchLabel(score: number): "Strong" | "Good" | "Fair" | "Low" {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Low";
}
