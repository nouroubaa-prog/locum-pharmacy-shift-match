import { Link } from "@tanstack/react-router";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { formatDate, formatTime, relativeTime } from "@/lib/format";
import type { ConversationRow } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { StartConversationButton } from "./start-conversation-button";

export function shiftLabel(c: Pick<ConversationRow, "roleTitle" | "pharmacyName">) {
  return `${c.roleTitle} · ${c.pharmacyName}`;
}

export function shiftWhen(c: Pick<ConversationRow, "shiftDate" | "startTime" | "endTime">) {
  return `${formatDate(c.shiftDate)} · ${formatTime(c.startTime)}–${formatTime(c.endTime)}`;
}

/** One inbox row: an existing thread links to it, an application without one offers to start it. */
export function ConversationSummary({ c }: { c: ConversationRow }) {
  const unread = c.unreadCount > 0;
  const body = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
      >
        {c.otherName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate", unread ? "font-semibold" : "font-medium")}>{c.otherName}</p>
          {c.lastMessageAt && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {relativeTime(c.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {shiftLabel(c)} · {shiftWhen(c)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {c.lastMessageBody
              ? `${c.lastMessageMine ? "You: " : ""}${c.lastMessageBody}`
              : "No messages yet"}
          </p>
          {unread && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-[11px] font-bold text-highlight-foreground"
              aria-label={`${c.unreadCount} unread`}
            >
              {c.unreadCount > 9 ? "9+" : c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (c.conversationId) {
    return (
      <Link
        to="/messages/$conversationId"
        params={{ conversationId: c.conversationId }}
        className="surface flex items-center gap-3 p-4 transition-colors hover:bg-accent/50"
      >
        {body}
      </Link>
    );
  }
  return (
    <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      {body}
      <div className="flex items-center gap-2 sm:shrink-0">
        <ApplicationStatusBadge status={c.applicationStatus} />
        <StartConversationButton applicationId={c.applicationId} label="Start chat" />
      </div>
    </div>
  );
}
