import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCheck, Flag, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  canSendMessages,
  chatKeys,
  isSeenByOther,
  MESSAGE_MAX_LENGTH,
  messageSchema,
  toConversationRow,
} from "@/lib/chat";
import { friendlyError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { EmptyState, ErrorState, PageSpinner } from "@/components/states";
import { ReportConversationDialog } from "@/components/chat/report-conversation-dialog";
import { shiftLabel, shiftWhen } from "@/components/chat/conversation-summary";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  head: () => ({
    meta: [{ title: "Conversation — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState<{ open: boolean; messageId: string | null }>({
    open: false,
    messageId: null,
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: chatKeys.thread(conversationId),
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_conversations", {
        _conversation_id: conversationId,
      });
      if (error) throw error;
      const row = data?.[0];
      return row ? toConversationRow(row) : null;
    },
  });

  const messages = useQuery({
    queryKey: chatKeys.messages(conversationId),
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).reverse();
    },
  });

  const lastIncoming = messages.data?.filter((m) => m.sender_id !== user?.id).at(-1)?.id;
  useEffect(() => {
    if (!user || !thread.data) return;
    supabase.rpc("mark_conversation_read", { _conversation_id: conversationId }).then(() => {
      queryClient.invalidateQueries({ queryKey: chatKeys.unread(user.id) });
      queryClient.invalidateQueries({ queryKey: chatKeys.inbox(user.id) });
    });
  }, [conversationId, lastIncoming, user, thread.data, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  async function send() {
    const parsed = messageSchema.safeParse({ body: draft });
    if (!parsed.success || !user) {
      toast.error(parsed.error?.issues[0]?.message ?? "Write a message first");
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, body: parsed.data.body });
    setSending(false);
    if (error) {
      toast.error(friendlyError(error, "Message not sent. Please try again."));
      return;
    }
    setDraft("");
    queryClient.invalidateQueries({ queryKey: chatKeys.all });
  }

  if (thread.isLoading) return <PageSpinner />;
  if (thread.isError)
    return (
      <div className="container-app max-w-3xl py-8">
        <ErrorState message="Couldn't load this conversation." onRetry={() => thread.refetch()} />
      </div>
    );
  if (!thread.data)
    return (
      <div className="container-app max-w-3xl py-8">
        <EmptyState
          title="Conversation not found"
          body="It may not exist, or you're not part of it."
          action={
            <Button asChild variant="outline">
              <Link to="/messages">Back to messages</Link>
            </Button>
          }
        />
      </div>
    );

  const c = thread.data;
  const open = canSendMessages(c.applicationStatus);

  return (
    <div className="container-app flex max-w-3xl flex-col py-4 sm:py-8">
      <header className="surface flex items-center gap-3 p-3 sm:p-4">
        <Button asChild variant="ghost" size="icon" aria-label="Back to messages">
          <Link to="/messages">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{c.otherName}</h1>
          <p className="truncate text-xs text-muted-foreground">
            <Link to="/shifts/$shiftId" params={{ shiftId: c.shiftId }} className="hover:underline">
              {shiftLabel(c)}
            </Link>{" "}
            · {shiftWhen(c)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setReport({ open: true, messageId: null })}
        >
          <Flag /> <span className="hidden sm:inline">Report</span>
        </Button>
      </header>

      <section
        aria-label="Messages"
        aria-live="polite"
        className="my-3 min-h-[40vh] flex-1 space-y-3 overflow-y-auto"
      >
        {messages.isLoading ? (
          <PageSpinner />
        ) : messages.isError ? (
          <ErrorState message="Couldn't load messages." onRetry={() => messages.refetch()} />
        ) : !messages.data?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello and ask anything about the shift.
          </p>
        ) : (
          messages.data.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className="group max-w-[85%] sm:max-w-[70%]">
                  <div
                    className={
                      mine
                        ? "rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground"
                        : "rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-foreground"
                    }
                  >
                    {/* Rendered as plain text: no HTML is ever interpreted. */}
                    <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground ${mine ? "justify-end" : ""}`}
                  >
                    <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                    {mine &&
                      (isSeenByOther(m.created_at, c.otherLastReadAt) ? (
                        <span className="flex items-center gap-0.5">
                          <CheckCheck className="h-3 w-3" aria-hidden /> Seen
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Check className="h-3 w-3" aria-hidden /> Sent
                        </span>
                      ))}
                    {!mine && (
                      <button
                        type="button"
                        className="underline-offset-2 hover:underline"
                        onClick={() => setReport({ open: true, messageId: m.id })}
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </section>

      {open ? (
        <form
          className="surface sticky bottom-2 flex items-end gap-2 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="message-input" className="sr-only">
            Message
          </label>
          <Textarea
            id="message-input"
            value={draft}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={2}
            placeholder="Write a message…"
            className="min-h-[44px] resize-none"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button type="submit" disabled={sending || !draft.trim()} aria-label="Send message">
            <Send />
          </Button>
        </form>
      ) : (
        <p className="surface p-3 text-center text-sm text-muted-foreground">
          This application was withdrawn, so no new messages can be sent. The history stays here.
        </p>
      )}

      {user && (
        <ReportConversationDialog
          open={report.open}
          onOpenChange={(o) => setReport((r) => ({ ...r, open: o }))}
          userId={user.id}
          conversationId={conversationId}
          messageId={report.messageId}
        />
      )}
    </div>
  );
}
