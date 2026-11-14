import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Must be ${max} characters or fewer` })
    .optional()
    .transform((v) => (v ? v : null));

const phone = z
  .string()
  .trim()
  .max(40)
  .regex(/^[+0-9 ()-]*$/, { message: "Use digits, spaces, + ( ) or -" })
  .optional()
  .transform((v) => (v ? v : null));

export const pharmacySchema = z.object({
  name: z.string().trim().min(2, "Enter the pharmacy name").max(120),
  address_line: z.string().trim().min(2, "Enter the street address").max(200),
  town: z.string().trim().min(1, "Choose a town").max(80),
  county: optionalText(80),
  postcode: optionalText(10),
  country: z.enum(["IE", "UK"]),
  contact_email: z.string().trim().email("Enter a valid email").max(255),
  contact_phone: phone,
});
export type PharmacyInput = z.input<typeof pharmacySchema>;

export const locumProfileSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your name").max(120),
    phone,
    psi_number: z
      .string()
      .trim()
      .regex(/^[0-9]{0,6}$/, "PSI numbers are up to 6 digits")
      .optional()
      .transform((v) => (v ? v : null)),
    gphc_number: z
      .string()
      .trim()
      .regex(/^([0-9]{7})?$/, "GPhC numbers are 7 digits")
      .optional()
      .transform((v) => (v ? v : null)),
    base_country: z.enum(["IE", "UK"]),
    base_town: z.string().trim().min(1, "Choose your base town").max(80),
    radius_km: z.coerce.number().int().min(1).max(500),
    available_days: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day"),
    available_from: z.string().optional().transform((v) => (v ? v : null)),
    available_until: z.string().optional().transform((v) => (v ? v : null)),
    preferred_rate: z
      .union([z.literal(""), z.coerce.number().min(0).max(500)])
      .optional()
      .transform((v) => (v === "" || v == null ? null : v)),
    preferred_currency: z.enum(["EUR", "GBP"]),
    years_experience: z.coerce.number().int().min(0).max(60),
    bio: optionalText(1000),
  })
  .refine((v) => v.psi_number || v.gphc_number, {
    message: "Add a PSI (Ireland) or GPhC (UK) registration number",
    path: ["psi_number"],
  })
  .refine((v) => !v.available_from || !v.available_until || v.available_until >= v.available_from, {
    message: "End date must be after start date",
    path: ["available_until"],
  });

export const shiftSchema = z
  .object({
    pharmacy_id: z.string().uuid("Choose a pharmacy"),
    pharmacy_name: z.string().trim().min(2, "Enter the pharmacy name").max(120),
    address_line: z.string().trim().min(2, "Enter the address").max(200),
    town: z.string().trim().min(1, "Choose a town").max(80),
    county: optionalText(80),
    postcode: optionalText(10),
    country: z.enum(["IE", "UK"]),
    shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    start_time: z.string().regex(/^\d{2}:\d{2}/, "Start time required"),
    end_time: z.string().regex(/^\d{2}:\d{2}/, "End time required"),
    hourly_rate: z.coerce.number({ invalid_type_error: "Enter a rate" }).gt(0, "Enter a rate").max(500),
    role_title: z.string().trim().min(2).max(80),
    min_experience_years: z.coerce.number().int().min(0).max(60),
    requirements: optionalText(1000),
    notes: optionalText(2000),
    contact_name: optionalText(120),
    contact_email: z.string().trim().email("Enter a valid contact email").max(255),
    contact_phone: phone,
    deadline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a deadline date"),
    deadline_time: z.string().regex(/^\d{2}:\d{2}/, "Choose a deadline time"),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: "End time must be after start time (overnight shifts aren't supported yet)",
    path: ["end_time"],
  })
  .refine((v) => `${v.deadline_date}T${v.deadline_time}` <= `${v.shift_date}T${v.end_time}`, {
    message: "Deadline must be before the shift ends",
    path: ["deadline_date"],
  });
export type ShiftFormInput = z.input<typeof shiftSchema>;

export const applicationSchema = z.object({
  message: optionalText(1000),
});

export const reportSchema = z.object({
  reason: z.enum(["inaccurate", "suspicious", "inappropriate", "duplicate", "other"]),
  details: optionalText(1000),
});

export function countryDefaults(country: "IE" | "UK") {
  return country === "IE"
    ? ({ currency: "EUR", required_registration: "PSI" } as const)
    : ({ currency: "GBP", required_registration: "GPhC" } as const);
}

/** Interpret a local Irish/UK date+time as an ISO instant. */
export function localToIso(date: string, time: string): string {
  // Europe/Dublin and Europe/London share offsets (UTC+0 / UTC+1 in summer).
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(guess);
  const localHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const offsetHours = (localHour - guess.getUTCHours() + 24) % 24;
  return new Date(guess.getTime() - offsetHours * 3600_000).toISOString();
}

export function isoToLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return { date, time };
}
