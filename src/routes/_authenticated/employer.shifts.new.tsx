import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/employer/shifts/new")({
  head: () => ({
    meta: [{ title: "Post a shift — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ComingNext
      title="Post a shift"
      body="The shift form (date, times, rate, registration, contact and deadline) is being built next."
    />
  ),
});
