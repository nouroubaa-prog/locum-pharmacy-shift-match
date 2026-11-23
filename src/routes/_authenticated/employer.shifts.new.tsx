import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, zodErrors } from "@/components/field";
import { EmptyState, PageHeader, PageSpinner } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { shiftSchema } from "@/lib/schemas";
import { useMyPharmacy } from "./employer.pharmacy";

export const Route = createFileRoute("/_authenticated/employer/shifts/new")({
  head: () => ({
    meta: [{ title: "Post a shift — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: NewShift,
});

function NewShift() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const ph = useMyPharmacy(user?.id);
  const [f, setF] = useState<Record<string, string>>({
    role_title: "Locum Pharmacist", shift_date: "", start_time: "09:00", end_time: "18:00",
    hourly_rate: "", min_experience_years: "0", requirements: "", notes: "",
    contact_name: "", contact_email: "", contact_phone: "", deadline_date: "", deadline_time: "17:00",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (ph.isLoading) return <PageSpinner />;
  if (!ph.data)
    return (
      <div className="container-app max-w-2xl py-8">
        <EmptyState title="Add your pharmacy first" body="Shifts are posted for your pharmacy."
          action={<Button asChild><Link to="/employer/pharmacy">Add pharmacy</Link></Button>} />
      </div>
    );
  const p = ph.data;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const contactEmail = f["contact_email"] || p.contact_email || "";
  const contactPhone = f["contact_phone"] || p.contact_phone || "";

  async function submit(publish: boolean) {
    const parsed = shiftSchema.safeParse({
      ...f, pharmacy_id: p.id, pharmacy_name: p.name, address_line: p.address_line, town: p.town,
      county: p.county ?? "", postcode: p.postcode ?? "", country: p.country,
      contact_email: contactEmail, contact_phone: contactPhone,
    });
    if (!parsed.success) return setErrors(zodErrors(parsed.error.issues));
    setErrors({});
    const v = parsed.data;
    setBusy(true);
    const { data: shift, error } = await supabase.from("shifts").insert({
      employer_id: user!.id, pharmacy_id: v.pharmacy_id, pharmacy_name: v.pharmacy_name,
      address_line: v.address_line, town: v.town, county: v.county, postcode: v.postcode,
      country: v.country, lat: p.lat, lng: p.lng, shift_date: v.shift_date,
      start_time: v.start_time, end_time: v.end_time, hourly_rate: v.hourly_rate,
      currency: v.country === "IE" ? "EUR" : "GBP", role_title: v.role_title,
      required_registration: v.country === "IE" ? "PSI" : "GPhC",
      min_experience_years: v.min_experience_years, requirements: v.requirements, notes: v.notes,
      application_deadline: new Date(`${v.deadline_date}T${v.deadline_time}`).toISOString(),
      status: "draft",
    }).select("id").single();
    if (error || !shift) {
      setBusy(false);
      return toast.error(friendlyError(error, "Couldn't save the shift."));
    }
    const c = await supabase.from("shift_contacts").insert({
      shift_id: shift.id, contact_name: v.contact_name, contact_email: v.contact_email,
      contact_phone: v.contact_phone,
    });
    let err = c.error;
    if (!err && publish)
      err = (await supabase.from("shifts").update({ status: "open" }).eq("id", shift.id)).error;
    setBusy(false);
    await qc.invalidateQueries({ queryKey: ["my-shifts"] });
    if (err) toast.error(friendlyError(err, "Saved as draft, but couldn't publish."));
    else toast.success(publish ? "Shift published" : "Draft saved");
    nav({ to: "/employer" });
  }

  const text = (k: string, label: string, type = "text", optional = false) => (
    <Field id={k} label={label} error={errors[k]} optional={optional}>
      <Input id={k} type={type} value={f[k] ?? ""} onChange={set(k)} />
    </Field>
  );

  return (
    <div className="container-app max-w-2xl py-8">
      <PageHeader title="Post a shift" description={`${p.name} · ${p.town}`} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(true); }}>
        {text("role_title", "Role")}
        <div className="grid grid-cols-3 gap-3">
          {text("shift_date", "Date", "date")}
          {text("start_time", "Start", "time")}
          {text("end_time", "End", "time")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {text("hourly_rate", `Hourly rate (${p.country === "IE" ? "€" : "£"})`, "number")}
          {text("min_experience_years", "Min. years experience", "number")}
        </div>
        <p className="text-sm text-muted-foreground">
          Required registration: {p.country === "IE" ? "PSI (Ireland)" : "GPhC (UK)"}
        </p>
        <Field id="requirements" label="Requirements" optional error={errors["requirements"]}>
          <Textarea id="requirements" value={f["requirements"]} onChange={set("requirements")} />
        </Field>
        <Field id="notes" label="Notes" optional error={errors["notes"]}>
          <Textarea id="notes" value={f["notes"]} onChange={set("notes")} />
        </Field>
        <fieldset className="space-y-3 border-t border-border pt-4">
          <legend className="text-sm font-semibold">Private contact (shown only to applicants)</legend>
          {text("contact_name", "Contact name", "text", true)}
          <Field id="contact_email" label="Contact email" error={errors["contact_email"]}>
            <Input id="contact_email" type="email" value={contactEmail} onChange={set("contact_email")} />
          </Field>
          <Field id="contact_phone" label="Contact phone" optional error={errors["contact_phone"]}>
            <Input id="contact_phone" type="tel" value={contactPhone} onChange={set("contact_phone")} />
          </Field>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          {text("deadline_date", "Apply by (date)", "date")}
          {text("deadline_time", "Apply by (time)", "time")}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>Publish shift</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => submit(false)}>Save draft</Button>
        </div>
      </form>
    </div>
  );
}
