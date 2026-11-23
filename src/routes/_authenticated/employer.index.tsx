import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { ApplicationConversations } from "@/components/chat/application-conversations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { formatDate, formatRate, formatTime } from "@/lib/format";
import { useMyPharmacy } from "./employer.pharmacy";

export const Route = createFileRoute("/_authenticated/employer/")({
  head: () => ({
    meta: [{ title: "Employer dashboard — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ph = useMyPharmacy(user?.id);
  const shifts = useQuery({
    queryKey: ["my-shifts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id,role_title,shift_date,start_time,end_time,hourly_rate,currency,status,applications(count)")
        .eq("employer_id", user!.id)
        .order("shift_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function act(id: string, action: "open" | "cancelled" | "filled") {
    const { error } = action === "filled"
      ? await supabase.rpc("mark_shift_filled", { _shift_id: id, _application_id: null as unknown as string })
      : await supabase.from("shifts").update({ status: action }).eq("id", id);
    if (error) return toast.error(friendlyError(error, "Couldn't update the shift."));
    toast.success("Shift updated");
    qc.invalidateQueries({ queryKey: ["my-shifts"] });
  }

  return (
    <div className="container-app max-w-3xl py-8">
      <PageHeader title="Employer dashboard" description={ph.data ? `${ph.data.name} · ${ph.data.town}` : undefined} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild><Link to="/employer/shifts/new">Post a shift</Link></Button>
        <Button asChild variant="outline">
          <Link to="/employer/pharmacy">{ph.data ? "Edit pharmacy" : "Add pharmacy"}</Link>
        </Button>
      </div>
      <h2 className="mb-3 text-xl font-semibold">Your shifts</h2>
      {shifts.isLoading ? <ListSkeleton rows={2} /> : shifts.isError ? (
        <ErrorState message="Couldn't load your shifts." onRetry={() => shifts.refetch()} />
      ) : !shifts.data?.length ? (
        <EmptyState title="No shifts yet" body="Post your first shift to start receiving applications." />
      ) : (
        <ul className="space-y-2">
          {shifts.data.map((s) => (
            <li key={s.id} className="surface space-y-2 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link to="/shifts/$shiftId" params={{ shiftId: s.id }} className="font-semibold hover:underline">
                  {s.role_title}
                </Link>
                <span className="text-xs font-medium uppercase text-muted-foreground">{s.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(s.shift_date)} · {formatTime(s.start_time)}–{formatTime(s.end_time)} ·{" "}
                {formatRate(s.hourly_rate, s.currency)} · {s.applications?.[0]?.count ?? 0} applications
              </p>
              <div className="flex flex-wrap gap-2">
                {s.status === "draft" && <Button size="sm" onClick={() => act(s.id, "open")}>Publish</Button>}
                {s.status === "open" && <Button size="sm" variant="outline" onClick={() => act(s.id, "filled")}>Mark filled</Button>}
                {(s.status === "draft" || s.status === "open") && (
                  <Button size="sm" variant="ghost" onClick={() => act(s.id, "cancelled")}>Cancel</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ApplicationConversations />
    </div>
  );
}
