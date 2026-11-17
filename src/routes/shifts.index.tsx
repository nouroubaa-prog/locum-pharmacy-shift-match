import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShiftCard } from "@/components/shift-card";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { todayISO } from "@/lib/format";

export const Route = createFileRoute("/shifts/")({
  head: () => ({
    meta: [
      { title: "Open pharmacy locum shifts — Locum4U" },
      {
        name: "description",
        content:
          "Browse open locum pharmacist shifts in Ireland and the UK. Apply directly, no agency commission.",
      },
      { property: "og:title", content: "Open pharmacy locum shifts — Locum4U" },
      {
        property: "og:description",
        content: "Browse open locum pharmacist shifts in Ireland and the UK.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShiftsPage,
});

function ShiftsPage() {
  const q = useQuery({
    queryKey: ["shifts", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("status", "open")
        .eq("moderation", "visible")
        .gte("shift_date", todayISO())
        .gt("application_deadline", new Date().toISOString())
        .order("shift_date", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Find shifts"
        title="Open locum shifts"
        description="Contact details unlock after you apply."
      />
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message="Couldn't load shifts." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="No open shifts right now"
          body="Check back soon."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((s) => (
            <ShiftCard key={s.id} shift={s} />
          ))}
        </div>
      )}
    </div>
  );
}
