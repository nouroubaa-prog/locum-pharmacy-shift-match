import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Moderation — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ComingNext
      title="Moderation"
      body="Reports, listing visibility and account status controls will appear here."
    />
  ),
});
