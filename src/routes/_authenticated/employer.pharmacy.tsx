import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, zodErrors } from "@/components/field";
import { TownSelect } from "@/components/town-select";
import { PageHeader, PageSpinner } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { pharmacySchema, type PharmacyInput } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/employer/pharmacy")({
  head: () => ({
    meta: [{ title: "Pharmacy profile — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: PharmacyPage,
});

export function useMyPharmacy(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-pharmacy", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("owner_id", userId!)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

const empty: PharmacyInput = {
  name: "", address_line: "", town: "", county: "", postcode: "", country: "IE",
  contact_email: "", contact_phone: "",
};

function PharmacyPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const ph = useMyPharmacy(user?.id);
  const [f, setF] = useState<PharmacyInput>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ph.data)
      setF({
        name: ph.data.name, address_line: ph.data.address_line, town: ph.data.town,
        county: ph.data.county ?? "", postcode: ph.data.postcode ?? "", country: ph.data.country,
        contact_email: ph.data.contact_email ?? "", contact_phone: ph.data.contact_phone ?? "",
      });
  }, [ph.data]);

  if (ph.isLoading) return <PageSpinner />;
  const set = (k: keyof PharmacyInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = pharmacySchema.safeParse(f);
    if (!p.success) return setErrors(zodErrors(p.error.issues));
    setErrors({});
    setBusy(true);
    const { error } = ph.data
      ? await supabase.from("pharmacies").update(p.data).eq("id", ph.data.id)
      : await supabase.from("pharmacies").insert({ ...p.data, owner_id: user!.id });
    setBusy(false);
    if (error) return toast.error(friendlyError(error, "Couldn't save the pharmacy."));
    toast.success("Pharmacy saved");
    await qc.invalidateQueries({ queryKey: ["my-pharmacy"] });
    nav({ to: "/employer" });
  }

  return (
    <div className="container-app max-w-2xl py-8">
      <PageHeader title="Pharmacy profile" description="Contact details stay private until a locum applies." />
      <form onSubmit={save} className="space-y-4">
        <Field id="name" label="Pharmacy name" error={errors["name"]}>
          <Input id="name" value={f.name} onChange={set("name")} />
        </Field>
        <Field id="country" label="Country">
          <select id="country" className="h-10 w-full rounded-md border border-input bg-background px-3"
            value={f.country} onChange={(e) => setF({ ...f, country: e.target.value as "IE" | "UK", town: "" })}>
            <option value="IE">Ireland</option>
            <option value="UK">United Kingdom</option>
          </select>
        </Field>
        <Field id="address_line" label="Street address" error={errors["address_line"]}>
          <Input id="address_line" value={f.address_line} onChange={set("address_line")} />
        </Field>
        <Field id="town" label="Town" error={errors["town"]}>
          <TownSelect id="town" country={f.country} value={f.town} onChange={(town) => setF({ ...f, town })} />
        </Field>
        <Field id="county" label="County" optional>
          <Input id="county" value={f.county ?? ""} onChange={set("county")} />
        </Field>
        <Field id="postcode" label={f.country === "IE" ? "Eircode" : "Postcode"} optional error={errors["postcode"]}>
          <Input id="postcode" value={f.postcode ?? ""} onChange={set("postcode")} />
        </Field>
        <Field id="contact_email" label="Contact email" error={errors["contact_email"]}>
          <Input id="contact_email" type="email" value={f.contact_email} onChange={set("contact_email")} />
        </Field>
        <Field id="contact_phone" label="Contact phone" optional error={errors["contact_phone"]}>
          <Input id="contact_phone" type="tel" value={f.contact_phone ?? ""} onChange={set("contact_phone")} />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save pharmacy"}</Button>
      </form>
    </div>
  );
}
