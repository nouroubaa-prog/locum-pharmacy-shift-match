import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/locum/")({
  head: () => ({ meta: [{ title: "Locum dashboard — Locum4U" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingNext title="Locum dashboard" body="Your matches and application history will appear here." />,
});
