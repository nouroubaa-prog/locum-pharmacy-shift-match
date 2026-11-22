import { useAuth } from "@/lib/auth";
import { useInbox } from "./use-chat";
import { ConversationSummary } from "./conversation-summary";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";

/** The RPC returns only the caller's applications, never arbitrary applicants. */
export function ApplicationConversations({ shiftId }: { shiftId?: string }) {
  const { user } = useAuth();
  const inbox = useInbox(user?.id);
  if (!user) return null;
  const rows = (inbox.data ?? []).filter((row) => !shiftId || row.shiftId === shiftId);
  return (
    <section className="mt-8 space-y-3" aria-labelledby="application-chats">
      <h2 id="application-chats" className="text-xl font-semibold">
        Applications & messages
      </h2>
      {inbox.isLoading ? (
        <ListSkeleton rows={2} />
      ) : inbox.isError ? (
        <ErrorState message="Couldn't load applications." onRetry={() => inbox.refetch()} />
      ) : rows.length ? (
        rows.map((row) => <ConversationSummary key={row.applicationId} c={row} />)
      ) : (
        <EmptyState
          title="No applications yet"
          body="Conversations appear here after an application is submitted."
        />
      )}
    </section>
  );
}
