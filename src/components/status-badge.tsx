import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, ShiftStatus } from "@/lib/types";

const shiftMap: Record<
  ShiftStatus | "expired",
  { label: string; variant: "success" | "muted" | "info" | "danger" | "warning" }
> = {
  draft: { label: "Draft", variant: "muted" },
  open: { label: "Open", variant: "success" },
  filled: { label: "Filled", variant: "info" },
  cancelled: { label: "Cancelled", variant: "danger" },
  expired: { label: "Expired", variant: "warning" },
};

export function ShiftStatusBadge({ status, expired }: { status: ShiftStatus; expired?: boolean }) {
  const key = status === "open" && expired ? "expired" : status;
  const m = shiftMap[key];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

const appMap: Record<
  ApplicationStatus,
  { label: string; variant: "success" | "muted" | "info" | "danger" | "warning" | "soft" }
> = {
  pending: { label: "Pending", variant: "warning" },
  shortlisted: { label: "Shortlisted", variant: "soft" },
  accepted: { label: "Accepted", variant: "success" },
  declined: { label: "Declined", variant: "danger" },
  withdrawn: { label: "Withdrawn", variant: "muted" },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const m = appMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function DemoBadge() {
  return (
    <Badge variant="demo" title="Demo listing for testing — not a real job">
      Demo
    </Badge>
  );
}
