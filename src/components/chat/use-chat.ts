import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { chatKeys, toConversationRow } from "@/lib/chat";

/** All conversations (and applications that can start one) for the signed-in user. */
export function useInbox(userId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.inbox(userId),
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_conversations");
      if (error) throw error;
      return (data ?? []).map(toConversationRow);
    },
  });
}

export function useUnreadMessages(userId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.unread(userId),
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_unread_message_count");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

/**
 * One live subscription per signed-in user. The database only delivers messages from
 * conversations the user takes part in; polling in the queries above is the fallback.
 */
export function useChatRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: chatKeys.all });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
