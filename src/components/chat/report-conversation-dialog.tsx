import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { reportSchema } from "@/lib/schemas";
import { friendlyError } from "@/lib/errors";

const reasons = [
  { value: "inappropriate", label: "Abusive or inappropriate" },
  { value: "suspicious", label: "Suspicious or scam" },
  { value: "inaccurate", label: "Misleading information" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Reports a conversation (or one message in it) to moderators. The database fills in
 * who is being reported and only accepts reports from people in the conversation.
 */
export function ReportConversationDialog({
  open,
  onOpenChange,
  userId,
  conversationId,
  messageId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  conversationId: string;
  messageId?: string | null;
}) {
  const [reason, setReason] = useState<string>("inappropriate");
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
      conversation_id: conversationId,
      message_id: messageId ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Thanks — our moderation team will review this conversation.");
    onOpenChange(false);
    setDetails("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messageId ? "Report this message" : "Report this conversation"}</DialogTitle>
          <DialogDescription>
            Moderators will be able to read this conversation to review your report. The other
            person won't see who reported it.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {reasons.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem id={`chat-reason-${r.value}`} value={r.value} />
              <Label htmlFor={`chat-reason-${r.value}`} className="font-normal">
                {r.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="chat-report-details">
            Details <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="chat-report-details"
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What happened?"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? (
              "Sending…"
            ) : (
              <>
                <Flag /> Send report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
