import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { reportSchema } from "@/lib/schemas";
import { friendlyError } from "@/lib/errors";

const reasons = [
  { value: "inaccurate", label: "Inaccurate details" },
  { value: "suspicious", label: "Suspicious or scam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Something else" },
] as const;

export function ReportDialog({ shiftId, userId }: { shiftId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("inaccurate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = reportSchema.safeParse({ reason, details });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      shift_id: shiftId,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Thanks — our team will review this listing.");
    setOpen(false);
    setDetails("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag /> Report listing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>Reports go to the Locum4U moderation team. The employer won't see who reported it.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {reasons.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
              <Label htmlFor={`reason-${r.value}`} className="font-normal">{r.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="report-details">Details <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="report-details" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What's wrong with this listing?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
