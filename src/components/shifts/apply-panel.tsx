import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { chatKeys } from "@/lib/chat";
import { friendlyError } from "@/lib/errors";

/** Locum apply box. Eligibility, deadlines and duplicates are enforced by the database. */
export function ApplyPanel({ shiftId }: { shiftId: string }) {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = useQuery({
    queryKey: ["my-application", shiftId, user?.id],
    enabled: !!user && role === "locum",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,status")
        .eq("shift_id", shiftId)
        .eq("locum_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // RLS only returns contact details to locums with an active application.
  const contact = useQuery({
    queryKey: ["shift-contact", shiftId, user?.id],
    enabled: !!mine.data && mine.data.status !== "withdrawn",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_contacts")
        .select("contact_name,contact_email,contact_phone")
        .eq("shift_id", shiftId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!user)
    return (
      <div className="surface mt-6 p-4 text-sm">
        <Link to="/auth" search={{ mode: "signin", redirect: `/shifts/${shiftId}` }} className="font-medium underline">
          Sign in as a locum
        </Link>{" "}
        to apply and see contact details.
      </div>
    );
  if (role !== "locum") return null;

  async function apply() {
    setBusy(true);
    const { error } = await supabase.from("applications").insert({
      shift_id: shiftId,
      locum_id: user!.id,
      message: message.trim().slice(0, 1000) || null,
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "Couldn't submit your application."));
      return;
    }
    toast.success("Application sent");
    qc.invalidateQueries({ queryKey: ["my-application", shiftId] });
    qc.invalidateQueries({ queryKey: chatKeys.all });
  }

  return (
    <section className="surface mt-6 space-y-3 p-4" aria-label="Apply">
      {mine.isLoading ? null : mine.data ? (
        <>
          <p className="text-sm">
            Application status: <strong className="capitalize">{mine.data.status}</strong>
          </p>
          {contact.data && (
            <div className="text-sm">
              <p className="font-medium">Employer contact</p>
              {contact.data.contact_name && <p>{contact.data.contact_name}</p>}
              <a className="underline" href={`mailto:${contact.data.contact_email}`}>
                {contact.data.contact_email}
              </a>
              {contact.data.contact_phone && (
                <p>
                  <a className="underline" href={`tel:${contact.data.contact_phone}`}>
                    {contact.data.contact_phone}
                  </a>
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <label htmlFor="apply-msg" className="text-sm font-medium">
            Message to employer (optional)
          </label>
          <Textarea
            id="apply-msg"
            value={message}
            maxLength={1000}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button onClick={apply} disabled={busy}>
            {busy ? "Sending…" : "Apply for this shift"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Employers are responsible for checking registration, insurance and suitability.
          </p>
        </>
      )}
    </section>
  );
}
