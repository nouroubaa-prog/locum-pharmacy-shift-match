import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { ConversationSummary } from "@/components/chat/conversation-summary";
import { useInbox } from "@/components/chat/use-chat";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [{ title: "Messages — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: MessagesInbox,
});

function MessagesInbox() {
  const { user } = useAuth();
  const inbox = useInbox(user?.id);
  const threads = (inbox.data ?? []).filter((c) => c.conversationId);
  const startable = (inbox.data ?? []).filter((c) => !c.conversationId);

  return (
    <div className="container-app max-w-3xl py-8">
      <PageHeader
        eyebrow="Messages"
        title="Your conversations"
        description="Chat about a shift you applied to or posted. Contact details still unlock only after applying."
      />
      {inbox.isLoading ? (
        <ListSkeleton rows={3} />
      ) : inbox.isError ? (
        <ErrorState message="Couldn't load your messages." onRetry={() => inbox.refetch()} />
      ) : !inbox.data?.length ? (
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title="No conversations yet"
          body="Once a locum applies to a shift, the locum and the employer can message each other here."
        />
      ) : (
        <div className="space-y-6">
          {threads.length > 0 && (
            <section className="space-y-2" aria-label="Conversations">
              {threads.map((c) => (
                <ConversationSummary key={c.applicationId} c={c} />
              ))}
            </section>
          )}
          {startable.length > 0 && (
            <section className="space-y-2" aria-labelledby="startable-heading">
              <h2 id="startable-heading" className="text-sm font-semibold text-muted-foreground">
                Applications you can message about
              </h2>
              {startable.map((c) => (
                <ConversationSummary key={c.applicationId} c={c} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
