import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, BadgeCheck } from "lucide-react";
import type { Shift } from "@/lib/types";
import { formatDate, formatRate, formatTime, shiftHours } from "@/lib/format";
import type { MatchResult } from "@/lib/matching";
import { MatchPill } from "./match-pill";
import { DemoBadge } from "./status-badge";

// Public card: never shows employer contact details.
export function ShiftCard({ shift, match, footer }: { shift: Shift; match?: MatchResult | null; footer?: React.ReactNode }) {
  const hours = shiftHours(shift.start_time, shift.end_time);
  return (
    <article className="surface group relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-lift sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {shift.is_demo && <DemoBadge />}
            <span className="text-xs font-medium text-muted-foreground">{shift.role_title}</span>
          </div>
          <h3 className="truncate text-base font-semibold sm:text-lg">
            <Link
              to="/shifts/$shiftId"
              params={{ shiftId: shift.id }}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {shift.pharmacy_name}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {shift.town}
              {shift.county && shift.county !== shift.town ? `, ${shift.county}` : ""} · {shift.country === "IE" ? "Ireland" : "UK"}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold text-primary">
            {formatRate(Number(shift.hourly_rate), shift.currency)}
          </p>
          <p className="text-xs text-muted-foreground">per hour</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
          {formatDate(shift.shift_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          {formatTime(shift.start_time)}–{formatTime(shift.end_time)} · {hours}h
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
          {shift.required_registration} registered
        </span>
      </div>
      {(match || footer) && (
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          {match ? <MatchPill match={match} /> : <span />}
          {footer}
        </div>
      )}
    </article>
  );
}
