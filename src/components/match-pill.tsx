import { Sparkles } from "lucide-react";
import { matchLabel, type MatchResult } from "@/lib/matching";
import { cn } from "@/lib/utils";

export function MatchPill({ match, className }: { match: MatchResult; className?: string }) {
  const label = matchLabel(match.score);
  const tone =
    label === "Strong"
      ? "bg-success-soft text-success"
      : label === "Good"
        ? "bg-primary-soft text-primary"
        : label === "Fair"
          ? "bg-warning-soft text-warning"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone,
        className,
      )}
      title={match.factors.map((f) => `${f.label}: ${f.points}/${f.max} — ${f.detail}`).join("\n")}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {match.score}% {label.toLowerCase()} match
    </span>
  );
}

export function MatchBreakdown({ match }: { match: MatchResult }) {
  return (
    <div className="space-y-3">
      {match.factors.map((f) => (
        <div key={f.key}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{f.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {f.points}/{f.max}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(f.points / f.max) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Score is a simple, fixed formula for guidance only. It never decides eligibility.
      </p>
    </div>
  );
}
