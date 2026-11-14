import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/locum/profile")({
  head: () => ({ meta: [{ title: "Locum profile — Locum4U" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingNext title="Locum profile" body="Registration numbers, base town, radius, availability and preferred rate go here." />,
});
