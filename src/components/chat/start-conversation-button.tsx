import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { chatKeys } from "@/lib/chat";
import { friendlyError } from "@/lib/errors";

/** Opens the single conversation for an application, creating it the first time. */
export function StartConversationButton({
  applicationId,
  conversationId,
  label = "Message",
  size = "sm",
  variant = "outline",
}: {
  applicationId: string;
  conversationId?: string | null;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (conversationId) {
      navigate({ to: "/messages/$conversationId", params: { conversationId } });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("start_conversation", {
      _application_id: applicationId,
    });
    setBusy(false);
    if (error || !data) {
      toast.error(friendlyError(error, "Couldn't open the conversation."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: chatKeys.all });
    navigate({ to: "/messages/$conversationId", params: { conversationId: data } });
  }

  return (
    <Button size={size} variant={variant} onClick={open} disabled={busy}>
      <MessageCircle /> {busy ? "Opening…" : label}
    </Button>
  );
}
