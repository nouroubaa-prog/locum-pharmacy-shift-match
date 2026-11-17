import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Finish setting up — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ComingNext
      title="Finish setting up"
      body="Choosing employer or locum and completing your profile is the next screen being built."
    />
  ),
});
