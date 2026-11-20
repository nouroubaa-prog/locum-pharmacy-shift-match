import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const MESSAGE_MAX_LENGTH = 2000;

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message first")
    .max(MESSAGE_MAX_LENGTH, `Messages can be up to ${MESSAGE_MAX_LENGTH} characters`),
});

type RawRow = Database["public"]["Functions"]["my_conversations"]["Returns"][number];

/** Inbox row. A null conversationId means the application has no thread yet. */
export interface ConversationRow {
  conversationId: string | null;
  applicationId: string;
  applicationStatus: RawRow["application_status"];
  shiftId: string;
  roleTitle: string;
  pharmacyName: string;
  town: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  iAmEmployer: boolean;
  otherUserId: string;
  otherName: string;
  otherLastReadAt: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageMine: boolean;
  unreadCount: number;
}

export function toConversationRow(r: RawRow): ConversationRow {
  return {
    conversationId: r.conversation_id ?? null,
    applicationId: r.application_id,
    applicationStatus: r.application_status,
    shiftId: r.shift_id,
    roleTitle: r.role_title,
    pharmacyName: r.pharmacy_name,
    town: r.town,
    shiftDate: r.shift_date,
    startTime: r.start_time,
    endTime: r.end_time,
    iAmEmployer: r.i_am_employer,
    otherUserId: r.other_user_id,
    otherName: r.other_name,
    otherLastReadAt: r.other_last_read_at ?? null,
    lastMessageBody: r.last_message_body ?? null,
    lastMessageAt: r.last_message_at ?? null,
    lastMessageMine: !!r.last_message_mine,
    unreadCount: Number(r.unread_count ?? 0),
  };
}

/** True when the other participant has opened the thread since this message was sent. */
export function isSeenByOther(messageCreatedAt: string, otherLastReadAt: string | null): boolean {
  if (!otherLastReadAt) return false;
  return new Date(otherLastReadAt).getTime() >= new Date(messageCreatedAt).getTime();
}

/** Conversations can receive new messages unless the application was withdrawn. */
export function canSendMessages(status: RawRow["application_status"]): boolean {
  return status !== "withdrawn";
}

export const chatKeys = {
  all: ["chat"] as const,
  inbox: (userId: string | undefined) => ["chat", "inbox", userId] as const,
  unread: (userId: string | undefined) => ["chat", "unread", userId] as const,
  thread: (conversationId: string) => ["chat", "thread", conversationId] as const,
  messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
};
