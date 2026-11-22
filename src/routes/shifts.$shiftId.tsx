import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ApplicationConversations } from "@/components/chat/application-conversations";
import { EmptyState, ErrorState, PageHeader, PageSpinner } from "@/components/states";
import { formatDate, formatRate, formatTime } from "@/lib/format";

export const Route = createFileRoute("/shifts/$shiftId")({
  head: () => ({
    meta: [
      { title: "Shift details — Locum4U" },
      { name: "description", content: "Locum shift details on Locum4U." },
      { property: "og:title", content: "Shift details — Locum4U" },
      { property: "og:description", content: "Locum shift details on Locum4U." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShiftDetails,
});

function ShiftDetails() {
  const { shiftId } = Route.useParams();
  const { user } = useAuth();
  const shift = useQuery({
    queryKey: ["shift", shiftId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select(
          "id,role_title,pharmacy_name,town,shift_date,start_time,end_time,hourly_rate,currency,required_registration,requirements,notes,is_demo",
        )
        .eq("id", shiftId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (shift.isLoading) return <PageSpinner />;
  return (
    <div className="container-app max-w-3xl py-8">
      {shift.isError ? (
        <ErrorState message="Couldn't load this shift." onRetry={() => shift.refetch()} />
      ) : shift.data ? (
        <>
          <PageHeader
            title={shift.data.role_title}
            description={`${shift.data.pharmacy_name} · ${shift.data.town}`}
          />
          {shift.data.is_demo && <p className="mb-3 text-sm text-muted-foreground">Demo shift</p>}
          <dl className="grid grid-cols-2 gap-4 border-y border-border py-5">
            <div>
              <dt className="text-sm text-muted-foreground">Date</dt>
              <dd>{formatDate(shift.data.shift_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Hours</dt>
              <dd>
                {formatTime(shift.data.start_time)}–{formatTime(shift.data.end_time)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Hourly rate</dt>
              <dd>{formatRate(shift.data.hourly_rate, shift.data.currency)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Registration</dt>
              <dd>{shift.data.required_registration}</dd>
            </div>
          </dl>
          {shift.data.requirements && (
            <p className="mt-5 whitespace-pre-wrap break-words">{shift.data.requirements}</p>
          )}
          {shift.data.notes && (
            <p className="mt-3 whitespace-pre-wrap break-words">{shift.data.notes}</p>
          )}
        </>
      ) : (
        <EmptyState
          title="Shift unavailable"
          body="This listing is no longer publicly available."
        />
      )}
      <ApplicationConversations shiftId={shiftId} />
    </div>
  );
}
