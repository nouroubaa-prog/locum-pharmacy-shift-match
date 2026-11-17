import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/shifts/$shiftId")({
  head: () => ({
    meta: [
      { title: "Shift details — Locum4U" },
      { name: "description", content: "Locum shift details on Locum4U." },
      { property: "og:title", content: "Shift details — Locum4U" },
      { property: "og:description", content: "Locum shift details on Locum4U." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ComingNext
      title="Shift details"
      body="Full shift details, the apply button and contact unlock are the next screen being built."
    />
  ),
});
