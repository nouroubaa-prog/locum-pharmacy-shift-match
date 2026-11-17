import { ShieldAlert } from "lucide-react";

export function ResponsibilityNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-foreground">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <p>
        {compact ? (
          <>
            Registration numbers are self-declared. Locum4U does not verify PSI/GPhC registration or
            insurance.
          </>
        ) : (
          <>
            Locum4U does <strong>not</strong> verify PSI or GPhC registration, indemnity insurance
            or suitability. Employers are responsible for checking the{" "}
            <a className="underline" href="https://www.thepsi.ie/" target="_blank" rel="noreferrer">
              PSI register
            </a>{" "}
            or{" "}
            <a
              className="underline"
              href="https://www.pharmacyregulation.org/registers"
              target="_blank"
              rel="noreferrer"
            >
              GPhC register
            </a>
            , insurance and suitability before confirming any shift.
          </>
        )}
      </p>
    </div>
  );
}
