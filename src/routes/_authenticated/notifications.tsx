import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ComingNext
      title="Notifications"
      body="Application updates and cancellations will be listed here."
    />
  ),
});
